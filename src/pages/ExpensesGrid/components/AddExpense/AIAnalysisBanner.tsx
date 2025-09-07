import React from "react";
import {
  Brain,
  Sparkles,
  AlertTriangle,
  Volume2,
  VolumeX,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

type Status = "processing" | "ready" | "error";

interface AIAnalysisBannerProps {
  status: Status;
  // נשמרים לתאימות אך לא מוצגים עוד:
  modelName?: string;    // לא מוצג
  confidence?: number;   // לא מוצג
  checklist?: string[];
  onRetry?: () => void;
  enableSoundToggle?: boolean;
}

export const AIAnalysisBanner: React.FC<AIAnalysisBannerProps> = ({
  status,
  // תאימות לאחור — לא משתמשים בהם ב-UI
  modelName,
  confidence,
  checklist = [],
  onRetry,
  enableSoundToggle = true,
}) => {
  const [soundOn, setSoundOn] = React.useState(false);

  React.useEffect(() => {
    let ctx: AudioContext | null = null;
    let osc: OscillatorNode | null = null;
    let gain: GainNode | null = null;

    if (status === "processing" && soundOn) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      gain = ctx.createGain();
      gain.gain.value = 0.03;
      gain.connect(ctx.destination);

      osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 220;
      osc.connect(gain);
      osc.start();

      let t = 0;
      const id = setInterval(() => {
        if (!osc) return;
        t += 1;
        const f = 200 + Math.sin(t / 3) * 35 + Math.sin(t / 7) * 15;
        try { osc.frequency.setTargetAtTime(f, ctx!.currentTime, 0.2); } catch {}
      }, 300);

      return () => {
        clearInterval(id);
        try { osc?.stop(); } catch {}
        osc?.disconnect();
        gain?.disconnect();
        ctx?.close();
      };
    }
    return;
  }, [status, soundOn]);

  return (
    <div
      className={[
        "relative overflow-hidden rounded-xl border",
        status === "processing" ? "border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50" : "",
        status === "ready" ? "border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50" : "",
        status === "error" ? "border-red-200 bg-gradient-to-r from-rose-50 to-red-50" : "",
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "repeating-linear-gradient(100deg, rgba(255,255,255,.4) 0, rgba(255,255,255,.4) 2px, transparent 2px, transparent 12px)",
          transform: "translate3d(0,0,0)",
          animation: status === "processing" ? "ai-stripes 3s linear infinite" : undefined,
        }}
      />
      <style>{`
        @keyframes ai-stripes { 0% { background-position: 0 0; } 100% { background-position: 200px 0; } }
        @keyframes ai-pulse { 0%,100% { transform: scale(1); opacity: .7 } 50% { transform: scale(1.06); opacity: 1 } }
        @keyframes ai-eq { 0% { height: 20% } 50% { height: 95% } 100% { height: 20% } }
      `}</style>

      <div className="relative px-5 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={[
                "rounded-xl p-2.5 shadow-sm",
                status === "processing" ? "bg-indigo-600 text-white" : "",
                status === "ready" ? "bg-amber-500 text-white" : "",
                status === "error" ? "bg-red-600 text-white" : "",
              ].join(" ")}
              style={status === "processing" ? { animation: "ai-pulse 2.4s ease-in-out infinite" } : undefined}
            >
              {status === "processing" && <Brain className="w-5 h-5" />}
              {status === "ready" && <CheckCircle2 className="w-5 h-5" />}
              {status === "error" && <AlertTriangle className="w-5 h-5" />}
            </div>

            <div>
              {status === "processing" && (
                <>
                  <h4 className="text-base md:text-lg font-semibold text-gray-900">
                    מנתח קובץ בעזרת AI
                  </h4>
                  <p className="text-sm text-gray-700 mt-0.5">
                    רגע סבלנות… אנחנו מחלצים טקסט ומבנים נתונים. אפשר להמשיך למלא ידנית אם תרצי.
                  </p>
                </>
              )}

              {status === "ready" && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base md:text-lg font-semibold text-gray-900">
                      הניתוח הושלם
                    </h4>
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-white/60 text-gray-800 border border-white/70 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                      חולץ אוטומטית
                    </span>
                  </div>
                  <p className="text-sm text-gray-800 mt-0.5">
                    הנתונים חולצו בעזרת AI — <span className="font-medium">חובה לעבור ולבדוק את כל השדות לפני שמירה</span>.
                  </p>
                </>
              )}

              {status === "error" && (
                <>
                  <h4 className="text-base md:text-lg font-semibold text-gray-900">הניתוח נכשל</h4>
                  <p className="text-sm text-gray-700 mt-0.5">
                    לא הצלחנו להפיק נתונים מהקובץ. נסי שוב או הזיני ידנית.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status === "processing" && enableSoundToggle && (
              <button
                onClick={() => setSoundOn(s => !s)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white/70 hover:bg-white transition"
                title="צליל עיבוד"
              >
                {soundOn ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span className="text-sm">{soundOn ? "ללא צליל" : "עם צליל"}</span>
              </button>
            )}
            {typeof onRetry === "function" && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border bg-white/70 hover:bg-white transition"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">נסי שוב</span>
              </button>
            )}
          </div>
        </div>

        {status === "processing" && (
          <div className="mt-4 flex items-end gap-1 h-8">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="w-1.5 rounded-sm bg-indigo-500/70"
                style={{
                  animation: "ai-eq 1.4s ease-in-out infinite",
                  animationDelay: `${(i % 6) * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}

        {status === "ready" && checklist.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {checklist.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-white/70 border"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
