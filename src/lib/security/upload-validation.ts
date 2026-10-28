export interface SniffedFile {
  buffer: Buffer;
  mimeType: string;
  extension: "jpg" | "png" | "webp" | "pdf" | "heic";
  originalName: string;
}

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

const MAX_FILE_COUNT = 5;
const MAX_PER_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_BYTES = 30 * 1024 * 1024; // 30MB

/**
 * Sniffs the magic byte file signature directly from a file buffer.
 * Does NOT trust client-supplied Content-Type or file extensions.
 */
export function sniffFileType(
  buffer: Buffer
): { mimeType: string; extension: "jpg" | "png" | "webp" | "pdf" | "heic" } | null {
  if (buffer.length < 4) {
    return null;
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: "image/png", extension: "png" };
  }

  // 3. WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" };
  }

  // 4. PDF: %PDF
  if (buffer.toString("ascii", 0, 4) === "%PDF") {
    return { mimeType: "application/pdf", extension: "pdf" };
  }

  // 5. HEIC / HEIF: ....ftyp(heic|mif1|msf1|heix|heim|hevc)
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12).toLowerCase();
    const heicBrands = ["heic", "mif1", "msf1", "heix", "heim", "hevc"];
    if (heicBrands.includes(brand)) {
      return { mimeType: "image/heic", extension: "heic" };
    }
  }

  return null;
}

/**
 * Validates uploaded files against size constraints, file counts,
 * and magic byte signatures.
 */
export async function validateUploadedFiles(files: File[]): Promise<SniffedFile[]> {
  if (!files || files.length === 0) {
    throw new UploadValidationError("No files were uploaded. Please select at least one lab report file.");
  }

  if (files.length > MAX_FILE_COUNT) {
    throw new UploadValidationError(`Maximum ${MAX_FILE_COUNT} pages allowed per report.`);
  }

  let totalSize = 0;
  const validatedFiles: SniffedFile[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (file.size > MAX_PER_FILE_BYTES) {
      throw new UploadValidationError(
        `File "${file.name || `Page ${i + 1}`}" exceeds the maximum allowed file size of 10MB.`
      );
    }

    totalSize += file.size;
    if (totalSize > MAX_TOTAL_BYTES) {
      throw new UploadValidationError("Total upload payload exceeds the 30MB limit across all pages.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffResult = sniffFileType(buffer);

    if (!sniffResult) {
      throw new UploadValidationError(
        `Unsupported or corrupted file format for "${file.name || `Page ${i + 1}`}". Please upload JPEG, PNG, WebP, HEIC, or PDF.`
      );
    }

    validatedFiles.push({
      buffer,
      mimeType: sniffResult.mimeType,
      extension: sniffResult.extension,
      originalName: file.name || `page-${i + 1}`,
    });
  }

  return validatedFiles;
}
