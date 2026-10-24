import { AlertCircle } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <aside
      aria-label="Medical disclaimer"
      className="sticky bottom-0 z-30 border-t border-amber-200/80 bg-amber-50/95 px-4 py-2.5 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 text-center text-xs text-amber-900 font-medium sm:text-sm">
        <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
        <span>
          <strong>Medical Disclaimer:</strong> This is educational information, not medical advice. Always consult a qualified physician for diagnosis and medical decisions.
        </span>
      </div>
    </aside>
  );
}

