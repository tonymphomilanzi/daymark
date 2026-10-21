import { VoiceCore } from "./VoiceCore";

export function HudShell({
  children,
  speaking = false,
  listening = false,
  showOrb = true,
  status = "STANDBY",
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#03080c] text-cyan-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,80,120,0.22),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.035)_1px,transparent_1px)] bg-[size:100%_3px] mix-blend-overlay" />

      <span className="pointer-events-none absolute left-3 top-3 z-30 h-10 w-10 border-l-2 border-t-2 border-cyan-400/80" />
      <span className="pointer-events-none absolute right-3 top-3 z-30 h-10 w-10 border-r-2 border-t-2 border-cyan-400/80" />
      <span className="pointer-events-none absolute bottom-3 left-3 z-30 h-10 w-10 border-b-2 border-l-2 border-cyan-400/80" />
      <span className="pointer-events-none absolute bottom-3 right-3 z-30 h-10 w-10 border-b-2 border-r-2 border-cyan-400/80" />

      <header className="pointer-events-none relative z-20 flex items-center justify-between px-8 py-4 font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/70">
        <span>Stark OS // Mark VII</span>
        <span className="tabular">{status}</span>
      </header>

      <div className="relative z-10 flex min-h-[calc(100vh-5.5rem)]">
        <div className="min-w-0 flex-1 px-4 pb-8 sm:px-6">{children}</div>

        {showOrb ? (
          <aside className="hidden w-80 shrink-0 flex-col items-center justify-center pr-6 lg:flex">
            <VoiceCore speaking={speaking} listening={listening} className="h-64 w-64" />
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/80">
              J.A.R.V.I.S. // {speaking ? "SPEAKING" : listening ? "LISTENING" : "STANDBY"}
            </p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}