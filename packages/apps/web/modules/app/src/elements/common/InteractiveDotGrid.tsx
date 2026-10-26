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

interface ChainNode {
  x: number;
  y: number;
  col: number;
  row: number;
}

interface DynamicDotChain {
  nodes: ChainNode[];
  state: "unfolding" | "rest" | "folding";
  stateStartTime: number;
  stepDuration: number;
  restDuration: number;
}

/**
 * InteractiveDotGrid
 * Fondo estelar procedimental 100% dinámico:
 * - Cadenas orgánicas efímeras que se generan en posiciones, direcciones y formas aleatorias.
 * - Soporta trazos rectos (horizontales, verticales) y giros en ángulo recto (L-shapes).
 * - Secuencia de vida:
 *     1. Despliegue: Se proyecta la línea y van brotando los puntos sucesivamente (1 -> 2 -> 3).
 *     2. Respiro: Permanece visible un instante.
 *     3. Recogida: El punto 1 se desplaza sobre la línea y se mete en el punto 2, el 2 en el 3, etc.
 *     4. Regeneración: Al extinguirse, nace una nueva cadena en una coordenada totalmente distinta.
 * - Puntos y líneas siempre en blanco puro translúcido con sutil resplandor.
 */
export default function InteractiveDotGrid({
  dotGap = 26,
  baseRadius = 1.9,
  activeRadius = 4.2,
  glowDistance = 170,
  className = "",
  dotColor = "rgba(255, 255, 255, 0.22)",
  activeDotColor = "rgba(255, 255, 255, 0.98)",
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

    const chains: DynamicDotChain[] = [];

    // Mouse coordinates
    const targetMouse = { x: -9999, y: -9999, active: false };
    const currentMouse = { x: -9999, y: -9999, intensity: 0 };

    /**
     * Generador procedimental de cadenas sobre la grilla:
     * Elige caminos rectos o giros en "L", asegurando que nunca se repita la misma trayectoria.
     */
    const createRandomChain = (now: number, delayMs = 0): DynamicDotChain => {
      const length = 3 + Math.floor(Math.random() * 3); // 3 a 5 puntos
      const patternType = Math.random(); // 0-0.4: horizontal, 0.4-0.8: vertical, 0.8-1.0: codo en L

      // Punto inicial aleatorio
      let c = Math.floor(Math.random() * Math.max(1, cols - 1));
      let r = Math.floor(Math.random() * Math.max(1, rows - 1));

      const nodes: ChainNode[] = [{
        col: c,
        row: r,
        x: offsetX + c * dotGap,
        y: offsetY + r * dotGap,
      }];

      if (patternType < 0.42) {
        // Horizontal pura (hacia la derecha o hacia la izquierda)
        const dir = Math.random() > 0.5 ? 1 : -1;
        for (let i = 1; i < length; i++) {
          c = Math.max(0, Math.min(cols - 1, c + dir));
          nodes.push({
            col: c,
            row: r,
            x: offsetX + c * dotGap,
            y: offsetY + r * dotGap,
          });
        }
      } else if (patternType < 0.84) {
        // Vertical pura (hacia abajo o hacia arriba)
        const dir = Math.random() > 0.5 ? 1 : -1;
        for (let i = 1; i < length; i++) {
          r = Math.max(0, Math.min(rows - 1, r + dir));
          nodes.push({
            col: c,
            row: r,
            x: offsetX + c * dotGap,
            y: offsetY + r * dotGap,
          });
        }
      } else {
        // Giro en L o codo sobre la grilla
        const firstSegment = 1 + Math.floor(Math.random() * 2);
        const dirH = Math.random() > 0.5 ? 1 : -1;
        const dirV = Math.random() > 0.5 ? 1 : -1;

        for (let i = 1; i <= firstSegment && nodes.length < length; i++) {
          c = Math.max(0, Math.min(cols - 1, c + dirH));
          nodes.push({
            col: c,
            row: r,
            x: offsetX + c * dotGap,
            y: offsetY + r * dotGap,
          });
        }
        while (nodes.length < length) {
          r = Math.max(0, Math.min(rows - 1, r + dirV));
          nodes.push({
            col: c,
            row: r,
            x: offsetX + c * dotGap,
            y: offsetY + r * dotGap,
          });
        }
      }

      // 50% de probabilidad de invertir el sentido de despliegue
      if (Math.random() > 0.5) {
        nodes.reverse();
      }

      return {
        nodes,
        state: "unfolding",
        stateStartTime: now + delayMs,
        stepDuration: 280 + Math.random() * 140, // 280ms a 420ms por nodo (ritmo fluido y perceptible)
        restDuration: 700 + Math.random() * 900,  // 0.7s a 1.6s en reposo visible
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

      // Inicializar el pool dinámico con desfase temporal
      chains.length = 0;
      const targetChains = Math.min(16, Math.max(7, Math.floor((cols * rows) / 50)));
      const now = performance.now();

      for (let i = 0; i < targetChains; i++) {
        // Distribuimos el inicio de las cadenas en el tiempo para que no empiecen a la vez
        chains.push(createRandomChain(now, i * 280 + Math.random() * 400));
      }
    };

    const draw = (now: number) => {
      if (!ctx || width === 0 || height === 0) return;

      ctx.clearRect(0, 0, width, height);

      // ── 1. DIBUJAR MATRIZ DE PUNTOS TENUES DE FONDO ──
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = offsetX + i * dotGap;
          const y = offsetY + j * dotGap;

          const dx = x - currentMouse.x;
          const dy = y - currentMouse.y;
          const dist = Math.hypot(dx, dy);

          let radius = baseRadius;
          let alpha = 0.18;
          let isHover = false;

          if (dist < glowDistance && currentMouse.intensity > 0.01) {
            const norm = 1 - dist / glowDistance;
            const factor = Math.pow(norm, 2.2) * currentMouse.intensity;
            radius = baseRadius + (activeRadius - baseRadius) * factor;
            alpha = 0.18 + (0.95 - 0.18) * factor;
            if (factor > 0.3) isHover = true;
          }

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);

          if (isHover) {
            ctx.shadowBlur = activeRadius * 1.5;
            ctx.shadowColor = "rgba(255, 255, 255, 0.75)";
            ctx.fillStyle = activeDotColor;
          } else {
            ctx.shadowBlur = 0;
            ctx.shadowColor = "transparent";
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
          }

          ctx.fill();
        }
      }

      // ── 2. ACTUALIZAR Y DIBUJAR CADENAS DINÁMICAS (EL 1 SE METE EN EL 2, REPLIEGUE Y RENACIMIENTO) ──
      for (let c = 0; c < chains.length; c++) {
        const chain = chains[c];
        if (now < chain.stateStartTime) continue;

        const elapsed = now - chain.stateStartTime;
        const totalSteps = chain.nodes.length - 1;
        const totalStepTime = totalSteps * chain.stepDuration;

        // ── TRANSICIONES DE ESTADO ──
        if (chain.state === "unfolding") {
          if (elapsed >= totalStepTime) {
            chain.state = "rest";
            chain.stateStartTime = now;
          }
        } else if (chain.state === "rest") {
          if (elapsed >= chain.restDuration) {
            chain.state = "folding";
            chain.stateStartTime = now;
          }
        } else if (chain.state === "folding") {
          if (elapsed >= totalStepTime) {
            // ¡La cadena murió! Se engendra de inmediato una NUEVA cadena en otra posición y forma
            chains[c] = createRandomChain(now, 200 + Math.random() * 600);
            continue;
          }
        }

        // ── RENDERIZADO DEL ESTADO ACTUAL ──
        if (chain.state === "unfolding") {
          // DESPLIEGUE: Se proyecta la línea y van naciendo los puntos (1 -> 2 -> 3)
          const stepIndex = Math.min(totalSteps - 1, Math.floor(elapsed / chain.stepDuration));
          const stepElapsed = elapsed - stepIndex * chain.stepDuration;
          const stepT = Math.min(1, stepElapsed / chain.stepDuration);

          const fromNode = chain.nodes[stepIndex];
          const toNode = chain.nodes[stepIndex + 1];

          // Posición del cabezal de luz viajero
          const headX = fromNode.x + (toNode.x - fromNode.x) * stepT;
          const headY = fromNode.y + (toNode.y - fromNode.y) * stepT;

          // 1. Dibujar puntos ya nacidos
          for (let n = 0; n <= stepIndex; n++) {
            const node = chain.nodes[n];
            ctx.beginPath();
            ctx.arc(node.x, node.y, baseRadius * 1.35, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
            ctx.shadowBlur = 4;
            ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
            ctx.fill();
          }

          // 2. Línea proyectándose hacia el siguiente punto
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          ctx.lineTo(headX, headY);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
          ctx.lineWidth = 2.0;
          ctx.lineCap = "round";
          ctx.shadowBlur = 5;
          ctx.shadowColor = "rgba(255, 255, 255, 0.7)";
          ctx.stroke();
          ctx.restore();

          // 3. Cabezal de luz
          ctx.beginPath();
          ctx.arc(headX, headY, baseRadius * 1.45, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
          ctx.shadowBlur = 6;
          ctx.shadowColor = "rgba(255, 255, 255, 0.85)";
          ctx.fill();
        } else if (chain.state === "rest") {
          // REPOSO: Todos los puntos de la cadena brillan conectados suavemente
          for (let n = 0; n < chain.nodes.length; n++) {
            const node = chain.nodes[n];
            ctx.beginPath();
            ctx.arc(node.x, node.y, baseRadius * 1.35, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
            ctx.shadowBlur = 4;
            ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
            ctx.fill();
          }
        } else if (chain.state === "folding") {
          // RECOGIDA: El punto k se desplaza por la línea y se mete dentro de k+1
          const stepIndex = Math.min(totalSteps - 1, Math.floor(elapsed / chain.stepDuration));
          const stepElapsed = elapsed - stepIndex * chain.stepDuration;
          const stepT = Math.min(1, stepElapsed / chain.stepDuration);

          const fromNode = chain.nodes[stepIndex];
          const toNode = chain.nodes[stepIndex + 1];

          // Posición del punto mientras se mete en el siguiente
          const curX = fromNode.x + (toNode.x - fromNode.x) * stepT;
          const curY = fromNode.y + (toNode.y - fromNode.y) * stepT;

          // 1. Línea que se recoge hacia el punto destino
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(curX, curY);
          ctx.lineTo(toNode.x, toNode.y);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
          ctx.lineWidth = 2.0;
          ctx.lineCap = "round";
          ctx.shadowBlur = 5;
          ctx.shadowColor = "rgba(255, 255, 255, 0.7)";
          ctx.stroke();
          ctx.restore();

          // 2. Punto viajero que se mete en el siguiente
          ctx.beginPath();
          ctx.arc(curX, curY, baseRadius * 1.45, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
          ctx.shadowBlur = 6;
          ctx.shadowColor = "rgba(255, 255, 255, 0.85)";
          ctx.fill();

          // 3. Puntos restantes esperando a ser recogidos
          for (let n = stepIndex + 1; n < chain.nodes.length; n++) {
            const node = chain.nodes[n];
            ctx.beginPath();
            ctx.arc(node.x, node.y, baseRadius * 1.35, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
            ctx.shadowBlur = 3;
            ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
            ctx.fill();
          }
        }
      }
    };

    const loop = (time: number) => {
      const lerpFactor = 0.16;
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
