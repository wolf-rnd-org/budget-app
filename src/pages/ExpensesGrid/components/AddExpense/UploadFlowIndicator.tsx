import { FileUp, ScanLine, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

type Phase = "idle" | "uploading" | "analyzing" | "done" | "error";

interface UploadFlowIndicatorProps {
  phase: Phase;
  progress?: number; // 0..100, אופציונלי
  className?: string;
}

export default function UploadFlowIndicator({
  phase,
  progress,
  className = "",
}: UploadFlowIndicatorProps) {
  // 👇 חדש: לא מציגים כלום במצב התחלתי
  if (phase === "idle") return null;

  const label =
    phase === "uploading" ? "מעלה קבצים…" :
    phase === "analyzing" ? "מנתח בעזרת AI…" :
    phase === "done" ? "הסתיים" :
    phase === "error" ? "אופס, משהו השתבש" :
    ""; // (לא נגיע לכאן בפועל)

  const Icon =
    phase === "uploading" ? FileUp :
    phase === "analyzing" ? ScanLine :
    phase === "done" ? CheckCircle2 :
    phase === "error" ? AlertTriangle :
    FileUp;

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Icon
          className={
            phase === "error"
              ? "text-red-600"
              : phase === "done"
              ? "text-green-600"
              : "text-gray-700"
          }
        />
        <span className="text-sm font-medium text-gray-900">{label}</span>

        {(phase === "uploading" || phase === "analyzing") && (
          <>
            <span className="ml-2 inline-flex h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
            <span className="ml-1 inline-flex h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:120ms]" />
            <span className="ml-1 inline-flex h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:240ms]" />
          </>
        )}
      </div>

      {/* progress / shimmer */}
      {(phase === "uploading" || phase === "analyzing") && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gray-300 via-gray-200 to-gray-300"
            style={{
              width: `${Math.max(8, Math.min(100, progress ?? 35))}%`,
              animation: "shimmer 1.8s linear infinite",
              backgroundSize: "200% 100%",
            }}
          />
        </div>
      )}

      {/* הודעת אימות אחרי סיום */}
      {phase === "done" && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <ShieldCheck className="text-blue-600 shrink-0" />
          <p className="text-sm text-gray-700">
            הנתונים חולצו אוטומטית בעזרת AI — <span className="font-medium">חובה לאמת</span> לפני שמירה.
          </p>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
