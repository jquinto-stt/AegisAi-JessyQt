import React, { useEffect, useRef } from "react";

interface InteractiveDotGridProps {
  dotGap?: number;
  baseRadius?: number;
  activeRadius?: number;
  glowDistance?: number;
  className?: string;
  dotColor?: string;
  activeDotColor?: string;
}

/**
 * InteractiveDotGrid
 * Recrea la experiencia de Google Stitch: mosaico de punticos que se iluminan
 * fluidamente con efecto estelar al pasar el cursor del mouse.
 */
export default function InteractiveDotGrid({
  dotGap = 26,
  baseRadius = 2.1,
  activeRadius = 4.2,
  glowDistance = 170,
  className = "",
  dotColor = "rgba(255, 255, 255, 0.18)",
  activeDotColor = "rgba(255, 255, 255, 0.95)",
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

    // Mouse positions for smooth lerp
    const targetMouse = { x: -9999, y: -9999, active: false };
    const currentMouse = { x: -9999, y: -9999, intensity: 0 };

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
      draw();
    };

    const draw = () => {
      if (!ctx || width === 0 || height === 0) return;

      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / dotGap) + 1;
      const rows = Math.ceil(height / dotGap) + 1;

      // Center the grid symmetrically
      const offsetX = (width - (cols - 1) * dotGap) / 2;
      const offsetY = (height - (rows - 1) * dotGap) / 2;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = offsetX + i * dotGap;
          const y = offsetY + j * dotGap;

          const dx = x - currentMouse.x;
          const dy = y - currentMouse.y;
          const dist = Math.hypot(dx, dy);

          let radius = baseRadius;
          let alpha = 0.18;
          let isGlowing = false;

          if (dist < glowDistance && currentMouse.intensity > 0.01) {
            // Smooth bell curve falloff
            const norm = 1 - dist / glowDistance;
            const factor = Math.pow(norm, 2.2) * currentMouse.intensity;

            radius = baseRadius + (activeRadius - baseRadius) * factor;
            alpha = 0.18 + (0.95 - 0.18) * factor;

            if (factor > 0.35) {
              isGlowing = true;
            }
          }

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);

          if (isGlowing) {
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
    };

    let isRunning = false;

    const loop = () => {
      // Lerp mouse coordinates towards target
      const lerpFactor = 0.16;
      currentMouse.x += (targetMouse.x - currentMouse.x) * lerpFactor;
      currentMouse.y += (targetMouse.y - currentMouse.y) * lerpFactor;

      const targetIntensity = targetMouse.active ? 1 : 0;
      currentMouse.intensity += (targetIntensity - currentMouse.intensity) * 0.12;

      draw();

      const isStillMoving =
        Math.hypot(targetMouse.x - currentMouse.x, targetMouse.y - currentMouse.y) > 0.3 ||
        Math.abs(targetIntensity - currentMouse.intensity) > 0.005;

      if (isStillMoving || targetMouse.active) {
        animId = requestAnimationFrame(loop);
      } else {
        isRunning = false;
      }
    };

    const startLoop = () => {
      if (!isRunning) {
        isRunning = true;
        animId = requestAnimationFrame(loop);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      targetMouse.x = e.clientX - rect.left;
      targetMouse.y = e.clientY - rect.top;
      targetMouse.active = true;
      startLoop();
    };

    const handleMouseLeave = () => {
      targetMouse.active = false;
      startLoop();
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
