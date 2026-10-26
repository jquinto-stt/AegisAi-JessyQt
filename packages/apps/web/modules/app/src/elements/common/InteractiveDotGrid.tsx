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

interface DynamicLaserRay {
  nodes: ChainNode[];
  state: "unfolding" | "rest" | "folding" | "dead";
  stateStartTime: number;
  stepDuration: number;
  restDuration: number;
  lineWidth: number;
}

/**
 * InteractiveDotGrid
 *
 * Animación de ráfagas láser procedimentales:
 * 1. El lienzo arranca completamente limpio (cero puntos en pantalla).
 * 2. Un pulso láser se dispara desde el centro geométrico hacia el exterior en
 *    múltiples direcciones (horizontales, verticales y codos en ángulo recto).
 * 3. Al proyectarse como un láser veloz, va dejando a su paso los puntos encendidos.
 * 4. Reposa un instante breve (~300ms).
 * 5. Se repliega velozmente (el nodo anterior se absorbe en el siguiente como un láser
 *    que se recoge) hasta desaparecer por completo.
 * 6. Breve pausa en lienzo vacío y nuevo disparo con trayectorias renovadas.
 */
export default function InteractiveDotGrid({
  dotGap = 26,
  baseRadius = 2.0,
  activeRadius = 4.0,
  glowDistance = 160,
  className = "",
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

    let rays: DynamicLaserRay[] = [];
    let nextBurstTime = 0;

    // Mouse coordinates para interacción
    const targetMouse = { x: -9999, y: -9999, active: false };
    const currentMouse = { x: -9999, y: -9999, intensity: 0 };

    /**
     * Genera una ráfaga de rayos láser desde el centro hacia afuera.
     */
    const triggerLaserBurst = (now: number) => {
      if (cols <= 2 || rows <= 2) return;

      const centerCol = Math.floor(cols / 2);
      const centerRow = Math.floor(rows / 2);

      // Direcciones primarias de propagación radial sobre la grilla
      // (Horizontales, verticales y diagonales/L)
      const primaryDirections: Array<{ dc: number; dr: number }> = [
        { dc: 1, dr: 0 },   // Derecha
        { dc: -1, dr: 0 },  // Izquierda
        { dc: 0, dr: 1 },   // Abajo
        { dc: 0, dr: -1 },  // Arriba
        { dc: 1, dr: 1 },   // Abajo-Derecha
        { dc: -1, dr: 1 },  // Abajo-Izquierda
        { dc: 1, dr: -1 },  // Arriba-Derecha
        { dc: -1, dr: -1 }, // Arriba-Izquierda
        // Ángulos extra para enriquecer la ráfaga
        { dc: 1, dr: 0 },
        { dc: -1, dr: 0 },
        { dc: 0, dr: 1 },
        { dc: 0, dr: -1 },
      ];

      const newRays: DynamicLaserRay[] = [];

      primaryDirections.forEach((dir, idx) => {
        const length = 4 + Math.floor(Math.random() * 4); // 4 a 7 saltos
        const nodes: ChainNode[] = [
          {
            col: centerCol,
            row: centerRow,
            x: offsetX + centerCol * dotGap,
            y: offsetY + centerRow * dotGap,
          },
        ];

        let currC = centerCol;
        let currR = centerRow;

        // Comportamiento de trayectoria: línea recta o bifurcación en L
        const makesTurn = Math.random() > 0.45;
        const turnStep = 2 + Math.floor(Math.random() * 2);

        for (let s = 1; s < length; s++) {
          if (makesTurn && s >= turnStep) {
            // Gira en ángulo recto según la dirección principal
            if (dir.dc !== 0 && dir.dr === 0) {
              currR += Math.random() > 0.5 ? 1 : -1;
            } else if (dir.dr !== 0 && dir.dc === 0) {
              currC += Math.random() > 0.5 ? 1 : -1;
            } else {
              // Diagonal: avanza en uno de los dos ejes
              if (Math.random() > 0.5) currC += dir.dc;
              else currR += dir.dr;
            }
          } else {
            // Continúa en la dirección principal hacia el exterior
            if (dir.dc !== 0 && dir.dr !== 0) {
              // En diagonal avanza paso a paso ortogonalmente
              if (s % 2 === 0) currC += dir.dc;
              else currR += dir.dr;
            } else {
              currC += dir.dc;
              currR += dir.dr;
            }
          }

          currC = Math.max(0, Math.min(cols - 1, currC));
          currR = Math.max(0, Math.min(rows - 1, currR));

          nodes.push({
            col: currC,
            row: currR,
            x: offsetX + currC * dotGap,
            y: offsetY + currR * dotGap,
          });
        }

        // Ligero desfase de disparo para dinamismo (como chispas consecutivas del láser)
        const stagger = (idx % 4) * 25 + Math.random() * 30;

        newRays.push({
          nodes,
          state: "unfolding",
          stateStartTime: now + stagger,
          // Velocidad tipo láser: 70ms a 100ms por tramo (rápido y definido)
          stepDuration: 75 + Math.random() * 25,
          // Reposo breve para apreciar la figura formada
          restDuration: 300 + Math.random() * 250,
          lineWidth: 1.8 + Math.random() * 0.8,
        });
      });

      rays = newRays;
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

      // Iniciar el ciclo de disparo con un breve retardo inicial
      const now = performance.now();
      rays = [];
      nextBurstTime = now + 200;
    };

    const draw = (now: number) => {
      if (!ctx || width === 0 || height === 0) return;

      // Limpiar lienzo por completo: inicia en vacío/negro total (sin puntos de fondo)
      ctx.clearRect(0, 0, width, height);

      // Si no hay ráfaga activa y llegó la hora del próximo disparo, disparar
      const allDead = rays.length === 0 || rays.every((r) => r.state === "dead");
      if (allDead) {
        if (now >= nextBurstTime) {
          triggerLaserBurst(now);
        }
      }

      // Dibujar interacción sutil con el cursor si el usuario mueve el ratón
      if (currentMouse.intensity > 0.05) {
        const mouseCol = Math.round((currentMouse.x - offsetX) / dotGap);
        const mouseRow = Math.round((currentMouse.y - offsetY) / dotGap);

        if (mouseCol >= 0 && mouseCol < cols && mouseRow >= 0 && mouseRow < rows) {
          const mx = offsetX + mouseCol * dotGap;
          const my = offsetY + mouseRow * dotGap;
          ctx.beginPath();
          ctx.arc(mx, my, activeRadius * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = activeDotColor;
          ctx.shadowBlur = 8;
          ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
          ctx.fill();
        }
      }

      // ── ACTUALIZAR Y DIBUJAR RAYOS LÁSER Y SUS PUNTOS ──
      for (let c = 0; c < rays.length; c++) {
        const ray = rays[c];
        if (ray.state === "dead" || now < ray.stateStartTime) continue;

        const elapsed = now - ray.stateStartTime;
        const totalSteps = ray.nodes.length - 1;
        const totalStepTime = totalSteps * ray.stepDuration;

        // ── TRANSICIONES DE ESTADO ──
        if (ray.state === "unfolding") {
          if (elapsed >= totalStepTime) {
            ray.state = "rest";
            ray.stateStartTime = now;
          }
        } else if (ray.state === "rest") {
          if (elapsed >= ray.restDuration) {
            ray.state = "folding";
            ray.stateStartTime = now;
          }
        } else if (ray.state === "folding") {
          if (elapsed >= totalStepTime) {
            ray.state = "dead";

            // Si todos los rayos murieron, programar el próximo disparo desde el centro
            const anyAlive = rays.some((r) => r.state !== "dead");
            if (!anyAlive) {
              // Pausa con el lienzo completamente vacío antes del siguiente disparo láser
              nextBurstTime = now + 450;
            }
            continue;
          }
        }

        // ── RENDERIZADO DEL ESTADO ACTUAL ──
        if (ray.state === "unfolding") {
          // DESPLIEGUE LÁSER: El haz se dispara hacia afuera encendiendo puntos a su paso
          const stepIndex = Math.min(totalSteps - 1, Math.floor(elapsed / ray.stepDuration));
          const stepElapsed = elapsed - stepIndex * ray.stepDuration;
          const stepT = Math.min(1, stepElapsed / ray.stepDuration);

          const fromNode = ray.nodes[stepIndex];
          const toNode = ray.nodes[stepIndex + 1];

          // Posición del cabezal láser
          const headX = fromNode.x + (toNode.x - fromNode.x) * stepT;
          const headY = fromNode.y + (toNode.y - fromNode.y) * stepT;

          // 1. Puntos nacidos a lo largo de la trayectoria del láser
          for (let n = 0; n <= stepIndex; n++) {
            const node = ray.nodes[n];
            ctx.beginPath();
            ctx.arc(node.x, node.y, baseRadius * 1.3, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.shadowBlur = 6;
            ctx.shadowColor = "rgba(255, 255, 255, 0.75)";
            ctx.fill();
          }

          // 2. Haz de luz láser disparándose
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(fromNode.x, fromNode.y);
          ctx.lineTo(headX, headY);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
          ctx.lineWidth = ray.lineWidth;
          ctx.lineCap = "round";
          ctx.shadowBlur = 8;
          ctx.shadowColor = "rgba(255, 255, 255, 0.85)";
          ctx.stroke();
          ctx.restore();

          // 3. Destello en la punta del láser
          ctx.beginPath();
          ctx.arc(headX, headY, baseRadius * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
          ctx.fill();
        } else if (ray.state === "rest") {
          // REPOSO: Todos los puntos y la estructura brillan un instante
          for (let n = 0; n < ray.nodes.length; n++) {
            const node = ray.nodes[n];
            ctx.beginPath();
            ctx.arc(node.x, node.y, baseRadius * 1.3, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
            ctx.shadowBlur = 5;
            ctx.shadowColor = "rgba(255, 255, 255, 0.7)";
            ctx.fill();
          }
        } else if (ray.state === "folding") {
          // REPLIEGUE RÁPIDO: El haz y los puntos se recogen y se tragan hacia el siguiente nodo
          const stepIndex = Math.min(totalSteps - 1, Math.floor(elapsed / ray.stepDuration));
          const stepElapsed = elapsed - stepIndex * ray.stepDuration;
          const stepT = Math.min(1, stepElapsed / ray.stepDuration);

          const fromNode = ray.nodes[stepIndex];
          const toNode = ray.nodes[stepIndex + 1];

          // Posición del punto mientras se absorbe en el siguiente
          const curX = fromNode.x + (toNode.x - fromNode.x) * stepT;
          const curY = fromNode.y + (toNode.y - fromNode.y) * stepT;

          // 1. Línea que se retrae velozmente
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(curX, curY);
          ctx.lineTo(toNode.x, toNode.y);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
          ctx.lineWidth = ray.lineWidth;
          ctx.lineCap = "round";
          ctx.shadowBlur = 7;
          ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
          ctx.stroke();
          ctx.restore();

          // 2. Punto en movimiento
          ctx.beginPath();
          ctx.arc(curX, curY, baseRadius * 1.4, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.shadowBlur = 8;
          ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
          ctx.fill();

          // 3. Puntos restantes por ser absorbidos
          for (let n = stepIndex + 1; n < ray.nodes.length; n++) {
            const node = ray.nodes[n];
            ctx.beginPath();
            ctx.arc(node.x, node.y, baseRadius * 1.3, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
            ctx.shadowBlur = 4;
            ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
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
  }, [dotGap, baseRadius, activeRadius, glowDistance, activeDotColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none z-0 ${className}`}
      aria-hidden="true"
    />
  );
}
