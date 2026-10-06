"""Corrige los valores de color de los SVG del logotipo NECTO.

No toca geometria: solo sustituye valores de `fill` por los medidos en el
manual de marca (`Esencia_necto/`, pag. G).

  · naranja  #FF3F1A -> #FF3C10   (desvio R+3, G+3, B+10)
  · indigo   #190088 -> #15008B   (desvio R-4, G 0, B+3)

Y en la variante para fondo oscuro, el manual (pag. D/E) pide:

  · wordmark y «grow together»  #ECECEC  (gris claro, NO blanco puro)
  · punto del N                 #FF3C10  (el acento; nunca se blanquea)

El punto del N es el path del grupo del wordmark cuyo `d` empieza por
`M22.8045 1.92936` (x 13,1-22,8 / y 0,4-5,8: el bloque superior derecho de la N).
"""

import sys
from pathlib import Path

RAIZ = Path(
    r"C:\Users\Jessy\Documents\GitHub\StockFlow\packages\apps\web\modules\app"
    r"\public\images\logo"
)

NARANJA_VIEJO, NARANJA_NUEVO = "#FF3F1A", "#FF3C10"
INDIGO_VIEJO, INDIGO_NUEVO = "#190088", "#15008B"

fallos = []


def sustituir(ruta: Path, cambios: list[tuple[str, str, int]]) -> None:
    """Aplica `cambios` = [(viejo, nuevo, veces_esperadas)] y verifica el recuento."""
    texto = ruta.read_text(encoding="utf-8")
    for viejo, nuevo, esperado in cambios:
        real = texto.count(viejo)
        if real != esperado:
            fallos.append(f"{ruta.name}: esperaba {esperado}x {viejo}, hay {real}")
            continue
        texto = texto.replace(viejo, nuevo)
        print(f"  {ruta.name}: {real}x {viejo} -> {nuevo}")
    ruta.write_text(texto, encoding="utf-8")


# ── 1. Lockup principal (naranja + indigo) ──────────────────────────────────
print("necto-full.svg")
sustituir(
    RAIZ / "necto-full.svg",
    [(NARANJA_VIEJO, NARANJA_NUEVO, 5), (INDIGO_VIEJO, INDIGO_NUEVO, 13)],
)

# ── 2. Isotipo suelto ───────────────────────────────────────────────────────
print("necto-icon.svg")
sustituir(
    RAIZ / "necto-icon.svg",
    [(NARANJA_VIEJO, NARANJA_NUEVO, 1), (INDIGO_VIEJO, INDIGO_NUEVO, 1)],
)

# ── 3. Variante para fondo oscuro ───────────────────────────────────────────
print("necto-full-white.svg")
ruta = RAIZ / "necto-full-white.svg"
texto = ruta.read_text(encoding="utf-8")

# 3a. El punto del N -> naranja de marca. Se localiza por su path, no por orden.
marca = 'd="M22.8045 1.92936'
if marca not in texto:
    fallos.append("necto-full-white.svg: no encontre el path del punto del N")
else:
    antes = texto.count('fill="#FFFFFF"')
    cabeza, cola = texto.split(marca, 1)
    cola = cola.replace('fill="#FFFFFF"', f'fill="{NARANJA_NUEVO}"', 1)
    texto = cabeza + marca + cola
    despues = texto.count('fill="#FFFFFF"')
    print(f"  punto del N: #FFFFFF -> {NARANJA_NUEVO} (quedan {despues} de {antes})")
    if despues != antes - 1:
        fallos.append("necto-full-white.svg: no sustitui exactamente un fill del punto")

# 3b. El resto (wordmark + «grow together») -> gris claro del manual.
resto = texto.count('fill="#FFFFFF"')
texto = texto.replace('fill="#FFFFFF"', 'fill="#ECECEC"')
print(f"  wordmark y «grow together»: {resto}x #FFFFFF -> #ECECEC")
ruta.write_text(texto, encoding="utf-8")

# ── Verificacion final ──────────────────────────────────────────────────────
print("\n--- recuento final ---")
for nombre in ("necto-full.svg", "necto-icon.svg", "necto-full-white.svg"):
    t = (RAIZ / nombre).read_text(encoding="utf-8")
    viejos = t.count(NARANJA_VIEJO) + t.count(INDIGO_VIEJO)
    print(
        f"  {nombre:24s} naranja={t.count(NARANJA_NUEVO)} indigo={t.count(INDIGO_NUEVO)} "
        f"gris_claro={t.count('#ECECEC')} blancos={t.count('#FFFFFF')} viejos={viejos}"
    )

if fallos:
    print("\nFALLOS:")
    for f in fallos:
        print("  -", f)
    sys.exit(1)
print("\nOK")
