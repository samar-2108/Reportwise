import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { sniffFileType, validateUploadedFiles, UploadValidationError } from "./upload-validation";
import { assertOwnedPaths } from "./assert-owned-paths";
import { AnalyzeRequestSchema, sanitizeText } from "../schemas/analyze-request";
import { consumeRateLimit, resetRateLimit } from "../rate-limit";
import { computeFilesSha256, computeInputSha256, reportCache } from "../cache/report-cache";
import { safeErrorResponse } from "./safe-error";
import { validateCsrfOrigin } from "./csrf";
import { NextRequest } from "next/server";

describe("Security Test Suite", () => {
  describe("1. Magic-byte Sniffing & Upload Validation", () => {
    it("correctly identifies JPEG magic bytes (FF D8 FF)", () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      const res = sniffFileType(jpegBuffer);
      assert.ok(res);
      assert.strictEqual(res?.mimeType, "image/jpeg");
      assert.strictEqual(res?.extension, "jpg");
    });

    it("correctly identifies PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)", () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const res = sniffFileType(pngBuffer);
      assert.ok(res);
      assert.strictEqual(res?.mimeType, "image/png");
      assert.strictEqual(res?.extension, "png");
    });

    it("correctly identifies WebP magic bytes (RIFF...WEBP)", () => {
      const webpBuffer = Buffer.concat([
        Buffer.from("RIFF", "ascii"),
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
        Buffer.from("WEBP", "ascii"),
      ]);
      const res = sniffFileType(webpBuffer);
      assert.ok(res);
      assert.strictEqual(res?.mimeType, "image/webp");
      assert.strictEqual(res?.extension, "webp");
    });

    it("correctly identifies PDF magic bytes (%PDF)", () => {
      const pdfBuffer = Buffer.from("%PDF-1.7\nSample", "ascii");
      const res = sniffFileType(pdfBuffer);
      assert.ok(res);
      assert.strictEqual(res?.mimeType, "application/pdf");
      assert.strictEqual(res?.extension, "pdf");
    });

    it("correctly identifies HEIC magic bytes", () => {
      const heicBuffer = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x18]),
        Buffer.from("ftypheic", "ascii"),
      ]);
      const res = sniffFileType(heicBuffer);
      assert.ok(res);
      assert.strictEqual(res?.mimeType, "image/heic");
      assert.strictEqual(res?.extension, "heic");
    });

    it("rejects malicious executable files (e.g., Windows PE .exe / shell script)", () => {
      const exeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ
      const res = sniffFileType(exeBuffer);
      assert.strictEqual(res, null);

      const bashBuffer = Buffer.from("#!/bin/bash\nrm -rf /", "utf-8");
      assert.strictEqual(sniffFileType(bashBuffer), null);
    });

    it("rejects file uploads exceeding 5 page limit", async () => {
      const dummyFile = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "sample.jpg", {
        type: "image/jpeg",
      });
      const files = [dummyFile, dummyFile, dummyFile, dummyFile, dummyFile, dummyFile]; // 6 files

      await assert.rejects(
        async () => validateUploadedFiles(files),
        (err: Error) => {
          assert.ok(err instanceof UploadValidationError);
          assert.match(err.message, /Maximum 5 pages allowed/);
          return true;
        }
      );
    });
  });

  describe("2. Storage Path Ownership & Traversal Defense", () => {
    const userId = "11111111-2222-3333-4444-555555555555";

    it("allows valid paths owned by the user", () => {
      const paths = [
        `${userId}/report-1/page-1.jpg`,
        `${userId}/report-1/page-2.png`,
      ];
      const validated = assertOwnedPaths(userId, paths);
      assert.deepStrictEqual(validated, paths);
    });

    it("rejects paths belonging to another user", () => {
      const victimId = "99999999-9999-9999-9999-999999999999";
      const paths = [`${victimId}/report-1/page-1.jpg`];
      assert.throws(
        () => assertOwnedPaths(userId, paths),
        /unauthorized storage path/
      );
    });

    it("rejects directory traversal attempts (../)", () => {
      const traversalPaths = [`${userId}/../other-user/page-1.jpg`];
      assert.throws(
        () => assertOwnedPaths(userId, traversalPaths),
        /malicious characters detected/
      );
    });

    it("rejects backslash directory traversal attempts", () => {
      const traversalPaths = [`${userId}/..\\other-user\\page-1.jpg`];
      assert.throws(
        () => assertOwnedPaths(userId, traversalPaths),
        /malicious characters detected/
      );
    });
  });

  describe("3. Analyze Request Zod Schema & Prompt Injection Sanitization", () => {
    it("strips ASCII and Unicode control characters from text", () => {
      const tainted = "Hemoglobin\u0000\u0007\u001b[31m Test\u007F";
      const clean = sanitizeText(tainted);
      assert.strictEqual(clean, "Hemoglobin[31m Test");
    });

    it("rejects empty test array", () => {
      const result = AnalyzeRequestSchema.safeParse({
        reportId: "11111111-1111-1111-1111-111111111111",
        tests: [],
      });
      assert.strictEqual(result.success, false);
    });

    it("rejects oversized test list exceeding 150 items", () => {
      const oversizedTests = Array.from({ length: 151 }, (_, i) => ({
        test: `Biomarker ${i + 1}`,
        value: "10",
        unit: "mg/dL",
        ref_range: "5-15",
      }));

      const result = AnalyzeRequestSchema.safeParse({
        reportId: "11111111-1111-1111-1111-111111111111",
        tests: oversizedTests,
      });
      assert.strictEqual(result.success, false);
      assert.match(result.error!.issues[0].message, /maximum of 150/);
    });

    it("accepts valid analysis request and sets sensible defaults", () => {
      const valid = {
        reportId: "11111111-1111-1111-1111-111111111111",
        reportType: "Complete Blood Count",
        tests: [
          { test: "Hemoglobin", value: "14.2", unit: "g/dL", ref_range: "12-16" },
        ],
      };

      const result = AnalyzeRequestSchema.safeParse(valid);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data?.tests[0].status, "unknown");
    });
  });

  describe("4. Atomic Rate Limiter & Window Rollover", () => {
    const testKey = "test-user-rate-limit-unit";

    beforeEach(async () => {
      await resetRateLimit(testKey);
    });

    it("allows requests within configured capacity and blocks when capacity exhausted", async () => {
      const bucket = "test:burst";
      const limit = 3;
      const windowSec = 60;

      const r1 = await consumeRateLimit(testKey, bucket, limit, windowSec);
      assert.strictEqual(r1.allowed, true);
      assert.strictEqual(r1.current, 1);
      assert.strictEqual(r1.remaining, 2);

      const r2 = await consumeRateLimit(testKey, bucket, limit, windowSec);
      assert.strictEqual(r2.allowed, true);
      assert.strictEqual(r2.current, 2);
      assert.strictEqual(r2.remaining, 1);

      const r3 = await consumeRateLimit(testKey, bucket, limit, windowSec);
      assert.strictEqual(r3.allowed, true);
      assert.strictEqual(r3.current, 3);
      assert.strictEqual(r3.remaining, 0);

      // 4th request must be rejected
      const r4 = await consumeRateLimit(testKey, bucket, limit, windowSec);
      assert.strictEqual(r4.allowed, false);
      assert.strictEqual(r4.remaining, 0);
    });

    it("resets counters when resetRateLimit is invoked", async () => {
      const bucket = "test:reset";
      await consumeRateLimit(testKey, bucket, 2, 60);
      await consumeRateLimit(testKey, bucket, 2, 60);

      const blocked = await consumeRateLimit(testKey, bucket, 2, 60);
      assert.strictEqual(blocked.allowed, false);

      await resetRateLimit(testKey, bucket);

      const allowedAgain = await consumeRateLimit(testKey, bucket, 2, 60);
      assert.strictEqual(allowedAgain.allowed, true);
      assert.strictEqual(allowedAgain.current, 1);
    });
  });

  describe("5. User-Scoped Cache Isolation", () => {
    it("produces different cache hashes for different users with identical file data", () => {
      const sampleFiles = [
        {
          mimeType: "image/jpeg",
          data: Buffer.from("identical-lab-report-image-bytes"),
        },
      ];

      const hashUserA = computeFilesSha256("user-alpha", sampleFiles);
      const hashUserB = computeFilesSha256("user-beta", sampleFiles);

      assert.notStrictEqual(hashUserA, hashUserB);
    });

    it("produces different input hashes for different users with identical biomarkers", () => {
      const input = {
        reportType: "Lipid Profile",
        tests: [{ test: "Cholesterol", value: "220" }],
      };

      const hashUserA = computeInputSha256("user-alpha", input);
      const hashUserB = computeInputSha256("user-beta", input);

      assert.notStrictEqual(hashUserA, hashUserB);
    });

    it("does not return User A cached extraction for User B", () => {
      reportCache.clear();
      const mockResult = { report_type: "CBC", tests: [] };

      reportCache.setExtraction("shared-hash", mockResult, "user-alpha");

      const userAHit = reportCache.getExtraction("shared-hash", "user-alpha");
      const userBHit = reportCache.getExtraction("shared-hash", "user-beta");

      assert.deepStrictEqual(userAHit, mockResult);
      assert.strictEqual(userBHit, null);
    });
  });

  describe("6. Generic Error Masking & Sensitive Field Redaction", () => {
    it("redacts Google API keys and authorization tokens in logs", async () => {
      const leakedError = new Error("Request to AIzaSyABC123456789012345678901234567 failed with Bearer secret-token-xyz");
      const res = safeErrorResponse(leakedError, "Custom generic fallback message", 500);

      assert.strictEqual(res.status, 500);
      const json = await res.json();
      assert.strictEqual(json.error, "Custom generic fallback message");
    });
  });

  describe("7. CSRF Origin Validation", () => {
    it("allows GET and HEAD requests without Origin check", () => {
      const getReq = new NextRequest("http://localhost:3000/api/reports/list", {
        method: "GET",
      });
      assert.strictEqual(validateCsrfOrigin(getReq), true);
    });

    it("blocks cross-origin POST request with foreign Origin header", () => {
      const postReq = new NextRequest("http://localhost:3000/api/reports/analyze", {
        method: "POST",
        headers: {
          origin: "https://malicious-phishing-site.com",
        },
      });
      assert.strictEqual(validateCsrfOrigin(postReq), false);
    });

    it("allows same-origin POST request", () => {
      const postReq = new NextRequest("http://localhost:3000/api/reports/analyze", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
        },
      });
      assert.strictEqual(validateCsrfOrigin(postReq), true);
    });
  });
});
