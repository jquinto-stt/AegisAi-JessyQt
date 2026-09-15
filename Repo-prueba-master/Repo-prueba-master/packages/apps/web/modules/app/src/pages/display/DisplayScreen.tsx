import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { observer } from "mobx-react-lite";
import { queuesStore } from "@/stores";

/**
 * Plays a short beep using the Web Audio API (no asset needed).
 */
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => ctx.close();
  } catch {
    // audio not available
  }
}

const Clock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-2xl font-medium text-white/80 tabular-nums">
      {now.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
};

/**
 * DisplayScreen — Public waiting-room screen (standalone, fullscreen).
 * Shows the current ticket of a chosen queue, next tickets, and beeps on change.
 * Query params: ?cola=<id>&sound=1
 */
export const DisplayScreen = observer(() => {
  const [params] = useSearchParams();
  const colaId = params.get("cola");
  const soundOn = params.get("sound") === "1";

  const queue = (colaId && queuesStore.getQueue(colaId)) || queuesStore.queues[0];

  const current = queue?.serving[0] ?? null;
  const lastCalledRef = useRef<string | null>(null);

  // Beep when the called ticket changes
  useEffect(() => {
    if (!current) return;
    if (lastCalledRef.current !== current.numero) {
      if (soundOn && lastCalledRef.current !== null) playBeep();
      lastCalledRef.current = current.numero;
    }
  }, [current?.numero, soundOn]);

  const [flash, setFlash] = useState(false);
  useEffect(() => {
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 800);
    return () => clearTimeout(t);
  }, [current?.numero]);

  if (!queue) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary-950 text-white">
        <p className="text-2xl">No hay cola seleccionada</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-secondary-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-10 py-6">
        <img src="/images/logo/necto-full-white.svg" alt="NECTO" className="h-7 w-auto" />
        <div className="flex items-center gap-6">
          <span className="rounded-full bg-white/10 px-4 py-1.5 text-lg font-medium">{queue.nombre}</span>
          <Clock />
        </div>
      </header>

      {/* Main split: current ticket + next list */}
      <div className="flex flex-1 flex-col gap-8 px-10 pb-10 lg:flex-row">
        {/* Current ticket — huge */}
        <div className="flex flex-[2] items-center justify-center">
          <div
            className={
              "flex w-full max-w-3xl flex-col items-center rounded-[2.5rem] bg-brand-500 py-16 text-center shadow-2xl transition-transform duration-300 " +
              (flash ? "scale-105" : "scale-100")
            }
          >
            <p className="text-2xl font-medium uppercase tracking-widest text-white/70">Turno</p>
            {current ? (
              <>
                <p className="my-4 text-[10rem] font-black leading-none tracking-tight">{current.numero}</p>
                <p className="text-4xl font-semibold">{current.cliente}</p>
                <p className="mt-3 text-2xl text-white/80">Pasar a {queue.nombre}</p>
              </>
            ) : (
              <p className="my-10 text-5xl font-bold text-white/80">En espera</p>
            )}
          </div>
        </div>

        {/* Next tickets */}
        <div className="flex flex-1 flex-col rounded-[2rem] bg-white/5 p-8">
          <h2 className="mb-6 text-2xl font-semibold uppercase tracking-wide text-white/60">Siguientes</h2>
          <div className="flex flex-1 flex-col gap-4">
            {queue.waiting.slice(0, 5).map((t, i) => (
              <div
                key={t.numero}
                className={
                  "flex items-center justify-between rounded-2xl px-6 py-4 " +
                  (i === 0 ? "bg-white/15" : "bg-white/5")
                }
              >
                <span className="text-4xl font-bold">{t.numero}</span>
                <span className="text-xl text-white/70">{t.cliente}</span>
              </div>
            ))}
            {queue.waiting.length === 0 && (
              <p className="mt-8 text-center text-xl text-white/50">No hay turnos en espera</p>
            )}
          </div>
        </div>
      </div>

      {/* Exit hint */}
      <Link
        to="/dashboard"
        className="absolute bottom-4 left-4 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/60 hover:bg-white/20"
      >
        Salir
      </Link>
    </div>
  );
});

export default DisplayScreen;
