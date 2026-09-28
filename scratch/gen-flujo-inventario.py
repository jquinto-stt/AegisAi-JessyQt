# -*- coding: utf-8 -*-
"""
Genera 'Módulo de Inventario — Diagramas de flujo' (HTML autocontenido, imprimible a A4).

El contenido refleja el código real de packages/apps/web/modules/app/src.
Paleta NECTO reponderada: índigo = trazado normal, celeste = acento de marca,
naranja = SOLO excepción (y aquí, además, todo lo que todavía no está implementado).
"""
import os

# Paleta NECTO, reponderada.
#   · El acento ESTRUCTURAL es el INDIGO: todo el trazado normal del flujo
#     (procesos, decisiones, flechas, numeración, filete de título).
#   · El CELESTE da el acento de marca: inicio/fin, carriles, etiquetas.
#   · El NARANJA queda RESERVADO a excepción: cancelar, reintentar, error, y
#     la deuda visible.
INDIGO    = "#15008B"
INDIGO_M  = "#7A71C4"
INDIGO_L  = "#F0EEFB"
INK       = "#1D3261"
BODY      = "#535250"
CELESTE   = "#71D6E0"
CELESTE_D = "#12808D"
CELESTE_L = "#E9F9FB"
GRAY      = "#F4F4F7"
GRAYB     = "#D6D6DE"
ORANGE    = "#FF3C10"   # SOLO excepción / deuda
PEACH     = "#FFF4F0"   # fondo de excepción / deuda
WHITE     = "#FFFFFF"

U = {"id": 0}
FONT = "Inter, 'Segoe UI', system-ui, -apple-system, sans-serif"


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def begin(w, h):
    U["id"] += 1
    i = U["id"]
    head = (
        '<svg class="dia" viewBox="0 0 %d %d" xmlns="http://www.w3.org/2000/svg" '
        'font-family="%s" role="img">' % (w, h, FONT)
    )
    defs = (
        '<defs>'
        '<marker id="a%d" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="7" markerHeight="7" '
        'orient="auto-start-reverse"><path d="M0.5 1 L9.5 5 L0.5 9 z" fill="%s"/></marker>'
        '<marker id="b%d" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="7" markerHeight="7" '
        'orient="auto-start-reverse"><path d="M0.5 1 L9.5 5 L0.5 9 z" fill="%s"/></marker>'
        '<marker id="o%d" viewBox="0 0 10 10" refX="9.5" refY="5" markerWidth="7" markerHeight="7" '
        'orient="auto-start-reverse"><path d="M0.5 1 L9.5 5 L0.5 9 z" fill="%s"/></marker>'
        '</defs>'
    ) % (i, INK, i, INDIGO, i, ORANGE)
    return head + defs


def MK(kind="ink"):
    i = U["id"]
    return {"ink": "a%d", "indigo": "b%d", "orange": "o%d"}[kind] % i


def T(x, y, s, size=13, fill=INK, w=400, anchor="middle", ls="0"):
    return (
        '<text x="%.1f" y="%.1f" font-size="%s" fill="%s" font-weight="%s" '
        'text-anchor="%s" letter-spacing="%s">%s</text>' % (x, y, size, fill, w, anchor, ls, esc(s))
    )


def TB(cx, cy, lines, size=13, fill=INK, w=400, lh=None):
    lh = lh or (size + 3.5)
    n = len(lines)
    y0 = cy - (n - 1) * lh / 2.0
    out = []
    for k, l in enumerate(lines):
        out.append(T(cx, y0 + k * lh + size * 0.34, l, size, fill, w))
    return "".join(out)


def rect(x, y, w, h, r=10, fill=WHITE, stroke=INDIGO, sw=1.6, dash=None):
    d = ' stroke-dasharray="%s"' % dash if dash else ""
    return ('<rect x="%.1f" y="%.1f" width="%.1f" height="%.1f" rx="%s" fill="%s" '
            'stroke="%s" stroke-width="%s"%s/>' % (x, y, w, h, r, fill, stroke, sw, d))


def dia_shape(x, y, w, h, fill="#F3F1FC", stroke=INDIGO, sw=1.6, dash=None):
    p = "%.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f" % (
        x + w / 2, y, x + w, y + h / 2, x + w / 2, y + h, x, y + h / 2)
    d = ' stroke-dasharray="%s"' % dash if dash else ""
    return '<polygon points="%s" fill="%s" stroke="%s" stroke-width="%s"%s/>' % (p, fill, stroke, sw, d)


def para_shape(x, y, w, h, s=16, fill=WHITE, stroke=INDIGO, sw=1.6):
    p = "%.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f" % (
        x + s, y, x + w, y, x + w - s, y + h, x, y + h)
    return '<polygon points="%s" fill="%s" stroke="%s" stroke-width="%s"/>' % (p, fill, stroke, sw)


def elbow(pts, r=12, dash=None, color=INK, kind="ink", label=None, lx=None, ly=None,
          lanchor="middle", lcolor=None, arrow=True):
    d = "M %.1f %.1f" % (pts[0][0], pts[0][1])
    for k in range(1, len(pts) - 1):
        p0, p1, p2 = pts[k - 1], pts[k], pts[k + 1]
        v1 = (p1[0] - p0[0], p1[1] - p0[1])
        v2 = (p2[0] - p1[0], p2[1] - p1[1])
        l1 = max(abs(v1[0]), abs(v1[1]))
        l2 = max(abs(v2[0]), abs(v2[1]))
        if l1 == 0 or l2 == 0:
            d += " L %.1f %.1f" % (p1[0], p1[1])
            continue
        rr = min(r, l1 / 2.0, l2 / 2.0)
        a = (p1[0] - v1[0] / l1 * rr, p1[1] - v1[1] / l1 * rr)
        b = (p1[0] + v2[0] / l2 * rr, p1[1] + v2[1] / l2 * rr)
        d += " L %.1f %.1f Q %.1f %.1f %.1f %.1f" % (a[0], a[1], p1[0], p1[1], b[0], b[1])
    d += " L %.1f %.1f" % (pts[-1][0], pts[-1][1])
    ds = ' stroke-dasharray="%s"' % dash if dash else ""
    mk = ' marker-end="url(#%s)"' % MK(kind) if arrow else ""
    out = '<path d="%s" fill="none" stroke="%s" stroke-width="1.5"%s%s/>' % (d, color, ds, mk)
    if label:
        out += T(lx if lx is not None else pts[0][0],
                 ly if ly is not None else pts[0][1],
                 label, 11, lcolor or BODY, 500)
    return out


def line(x1, y1, x2, y2, color=GRAYB, dash=None, sw=1.3):
    ds = ' stroke-dasharray="%s"' % dash if dash else ""
    return ('<line x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="%s" stroke-width="%s"%s/>'
            % (x1, y1, x2, y2, color, sw, ds))


def node(x, y, w, h, title, sub=None, kind="process"):
    """kind: process | start | io | terminal | note | warn"""
    t = title if isinstance(title, list) else [title]
    s = [sub] if isinstance(sub, str) else (sub or [])
    if kind == "start":
        g = rect(x, y, w, h, h / 2.0, CELESTE_L, CELESTE_D, 1.6)
        fill_t, fill_s = INDIGO, BODY
    elif kind == "io":
        g = para_shape(x, y, w, h)
        fill_t, fill_s = INDIGO, BODY
    elif kind == "terminal":
        g = rect(x, y, w, h, 10, INDIGO, INDIGO, 1.6)
        fill_t, fill_s = "#FFFFFF", "#CFC7F2"
    elif kind == "note":
        g = rect(x, y, w, h, 8, GRAY, GRAYB, 1.2, dash="5 4")
        fill_t, fill_s = BODY, BODY
    elif kind == "warn":
        g = rect(x, y, w, h, 8, CELESTE_L, CELESTE_D, 1.3)
        fill_t, fill_s = "#0E6B75", "#3E7C84"
    elif kind == "deuda":
        g = rect(x, y, w, h, 8, PEACH, ORANGE, 1.3, dash="5 4")
        fill_t, fill_s = "#A32A0A", "#B4553A"
    else:
        g = rect(x, y, w, h, 10, WHITE, INDIGO, 1.6)
        fill_t, fill_s = INDIGO, BODY

    ts, ss = 13.5, 11
    th = len(t) * (ts + 3.5)
    sh = len(s) * (ss + 3) + (5 if s else 0)
    total = th + sh
    top = y + h / 2.0 - total / 2.0
    cx = x + w / 2.0
    g += TB(cx, top + th / 2.0, t, ts, fill_t, 600)
    if s:
        g += TB(cx, top + th + 5 + sh / 2.0, s, ss, fill_s, 400)
    return g


def diamond(x, y, w, h, title, sub=None, kind="decision"):
    g = dia_shape(x, y, w, h)
    t = title if isinstance(title, list) else [title]
    s = [sub] if isinstance(sub, str) else (sub or [])
    cx = x + w / 2.0
    if s:
        g += TB(cx, y + h / 2.0 - 9, t, 13, INDIGO, 600)
        g += TB(cx, y + h / 2.0 + 12, s, 10.5, BODY, 400)
    else:
        g += TB(cx, y + h / 2.0, t, 13, INDIGO, 600)
    return g


def end():
    return "</svg>"


