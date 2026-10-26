import { useEffect, useRef } from "react";

interface InteractiveDotGridProps {
  dotGap?: number;
  baseRadius?: number;
  activeRadius?: number;
  glowDistance?: number;
  className?: string;
  dotColor?: string;
  activeDotColor?: string;
}

interface GridRunner {
  isHorizontal: boolean;
  col: number;
  row: number;
  length: number;
  startTime: number;
  duration: number;
}

/**
 * InteractiveDotGrid
 * Fondo cinemático inspirado en el patrón orgánico de puntos y runners láser:
 * - Matriz ortogonal de puntos con onda armónica orgánica continua (Simplex/harmonic drift).
 * - Los puntos nacen, respiran y se desvanecen en siluetas fluidas como en la referencia de video.
 * - Runners lineales: trazos rectos efímeros (horizontales y verticales) que conectan puntos de la grilla.
 * - Interacción por mouse: halo responsivo que intensifica la constelación local al pasar el cursor.
 * - 60 FPS garantizados, renderizado eficiente en canvas nativo con aceleración por hardware.
 */
export default function InteractiveDotGrid({
  dotGap = 26,
  baseRadius = 1.6,
  activeRadius = 3.4,
  glowDistance = 160,
  className = "",
  dotColor = "rgba(255, 255, 255, 0.05)",
  activeDotColor = "rgba(255, 255, 255, 0.96)",
}: InteractiveDotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let offsetX = 0;
    let offsetY = 0;

    const runners: GridRunner[] = [];

    // Coordenadas y suavizado del cursor
    const targetMouse = { x: -9999, y: -9999, active: false };
    const currentMouse = { x: -9999, y: -9999, intensity: 0 };

    /**
     * Evalúa el campo de onda orgánica para una coordenada de la grilla en el tiempo t.
     * Combina armónicos sinusoidales para generar una silueta fluida similar al video de referencia.
     */
    const evaluateField = (c: number, r: number, time: number): number => {
      const scale = 0.11;
      const t1 = time * 0.00032;
      const t2 = time * 0.00022;

      // Centros viajeros con trayectoria elíptica suave
      const cx1 = cols * (0.52 + 0.30 * Math.sin(t1 * 0.7));
      const cy1 = rows * (0.48 + 0.32 * Math.cos(t2 * 0.6));

      const cx2 = cols * (0.46 + 0.32 * Math.cos(t1 * 0.5 + 1.8));
      const cy2 = rows * (0.54 + 0.28 * Math.sin(t2 * 0.8 + 2.2));

      // Distancia normalizada a los focos de densidad
      const d1 = Math.hypot(c - cx1, (r - cy1) * 1.1) / (cols * 0.40);
      const d2 = Math.hypot(c - cx2, (r - cy2) * 1.1) / (cols * 0.44);

      // Modulación armónica para deformar los bordes en curvas vivas
      const undulation =
        Math.sin(c * scale + t1 * 1.4) * 0.38 +
        Math.cos(r * scale - t2 * 1.1) * 0.38 +
        Math.sin((c + r) * (scale * 0.65) + t1 * 0.9) * 0.32;

      const blob1 = Math.max(0, 1 - d1) + undulation * 0.35;
      const blob2 = Math.max(0, 1 - d2) - undulation * 0.30;

      return Math.max(0, Math.min(1, Math.max(blob1, blob2)));
    };

    /**
     * Genera un runner recto en una posición con alta densidad de puntos
     */
    const createRunner = (now: number, delayMs = 0): GridRunner => {
      const isHorizontal = Math.random() > 0.48;
      const length = 2 + Math.floor(Math.random() * 3); // 2 a 4 pasos de grilla

      // Buscar un punto donde la onda esté viva
      let col = Math.floor(Math.random() * Math.max(1, cols - (isHorizontal ? length : 1)));
      let row = Math.floor(Math.random() * Math.max(1, rows - (!isHorizontal ? length : 1)));

      // Intentar hasta 6 veces encontrar un punto dentro de la onda activa
      for (let attempt = 0; attempt < 6; attempt++) {
        const testCol = Math.floor(Math.random() * Math.max(1, cols - (isHorizontal ? length : 1)));
        const testRow = Math.floor(Math.random() * Math.max(1, rows - (!isHorizontal ? length : 1)));
        if (evaluateField(testCol, testRow, now) > 0.25) {
          col = testCol;
          row = testRow;
          break;
        }
      }

      return {
        isHorizontal,
        col,
        row,
        length,
        startTime: now + delayMs,
        duration: 800 + Math.random() * 850, // 800ms a 1650ms de vida
      };
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      height = rect.height;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);

      cols = Math.ceil(width / dotGap) + 1;
      rows = Math.ceil(height / dotGap) + 1;
      offsetX = (width - (cols - 1) * dotGap) / 2;
      offsetY = (height - (rows - 1) * dotGap) / 2;

      // Inicializar el pool de runners con cadencia escalonada
      runners.length = 0;
      const targetRunners = Math.min(7, Math.max(3, Math.floor((cols * rows) / 90)));
      const now = performance.now();

      for (let i = 0; i < targetRunners; i++) {
        runners.push(createRunner(now, i * 220 + Math.random() * 400));
      }
    };

    const draw = (now: number) => {
      if (!ctx || width === 0 || height === 0) return;

      ctx.clearRect(0, 0, width, height);

      // ── 1. DIBUJAR PUNTOS DE LA MALLA CON CAMPO ORGÁNICO ──
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = offsetX + i * dotGap;
          const y = offsetY + j * dotGap;

          // Intensidad base de la onda orgánica
          const fieldIntensity = evaluateField(i, j, now);

          // Influencia del cursor del mouse
          const dx = x - currentMouse.x;
          const dy = y - currentMouse.y;
          const dist = Math.hypot(dx, dy);

          let mouseFactor = 0;
          if (dist < glowDistance && currentMouse.intensity > 0.01) {
            const norm = 1 - dist / glowDistance;
            mouseFactor = Math.pow(norm, 2.0) * currentMouse.intensity;
          }

          // Combinar campo armónico con proximidad al cursor
          const combined = Math.min(1, fieldIntensity + mouseFactor * 0.95);

          // Umbral de visibilidad: fuera de la onda, los puntos son ultra sutiles
          if (combined < 0.12) {
            ctx.beginPath();
            ctx.arc(x, y, baseRadius * 0.75, 0, Math.PI * 2);
            ctx.shadowBlur = 0;
            ctx.shadowColor = "transparent";
            ctx.fillStyle = "rgba(255, 255, 255, 0.045)";
            ctx.fill();
            continue;
          }

          // Curva suave de opacidad (smoothstep)
          const normVal = (combined - 0.12) / 0.88;
          const alpha = 0.12 + Math.pow(normVal, 1.3) * 0.82;
          const radius = baseRadius + (activeRadius - baseRadius) * Math.pow(normVal, 1.5);
          const isHighLight = combined > 0.65 || mouseFactor > 0.25;

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);

          if (isHighLight) {
            ctx.shadowBlur = radius * 2.2;
            ctx.shadowColor = "rgba(255, 255, 255, 0.80)";
            ctx.fillStyle = activeDotColor;
          } else {
            ctx.shadowBlur = 0;
            ctx.shadowColor = "transparent";
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
          }

          ctx.fill();
        }
      }

      // ── 2. DIBUJAR TRAZOS RECTOS EFÍMEROS (GRID RUNNERS DEL VIDEO) ──
      for (let r = 0; r < runners.length; r++) {
        const runner = runners[r];
        if (now < runner.startTime) continue;

        const elapsed = now - runner.startTime;
        if (elapsed >= runner.duration) {
          // El runner terminó: generamos uno nuevo con un pequeño delay
          runners[r] = createRunner(now, 150 + Math.random() * 500);
          continue;
        }

        // Progreso normalizado de vida (0 -> 1)
        const p = elapsed / runner.duration;

        // Envolvente de opacidad: entrada rápida, reposo visible, desvanecimiento suave
        let runnerAlpha = 0;
        if (p < 0.22) {
          runnerAlpha = p / 0.22;
        } else if (p < 0.68) {
          runnerAlpha = 1.0;
        } else {
          runnerAlpha = (1.0 - p) / 0.32;
        }

        const startX = offsetX + runner.col * dotGap;
        const startY = offsetY + runner.row * dotGap;
        const endX = offsetX + (runner.isHorizontal ? runner.col + runner.length : runner.col) * dotGap;
        const endY = offsetY + (runner.isHorizontal ? runner.row : runner.row + runner.length) * dotGap;

        // Línea conectora sobre los rieles de la grilla
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `rgba(255, 255, 255, ${(runnerAlpha * 0.90).toFixed(3)})`;
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        ctx.shadowBlur = 5;
        ctx.shadowColor = "rgba(255, 255, 255, 0.75)";
        ctx.stroke();

        // Nodos iluminados en los extremos del runner
        ctx.beginPath();
        ctx.arc(startX, startY, baseRadius * 1.45, 0, Math.PI * 2);
        ctx.arc(endX, endY, baseRadius * 1.45, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(runnerAlpha * 0.98).toFixed(3)})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = "rgba(255, 255, 255, 0.85)";
        ctx.fill();

        ctx.restore();
      }
    };

    const loop = (time: number) => {
      // Suavizado cinemático del mouse (lerp)
      const lerpFactor = 0.15;
      currentMouse.x += (targetMouse.x - currentMouse.x) * lerpFactor;
      currentMouse.y += (targetMouse.y - currentMouse.y) * lerpFactor;

      const targetIntensity = targetMouse.active ? 1 : 0;
      currentMouse.intensity += (targetIntensity - currentMouse.intensity) * 0.12;

      draw(time);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouse.x = e.clientX - rect.left;
      targetMouse.y = e.clientY - rect.top;
      targetMouse.active = true;
    };

    const handleMouseLeave = () => {
      targetMouse.active = false;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener("mousemove", handleMouseMove, { passive: true });
      parent.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    }

    const resizeObserver = new ResizeObserver(handleResize);
    if (parent) {
      resizeObserver.observe(parent);
    }
    handleResize();

    return () => {
      cancelAnimationFrame(animId);
      if (parent) {
        parent.removeEventListener("mousemove", handleMouseMove);
        parent.removeEventListener("mouseleave", handleMouseLeave);
        resizeObserver.unobserve(parent);
      }
      resizeObserver.disconnect();
    };
  }, [dotGap, baseRadius, activeRadius, glowDistance, dotColor, activeDotColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    />
  );
}
