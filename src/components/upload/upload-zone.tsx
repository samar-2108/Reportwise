"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  Camera,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Scissors,
  Sparkles,
  FileUp,
} from "lucide-react";
import { compressImageClientSide } from "@/lib/utils/image-compression";
import { useLanguage } from "@/lib/i18n/context";
import {
  MOCK_EXTRACTION_CBC,
  MOCK_EXTRACTION_LIPID,
  MOCK_EXTRACTION_CRITICAL,
} from "@/lib/fixtures/sample-reports";
import { ExtractionResult } from "@/lib/schemas/extraction";

export interface UploadedPage {
  id: string;
  file: File;
  previewUrl: string;
}

interface UploadZoneProps {
  onExtractionComplete: (result: ExtractionResult, files?: UploadedPage[]) => void;
  onExtractionStart: () => void;
  onError: (errorMessage: string) => void;
}

export function UploadZone({ onExtractionComplete, onExtractionStart, onError }: UploadZoneProps) {
  const { t } = useLanguage();
  const [pages, setPages] = useState<UploadedPage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    if (pages.length + fileList.length > 5) {
      onError("Maximum 5 pages allowed per report analysis.");
      return;
    }

    setIsCompressing(true);
    const newPages: UploadedPage[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const original = fileList[i];
      if (original.size > 10 * 1024 * 1024) {
        onError(`File ${original.name} exceeds 10 MB limit.`);
        continue;
      }

      try {
        const compressed = await compressImageClientSide(original);
        const previewUrl = original.type === "application/pdf"
          ? ""
          : URL.createObjectURL(compressed);

        newPages.push({
          id: `page-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          file: compressed,
          previewUrl,
        });
      } catch (err) {
        console.error("Compression error:", err);
        newPages.push({
          id: `page-${Date.now()}-${i}`,
          file: original,
          previewUrl: original.type === "application/pdf" ? "" : URL.createObjectURL(original),
        });
      }
    }

    setPages((prev) => [...prev, ...newPages]);
    setIsCompressing(false);
  };

  const removePage = (index: number) => {
    setPages((prev) => {
      const removed = prev[index];
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pages.length) return;
    setPages((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  };

  const handleStartExtraction = async () => {
    if (pages.length === 0) {
      onError("Please select or photograph at least one report page.");
      return;
    }

    onExtractionStart();

    try {
      const formData = new FormData();
      pages.forEach((p) => {
        formData.append("files", p.file);
      });

      const response = await fetch("/api/reports/extract", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to extract values from report");
      }

      onExtractionComplete(data, pages);
    } catch (err) {
      console.error("Extraction error:", err);
      onError(err instanceof Error ? err.message : "Failed to extract values from report.");
    }
  };

  // Instant prefill with sample fixtures for testing without camera
  const loadSampleFixture = (type: "cbc" | "lipid" | "critical") => {
    onExtractionStart();
    setTimeout(() => {
      const mockId = crypto.randomUUID();
      if (type === "cbc") {
        onExtractionComplete({ ...MOCK_EXTRACTION_CBC, reportId: mockId } as unknown as ExtractionResult);
      } else if (type === "lipid") {
        onExtractionComplete({ ...MOCK_EXTRACTION_LIPID, reportId: mockId } as unknown as ExtractionResult);
      } else {
        onExtractionComplete({ ...MOCK_EXTRACTION_CRITICAL, reportId: mockId } as unknown as ExtractionResult);
      }
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Privacy Header Crop Reminder */}
      <div className="flex items-start gap-2.5 rounded-xl border border-teal-200 bg-teal-50/70 p-3.5 text-xs text-teal-950">
        <Scissors className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold">Privacy Header Recommendation:</span>
          <p className="text-teal-900 leading-relaxed">
            {t.upload.cropReminder}
          </p>
        </div>
      </div>

      {/* Main Upload Dropzone & Action Buttons */}
      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 sm:p-8 text-center transition-all hover:border-teal-400">
        {/* Hidden Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-4 shadow-xs">
          <UploadCloud className="h-7 w-7" />
        </div>

        <h3 className="text-base font-bold text-slate-900">{t.upload.title}</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          {t.upload.subtitle}
        </p>

        {/* Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors"
          >
            <Camera className="h-4 w-4" />
            {t.upload.cameraButton}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <FileUp className="h-4 w-4 text-slate-500" />
            {t.upload.uploadButton}
          </button>
        </div>

        <div className="mt-4 text-[11px] text-slate-400 font-medium">
          {t.upload.dropzoneSubtext} • {t.upload.maxPages}
        </div>
      </div>

      {/* Pages Preview & Reordering Grid */}
      {pages.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Report Pages ({pages.length} of 5)
            </h4>
            <span className="text-[11px] text-slate-500">
              Drag or use arrows to reorder pages
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {pages.map((p, idx) => (
              <div
                key={p.id}
                className="group relative rounded-xl border border-slate-200 bg-slate-50 p-2 text-center space-y-2 overflow-hidden shadow-2xs"
              >
                <div className="h-32 w-full rounded-lg bg-white border border-slate-100 flex items-center justify-center overflow-hidden">
                  {p.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.previewUrl}
                      alt={`Page ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <FileText className="h-8 w-8 text-teal-600" />
                      <span className="text-[10px] font-semibold text-slate-600">PDF Doc</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-semibold text-slate-700 text-[11px]">
                    {t.upload.pageLabel} {idx + 1}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => movePage(idx, idx - 1)}
                      className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Move page left"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === pages.length - 1}
                      onClick={() => movePage(idx, idx + 1)}
                      className="rounded p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                      title="Move page right"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePage(idx)}
                      className="rounded p-1 text-rose-500 hover:bg-rose-50"
                      title="Remove page"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={isCompressing}
              onClick={handleStartExtraction}
              className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-700 transition-colors flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isCompressing ? "Compressing..." : t.upload.extractButton}
            </button>
          </div>
        </div>
      )}

      {/* Instant 1-Click Sample Fixtures */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs space-y-3">
        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-teal-600" />
          {t.upload.selectSample}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadSampleFixture("cbc")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 transition-colors"
          >
            📋 {t.upload.loadCbc}
          </button>
          <button
            type="button"
            onClick={() => loadSampleFixture("lipid")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 transition-colors"
          >
            🧪 {t.upload.loadLipid}
          </button>
          <button
            type="button"
            onClick={() => loadSampleFixture("critical")}
            className="rounded-lg border border-rose-200 bg-rose-50/60 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
            {t.upload.loadCritical}
          </button>
        </div>
      </div>
    </div>
  );
}