# ══════════════════════════════════════════════════════════════════════════
# D0 · Leyenda
# ══════════════════════════════════════════════════════════════════════════
def d_leyenda():
    s = [begin(940, 86)]
    items = [
        ("start", "Inicio / fin"),
        ("process", "Paso"),
        ("decision", "Decisión"),
        ("io", "Dato o elección"),
        ("terminal", "Estado final"),
        ("note", "Nota"),
    ]
    x = 14
    for kind, label in items:
        if kind == "decision":
            s.append(dia_shape(x + 6, 16, 66, 42))
        elif kind == "io":
            s.append(para_shape(x + 2, 18, 74, 38, 11))
        elif kind == "start":
            s.append(rect(x + 4, 16, 70, 42, 21, CELESTE_L, CELESTE_D))
        elif kind == "terminal":
            s.append(rect(x + 4, 16, 70, 42, 9, INDIGO, INDIGO))
        elif kind == "note":
            s.append(rect(x + 4, 16, 70, 42, 8, GRAY, GRAYB, 1.2, dash="5 4"))
        else:
            s.append(rect(x + 4, 16, 70, 42, 9))
        s.append(T(x + 39, 74, label, 11, BODY, 500))
        x += 133
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D1 · Arranque y entrada al módulo
# ══════════════════════════════════════════════════════════════════════════
def d_arranque():
    s = [begin(900, 790)]
    s.append(node(290, 20, 180, 44, "Login  /login", kind="start"))
    s.append(elbow([(380, 64), (380, 94)]))

    s.append(diamond(230, 94, 300, 92, ["¿Ya existe un espacio", "configurado?"]))
    s.append(T(396, 208, "No", 11.5, BODY, 600, anchor="start"))
    s.append(elbow([(380, 186), (380, 218)]))

    s.append(rect(210, 218, 340, 262, 12, "#FBFAFE", GRAYB, 1.3, dash="6 5"))
    s.append(T(380, 242, "Onboarding  ·  solo el administrador", 11, BODY, 600))
    pasos = ["1 · Perfil", "2 · Organización", "3 · Módulos", "4 · Inventario (rubro y agentes)",
             "5 · Encuesta final"]
    y = 258
    for p in pasos:
        s.append(node(240, y, 280, 38, p))
        if p is not pasos[-1]:
            s.append(elbow([(380, y + 38), (380, y + 44)]))
        y += 44

    s.append(T(566, 132, "Sí", 11.5, BODY, 600, anchor="start"))
    s.append(elbow([(530, 140), (790, 140), (790, 500), (386, 500)]))
    s.append(elbow([(380, 480), (380, 500)]))

    s.append(diamond(230, 500, 300, 92, ["¿El módulo «Inventario»", "está activo?"]))
    s.append(T(396, 606, "Sí", 11.5, BODY, 600, anchor="start"))
    s.append(elbow([(380, 592), (380, 622)]))
    s.append(node(60, 522, 168, 48, "Configuración › Módulos", kind="io"))
    s.append(elbow([(230, 546), (228, 546)], arrow=True))
    s.append(T(214, 538, "No", 11, BODY, 600, anchor="end"))

    s.append(diamond(230, 622, 300, 92, ["¿La sesión tiene", "inventory.read?"]))
    s.append(elbow([(380, 714), (380, 742)]))
    s.append(T(396, 730, "Sí", 11.5, BODY, 600, anchor="start"))
    s.append(node(60, 644, 168, 48, "Pantalla sin permiso", kind="io"))
    s.append(elbow([(230, 668), (228, 668)], arrow=True))
    s.append(T(214, 660, "No", 11, BODY, 600, anchor="end"))

    s.append(node(280, 742, 200, 44, "/inventario/inicio", kind="terminal"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D2 · Las dos guardas que protegen cada ruta
# ══════════════════════════════════════════════════════════════════════════
def d_guardas():
    s = [begin(940, 300)]
    s.append(node(40, 118, 170, 60, "Ruta solicitada", "p. ej. /inventario/movimientos", kind="io"))
    s.append(elbow([(210, 148), (250, 148)]))
    s.append(diamond(250, 100, 180, 96, ["¿El módulo", "está activo?"]))
    s.append(node(40, 22, 170, 56, "→ Configuración › Módulos", kind="io"))
    s.append(elbow([(340, 100), (340, 50), (214, 50)]))
    s.append(T(352, 88, "No", 11, BODY, 600, anchor="start"))

    s.append(elbow([(430, 148), (470, 148)]))
    s.append(T(450, 138, "Sí", 11, BODY, 600))
    s.append(diamond(470, 100, 180, 96, ["¿La sesión tiene", "la capacidad?"]))
    s.append(node(40, 212, 170, 56, "Pantalla sin permiso", kind="io"))
    s.append(elbow([(560, 196), (560, 240), (214, 240)]))
    s.append(T(572, 232, "No", 11, BODY, 600, anchor="start"))

    s.append(elbow([(650, 148), (690, 148)]))
    s.append(T(670, 138, "Sí", 11, BODY, 600))
    s.append(node(690, 118, 210, 60, "Se pinta la pantalla", kind="terminal"))
    s.append(T(30, 298, "Una ruta y el enlace que lleva a ella usan la MISMA capacidad. "
                        "Entrar a una pantalla nunca implica poder operarla.", 11.5, BODY, 500,
               anchor="start"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D3 · Qué se guarda y qué se deriva
# ══════════════════════════════════════════════════════════════════════════
def d_derivado():
    s = [begin(940, 470)]

    # El kárdex: la única fuente
    s.append(rect(30, 16, 880, 62, 10, INDIGO_L, INDIGO, 1.4))
    s.append(T(470, 42, "Movimiento[]  —  el kárdex", 13.5, INDIGO, 700))
    s.append(T(470, 62, "articuloId · tipo · cantidad · origenId · destinoId · motivo · loteId · "
                        "fecha · actor", 10.5, BODY, 400))

    cards = [
        ("Existencia", ["stockDe(movs,", "articuloId, bodegaId)"], "Suma de efectos por bodega"),
        ("Estado de stock", ["estadoDeStock(disponible,", "mínimo, puntoReorden)"], "4 estados → 3 niveles"),
        ("Disponible del lote", ["disponibleDeLote(movs,", "lote)"], "cantidadInicial + efectos"),
        ("Diferencia del conteo", ["diferenciaDe(item)"], "conteoFisico − conteoTeorico"),
        ("Valor a costo", ["valorInventario(movs,", "articulos, bodegas)"], "existencia × costoUnitario"),
    ]
    cw, gap = 168, 15
    x = 30
    for titulo, fn, sub in cards:
        s.append(elbow([(x + cw / 2.0, 86), (x + cw / 2.0, 158)]))
        s.append(rect(x, 158, cw, 116, 10))
        s.append(T(x + cw / 2.0, 184, titulo, 12, INDIGO, 700))
        s.append(TB(x + cw / 2.0, 216, fn, 10, CELESTE_D, 500, lh=12.5))
        s.append(T(x + cw / 2.0, 256, sub, 9.5, BODY, 400))
        x += cw + gap

    s.append(T(30, 306, "SE DERIVA — no existe ningún campo que guardar, y por tanto ninguno que se "
                        "pueda desincronizar.", 11.5, INDIGO, 600, anchor="start"))

    # Hechos declarados
    s.append(rect(30, 326, 880, 62, 10, CELESTE_L, CELESTE_D, 1.3))
    s.append(T(50, 352, "SE GUARDA — y no se deriva, porque es un HECHO y no cambia", 12,
               "#0E6B75", 700, anchor="start"))
    s.append(T(50, 372, "cantidadInicial del lote (cuánto entró)   ·   costoUnitario del artículo "
                        "(costo vigente)   ·   conteoTeorico de la auditoría (foto congelada al abrir)",
               10.5, BODY, 400, anchor="start"))

    s.append(T(30, 416, "Un campo «cantidad» en el artículo, un «cantidadDisponible» en el lote o una "
                        "«diferencia» en la línea serían una SEGUNDA respuesta a la misma pregunta.",
               11.5, BODY, 500, anchor="start"))
    s.append(T(30, 436, "El repo ya pagó ese precio dos veces —Conversacion.pedidoActivoId y "
                        "ESTADO_PREP_META— y las dos quedaron escritas.", 11.5, BODY, 500,
               anchor="start"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D4 · El kárdex: una sola fórmula, cinco casos
# ══════════════════════════════════════════════════════════════════════════
def d_formula():
    s = [begin(940, 440)]
    s.append(rect(30, 16, 880, 52, 10, INDIGO_L, INDIGO, 1.4))
    s.append(T(470, 40, "efectoEnBodega(movimiento, bodegaId)  =  (+cantidad si es el destino)  "
                        "−  (cantidad si es el origen)", 12, INDIGO, 700))
    s.append(T(470, 58, "Es la ÚNICA fórmula del módulo: los cinco casos salen de aquí, porque "
                        "origenId y destinoId ya llevan la dirección.", 10.5, BODY, 400))

    casos = [
        ("entrada", "Exterior", "Bodega", "Llega mercancía de fuera", "+"),
        ("salida", "Bodega", "Exterior", "Sale del sistema", "−"),
        ("ajuste al alza", "Exterior", "Bodega", "Conteo al alza · exige motivo", "+"),
        ("ajuste a la baja", "Bodega", "Exterior", "Merma, rotura · exige motivo", "−"),
        ("transferencia", "Bodega A", "Bodega B", "Cambia de sitio, no sale", "±"),
    ]
    cw, gap = 168, 15
    x = 30
    y = 108
    for titulo, org, dst, sub, signo in casos:
        s.append(rect(x, y, cw, 148, 10))
        s.append(T(x + cw / 2.0, y + 24, titulo, 11.5, INDIGO, 700))
        s.append(rect(x + 20, y + 38, cw - 40, 26, 6, WHITE, GRAYB, 1.1))
        s.append(T(x + cw / 2.0, y + 56, org, 10.5, BODY, 500))
        s.append(elbow([(x + cw / 2.0, y + 68), (x + cw / 2.0, y + 86)]))
        s.append(rect(x + 20, y + 90, cw - 40, 26, 6, WHITE, GRAYB, 1.1))
        s.append(T(x + cw / 2.0, y + 108, dst, 10.5, BODY, 500))
        s.append(T(x + cw / 2.0, y + 136, sub, 9, BODY, 400))
        s.append(T(x + cw - 12, y + 24, signo, 13, CELESTE_D, 700, anchor="end"))
        x += cw + gap

    s.append(T(30, 288, "«Traslado» ES la transferencia. Un quinto tipo dejaría dos nombres para el "
                        "mismo hecho, y el mismo traslado se podría escribir de dos formas.",
               11.5, BODY, 500, anchor="start"))
    s.append(T(30, 308, "La transferencia es UN movimiento, no dos: no hay una mitad que se pueda "
                        "perder y que deje la operación a medias.", 11.5, BODY, 500, anchor="start"))

    s.append(rect(30, 330, 880, 88, 10, GRAY, GRAYB, 1.2, dash="5 4"))
    s.append(T(50, 354, "El tipo es el MOTIVO, no la dirección", 12, INK, 700, anchor="start"))
    s.append(T(50, 374, "Por eso un ajuste al alza y una entrada se distinguen aunque los dos sumen: "
                        "el tipo dice por qué, los extremos dicen hacia dónde.", 10.5, BODY, 400,
               anchor="start"))
    s.append(T(50, 394, "Un ajuste tiene UN solo extremo. Nunca los dos: aparecer y desaparecer "
                        "mercancía a la vez no es un movimiento, son dos.", 10.5, BODY, 400,
               anchor="start"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D5 · Estados de existencias y umbrales
# ══════════════════════════════════════════════════════════════════════════
def d_estados():
    s = [begin(940, 400)]

    s.append(T(30, 26, "CUATRO estados finos  →  TRES niveles con los que decide el operador",
               12, INDIGO, 700, anchor="start"))
    s.append(rect(30, 40, 880, 44, 9, INDIGO_L, INDIGO, 1.2))
    s.append(T(50, 68, "critico  =  agotado + bajo mínimo   ·   reorden  =  reorden   ·   ok  =  ok"
                       "        (nivelDeStock agrupa; la página, el filtro y los selectores "
                       "agrupan igual)", 10.5, BODY, 500, anchor="start"))

    # ── La recta numérica ──────────────────────────────────────────────────
    eje_y = 170
    s.append(line(80, eje_y, 870, eje_y, INK, sw=1.6))

    bandas = [
        (80, 270, "bajo mínimo", "0 < disponible < mínimo", PEACH, "#C25A00", "#8A3F00"),
        (350, 260, "reorden", "mínimo ≤ disponible < reorden", CELESTE_L, CELESTE_D, "#0E6B75"),
        (610, 260, "ok", "disponible ≥ punto de reorden", INDIGO_L, INDIGO_M, INDIGO),
    ]
    for x, w, nombre, cond, fill, stroke, tcol in bandas:
        s.append(rect(x, eje_y - 46, w, 34, 8, fill, stroke, 1.3))
        s.append(T(x + w / 2.0, eje_y - 32, nombre, 11.5, tcol, 700))
        s.append(T(x + w / 2.0, eje_y - 18, cond, 9.5, BODY, 400))

    s.append('<circle cx="80" cy="%.1f" r="6" fill="%s"/>' % (eje_y, ORANGE))
    s.append(T(80, eje_y - 58, "agotado", 11, "#A32A0A", 700))
    s.append(T(80, eje_y - 72, "disponible ≤ 0", 9.5, BODY, 400))

    for x, lab in [(80, "0"), (350, "mínimo"), (610, "punto de reorden"), (870, "…")]:
        s.append(line(x, eje_y - 8, x, eje_y + 8, INK, sw=1.6))
        s.append(T(x, eje_y + 26, lab, 11, BODY, 600))

    s.append(T(30, 224, "Estar JUSTO en el mínimo ya es «reorden», no «bajo mínimo»: el mínimo es el "
                        "nivel al que hay que reponer, no un valor que ya esté mal.", 11.5, BODY, 500,
               anchor="start"))
    s.append(T(30, 244, "puntoReorden es opcional y SOLO PUEDE ESTRECHAR la banda de aviso. Si llega "
                        "por debajo del mínimo no describe nada y se ignora en vez de inventar una "
                        "banda invertida.", 11.5, BODY, 500, anchor="start"))
    s.append(T(30, 264, "stockMaximo es una referencia de reposición, NO un umbral de alarma: un "
                        "artículo por encima de su máximo sigue estando «ok».", 11.5, BODY, 500,
               anchor="start"))

    s.append(rect(30, 292, 880, 94, 10, GRAY, GRAYB, 1.2, dash="5 4"))
    s.append(T(50, 316, "«Por debajo del mínimo» y «bajo mínimo» NO son lo mismo, y la etiqueta "
                        "importa", 12, INK, 700, anchor="start"))
    s.append(T(50, 336, "bajoMinimo (el número del panel) es todo lo que está por debajo de su punto "
                        "de reorden, y ESO INCLUYE LOS AGOTADOS. El badge «Bajo mínimo» de la tabla "
                        "excluye los agotados.", 10.5, BODY, 400, anchor="start"))
    s.append(T(50, 356, "La pantalla llegó a decir 3 arriba y 2 abajo con la misma etiqueta. Los dos "
                        "números eran correctos; la palabra era la que mentía.", 10.5, BODY, 400,
               anchor="start"))
    s.append(T(50, 376, "El filtro de la lista pasa por nivelDeStock y no por «!== ok»: con la "
                        "comparación anterior, un artículo que solo pasó su punto de reorden entraba "
                        "en «por debajo del mínimo».", 10.5, BODY, 400, anchor="start"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D6 · Registrar un movimiento
# ══════════════════════════════════════════════════════════════════════════
def d_movimiento():
    s = [begin(900, 876)]
    x, w, cx = 300, 300, 450

    s.append(node(cx - 90, 16, 180, 42, "Nuevo movimiento", kind="start"))
    s.append(elbow([(cx, 58), (cx, 82)]))

    pasos = [
        ("1 · Tipo de movimiento", "entrada · salida · transferencia · ajuste"),
        ("2 · Artículo", "del catálogo"),
        ("3 · Bodega", "la etiqueta cambia según el tipo"),
        ("4 · Cantidad", "mayor que cero"),
    ]
    y = 82
    for t, sub in pasos:
        s.append(node(x, y, w, 54, t, sub))
        s.append(elbow([(cx, y + 54), (cx, y + 72)]))
        y += 72

    s.append(diamond(x, y, w, 80, "¿Es transferencia?"))
    s.append(node(40, y + 12, 200, 56, "Bodega de destino", "y debe ser distinta", kind="warn"))
    s.append(elbow([(x, y + 40), (240, y + 40)], kind="indigo", color=INDIGO, dash="5 4"))
    s.append(T(x - 8, y + 30, "Sí", 11, INDIGO, 600, anchor="end"))
    s.append(elbow([(cx, y + 80), (cx, y + 96)]))
    s.append(T(cx + 12, y + 92, "No", 11, BODY, 600, anchor="start"))
    y += 96

    s.append(diamond(x, y, w, 80, "¿Es ajuste?"))
    s.append(node(40, y + 12, 200, 56, "Sentido y motivo", "al alza o a la baja", kind="warn"))
    s.append(elbow([(x, y + 40), (240, y + 40)], kind="indigo", color=INDIGO, dash="5 4"))
    s.append(T(x - 8, y + 30, "Sí", 11, INDIGO, 600, anchor="end"))
    s.append(elbow([(cx, y + 80), (cx, y + 96)]))
    s.append(T(cx + 12, y + 92, "No", 11, BODY, 600, anchor="start"))
    y += 96

    s.append(node(x, y, w, 54, "registrarMovimiento()", "el único camino al kárdex"))
    s.append(elbow([(cx, y + 54), (cx, y + 72)]))
    y += 72

    s.append(diamond(x, y, w, 84, "¿Pasa la validación?", "siete reglas, fail-closed"))
    s.append(node(x, y + 110, w, 50, "Se escribe en el kárdex", "y la existencia cambia sola",
                  kind="terminal"))
    s.append(elbow([(cx, y + 84), (cx, y + 110)]))
    s.append(T(cx + 12, y + 102, "Sí", 11, BODY, 600, anchor="start"))
    s.append(node(40, y + 6, 200, 72, "No se escribe nada", "y se devuelve el MOTIVO legible",
                  kind="deuda"))
    s.append(elbow([(x, y + 42), (240, y + 42)], kind="orange", color=ORANGE))
    s.append(T(x - 8, y + 32, "No", 11, ORANGE, 600, anchor="end"))

    s.append(T(30, y + 186, "El botón no decide si hay stock. Valida el store contra la existencia de "
                            "la bodega de ORIGEN y devuelve el motivo; la pantalla lo pinta.",
               11.5, BODY, 500, anchor="start"))
    s.append(T(30, y + 206, "Duplicar la comprobación en el formulario sería un segundo cálculo que "
                            "puede discrepar del real.", 11.5, BODY, 500, anchor="start"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D7 · Las seis reglas de validación
# ══════════════════════════════════════════════════════════════════════════
def d_reglas():
    s = [begin(940, 430)]
    reglas = [
        ("1", "La cantidad debe ser mayor que cero", "I2"),
        ("2", "Origen y destino deben ser bodegas distintas", "I2"),
        ("3", "entrada: sin origen, con destino", "I2"),
        ("4", "salida: con origen, sin destino", "I2"),
        ("5", "ajuste: un solo extremo, y con motivo", "I5"),
        ("6", "transferencia: exige las dos bodegas", "I2"),
    ]
    y = 20
    for n, texto, inv in reglas:
        s.append(rect(30, y, 880, 46, 9, WHITE, "#E9E6F4", 1.2))
        s.append(rect(30, y, 5, 46, 2.5, CELESTE, CELESTE, 0))
        s.append('<circle cx="70" cy="%.1f" r="14" fill="%s"/>' % (y + 23, INDIGO))
        s.append(T(70, y + 28, n, 12, WHITE, 700))
        s.append(T(98, y + 29, texto, 12.5, INK, 500, anchor="start"))
        s.append(T(890, y + 29, inv, 11, CELESTE_D, 700, anchor="end"))
        y += 54

    s.append(rect(30, y + 4, 880, 78, 10, PEACH, ORANGE, 1.3))
    s.append(T(50, y + 30, "Y una séptima, que es la que más importa", 12, "#A32A0A", 700,
               anchor="start"))
    s.append(T(50, y + 52, "Ningún movimiento puede dejar stock negativo en su bodega de ORIGEN. Se "
                           "compara contra la existencia real de esa bodega, no contra el total del "
                           "artículo:", 10.5, BODY, 400, anchor="start"))
    s.append(T(50, y + 70, "validar contra el total dejaría retirar de una bodega vacía lo que sobra "
                           "en otra.", 10.5, BODY, 400, anchor="start"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D8 · Lotes y FEFO
# ══════════════════════════════════════════════════════════════════════════
def d_fefo():
    s = [begin(940, 478)]

    s.append(T(30, 34, "Se piden 4 kg de chocolate. Tres lotes del artículo, uno de ellos vencido.",
               11.5, BODY, 500, anchor="start"))

    lotes = [
        ("CHO-2609B", "vence en 3 días", "1 kg", "1.º", True),
        ("CHO-2609A", "vence en 12 días", "8 kg", "2.º", True),
        ("CHO-2609V", "venció hace 2 días", "6 kg", "—", False),
    ]
    y = 50
    for codigo, venc, disp, orden, ok in lotes:
        fill = WHITE if ok else PEACH
        stroke = "#E9E6F4" if ok else ORANGE
        s.append(rect(30, y, 570, 52, 9, fill, stroke, 1.2))
        s.append(T(52, y + 22, codigo, 12, INK if ok else "#A32A0A", 700, anchor="start"))
        s.append(T(52, y + 40, venc + "   ·   " + disp + " disponibles", 10.5, BODY, 400,
                   anchor="start"))
        s.append(T(570, y + 32, orden, 13, CELESTE_D if ok else "#C0BFC8", 700, anchor="end"))
        y += 60

    s.append(rect(630, 50, 280, 142, 10, INDIGO_L, INDIGO, 1.3))
    s.append(T(650, 74, "FEFO excluye, no ordena", 12, INDIGO, 700, anchor="start"))
    s.append(T(650, 96, "· lotes con disponible ≤ 0", 10.5, BODY, 400, anchor="start"))
    s.append(T(650, 116, "· lotes ya vencidos", 10.5, BODY, 400, anchor="start"))
    s.append(T(650, 136, "· lotes con fecha ilegible", 10.5, BODY, 400, anchor="start"))
    s.append(T(650, 162, "Devolver primero el que venció ayer", 10.5, BODY, 400, anchor="start"))
    s.append(T(650, 180, "sería una sugerencia que hay que", 10.5, BODY, 400, anchor="start"))

    s.append(rect(630, 206, 280, 90, 10, GRAY, GRAYB, 1.2, dash="5 4"))
    s.append(T(650, 230, "La exclusión se VE", 12, INK, 700, anchor="start"))
    s.append(T(650, 252, "El total devuelto puede no", 10.5, BODY, 400, anchor="start"))
    s.append(T(650, 270, "cubrir lo pedido. El llamador", 10.5, BODY, 400, anchor="start"))
    s.append(T(650, 288, "compara en vez de suponer.", 10.5, BODY, 400, anchor="start"))

    s.append(T(30, 250, "El orden lo fija el VENCIMIENTO, no el nombre del lote: el código «B» sale "
                        "antes que el «A».", 11.5, BODY, 500, anchor="start"))
    s.append(T(30, 270, "Dos lotes que vencen el mismo día se ordenan por código de lote. Sin "
                        "desempate, el orden", 11.5, BODY, 500, anchor="start"))
    s.append(T(30, 290, "saldría del array, que cambia al registrar un movimiento: una lista de "
                        "despacho que se", 11.5, BODY, 500, anchor="start"))
    s.append(T(30, 310, "reordena sola no se puede seguir con el dedo.", 11.5, BODY, 500,
               anchor="start"))
    s.append(T(30, 330, "Un lote no se reparte entre bodegas, y en esta versión NO se transfiere "
                        "entre ellas.", 11.5, BODY, 500, anchor="start"))

    s.append(rect(30, 352, 880, 108, 10, PEACH, ORANGE, 1.3))
    s.append(T(50, 378, "Deuda declarada: un ajuste de auditoría NO se etiqueta con lote", 12,
               "#A32A0A", 700, anchor="start"))
    s.append(T(50, 400, "En un artículo con lotes, el ajuste mueve la existencia del artículo pero no "
                        "la disponibilidad derivada de sus lotes. Después de conciliar, las dos cifras "
                        "pueden separarse", 10.5, BODY, 400, anchor="start"))
    s.append(T(50, 418, "hasta el siguiente movimiento etiquetado. Resolverlo bien exige contar por "
                        "lote —una línea por lote, no por artículo— y eso cambia la forma del conteo.",
               10.5, BODY, 400, anchor="start"))
    s.append(T(50, 440, "Lo que NO se hace es elegir un lote «razonable»: un reparto inventado sería "
                        "una trazabilidad que el operador no declaró, y eso es peor que la deriva.",
               10.5, BODY, 400, anchor="start"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D9 · Vencimientos: las bandas de urgencia
# ══════════════════════════════════════════════════════════════════════════
def d_vencimientos():
    s = [begin(940, 300)]
    s.append(T(30, 30, "urgenciaDeVencimiento(fechaVencimiento, hoy) — seis bandas, de más a menos "
                       "grave.", 11.5, BODY, 500, anchor="start"))

    bandas = [
        ("vencido", "ya pasó", "días < 0", "—", ORANGE, PEACH),
        ("critico", "esta semana", "días ≤ 7", "7 días", "#C25A00", PEACH),
        ("proximo", "vence pronto", "días ≤ 15", "15 días", "#C25A00", PEACH),
        ("aviso", "aviso temprano", "días ≤ 30", "30 días", CELESTE_D, CELESTE_L),
        ("ok", "vigente", "días > 30", "—", INDIGO_M, INDIGO_L),
        ("desconocido", "sin fecha legible", "fecha ilegible", "—", ORANGE, PEACH),
    ]
    cw, gap = 141, 12
    x = 30
    for nombre, etiqueta, corte, umbral, stroke, fill in bandas:
        s.append(rect(x, 56, cw, 116, 10, fill, stroke, 1.4))
        s.append(T(x + cw / 2.0, 84, nombre, 12.5, stroke, 700))
        s.append(T(x + cw / 2.0, 108, etiqueta, 10.5, BODY, 500))
        s.append(line(x + 20, 122, x + cw - 20, 122, stroke, sw=1))
        s.append(T(x + cw / 2.0, 144, corte, 10.5, BODY, 400))
        s.append(T(x + cw / 2.0, 162, umbral, 9.5, BODY, 400))
        x += cw + gap

    s.append(T(30, 206, "UMBRALES_VENCIMIENTO:  critico = 7 días   ·   proximo = 15   ·   aviso = 30. "
                        "El más estrecho manda.", 11.5, INDIGO, 600, anchor="start"))
    s.append(T(30, 226, "Están en el dominio y no repartidos por las superficies para que el badge de "
                        "la tabla y el aviso del panel corten el MISMO día.", 11.5, BODY, 500,
               anchor="start"))

    s.append(rect(30, 244, 880, 48, 10, PEACH, ORANGE, 1.3))
    s.append(T(50, 274, "«desconocido» existe porque una fecha ilegible NO es un lote sano: sin él, "
                        "caería por descarte en «ok» y un lote con la fecha corrupta se pintaría "
                        "como «todo bien».", 11, "#A32A0A", 600, anchor="start"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D10 · Conteo físico
# ══════════════════════════════════════════════════════════════════════════
def d_conteo():
    s = [begin(940, 584)]
    x, w, cx = 330, 280, 470

    s.append(node(cx - 90, 28, 180, 42, "Abrir conteo", kind="start"))
    s.append(elbow([(cx, 70), (cx, 88)]))
    s.append(node(x, 88, w, 58, "Se congela el teórico", "existencia AHORA, artículo por artículo"))
    s.append(elbow([(cx, 146), (cx, 164)]))
    s.append(node(x, 164, w, 58, "Se cuenta a mano", "cada línea: un número, vacío, o corregir"))
    s.append(elbow([(cx, 222), (cx, 240)]))

    s.append(diamond(x, 240, w, 88, "¿Están todas contadas?", "motivoNoConciliable"))
    s.append(node(690, 326, 230, 56, "El botón está apagado", "y dice cuántas faltan", kind="note"))
    s.append(elbow([(x + w, 284), (650, 284), (650, 354), (690, 354)], kind="ink", color=INK))
    s.append(T(x + w + 12, 276, "No", 11, BODY, 600, anchor="start"))
    s.append(elbow([(cx, 328), (cx, 360)]))
    s.append(T(cx + 12, 348, "Sí", 11, BODY, 600, anchor="start"))

    s.append(node(x, 360, w, 58, "Conciliar", "un ajuste por cada diferencia"))
    s.append(elbow([(cx, 418), (cx, 436)]))
    s.append(diamond(x, 436, w, 88, "¿Los ajustes pasan?", "validación uno por uno"))

    s.append(node(30, 444, 270, 68, "Atómico: se deshace todo", "y la auditoría SIGUE ABIERTA, "
                  "con el motivo", kind="deuda"))
    s.append(elbow([(x, 480), (300, 480)], kind="orange", color=ORANGE))
    s.append(T(x - 8, 470, "No", 11, ORANGE, 600, anchor="end"))

    s.append(node(690, 466, 230, 56, "Conciliada", "estado completada", kind="terminal"))
    s.append(elbow([(x + w, 480), (690, 480)], kind="indigo", color=INDIGO))
    s.append(T(x + w + 10, 470, "Sí", 11, INDIGO, 600, anchor="start"))

    s.append(rect(30, 28, 270, 252, 10, GRAY, GRAYB, 1.2, dash="5 4"))
    s.append(T(50, 54, "Cuatro clases de línea", 12, INK, 700, anchor="start"))
    clases = [
        ("Sin contar", "pendiente · ámbar", "Es trabajo sin hacer"),
        ("Coincide", "neutro", "No genera movimiento"),
        ("Sobra", "físico > teórico", "Ajuste al alza"),
        ("Falta", "físico < teórico", "Ajuste a la baja"),
    ]
    y = 78
    for nombre, badge, efecto in clases:
        s.append(T(50, y, nombre, 11.5, INDIGO, 700, anchor="start"))
        s.append(T(50, y + 16, badge, 10, CELESTE_D, 500, anchor="start"))
        s.append(T(50, y + 32, efecto, 10, BODY, 400, anchor="start"))
        y += 46
    s.append(T(50, y + 4, "«Sin contar» NO es «coincide»:", 10, "#A32A0A", 600, anchor="start"))
    s.append(T(50, y + 20, "colapsarlas pintaría como", 10, BODY, 400, anchor="start"))
    s.append(T(50, y + 34, "cuadrada una línea sin mirar.", 10, BODY, 400, anchor="start"))

    s.append(rect(30, 298, 270, 126, 10, CELESTE_L, CELESTE_D, 1.3))
    s.append(T(50, 322, "Se cuenta el catálogo ENTERO,", 11.5, "#0E6B75", 700, anchor="start"))
    s.append(T(50, 340, "no lo que el sistema cree", 11.5, "#0E6B75", 700, anchor="start"))
    s.append(T(50, 358, "que hay.", 11.5, "#0E6B75", 700, anchor="start"))
    s.append(T(50, 380, "Contar solo lo que el kárdex ya", 10, BODY, 400, anchor="start"))
    s.append(T(50, 396, "declara hace imposible encontrar", 10, BODY, 400, anchor="start"))
    s.append(T(50, 412, "un sobrante de un artículo agotado.", 10, BODY, 400, anchor="start"))

    s.append(rect(680, 28, 240, 252, 10, INDIGO_L, INDIGO, 1.3))
    s.append(T(700, 54, "Tres reglas que la sostienen", 12, INDIGO, 700, anchor="start"))
    s.append(T(700, 82, "1. El teórico es una FOTO,", 10, BODY, 500, anchor="start"))
    s.append(T(700, 98, "congelada al abrir. Leerlo en", 10, BODY, 400, anchor="start"))
    s.append(T(700, 114, "cada render haría que un", 10, BODY, 400, anchor="start"))
    s.append(T(700, 130, "movimiento a mitad del conteo", 10, BODY, 400, anchor="start"))
    s.append(T(700, 146, "cambiara la diferencia.", 10, BODY, 400, anchor="start"))
    s.append(T(700, 176, "2. UNA sola auditoría abierta", 10, BODY, 500, anchor="start"))
    s.append(T(700, 192, "por bodega.", 10, BODY, 400, anchor="start"))
    s.append(T(700, 222, "3. Conciliar es atómico o no es.", 10, BODY, 500, anchor="start"))
    s.append(T(700, 250, "Cancelar NO escribe nada.", 10, "#A32A0A", 600, anchor="start"))

    s.append(T(30, 552, "Media conciliación es peor que ninguna: deja el kárdex con parte del conteo "
                        "aplicado y sin forma de saber cuál parte.", 11.5, BODY, 500, anchor="start"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D11 · El panel de Inicio
# ══════════════════════════════════════════════════════════════════════════
def d_inicio():
    s = [begin(940, 340)]
    s.append(rect(30, 16, 880, 46, 10, INDIGO_L, INDIGO, 1.4))
    s.append(T(470, 45, "Inicio responde a UNA pregunta: ¿qué me está pidiendo atención ahora mismo?",
               12.5, INDIGO, 700))

    bloques = [
        ("Cuatro cifras", ["Artículos", "Valor a costo", "Por debajo del mínimo", "Agotados"]),
        ("Bodegas", ["Cada bodega con cuántos", "artículos tiene algo dentro,", "y su valor a costo"]),
        ("Requiere reposición", ["Agotados y bajo mínimo,", "con lo que hay hoy y el", "punto de reorden"]),
        ("Últimos movimientos", ["El kárdex más reciente —", "la única fuente de las", "existencias de arriba"]),
    ]
    cw, gap = 208, 16
    x = 30
    for titulo, lineas in bloques:
        s.append(rect(x, 80, cw, 118, 10))
        s.append(rect(x, 80, 5, 118, 2.5, CELESTE, CELESTE, 0))
        s.append(T(x + cw / 2.0 + 2, 108, titulo, 12.5, INDIGO, 700))
        s.append(TB(x + cw / 2.0 + 2, 148, lineas, 10.5, BODY, 400, lh=14))
        x += cw + gap

    s.append(T(30, 228, "Esta pantalla NO escribe nada. Ninguna capacidad de escritura se consulta "
                        "aquí: registrar un movimiento vive en Movimientos, que es donde el "
                        "formulario tiene contexto.", 11.5, BODY, 500, anchor="start"))
    s.append(T(30, 248, "Ninguna cifra se guarda: todas salen del kárdex a través del store. Si la "
                        "página sumara por su cuenta habría un segundo cálculo del mismo número.",
               11.5, BODY, 500, anchor="start"))

    s.append(rect(30, 268, 880, 56, 10, PEACH, ORANGE, 1.3))
    s.append(T(50, 294, "Con el interruptor de alertas apagado, el panel lo dice en voz alta", 12,
               "#A32A0A", 700, anchor="start"))
    s.append(T(50, 314, "La lista se sigue calculando, pero el módulo no avisa por ningún otro medio. "
                        "Sin ese aviso, el usuario creería que las alertas funcionan: una lista que se "
                        "pinta sola no es una alerta.", 10.5, BODY, 400, anchor="start"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D12 · Quién puede hacer qué
# ══════════════════════════════════════════════════════════════════════════
def d_permisos():
    s = [begin(940, 528)]
    caps = ["read", "manage", "move", "adjust"]
    roles = [
        ("Administrador de tienda", [1, 1, 1, 1]),
        ("Bodega", [1, 0, 1, 1]),
        ("Supervisor de pedidos", [0, 0, 0, 0]),
        ("Operador", [0, 0, 0, 0]),
        ("Preparación", [0, 0, 0, 0]),
        ("Personalizado (sin capacidades)", [0, 0, 0, 0]),
    ]
    x0, y0 = 40, 60
    cw = [300] + [140] * 4
    rh = 46

    s.append(rect(x0, y0, cw[0], rh * 2, 8, INDIGO_L, INDIGO, 1.2))
    s.append(T(x0 + 16, y0 + 46, "Rol", 12, INDIGO, 600, anchor="start"))
    cx = x0 + cw[0]
    for i, c in enumerate(caps):
        s.append(rect(cx, y0, cw[i + 1], rh * 2, 8, INDIGO_L, INDIGO, 1.2))
        s.append(T(cx + cw[i + 1] / 2.0, y0 + 40, "inventory." + c, 11.5, INDIGO, 600))
        s.append(T(cx + cw[i + 1] / 2.0, y0 + 62, ["Ver", "Administrar", "Registrar",
                                                   "Corregir"][i], 9.5, BODY, 400))
        cx += cw[i + 1]

    y = y0 + rh * 2
    for j, (rol, vals) in enumerate(roles):
        s.append(rect(x0, y, cw[0], rh, 0, WHITE if j % 2 == 0 else "#FAF9FE", GRAYB, 1))
        s.append(T(x0 + 16, y + 29, rol, 11.5, INK, 500, anchor="start"))
        cx = x0 + cw[0]
        for i, v in enumerate(vals):
            s.append(rect(cx, y, cw[i + 1], rh, 0, WHITE if j % 2 == 0 else "#FAF9FE", GRAYB, 1))
            if v:
                s.append('<circle cx="%.1f" cy="%.1f" r="7" fill="%s"/>'
                         % (cx + cw[i + 1] / 2.0, y + 23, INDIGO))
                s.append(T(cx + cw[i + 1] / 2.0, y + 27.5, "sí", 9, WHITE, 700))
            else:
                s.append(T(cx + cw[i + 1] / 2.0, y + 28, "—", 12, "#C4C4CE", 400))
            cx += cw[i + 1]
        y += rh

    s.append(T(40, y + 32, "Solo dos roles tienen alguna capacidad de Inventario: el administrador y "
                           "el rol «Bodega». Para todos los demás, el módulo no se pinta.", 11.5, BODY,
               500, anchor="start"))
    s.append(T(40, y + 52, "«Bodega» lleva move y adjust pero NO manage: administrar el catálogo —SKUs, "
                           "costos, mínimos, bodegas— es trabajo de quien configura, no de quien "
                           "despacha.", 11.5, BODY, 500, anchor="start"))
    s.append(T(40, y + 72, "No existe `esAdmin`. El administrador es un rol normal y todo pasa por la "
                           "misma comprobación de capacidad que los demás.", 11.5, BODY, 500,
               anchor="start"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D13 · WhatsApp: consulta del inventario — promesa y realidad
# ══════════════════════════════════════════════════════════════════════════
def d_whatsapp():
    s = [begin(940, 620)]

    # ── Lo que el catálogo promete ──────────────────────────────────────────
    s.append(rect(30, 16, 880, 92, 10, CELESTE_L, CELESTE_D, 1.4))
    s.append(T(50, 42, "LO QUE EL CATÁLOGO DE LA PLATAFORMA PROMETE HOY", 11, "#0E6B75", 700,
               anchor="start"))
    s.append(T(50, 66, "«Canales de WhatsApp — Habilita consultas de disponibilidad de productos por "
                       "WhatsApp.»", 12, INDIGO, 600, anchor="start"))
    s.append(T(50, 88, "Beneficios declarados: «Respuestas instantáneas de stock a clientes por chat» "
                       "·  «Envío de catálogo y precios por mensaje directo».", 10.5, BODY, 400,
               anchor="start"))

    # ── Lo que existe ───────────────────────────────────────────────────────
    s.append(rect(30, 124, 425, 250, 10, WHITE, "#E9E6F4", 1.3))
    s.append(T(50, 150, "LO QUE EXISTE HOY", 11, INDIGO, 700, anchor="start"))
    s.append(T(50, 174, "Cero. El bot de WhatsApp es BotPedidos,", 11.5, INK, 500, anchor="start"))
    s.append(T(50, 192, "y su alcance dice, escrito:", 11.5, INK, 500, anchor="start"))
    s.append(rect(50, 206, 385, 66, 8, PEACH, ORANGE, 1.2))
    s.append(T(66, 230, "«Descontar stock. El catálogo de venta y el", 10.5, "#A32A0A", 600,
               anchor="start"))
    s.append(T(66, 248, "inventario son dos cosas distintas y este bot", 10.5, "#A32A0A", 600,
               anchor="start"))
    s.append(T(66, 266, "no las conecta. No lee `necto.articulo`.»", 10.5, "#A32A0A", 600,
               anchor="start"))
    s.append(T(50, 296, "Es una decisión de diseño, no un olvido: un pedido", 10.5, BODY, 400,
               anchor="start"))
    s.append(T(50, 314, "tomado por WhatsApp es una promesa comercial, no un", 10.5, BODY, 400,
               anchor="start"))
    s.append(T(50, 332, "movimiento de kárdex.", 10.5, BODY, 400, anchor="start"))
    s.append(T(50, 358, "Por tanto: la consulta de inventario por WhatsApp", 10.5, "#A32A0A", 600,
               anchor="start"))
    s.append(T(50, 374, "NO está implementada.", 10.5, "#A32A0A", 600, anchor="start"))

    # ── Lo que ya sabe responder ────────────────────────────────────────────
    s.append(rect(485, 124, 425, 250, 10, INDIGO_L, INDIGO, 1.3))
    s.append(T(505, 150, "LO QUE YA SABE RESPONDER — pero solo en el navegador", 11, INDIGO, 700,
               anchor="start"))
    tools = [
        ("inventario.getExistencias", "cuánto hay, y en qué bodega"),
        ("inventario.getBajoMinimo", "qué está por debajo del reorden"),
        ("inventario.getAgotados", "qué no tiene existencia"),
        ("inventario.getValorInventario", "cuánto vale a costo"),
        ("inventario.getMovimientosRecientes", "qué se movió últimamente"),
    ]
    y = 174
    for tid, que in tools:
        s.append('<circle cx="516" cy="%.1f" r="3" fill="%s"/>' % (y - 4, INDIGO))
        s.append(T(530, y, tid, 10.5, INDIGO, 700, anchor="start"))
        s.append(T(530, y + 15, que, 10, BODY, 400, anchor="start"))
        y += 36
    s.append(T(505, 358, "Las cinco exigen inventory.read y son SOLO de lectura.", 10.5, BODY, 400,
               anchor="start"))

    # ── La flecha que falta ─────────────────────────────────────────────────
    s.append(elbow([(455, 250), (485, 250)], dash="6 5", color=ORANGE, kind="orange"))
    s.append(T(470, 232, "falta", 10, ORANGE, 700))

    # ── Lo que falta para cerrarlo ──────────────────────────────────────────
    s.append(rect(30, 394, 880, 212, 10, PEACH, ORANGE, 1.4))
    s.append(T(50, 420, "PARA QUE LA CONSULTA POR WHATSAPP FUNCIONE, FALTAN CUATRO COSAS",
               11.5, "#A32A0A", 700, anchor="start"))
    faltas = [
        ("Una fuente en el servidor.", "El kárdex no se persiste: vive en memoria y solo la "
         "configuración va a `necto.inventarioConfig`. El bot corre en `srv.api` y no puede leer MobX."),
        ("Un modo de consulta.", "`modo_atencion` es la puerta del bot y el hilo se enruta por "
         "`zernio_conversation_id`. Hoy no existe un camino «pregunta y responde» sin tomar pedido."),
        ("Decidir quién pregunta.", "El canal de Pedidos es el del CLIENTE; una consulta de "
         "inventario es del DUEÑO. Son dos públicos en el mismo número, y eso es una decisión."),
        ("Retirar lo que no se puede honrar.", "«Envío de catálogo y precios» no es posible: el precio "
         "de venta vive en Pedidos y este módulo solo guarda costo. Prometerlo obliga a romper la "
         "independencia."),
    ]
    y = 446
    for titulo, detalle in faltas:
        s.append('<circle cx="62" cy="%.1f" r="3.5" fill="%s"/>' % (y - 4, ORANGE))
        s.append(T(78, y, titulo, 11, "#A32A0A", 700, anchor="start"))
        s.append(T(78, y + 17, detalle, 10, BODY, 400, anchor="start"))
        y += 40
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# CSS
# ══════════════════════════════════════════════════════════════════════════
CSS = """
*{box-sizing:border-box}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#fff;color:#535250;
  font-family:Inter,'Segoe UI',system-ui,-apple-system,sans-serif;
  font-size:13.5px;line-height:1.62;-webkit-font-smoothing:antialiased}
.page{max-width:1000px;margin:0 auto;padding:46px 54px 70px}
h1{font-size:29px;line-height:1.2;color:#15008B;font-weight:800;margin:0 0 14px;letter-spacing:-.4px}
h2{font-size:15px;color:#1D3261;font-weight:700;margin:34px 0 10px}
.rule{height:4px;border-radius:2px;margin:0 0 26px;width:100%;
  background:linear-gradient(90deg,#15008B 0 62%,#71D6E0 62% 100%)}
.callout{background:#F0EEFB;border-left:4px solid #15008B;border-radius:0 8px 8px 0;
  padding:16px 20px;margin:0 0 26px;color:#535250;font-size:13px}
.callout b,.callout strong{color:#1D3261}
.callout.key{background:#E9F9FB;border-left-color:#12808D}
.actors{margin:0 0 26px;padding-left:0;list-style:none}
.actors li{position:relative;padding-left:18px;margin-bottom:7px}
.actors li:before{content:"";position:absolute;left:2px;top:9px;width:6px;height:6px;
  border-radius:50%;background:#15008B}
.actors b{color:#1D3261}
section.sec{margin:0 0 34px;page-break-inside:avoid;break-inside:avoid}
section.sec h3{font-size:17px;color:#15008B;font-weight:750;margin:0 0 6px;letter-spacing:-.2px;
  display:flex;align-items:baseline;gap:10px}
section.sec h3 .num{display:inline-flex;align-items:center;justify-content:center;
  min-width:26px;height:26px;border-radius:8px;background:#15008B;color:#fff;font-size:13px;
  font-weight:700;flex:0 0 auto;transform:translateY(2px)}
.lead{margin:0 0 14px;color:#535250}
.hr{height:1px;background:#E9E6F4;margin:0 0 18px}
figure{margin:0 0 14px;background:#FBFAFE;border:1px solid #EDEAF8;border-radius:12px;
  padding:14px 10px;page-break-inside:avoid;break-inside:avoid}
svg.dia{display:block;width:100%;height:auto}
.notes{background:#F7F6FD;border-radius:10px;padding:12px 18px;font-size:12.5px}
.notes ul{margin:0;padding-left:16px}
.notes li{margin-bottom:5px}
.notes b{color:#1D3261}
table{width:100%;border-collapse:collapse;font-size:12px;margin:0 0 14px;
  page-break-inside:avoid;break-inside:avoid}
th{background:#F0EEFB;color:#15008B;text-align:left;font-weight:650;padding:6px 10px;
  border:1px solid #E3DFF4;font-size:11.5px}
td{padding:6px 10px;border:1px solid #EDEAF8;vertical-align:top}
td code,th code{background:#F1EFFA;padding:1px 5px;border-radius:4px;font-size:11.5px;color:#15008B}
tbody tr:nth-child(even) td{background:#FAF9FE}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.card{border:1px solid #E9E6F4;border-radius:10px;padding:14px 16px;background:#fff}
.card h4{margin:0 0 8px;font-size:13px;color:#15008B;font-weight:700}
.card ul{margin:0;padding-left:16px;font-size:12.5px}
.card li{margin-bottom:5px}
.tag{display:inline-block;background:#E9F9FB;color:#0E6B75;border-radius:999px;
  padding:2px 9px;font-size:11px;font-weight:600;margin-right:6px}
.tag.d{background:#FFF4F0;color:#A32A0A}
footer{margin-top:20px;padding-top:12px;border-top:1px solid #E3DFF4;font-size:11.5px;color:#8A8A96}
@media print{
  @page{size:A4;margin:13mm 12mm}
  body{font-size:11.6px}
  .page{max-width:none;padding:0}
  h1{font-size:23px}
  section.sec{page-break-inside:avoid;break-inside:avoid}
  figure{page-break-inside:avoid;break-inside:avoid}
  .pb{page-break-before:always;break-before:page}
}
"""


def sec(n, titulo, lead, figura, notas, pb=False):
    cls = "sec pb" if pb else "sec"
    h = ['<section class="%s">' % cls]
    h.append('<h3><span class="num">%s</span>%s</h3>' % (n, titulo))
    h.append('<div class="hr"></div>')
    if lead:
        h.append('<p class="lead">%s</p>' % lead)
    h.append("<figure>%s</figure>" % figura)
    if notas:
        h.append('<div class="notes"><ul>%s</ul></div>' % "".join("<li>%s</li>" % x for x in notas))
    h.append("</section>")
    return "".join(h)


def build():
    p = []
    p.append('<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">')
    p.append('<meta name="viewport" content="width=device-width, initial-scale=1">')
    p.append("<title>Módulo de Inventario — Diagramas de flujo</title>")
    p.append("<style>%s</style></head><body><div class='page'>" % CSS)

    p.append("<h1>Módulo de Inventario — Diagramas de flujo</h1>")
    p.append('<div class="rule"></div>')
    p.append(
        '<div class="callout">Documento de referencia del flujo funcional del <b>módulo de '
        'Inventario</b> de NECTO: qué se guarda, de dónde salen las existencias, cómo se mueve la '
        'mercancía y quién puede moverla. Refleja lo implementado hoy en '
        '<code>packages/apps/web/modules/app/src</code>.</div>')

    p.append('<h2>Actores</h2>')
    p.append(
        '<ul class="actors">'
        '<li><b>Administrador</b> — dueño del almacén: catálogo, costos, mínimos, bodegas y equipo.</li>'
        '<li><b>Bodega</b> — registra entradas, salidas, transferencias y conteos. No administra el '
        'catálogo.</li>'
        '<li><b>Operador</b> — mueve pedidos. Hoy <b>no tiene ninguna capacidad de Inventario</b>: '
        'el módulo no se le pinta.</li>'
        '</ul>')
    p.append(
        '<div class="callout key"><b>Regla que gobierna todo el módulo:</b> nada se decide por cómo se '
        'llama el rol. Cada ruta y cada botón preguntan por una <b>capacidad</b>. Un destino sin '
        'capacidad declarada se deniega, y cuando el sistema no puede honrar una acción, el control se '
        'deshabilita <b>con su motivo escrito</b> en vez de prometer algo que no cumple.</div>')

    p.append('<h2>Vocabulario de las figuras</h2>')
    p.append("<figure>%s</figure>" % d_leyenda())

    p.append('<h2>Rutas del módulo</h2>')
    p.append(
        '<table><thead><tr><th>Sección</th><th>Ruta</th><th>Capacidad para entrar</th>'
        '<th>Qué se hace ahí</th></tr></thead><tbody>'
        '<tr><td>Inicio</td><td><code>/inventario/inicio</code></td><td><code>inventory.read</code></td>'
        '<td>Qué pide atención: reposición, bodegas y últimos movimientos.</td></tr>'
        '<tr><td>Existencias</td><td><code>/inventario</code></td><td><code>inventory.read</code></td>'
        '<td>Catálogo, existencia por bodega y ficha de lotes.</td></tr>'
        '<tr><td>Movimientos</td><td><code>/inventario/movimientos</code></td>'
        '<td><code>inventory.read</code></td><td>El kárdex y el formulario de registro.</td></tr>'
        '<tr><td>Conteo físico</td><td><code>/inventario/auditoria</code></td>'
        '<td><code>inventory.read</code></td><td>Contar lo que hay y conciliar la diferencia.</td></tr>'
        '<tr><td>Configuración</td><td><code>/inventario/config</code></td>'
        '<td><code>settings.read</code></td><td>Unidad por defecto, bodegas y alertas.</td></tr>'
        '</tbody></table>')

    # ── 1 ─────────────────────────────────────────────────────────────────
    p.append(sec("1", "Arranque y entrada al módulo", 
                 "El onboarding solo lo hace el administrador, una vez. Los operadores entran a un "
                 "espacio ya configurado y caen directo en la ruta de llegada del módulo.",
                 d_arranque(),
                 ["El onboarding son cinco pasos: perfil, organización, módulos, Inventario (rubro y "
                  "agentes) y encuesta final.",
                  "Antes de pintar cualquier pantalla, dos guardas: el módulo debe estar activo en la "
                  "organización y la sesión debe tener la capacidad que la ruta exige.",
                  "`/inventario/inicio` es la llegada; `/inventario` es Existencias. Igual que en "
                  "Pedidos, `/pedidos/inicio` es la llegada y `/pedidos` el tablero."]))

    # ── 2 ─────────────────────────────────────────────────────────────────
    p.append(sec("2", "Las dos guardas que protegen cada ruta",
                 "Toda ruta de Inventario pasa por la misma puerta doble, en el mismo orden.",
                 d_guardas(),
                 ["<b>Guarda de pertenencia</b>: si la organización no tiene el módulo encendido, "
                  "redirige a Configuración › Módulos — no a una pantalla vacía.",
                  "<b>Guarda de capacidad</b>: si la sesión no tiene la capacidad, no se pinta la "
                  "pantalla.",
                  "Entrar a una pantalla nunca implica poder operarla. Y en este módulo la distancia "
                  "entre entrar y operar es mayor que en Pedidos: <code>/inventario/auditoria</code> "
                  "se entra con <code>inventory.read</code> y <b>todo</b> lo que hay dentro —abrir, "
                  "contar, conciliar, cancelar— exige <code>inventory.adjust</code>.",
                  "En <code>/inventario/config</code> conviven dos capacidades distintas: las "
                  "secciones General y Alertas se guardan con <code>settings.manage</code>, pero "
                  "<b>Bodegas administra el catálogo</b> y exige <code>inventory.manage</code>."]))

    # ── 3 ─────────────────────────────────────────────────────────────────
    p.append(sec("3", "El artículo: qué se guarda y qué se deriva",
                 "El módulo guarda hechos y calcula el resto. Ninguna existencia, ningún estado y "
                 "ninguna diferencia se almacenan.",
                 d_derivado(),
                 ["Un <code>Articulo</code> <b>no tiene campo de cantidad</b>, y un "
                  "<code>LoteArticulo</code> no tiene <code>cantidadDisponible</code>. La existencia "
                  "es la suma de los efectos de los movimientos, calculada cada vez.",
                  "La consecuencia práctica: registrar un movimiento cambia la existencia, el estado, "
                  "el valor y la lista de reposición <b>sin que nadie los actualice</b>. No hay "
                  "sincronización que pueda fallar porque no hay nada que sincronizar.",
                  "<b>Articulo no es CatalogoItem.</b> El artículo responde a «¿qué tengo, dónde y "
                  "cuánto me costó?»; el catálogo de Pedidos responde a «¿qué vendo y a cuánto?». No "
                  "comparten clave ni campo, y esa separación está fijada por un test que lee los "
                  "fuentes y exige cero imports cruzados en los dos sentidos.",
                  "<b>Deuda declarada:</b> un pedido <b>no descuenta stock</b>. Es el disparador "
                  "anotado: cuando el negocio pida «que un pedido descuente stock», la independencia "
                  "dejará de ser posible y habrá que decidir el dueño del catálogo."]))

    # ── 4 ─────────────────────────────────────────────────────────────────
    p.append(sec("4", "El kárdex: una sola fórmula para cinco casos",
                 "Todo movimiento es una transferencia de cantidad entre dos sitios, uno de los "
                 "cuales puede ser el exterior.",
                 d_formula(),
                 ["La dirección la dan los extremos, no el tipo. Por eso una transferencia resta en "
                  "origen y suma en destino <b>sin ningún caso especial</b>.",
                  "«Traslado» es la transferencia con otro nombre. Quien llegue buscando "
                  "<code>TRASLADO</code>, <code>almacenOrigenId</code> o <code>usuarioId</code> está "
                  "buscando esto: <code>transferencia</code>, <code>origenId</code> y "
                  "<code>actor</code>.",
                  "Un ajuste <b>exige motivo</b> y es la única acción del módulo que reescribe lo que "
                  "el sistema cree que hay sin un hecho externo que lo respalde. Sin motivo sería una "
                  "escritura que nadie puede auditar después."]))

    # ── 5 ─────────────────────────────────────────────────────────────────
    p.append(sec("5", "Estados de existencias y umbrales",
                 "Cuatro estados finos, tres niveles, y una banda de aviso que solo puede estrecharse.",
                 d_estados(),
                 ["El dominio distingue cuatro estados porque la reposición necesita saber si ya se "
                  "tocó el suelo o si solo se pasó el aviso. El operador decide con tres.",
                  "<code>nivelDeStock</code> vive en el dominio para que la página, el filtro y los "
                  "selectores agrupen igual: dos definiciones de «crítico» darían dos cifras distintas "
                  "del mismo almacén.",
                  "<b>Cuidado con la etiqueta:</b> «por debajo del mínimo» (el número del panel) "
                  "incluye los agotados; «bajo mínimo» (el badge) no. La pantalla llegó a mostrar 3 "
                  "arriba y 2 abajo con la misma palabra, y los dos números eran correctos."]))

    # ── 6 ─────────────────────────────────────────────────────────────────
    p.append(sec("6", "Registrar un movimiento",
                 "El único camino por el que entra un movimiento al kárdex, y es fail-closed.",
                 d_movimiento(),
                 ["El formulario ofrece los cuatro tipos, menos <code>ajuste</code> si falta su "
                  "capacidad: se filtra la <b>lista</b> en vez de dejar elegir y fallar al enviar. "
                  "Ofrecer un formulario que produce un rechazo garantizado es una trampa.",
                  "«Motivo» aparece en el ajuste, donde el dominio lo <b>exige</b>, y en la "
                  "transferencia, donde es opcional: ahí sí hay un hecho externo que respalda el "
                  "movimiento.",
                  "La cantidad se valida contra la existencia de la bodega de <b>origen</b>. Validar "
                  "contra el total del artículo dejaría retirar de una bodega vacía lo que sobra en "
                  "otra."]))

    # ── 7 ─────────────────────────────────────────────────────────────────
    p.append(sec("7", "Las seis reglas de validación",
                 "Y una séptima que es la que más importa: nunca dejar stock negativo.",
                 d_reglas(),
                 ["La validación vive en el dominio y la llama el store. Duplicarla en el formulario "
                  "crearía un segundo cálculo que puede discrepar del real.",
                  "El resultado nunca es un <code>false</code> pelado: es "
                  "<code>{ ok: false, motivo }</code>. La UI no pinta un botón gris sin explicación, "
                  "pinta el motivo.",
                  "Un control deshabilitado no es una regla: la guarda del store es la que sostiene el "
                  "invariante. El botón solo evita el viaje."]))

    # ── 8 ─────────────────────────────────────────────────────────────────
    p.append(sec("8", "Lotes y despacho FEFO",
                 "De qué queda y hasta cuándo — la pregunta que decide qué se despacha primero.",
                 d_fefo(),
                 ["La disponibilidad de un lote <b>tampoco se guarda</b>: es "
                  "<code>cantidadInicial</code> más el efecto de los movimientos etiquetados con ese "
                  "lote. Un lote consumido del todo da 0, y uno al que le devolvieron mercancía puede "
                  "subir: el número es lo que el kárdex dice, no una cuenta regresiva.",
                  "FEFO devuelve los lotes necesarios para cubrir la cantidad pedida, incluido el que "
                  "cruza la línea. Si hacen falta 25 y hay 20 y 20, devuelve los dos, no uno y medio.",
                  "Un artículo sin lotes es un estado legítimo, no un catálogo incompleto: no todo se "
                  "rastrea por vencimiento.",
                  "<b>Deuda declarada:</b> un ajuste de auditoría no se etiqueta con lote, así que "
                  "después de conciliar la existencia del artículo y la suma de sus lotes pueden "
                  "separarse hasta el siguiente movimiento etiquetado. Un test lo fija para que la "
                  "limitación se vea en vez de descubrirse."]))

    # ── 9 ─────────────────────────────────────────────────────────────────
    p.append(sec("9", "Vencimientos: las bandas de urgencia",
                 "Se comparan días de calendario, y el día del vencimiento el producto todavía sirve.",
                 d_vencimientos(),
                 ["<code>dias === 0</code> es «crítico», no «vencido». La convención contraria "
                  "retiraría mercancía buena un día antes.",
                  "Una fecha ilegible devuelve <code>null</code> y no un número: un vencimiento "
                  "ilegible no es «vence hoy» ni «no vence», y colapsarlo haría que el lote pasara por "
                  "bueno o por vencido según la dirección en que se redondeara.",
                  "Un lote ya agotado no entra en el aviso aunque esté vencido: no hay nada que "
                  "retirar de él, y una alerta sobre mercancía que ya no está enseña a ignorar las "
                  "alertas."]))

    # ── 10 ────────────────────────────────────────────────────────────────
    p.append(sec("10", "El conteo físico",
                 "La única pantalla donde el operador contradice al sistema con un hecho.",
                 d_conteo(),
                 ["Abrir, contar, conciliar y cancelar piden <b>la misma</b> capacidad, "
                  "<code>inventory.adjust</code>. Es deliberado y es grueso: el producto de este flujo "
                  "es un ajuste, y un conteo que quien lo llenó no puede aplicar es un formulario a "
                  "medias con dueño.",
                  "El botón de conciliar se apaga con <code>motivoNoConciliable</code>, la misma "
                  "función que usa el store para rechazar: el texto que explica el botón apagado es "
                  "literalmente el que saldría al pulsarlo. Pero manda el del store — una pantalla no "
                  "es una regla.",
                  "<b>Cancelar no escribe nada.</b> Cancelar es abandonar el conteo, no aplicarlo: si "
                  "cancelar ajustara, el botón «cancelar» sería una segunda forma de conciliar con "
                  "otro nombre.",
                  "<b>Deuda declarada:</b> contar con <code>inventory.move</code> y conciliar con "
                  "<code>inventory.adjust</code> sería defendible, pero parte el flujo en dos personas "
                  "y ninguna de las dos ve el estado completo."]))

    # ── 11 ────────────────────────────────────────────────────────────────
    p.append(sec("11", "El panel de Inicio",
                 "No es el listado completo ni el kárdex: responde a qué hay que reponer ahora mismo.",
                 d_inicio(),
                 ["Las cuatro cifras salen del kárdex a través del store. La única aritmética propia "
                  "de la página es <code>existencia × costoUnitario</code>, que es una valoración de "
                  "presentación, no una existencia.",
                  "Una bodega sin existencias sigue apareciendo en la tabla: existe, lo que no tiene "
                  "es mercancía.",
                  "La lista de reposición ordena por urgencia y desempata por nombre. Sin el "
                  "desempate, dos artículos agotados saldrían en el orden del array, que cambia al "
                  "registrar un movimiento — y una lista de trabajo que se reordena sola no se puede "
                  "seguir con el dedo."]))

    # ── 12 ────────────────────────────────────────────────────────────────
    p.append(sec("12", "Quién puede mover el inventario",
                 "El destino y el botón deciden por capacidad. No existe ninguna comprobación del "
                 "tipo «es administrador».",
                 d_permisos(),
                 ["El catálogo tiene cuatro capacidades de Inventario: <code>read</code>, "
                  "<code>manage</code>, <code>move</code> y <code>adjust</code>. Ninguna superficie "
                  "escribe una etiqueta de capacidad a mano: todas salen de la misma tabla.",
                  "«Bodega» es el rol que describe a quien opera un almacén, y se añadió porque el "
                  "catálogo era enteramente centrado en pedidos y <b>ninguno describía ese trabajo</b>.",
                  "El administrador es un rol normal con todas las capacidades. No hay una rama "
                  "especial para él en ninguna comprobación."]))

    # ── 13 ────────────────────────────────────────────────────────────────
    p.append(sec("13", "WhatsApp: la consulta del inventario",
                 "El módulo todavía no tiene WhatsApp. Su función prevista es de consulta: que el "
                 "dueño pueda preguntar por sus existencias y sus estados. Hoy no existe.",
                 d_whatsapp(),
                 ["<b>El catálogo de la plataforma ya lo promete</b> y el sistema todavía no lo "
                  "cumple. Es exactamente el defecto que este repo persigue: una superficie que "
                  "afirma algo que el sistema no puede sostener.",
                  "El bot de WhatsApp que existe es <code>BotPedidos</code>, y su alcance declara en "
                  "voz alta que <b>no lee <code>necto.articulo</code></b>: el catálogo de venta y el "
                  "inventario son dos cosas distintas y el bot no las conecta.",
                  "Lo que <b>sí</b> existe y responde a las mismas preguntas son las cinco "
                  "herramientas del asistente —<code>getExistencias</code>, <code>getBajoMinimo</code>, "
                  "<code>getAgotados</code>, <code>getValorInventario</code> y "
                  "<code>getMovimientosRecientes</code>—, todas de lectura y todas con "
                  "<code>inventory.read</code>. Son la base natural de la consulta por WhatsApp, pero "
                  "viven en el navegador: leen <code>inventarioStore</code>, que es memoria del "
                  "frontend.",
                  "El obstáculo de fondo no es el bot: es que <b>el kárdex no se persiste</b>. Solo "
                  "la configuración va a <code>necto.inventarioConfig</code>. Un bot que corre en "
                  "<code>srv.api</code> no puede leer MobX, así que hoy no tendría qué consultar."],
                 pb=True))

    # ── Pendientes ────────────────────────────────────────────────────────
    p.append('<div class="pb"></div>')
    p.append('<h2>Pendientes y deuda visible</h2>')
    p.append(
        '<div class="callout key">Escrito, no escondido. Cada punto está comprobado en el código; '
        'ninguno se apoya en lo que el sistema «debería» hacer.</div>')
    p.append('<div class="notes"><ul>'
             '<li><b>La consulta de inventario por WhatsApp no existe.</b> El catálogo de la '
             'plataforma ya la ofrece en la ficha del conector («Habilita consultas de disponibilidad '
             'de productos por WhatsApp»), y el bot que hay —<code>BotPedidos</code>— declara que no '
             'lee <code>necto.articulo</code>. Falta fuente en el servidor, un modo de consulta, '
             'decidir quién pregunta y retirar el beneficio que promete precios de venta.</li>'
             '<li><b>El kárdex no persiste.</b> Vive en memoria; solo la configuración va a '
             '<code>necto.inventarioConfig</code>. Un recargue devuelve el almacén al seed. Es '
             'defendible que un kárdex sobreviva, pero la coherencia pide revisarlo también en '
             'Pedidos y eso es otro trabajo.</li>'
             '<li><b>Un pedido no descuenta stock.</b> El catálogo de venta y el inventario son dos '
             'agregados que solo comparten el nombre. Disparador declarado: cuando el negocio pida '
             'que un pedido descuente, habrá que decidir el dueño del catálogo.</li>'
             '<li><b>El ajuste de auditoría no se etiqueta con lote.</b> En un artículo con lotes, '
             'después de conciliar la existencia del artículo y la suma de sus lotes pueden '
             'separarse. Resolverlo exige contar por lote, que cambia la forma del conteo.</li>'
             '<li><b>Un lote no se transfiere entre bodegas.</b> Mover mercancía de una bodega a otra '
             'mueve la existencia del artículo pero no reubica sus lotes.</li>'
             '<li><b>Las variantes (talla/color) están fuera de v1.</b> Una variante real necesita SKU '
             'propio y stock propio; declarar <code>variantes: [«M», «L»]</code> sin darle identidad a '
             'cada una haría que dos tallas compartieran una única cifra de existencia.</li>'
             '<li><b>El conteo no se puede repartir.</b> Contar y conciliar exigen la misma capacidad, '
             'así que quien cuenta es quien aplica. Partirlo en dos personas dejaría a ninguna de las '
             'dos viendo el estado completo.</li>'
             '</ul></div>')

    p.append('<footer>Inventario · NECTO — documento de flujo funcional. Generado desde el código de '
             '<code>packages/apps/web/modules/app/src</code>.</footer>')
    p.append("</div></body></html>")
    return "".join(p)


if __name__ == "__main__":
    out = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "outputs",
                                        "inventario-diagramas-flujo.html"))
    with open(out, "w", encoding="utf-8") as f:
        f.write(build())
    print("OK ->", out, os.path.getsize(out), "bytes")
