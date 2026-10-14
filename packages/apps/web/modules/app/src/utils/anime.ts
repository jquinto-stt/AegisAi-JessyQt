import { cubicBezier } from "animejs";
import type { EasingFunction } from "animejs";

import { CURVA_PUNTOS } from "@/utils";

// ═══════════════════════════════════════════════════════════════════════════
// ANIME.JS — la puerta única
// ═══════════════════════════════════════════════════════════════════════════
//
// Este archivo es el **único sitio del proyecto que habla con anime.js**. No es
// una regla de estilo: es lo que hace que la librería no se desparrame.
//
// ── Por qué una puerta y no importar `animejs` donde haga falta ────────────
//
// Porque hay TRES reglas del proyecto que una llamada suelta se salta sin que
// nada avise:
//
//   1. **`prefers-reduced-motion`.** anime.js NO la respeta por su cuenta. Las
//      animaciones de `css/theme.css` las neutraliza la guarda de `css/base.css`,
//      pero una animación que corre por JS no pasa por ahí. Todo lo que anime
//      desde JS tiene que consultar `prefiereMenosMovimiento()` antes, y ese
//      olvido no da error: da una animación que se mueve para quien pidió que no
//      se moviera nada.
//   2. **La curva.** Es una sola para todo el producto. Si cada pantalla pasara
//      la suya, el movimiento dejaría de leerse como un sistema.
//   3. **El escalonado.** El paso y el tope son una decisión única
//      (`PASO_ESCALONADO_MS`, `TOPE_ESCALONADO`), compartida con el motor CSS.
//
// Lo que SÍ se importa directo desde `animejs` en los consumidores son los
// tipos y las utilidades puras (`stagger`, `utils`), que no animan nada por sí
// solos. Lo que pasa por aquí es lo que MUEVE.
//
// ── Por qué la curva se compone, no se copia ──────────────────────────────
//
// `CURVA_ASENTAR` es la curva del tema en forma de cadena, que es lo que come la
// Web Animations API. anime.js quiere una función, así que la construye a partir
// de **los mismos cuatro puntos** (`CURVA_PUNTOS`) y no de una cadena repetida.
// Medido: `cubicBezier(0.22, 1, 0.36, 1)` vale 0,9614 a mitad de tiempo, el
// mismo 96,1 % que documenta `CURVA_ASENTAR`. Una sola fuente, dos formas.
export const CURVA_ANIME: EasingFunction = cubicBezier(...CURVA_PUNTOS);
