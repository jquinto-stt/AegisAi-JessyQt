# -*- coding: utf-8 -*-
"""
Genera 'Módulo de Pedidos — Diagramas de flujo' (HTML autocontenido, imprimible a A4).
El contenido refleja el código real de packages/apps/web/modules/app/src.
"""
import os

# Paleta NECTO, reponderada.
#   · El acento ESTRUCTURAL es el INDIGO: todo el trazado normal del flujo
#     (procesos, decisiones, flechas, numeración, filete de título).
#   · El CELESTE da el acento de marca: inicio/fin, carriles, etiquetas.
#   · El NARANJA queda RESERVADO a excepción: cancelar, reintentar, error.
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
ORANGE    = "#FF3C10"   # SOLO excepción
PEACH     = "#FFF4F0"   # fondo de excepción
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
            s.append(rect(x + 4, 16, 70, 42, 21))
        elif kind == "terminal":
            s.append(rect(x + 4, 16, 70, 42, 9, INDIGO, INDIGO))
        elif kind == "note":
            s.append(rect(x + 4, 16, 70, 42, 8, GRAY, GRAYB, 1.2, dash="5 4"))
        else:
            s.append(rect(x + 4, 16, 70, 42, 9))
        s.append(T(x + 39, 74, label, 11, BODY, 500))
        x += 155
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D1 · Arranque y entrada al módulo
# ══════════════════════════════════════════════════════════════════════════
def d_arranque():
    s = [begin(900, 940)]
    s.append(node(290, 24, 180, 44, "Login  /login", kind="start"))
    s.append(elbow([(380, 68), (380, 104)]))

    s.append(diamond(230, 104, 300, 96, ["¿Ya existe un espacio", "configurado?"]))
    s.append(T(396, 224, "No", 11.5, BODY, 600, anchor="start"))
    s.append(elbow([(380, 200), (380, 240)]))

    # Onboarding container
    s.append(rect(210, 240, 340, 284, 12, "#FCFCFD", GRAYB, 1.3, dash="6 5"))
    s.append(T(380, 264, "Onboarding  ·  solo el administrador", 11, BODY, 600))
    pasos = ["1 · Perfil", "2 · Organización", "3 · Módulos", "4 · Pedidos (rubro y agentes)", "5 · Encuesta final"]
    y = 282
    for i, p in enumerate(pasos):
        s.append(node(232, y, 296, 34, p, kind="process"))
        if i < len(pasos) - 1:
            s.append(elbow([(380, y + 34), (380, y + 48)], r=0))
        y += 48
    s.append(elbow([(380, 524), (380, 566)]))

    # Sí bypass
    s.append(elbow([(530, 152), (790, 152), (790, 566), (386, 566)]))
    s.append(T(640, 142, "Sí", 11.5, BODY, 600))

    s.append('<circle cx="380" cy="566" r="4" fill="%s"/>' % INK)
    s.append(elbow([(380, 566), (380, 586)]))

    s.append(diamond(230, 586, 300, 96, ["¿El módulo «Pedidos»", "está activo?"]))
    s.append(node(20, 606, 190, 56, "Configuración › Módulos", kind="io"))
    s.append(elbow([(230, 634), (216, 634)]))
    s.append(T(224, 624, "No", 11, BODY, 600, anchor="end"))

    s.append(elbow([(380, 682), (380, 718)]))
    s.append(T(392, 708, "Sí", 11.5, BODY, 600, anchor="start"))

    s.append(diamond(230, 718, 300, 96, ["¿La sesión tiene", "orders.read?"]))
    s.append(node(20, 738, 190, 56, "Pantalla sin permiso", kind="io"))
    s.append(elbow([(230, 766), (216, 766)]))
    s.append(T(224, 756, "No", 11, BODY, 600, anchor="end"))

    s.append(elbow([(380, 814), (380, 850)]))
    s.append(T(392, 840, "Sí", 11.5, BODY, 600, anchor="start"))
    s.append(node(250, 850, 260, 48, "/pedidos/inicio", kind="terminal"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D2 · Las dos guardas de cada ruta
# ══════════════════════════════════════════════════════════════════════════
def d_guardas():
    s = [begin(940, 300)]
    s.append(node(40, 118, 170, 60, "Ruta solicitada", "p. ej. /pedidos/crear", kind="process"))
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
# D3 · Ciclo de vida del pedido
# ══════════════════════════════════════════════════════════════════════════
def d_ciclo():
    s = [begin(760, 812)]
    x, w = 280, 200
    cx = x + w / 2.0
    estados = [
        ("Programado", "agendado a futuro", False),
        ("Nuevo", "pendiente de pago", False),
        ("Confirmado", "pago confirmado", False),
        ("En preparación", "cocina o empaque", False),
        ("Listo", "listo para entregar", False),
        ("En camino", "solo si es domicilio", False),
    ]
    ys = [70 + i * 94 for i in range(7)]
    for i, (t, sub, _) in enumerate(estados):
        s.append(node(x, ys[i], w, 56, t, sub))
        if i < len(estados) - 1:
            s.append(elbow([(cx, ys[i] + 56), (cx, ys[i + 1])]))
    s.append(node(x, ys[6], w, 56, "Entregado", "terminal", kind="terminal"))

    # notas de entrada
    s.append(T(252, 92, "nace aquí si se programa", 11, BODY, 500, anchor="end"))
    s.append(T(252, 108, "para una hora futura", 11, BODY, 500, anchor="end"))
    s.append(T(252, 186, "llega del bot o del", 11, BODY, 500, anchor="end"))
    s.append(T(252, 202, "mostrador", 11, BODY, 500, anchor="end"))

    # raíl de cancelación
    rail = 580
    s.append(line(rail, 98, rail, 700, ORANGE, dash="5 4", sw=1.4))
    s.append(T(rail + 10, 88, "cancelar", 11.5, ORANGE, 600, anchor="start"))
    s.append(T(rail + 10, 104, "desde cualquier estado", 10.5, BODY, 400, anchor="start"))
    s.append(T(rail + 10, 118, "no terminal", 10.5, BODY, 400, anchor="start"))
    for i in range(6):
        s.append(line(x + w, ys[i] + 28, rail, ys[i] + 28, ORANGE, dash="4 4", sw=1.2))
    s.append(node(460, 706, 240, 56, "Cancelado", "terminal", kind="terminal"))
    s.append(elbow([(rail, 700), (rail, 706)], kind="orange"))

    # reintento (única transición hacia atrás)
    s.append(elbow([(x, 568), (196, 568), (196, 474), (x, 474)], kind="orange",
                   color=ORANGE, label="reintentar entrega", lx=190, ly=524, lanchor="end",
                   lcolor=ORANGE))
    s.append(T(190, 540, "vuelve a «Listo»", 10.5, BODY, 400, anchor="end"))

    s.append(T(380, 796, "Los estados «Confirmado» y «En camino» se pueden apagar en Configuración; "
                          "el pedido entonces los salta.", 11, BODY, 500))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D4 · Dos formas de que entre un pedido
# ══════════════════════════════════════════════════════════════════════════
def d_origenes():
    s = [begin(900, 330)]
    s.append(node(60, 30, 260, 66, "Cliente por WhatsApp", "canal externo · lo atiende el bot"))
    s.append(node(580, 30, 260, 66, "Operador en el mostrador", "formulario /pedidos/crear"))
    s.append(elbow([(190, 96), (190, 160), (390, 160), (390, 190)], arrow=True))
    s.append(elbow([(710, 96), (710, 160), (510, 160), (510, 190)], arrow=True))
    s.append(T(190, 152, "el bot toma el pedido", 11, BODY, 500, anchor="start"))
    s.append(T(710, 152, "lo carga el operador", 11, BODY, 500, anchor="end"))
    s.append(node(300, 190, 300, 66, "Pedido en el tablero", "estado Nuevo · origen whatsapp | operador",
                  kind="terminal"))
    s.append(T(450, 288, "`origen` (de dónde viene) es independiente de `modalidad` (cómo se entrega) "
                          "y de `estado` (en qué punto va).", 11.5, BODY, 500))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D5 · Bot: qué hacer con el mensaje
# ══════════════════════════════════════════════════════════════════════════
def d_bot_decision():
    s = [begin(1000, 900)]
    mx, mw = 250, 300
    cx = mx + mw / 2.0
    rx, rw = 640, 340
    lx, lw = 20, 210
    ys = [92 + i * 120 for i in range(6)]

    s.append(node(310, 24, 180, 44, "Mensaje entrante", kind="start"))
    s.append(elbow([(400, 68), (400, 92)]))

    preguntas = [
        ["¿El hilo está en", "modo humano?"],
        ["¿Es un mensaje", "propio del bot?"],
        ["¿Pide hablar con", "una persona?"],
        ["¿El mensaje", "trae texto?"],
        ["¿Parece consulta", "sobre un pedido?"],
        ["¿Cuántos pedidos", "activos tiene?"],
    ]
    for i, q in enumerate(preguntas):
        s.append(diamond(mx, ys[i], mw, 88, q))
        if i < 5:
            s.append(elbow([(cx, ys[i] + 88), (cx, ys[i + 1])]))

    # ramas derechas
    der = [
        (0, ["El bot calla:", "lo atiende un asesor"], "Sí"),
        (1, ["Se descarta:", "anti-bucle"], "Sí"),
        (2, ["Handoff:", "pasa a un asesor humano"], "Sí"),
        (3, ["Handoff:", "solo entiende texto"], "No"),
        (4, None, "No"),
    ]
    for idx, texto, lab in der:
        y = ys[idx] + 44
        if texto:
            s.append(node(rx, y - 26, rw, 52, texto, kind="io"))
            s.append(elbow([(mx + mw, y), (rx - 6, y)]))
            s.append(T(mx + mw + 8, y - 8, lab, 11, BODY, 600, anchor="start"))

    # rama 5: quiere comprar
    s.append(diamond(rx, ys[4], rw, 88, ["¿Quiere comprar o", "ver el catálogo?"]))
    s.append(elbow([(mx + mw, ys[4] + 44), (rx - 6, ys[4] + 44)]))
    s.append(node(rx, 700, rw, 52, "Inicia la toma de pedido", "ver diagrama 6", kind="io"))
    s.append(node(rx, 772, rw, 52, "Saluda, se presenta", "y se queda a la espera", kind="io"))
    s.append(elbow([(rx + rw / 2, ys[4] + 88), (rx + rw / 2, 676), (rx + 110, 676), (rx + 110, 700)]))
    s.append(elbow([(rx + rw / 2, 676), (rx + 250, 676), (rx + 250, 772)]))
    s.append(T(rx + 96, 668, "Sí", 11, BODY, 600, anchor="end"))
    s.append(T(rx + 264, 668, "No", 11, BODY, 600, anchor="start"))

    # rama 6: izquierda
    s.append(node(lx, 638, lw, 52, "Pide el número del pedido", "varios activos", kind="warn"))
    s.append(node(lx, 710, lw, 52, "Handoff: no puede verificar", "ninguno activo", kind="io"))
    s.append(elbow([(238, ys[5] + 44), (238, 664), (lx + lw + 4, 664)]))
    s.append(elbow([(238, ys[5] + 44), (238, 736), (lx + lw + 4, 736)]))
    s.append(T(248, 654, "varios", 10.5, BODY, 500, anchor="start"))
    s.append(T(248, 726, "ninguno", 10.5, BODY, 500, anchor="start"))

    s.append(elbow([(cx, ys[5] + 88), (cx, 812)]))
    s.append(T(cx + 12, 800, "uno", 11, BODY, 600, anchor="start"))
    s.append(node(280, 812, 240, 56, "Responde con la", "plantilla del estado", kind="terminal"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D6 · Bot: toma de pedido paso a paso
# ══════════════════════════════════════════════════════════════════════════
def d_bot_toma():
    s = [begin(900, 470)]
    s.append(rect(30, 24, 840, 46, 10, INDIGO_L, INDIGO, 1.3))
    s.append(T(450, 53, "Antes de empezar: si el cliente ya tiene un pedido activo, el bot no abre otro — se lo dice.",
               12, INDIGO, 600))

    w, gap = 120, 16
    xs = [40 + i * (w + gap) for i in range(6)]
    steps = [
        ("Elegir ítems", "catálogo numerado"),
        ("Elegir cantidad", "entero, 1 a 999"),
        ("Elegir modalidad", "retiro · domicilio · en sitio"),
        ("Elegir dirección", "solo si es domicilio"),
        ("Confirmar", "resumen + total"),
    ]
    y = 200
    for i, (t, sub) in enumerate(steps):
        s.append(node(xs[i], y, w, 78, t, sub))
        s.append(elbow([(xs[i] + w, y + 39), (xs[i + 1], y + 39)]))
    s.append(node(xs[5], y, w, 78, "Pedido creado", "estado Nuevo", kind="terminal"))
    s.append(T(xs[5] - 10, y - 10, "sí", 11, BODY, 600, anchor="end"))

    # bucles
    for i in (0, 1):
        c = xs[i] + w / 2.0
        s.append(elbow([(c - 22, y), (c - 22, 156), (c + 22, 156), (c + 22, y)], r=10, kind="orange",
                       color=ORANGE, arrow=True))
    s.append(T(xs[0] + w / 2.0, 146, "no está en el catálogo", 10.5, BODY, 500))
    s.append(T(xs[1] + w / 2.0, 146, "cantidad inválida", 10.5, BODY, 500))

    # descarte
    s.append(elbow([(xs[4] + w / 2.0, y + 78), (xs[4] + w / 2.0, 350)]))
    s.append(T(xs[4] + w / 2.0 + 12, 330, "no", 11, BODY, 600, anchor="start"))
    s.append(node(xs[4] + w / 2.0 - 110, 350, 220, 56, "Borrador descartado", "no se crea nada",
                  kind="io"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D7 · Pedido creado por el operador
# ══════════════════════════════════════════════════════════════════════════
def d_operador():
    s = [begin(900, 980)]
    x, w = 250, 320
    cx = x + w / 2.0
    s.append(node(320, 20, 180, 44, "Nuevo pedido", kind="start"))
    s.append(elbow([(410, 64), (410, 92)]))

    pasos = [
        ("1 · Datos del cliente", "nombre y teléfono de WhatsApp"),
        ("2 · Modalidad de entrega", "retiro · domicilio · en sitio"),
    ]
    y = 92
    for t, sub in pasos:
        s.append(node(x, y, w, 62, t, sub))
        s.append(elbow([(cx, y + 62), (cx, y + 86)]))
        y += 86

    s.append(diamond(x, y, w, 84, "¿Es domicilio?"))
    s.append(node(30, y + 14, 190, 56, "3 · Dirección", "y costo de envío", kind="warn"))
    s.append(elbow([(x, y + 42), (224, y + 42)], kind="indigo", color=INDIGO, dash="5 4"))
    s.append(T(x - 8, y + 32, "Sí", 11, INDIGO, 600, anchor="end"))
    s.append(elbow([(cx, y + 84), (cx, y + 108)]))
    s.append(T(cx + 12, y + 102, "No", 11, BODY, 600, anchor="start"))
    y += 108

    s.append(diamond(x, y, w, 84, ["¿Es en sitio y tiene", "table_service?"]))
    s.append(node(30, y + 14, 190, 56, "3 · Mesa", "o ubicación en salón", kind="warn"))
    s.append(elbow([(x, y + 42), (224, y + 42)], kind="indigo", color=INDIGO, dash="5 4"))
    s.append(T(x - 8, y + 32, "Sí", 11, INDIGO, 600, anchor="end"))
    s.append(elbow([(cx, y + 84), (cx, y + 108)]))
    s.append(T(cx + 12, y + 102, "No", 11, BODY, 600, anchor="start"))
    y += 108

    for t, sub in [
        ("4 · Ítems del catálogo", "del catálogo del rubro"),
        ("5 · Método de pago", "efectivo · transferencia · tarjeta · contra entrega"),
        ("6 · Notas y programación", "opcional"),
    ]:
        s.append(node(x, y, w, 62, t, sub))
        s.append(elbow([(cx, y + 62), (cx, y + 86)]))
        y += 86

    s.append(diamond(x, y, w, 84, ["¿Se programó para", "una hora futura?"]))
    s.append(node(30, y + 14, 190, 56, "Nace Programado", "se activa solo", kind="terminal"))
    s.append(elbow([(x, y + 42), (224, y + 42)], kind="indigo", color=INDIGO))
    s.append(T(x - 8, y + 32, "Sí", 11, BODY, 600, anchor="end"))
    s.append(elbow([(cx, y + 84), (cx, y + 110)]))
    s.append(T(cx + 12, y + 104, "No", 11, BODY, 600, anchor="start"))
    s.append(node(cx - 130, y + 110, 260, 52, "Nace Nuevo", "y aparece en el tablero",
                  kind="terminal"))
    s.append(T(450, y + 200, "El número de paso cambia: los pasos condicionales (3) desplazan a los siguientes.",
               11, BODY, 500))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D8 · Quién puede mover el pedido
# ══════════════════════════════════════════════════════════════════════════
def d_capacidades():
    s = [begin(900, 430)]
    s.append(T(30, 30, "El pedido se mueve por CAPACIDAD, no por nombre de rol", 13.5, INDIGO, 600,
               anchor="start"))
    filas = [
        ("Confirmado", "orders.confirm"),
        ("En preparación", "preparation.manage"),
        ("Listo", "preparation.manage"),
        ("En camino", "preparation.manage"),
        ("Entregado", "preparation.manage"),
        ("Cancelado", "orders.cancel"),
    ]
    y = 62
    s.append(rect(30, y, 380, 40, 8, "#F0EEFB", INDIGO, 1.2))
    s.append(T(50, y + 26, "Estado destino", 12, INDIGO, 600, anchor="start"))
    s.append(T(390, y + 26, "Capacidad exigida", 12, INDIGO, 600, anchor="end"))
    y += 40
    for i, (e, c) in enumerate(filas):
        s.append(rect(30, y, 380, 40, 0, WHITE if i % 2 == 0 else "#FAFAFC", GRAYB, 1))
        s.append(T(50, y + 26, e, 12, INK, 500, anchor="start"))
        s.append(T(390, y + 26, c, 12, CELESTE_D, 600, anchor="end"))
        y += 40

    s.append(rect(460, 62, 410, 238, 10, GRAY, GRAYB, 1.2, dash="5 4"))
    s.append(T(482, 90, "Otras capacidades del módulo", 12, INK, 600, anchor="start"))
    otras = [
        "orders.read — entrar a Inicio, Tablero, Historial y Analítica",
        "orders.create — entrar a Crear pedido",
        "settings.read / settings.manage — ver y guardar Configuración",
        "channels.read / channels.respond — ver y responder conversaciones",
        "assistant.use — usar el Asistente",
        "orders.edit y orders.delete — reservadas, sin interfaz",
    ]
    yy = 118
    for o in otras:
        s.append('<circle cx="488" cy="%.1f" r="2.6" fill="%s"/>' % (yy - 4, INDIGO))
        s.append(T(500, yy, o, 11, BODY, 400, anchor="start"))
        yy += 30
    s.append(T(30, 412, "Un destino sin capacidad declarada se deniega: el sistema falla cerrado.",
               11.5, BODY, 500, anchor="start"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D9 · Aviso al cliente
# ══════════════════════════════════════════════════════════════════════════
def d_aviso():
    s = [begin(940, 660)]
    mx, mw = 230, 320
    cx = mx + mw / 2.0
    rx, rw = 620, 300
    s.append(node(300, 20, 180, 44, "El pedido avanza", kind="start"))
    s.append(elbow([(390, 64), (390, 92)]))

    qs = [
        ["¿El estado destino", "tiene plantilla?"],
        ["¿La plantilla", "está escrita?"],
        ["¿El cliente tiene", "un hilo abierto?"],
    ]
    ys = [92 + i * 128 for i in range(3)]
    for i, q in enumerate(qs):
        s.append(diamond(mx, ys[i], mw, 88, q))
        if i < 2:
            s.append(elbow([(cx, ys[i] + 88), (cx, ys[i + 1])]))
    salidas = [
        (0, ["No se envía nada:", "«Nuevo» y «Programado» no avisan"], "No"),
        (1, ["No se envía un", "mensaje vacío"], "No"),
        (2, ["No se inventa", "una conversación"], "No"),
    ]
    for idx, texto, lab in salidas:
        y = ys[idx] + 44
        s.append(node(rx, y - 26, rw, 52, texto, kind="io"))
        s.append(elbow([(mx + mw, y), (rx - 6, y)]))
        s.append(T(mx + mw + 8, y - 8, lab, 11, BODY, 600, anchor="start"))

    s.append(elbow([(cx, ys[2] + 88), (cx, 496)]))
    s.append(T(cx + 12, 484, "Sí", 11, BODY, 600, anchor="start"))
    s.append(node(190, 496, 400, 60, "Se publica la plantilla en el hilo del cliente",
                  "autor bot · marcado como «pedidos»", kind="terminal"))
    s.append(T(470, 596, "La plantilla se lee en el momento del envío, no al arrancar: si el dueño "
                          "edita el texto, el siguiente aviso ya sale nuevo.", 11.5, BODY, 500))
    s.append(T(470, 618, "El aviso se dispara solo desde los envoltorios (avanzar, mover, cancelar, "
                          "confirmar pago): una mutación directa no notifica.", 11.5, BODY, 500))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D10 · Novedad de entrega
# ══════════════════════════════════════════════════════════════════════════
def d_novedad():
    s = [begin(940, 600)]
    s.append(node(370, 20, 200, 48, "Entrega fallida", kind="start"))
    s.append(elbow([(470, 68), (470, 104)]))
    s.append(node(290, 104, 360, 62, "1 · Se anexa la nota al pedido",
                  "primero: mover el estado puede rechazarse"))
    s.append(elbow([(470, 166), (470, 202)]))
    s.append(diamond(320, 202, 300, 84, "¿Cuál es el desenlace?"))

    # rama izquierda: reintentar
    s.append(elbow([(320, 244), (180, 244), (180, 330)]))
    s.append(T(188, 234, "Reintentar", 11, BODY, 600, anchor="end"))
    s.append(node(40, 330, 280, 62, "2 · El pedido vuelve a «Listo»", "sin avisar al cliente"))
    s.append(T(180, 420, "Repetir «tu pedido está listo»", 11, BODY, 500))
    s.append(T(180, 438, "por el mismo pedido sería ruido.", 11, BODY, 500))

    # rama derecha: cancelar
    s.append(elbow([(620, 244), (760, 244), (760, 330)]))
    s.append(T(752, 234, "Cancelar", 11, BODY, 600, anchor="start"))
    s.append(node(620, 330, 300, 62, "2 · El pedido pasa a «Cancelado»", "estado terminal",
                  kind="terminal"))
    s.append(elbow([(770, 392), (770, 420)]))
    s.append(diamond(660, 420, 220, 80, "¿El origen es", "whatsapp?"))
    s.append(elbow([(660, 460), (540, 460), (540, 500)]))
    s.append(T(548, 450, "No", 11, BODY, 600, anchor="start"))
    s.append(node(340, 500, 250, 48, "No hay hilo: no se avisa", kind="io"))
    s.append(elbow([(770, 500), (770, 516)]))
    s.append(T(782, 490, "Sí", 11, BODY, 600, anchor="start"))
    s.append(node(620, 516, 300, 56, "Se avisa al cliente", "plantilla de cancelación",
                  kind="terminal"))
    s.append(T(470, 592, "El reintento no avisa; la cancelación sí. Y solo avisa si el pedido "
                         "vino de WhatsApp.", 11.5, BODY, 500))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D11 · Secuencia de punta a punta
# ══════════════════════════════════════════════════════════════════════════
def d_secuencia():
    s = [begin(940, 700)]
    cols = [("Cliente", 120, CELESTE), ("Bot WhatsApp", 380, INDIGO),
            ("Sistema · pedidos", 620, CELESTE_D), ("Operador", 860, INK)]
    for name, x, col in cols:
        s.append(rect(x - 90, 20, 180, 46, 9, col, col, 1.4))
        s.append(T(x, 48, name, 12, "#0B4A52" if col == CELESTE else WHITE, 600))
        s.append(line(x, 66, x, 660, GRAYB, dash="5 5", sw=1.2))

    msgs = [
        (120, 380, "«Quiero pedir»", "solid"),
        (380, 120, "catálogo numerado", "dash"),
        (120, 380, "ítems y cantidades", "solid"),
        (380, 120, "¿retiro, domicilio o en sitio?", "dash"),
        (120, 380, "domicilio + dirección", "solid"),
        (380, 120, "resumen y total", "dash"),
        (120, 380, "«sí, confirmo»", "solid"),
        (380, 620, "crea el pedido → estado Nuevo", "solid"),
        (380, 120, "«tu pedido P-014 quedó creado»", "dash"),
        (620, 860, "aparece en el tablero", "dash"),
        (860, 620, "confirma el pago → Confirmado", "solid"),
        (620, 120, "plantilla «confirmado»", "dash"),
        (860, 620, "En preparación → Listo → En camino → Entregado", "solid"),
        (620, 120, "plantilla de cada estado", "dash"),
    ]
    y = 100
    for x1, x2, txt, style in msgs:
        col = INK if style == "solid" else BODY
        s.append(elbow([(x1, y), (x2, y)], r=0, dash=None if style == "solid" else "5 4",
                       color=col, kind="ink"))
        mid = (x1 + x2) / 2.0
        s.append(T(mid, y - 9, txt, 11, col, 500))
        y += 38
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# D12 · Inicio compuesto por perfil
# ══════════════════════════════════════════════════════════════════════════
def d_inicio():
    s = [begin(940, 530)]
    secciones = ["Agenda", "Resumen", "Atención", "Preparación", "Logística"]
    capacidades = ["orders.read", "orders.read", "channels.read", "preparation.read", "preparation.manage"]
    roles = [
        ("Administrador de tienda", [1, 1, 1, 1, 1]),
        ("Supervisor de pedidos", [1, 1, 1, 1, 1]),
        ("Operador", [1, 1, 1, 0, 0]),
        ("Preparación", [1, 1, 0, 1, 1]),
        ("Bodega", [0, 1, 0, 0, 0]),
        ("Personalizado (sin capacidades)", [0, 1, 0, 0, 0]),
    ]
    x0, y0 = 40, 60
    cw = [230] + [126] * 5
    rh = 46
    # encabezados
    s.append(rect(x0, y0, cw[0], rh * 2, 8, "#F0EEFB", INDIGO, 1.2))
    s.append(T(x0 + 16, y0 + 46, "Perfil", 12, INDIGO, 600, anchor="start"))
    cx = x0 + cw[0]
    for i, sec in enumerate(secciones):
        s.append(rect(cx, y0, cw[i + 1], rh * 2, 8, "#F0EEFB", INDIGO, 1.2))
        s.append(T(cx + cw[i + 1] / 2.0, y0 + 40, sec, 12, INDIGO, 600))
        s.append(T(cx + cw[i + 1] / 2.0, y0 + 62, capacidades[i], 9.5, BODY, 400))
        cx += cw[i + 1]
    y = y0 + rh * 2
    for j, (rol, vals) in enumerate(roles):
        s.append(rect(x0, y, cw[0], rh, 0, WHITE if j % 2 == 0 else "#FAFAFC", GRAYB, 1))
        s.append(T(x0 + 16, y + 29, rol, 11.5, INK, 500, anchor="start"))
        cx = x0 + cw[0]
        for i, v in enumerate(vals):
            s.append(rect(cx, y, cw[i + 1], rh, 0, WHITE if j % 2 == 0 else "#FAFAFC", GRAYB, 1))
            if v:
                s.append('<circle cx="%.1f" cy="%.1f" r="7" fill="%s"/>'
                         % (cx + cw[i + 1] / 2.0, y + 23, INDIGO))
                s.append(T(cx + cw[i + 1] / 2.0, y + 27.5, "sí", 9, WHITE, 700))
            else:
                s.append(T(cx + cw[i + 1] / 2.0, y + 28, "—", 12, "#C4C4CE", 400))
            cx += cw[i + 1]
        y += rh
    s.append(T(40, y + 34, "La composición se deriva de la CAPACIDAD, nunca del nombre del rol. "
                           "Un rol personalizado ve lo que sus capacidades permiten, sin ampliar ningún mapa.",
               11.5, BODY, 500, anchor="start"))
    s.append(T(40, y + 54, "La pantalla nunca queda vacía: sin capacidades se muestra el Resumen, y "
                           "cada botón dice qué permiso falta en vez de desaparecer.", 11.5, BODY, 500,
               anchor="start"))
    s.append(end())
    return "".join(s)


# ══════════════════════════════════════════════════════════════════════════
# HTML
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
    p.append("<title>Módulo de Pedidos — Diagramas de flujo</title>")
    p.append("<style>%s</style></head><body><div class='page'>" % CSS)

    p.append("<h1>Módulo de Pedidos — Diagramas de flujo</h1>")
    p.append('<div class="rule"></div>')
    p.append(
        '<div class="callout">Documento de referencia del flujo funcional del <b>módulo de Pedidos</b> '
        'de NECTO: cómo entra un pedido, cómo recorre el pipeline y quién puede moverlo. Refleja lo '
        'implementado hoy: el canal de WhatsApp es real —el bot vive en el servidor— y Pedidos lee sus '
        'pedidos de la base, con el juego de datos de ejemplo como respaldo (ver «Pendientes»).</div>')

    p.append("<h2>Actores</h2>")
    p.append(
        '<ul class="actors">'
        '<li><b>Cliente</b> — pide por WhatsApp o en el mostrador. No entra al sistema: su voz es el hilo.</li>'
        '<li><b>Bot de WhatsApp</b> — atiende el texto del cliente: responde el estado de un pedido y '
        'toma pedidos nuevos, paso a paso.</li>'
        '<li><b>Operador</b> — mueve los pedidos en el tablero, crea pedidos manuales y responde en '
        'Conversaciones. Su alcance lo fija su rol.</li>'
        '<li><b>Administrador</b> — dueño: configura el rubro, las columnas, las plantillas de '
        'WhatsApp y el equipo.</li>'
        '</ul>')

    p.append(
        '<div class="callout key"><b>Regla que gobierna todo el módulo:</b> nada se decide por cómo se '
        'llama el rol. Cada ruta y cada botón preguntan por una <b>capacidad</b>. Un destino sin '
        'capacidad declarada se deniega, y cuando el sistema no puede honrar una acción, el control se '
        'deshabilita <b>con su motivo escrito</b> en vez de prometer algo que no cumple.</div>')

    p.append("<h2>Vocabulario de las figuras</h2>")
    p.append("<figure>%s</figure>" % d_leyenda())

    p.append("<h2>Rutas del módulo</h2>")
    p.append(
        "<table><thead><tr><th>Sección</th><th>Ruta</th><th>Capacidad</th>"
        "<th>Qué se hace ahí</th></tr></thead><tbody>"
        "<tr><td>Inicio</td><td><code>/pedidos/inicio</code></td><td><code>orders.read</code></td>"
        "<td>Calendario del mes y resumen del día.</td></tr>"
        "<tr><td>Tablero</td><td><code>/pedidos</code></td><td><code>orders.read</code></td>"
        "<td>El kanban del trabajo en curso.</td></tr>"
        "<tr><td>Crear pedido</td><td><code>/pedidos/crear</code></td><td><code>orders.create</code></td>"
        "<td>Alta manual en el mostrador.</td></tr>"
        "<tr><td>Historial</td><td><code>/pedidos/historial</code></td><td><code>orders.read</code></td>"
        "<td>Pedidos entregados y cancelados.</td></tr>"
        "<tr><td>Analítica</td><td><code>/pedidos/analitica</code></td><td><code>orders.read</code></td>"
        "<td>Ventas, tiempos y cancelaciones.</td></tr>"
        "<tr><td>Configuración</td><td><code>/pedidos/config</code></td><td><code>settings.read</code></td>"
        "<td>Rubro, columnas, plantillas y catálogo.</td></tr>"
        "<tr><td>Asistente</td><td><code>/asistente</code></td><td><code>assistant.use</code></td>"
        "<td>Transversal. Preguntas del dueño.</td></tr>"
        "<tr><td>Conversaciones</td><td><code>/conversaciones</code></td><td><code>channels.read</code></td>"
        "<td>Transversal. Bandeja de WhatsApp.</td></tr>"
        "</tbody></table>")

    p.append(sec(
        "1", "Arranque y entrada al módulo",
        "El onboarding solo lo hace el administrador, una vez. Los operadores entran con un espacio ya "
        "configurado y caen directo en la ruta de llegada del módulo.",
        d_arranque(),
        ["El onboarding son cinco pasos: perfil, organización, módulos, Pedidos (rubro y agentes) y encuesta final.",
         "Antes de pintar cualquier pantalla, dos guardas: el módulo debe estar activo en la organización "
         "y la sesión debe tener la capacidad que la ruta exige.",
         "<code>/pedidos/inicio</code> es la llegada; <code>/pedidos</code> es el tablero."],
        pb=True))

    p.append(sec(
        "2", "Las dos guardas que protegen cada ruta",
        "Toda ruta de Pedidos pasa por la misma puerta doble, en el mismo orden.",
        d_guardas(),
        ["<b>Guarda de pertenencia</b>: si la organización no tiene el módulo encendido, redirige a "
         "Configuración › Módulos — no a una pantalla vacía.",
         "<b>Guarda de capacidad</b>: si la sesión no tiene la capacidad, no se pinta la pantalla.",
         "Entrar a una pantalla nunca implica poder operarla: <code>/pedidos/config</code> se entra con "
         "<code>settings.read</code> y se guarda con <code>settings.manage</code>."]))

    p.append(sec(
        "3", "Ciclo de vida del pedido",
        "El corazón del módulo. Ocho estados, una sola dirección de avance y una única excepción "
        "explícita: el reintento de entrega.",
        d_ciclo(),
        ["<b>Programado</b> queda fuera del pipeline: es un pedido que aún no ha entrado. Se activa solo "
         "cuando llega su hora, y entonces pasa a <b>Nuevo</b>.",
         "<b>Confirmado</b> y <b>En camino</b> se pueden apagar en Configuración. Si se apagan, el pedido "
         "los salta y el tablero deja de mostrar esa columna.",
         "<b>En camino</b> solo existe si la modalidad es domicilio: un retiro en tienda nunca sale a la calle.",
         "<b>Cancelado</b> es alcanzable desde cualquier estado no terminal; <b>Entregado</b> y "
         "<b>Cancelado</b> cierran el pedido.",
         "Solo se avanza un paso. <b>Reintentar entrega</b> es la única transición hacia atrás, y existe "
         "con nombre propio: no se aflojó la regla general para permitirla.",
         "Un pedido cerrado no admite ningún movimiento más."],
        pb=True))

    p.append(sec(
        "4", "Dos formas de que entre un pedido",
        "El origen dice de dónde viene el pedido; no dice cómo se entrega ni en qué punto va.",
        d_origenes(),
        ["Un pedido del bot nace con origen <code>whatsapp</code> y tiene un hilo de cliente del que "
         "puede leerse su estado.",
         "Un pedido del mostrador nace con origen <code>operador</code> y <b>no</b> tiene hilo: no se le "
         "inventa una conversación.",
         "Esa distinción es la que después decide si un aviso al cliente tiene a dónde llegar."]))

    p.append(sec(
        "5", "El bot: qué hacer con cada mensaje",
        "El bot solo maneja texto y solo decide cosas que puede sostener. Ante la duda, pasa el hilo a "
        "una persona.",
        d_bot_decision(),
        ["El orden importa: si el cliente <b>pide un humano</b>, no se le hace pasar por ningún "
         "clasificador — es la petición más clara que puede hacer.",
         "Un mensaje sin texto (una foto, un audio) va a un humano: fingir que se entendió sería mentir.",
         "Con <b>varios</b> pedidos activos el bot pide el número; con <b>ninguno</b> no afirma «no "
         "tienes pedidos» — el pedido puede estar en otra organización o venir de otro número.",
         "Si el hilo está en <b>modo humano</b>, el bot calla: la conversación la lleva el operador.",
         "El bot descarta sus propios mensajes: sin esa guarda se respondería a sí mismo y facturaría "
         "mensajes reales."]))

    p.append(sec(
        "6", "El bot: cómo toma un pedido",
        "Un pedido a medias no es un pedido. El borrador vive dentro de la conversación y caduca con "
        "ella; nadie de operaciones lo ve hasta que el cliente confirma.",
        d_bot_toma(),
        ["Cada paso vuelve a pedir lo que no entendió en vez de adivinar. Una cantidad inválida o un "
         "ítem que no está en el catálogo no crean una línea: se vuelve a preguntar.",
         "La modalidad desconocida <b>no</b> se convierte en una por defecto: inventar «domicilio» "
         "mandaría a un repartidor a una casa a la que nadie pidió ir.",
         "Un cliente no puede tener dos pedidos abiertos a la vez: el bot se lo dice en vez de elegir "
         "por él.",
         "Solo al confirmar se crea el pedido, y nace en <b>Nuevo</b>."]))

    p.append(sec(
        "7", "Pedido creado por el operador",
        "El alta manual del mostrador. Dos pasos son condicionales, así que la numeración se desplaza "
        "según la modalidad elegida.",
        d_operador(),
        ["El teléfono es obligatorio porque es la <b>clave de cruce</b> con Conversaciones: es lo que "
         "enlaza el pedido con su hilo de WhatsApp.",
         "El paso 3 aparece solo si hace falta: dirección para domicilio, mesa para consumo en sitio "
         "(y solo si el rubro declara servicio de mesa).",
         "Si la hora de programación es futura, el pedido nace <b>Programado</b>; si no, nace "
         "<b>Nuevo</b> y aparece de inmediato en el tablero.",
         "El catálogo de venta es del rubro, no del inventario: un pedido se lee entero sin abrir "
         "otro módulo, porque el nombre y el precio viajan congelados en la línea."],
        pb=True))

    p.append(sec(
        "8", "Quién puede mover el pedido",
        "El destino decide la capacidad. No existe ninguna comprobación del tipo «es administrador».",
        d_capacidades(),
        ["Avanzar la preparación y la entrega es la misma capacidad: son el mismo puesto de trabajo, "
         "no dos.",
         "Cancelar es una capacidad aparte porque anular una venta no es lo mismo que empujarla.",
         "Un destino sin capacidad declarada se deniega siempre: el sistema falla cerrado.",
         "<code>orders.edit</code> y <code>orders.delete</code> existen en el catálogo pero están "
         "reservadas: no tienen interfaz todavía."]))

    p.append(sec(
        "9", "El aviso al cliente",
        "Cuando el pedido avanza, el cliente se entera por WhatsApp. El aviso tiene cuatro salidas "
        "posibles y tres de ellas son «no enviar nada».",
        d_aviso(),
        ["<b>Nuevo</b> y <b>Programado</b> no avisan: son estados de entrada, y agradecerle al cliente "
         "el pedido que él mismo acaba de hacer no aporta.",
         "Si el dueño borró la plantilla, no se envía un mensaje vacío.",
         "Si el cliente no tiene hilo, <b>no se crea uno</b>: la conversación nace del dispositivo del "
         "cliente.",
         "Las plantillas son del rubro y editables en Configuración; lo que el dueño escriba gana "
         "sobre el texto de fábrica."]))

    p.append(sec(
        "10", "Entrega fallida",
        "Una entrega que no ocurre toca tres cosas a la vez: deja constancia, saca el pedido de la "
        "calle y —a veces— avisa al cliente. Van juntas o el pedido miente.",
        d_novedad(),
        ["La nota se escribe <b>antes</b> de mover el estado, porque mover puede rechazarse: si fuera al "
         "revés, quedaría una nota afirmando una novedad que no se registró.",
         "El desenlace lo elige el operador: <b>reintentar</b> devuelve el pedido a «Listo» y "
         "<b>cancelar</b> lo cierra.",
         "El reintento <b>no</b> avisa al cliente: repetir «tu pedido está listo» por el mismo pedido "
         "sería ruido.",
         "La cancelación sí avisa, y solo si el pedido vino de WhatsApp y el cliente tiene hilo."],
        pb=True))

    p.append(sec(
        "11", "De punta a punta: un pedido por WhatsApp",
        "La misma historia, contada en el tiempo. Los actores de la izquierda no son todos personas: "
        "el bot y el sistema trabajan solos.",
        d_secuencia(),
        ["Entre el paso 9 y el 11 el pedido ya está en el tablero: el operador no tiene que «recibir» "
         "nada, aparece.",
         "Cada aviso al cliente (12 y 14) es la plantilla del estado, no un texto inventado por el "
         "sistema.",
         "Si en cualquier punto el operador toma el hilo, el bot deja de responder y el resto lo "
         "continúa una persona."]))

    p.append(sec(
        "12", "El Inicio se compone según el perfil",
        "No hay un conmutador de vistas: la pantalla se arma sola con lo que el perfil puede operar. Lo "
        "que no se puede operar, no se pinta.",
        d_inicio(),
        ["Una sección se pinta si la sesión tiene <b>al menos una</b> de sus capacidades; cada botón de "
         "dentro vuelve a preguntar por la suya y se deshabilita con su motivo.",
         "Un rol <b>personalizado</b> obtiene la composición que sus capacidades permitan, sin tocar "
         "ningún mapa. Si mañana se le quita una capacidad al rol «Preparación», la sección desaparece sola.",
         "La pantalla <b>nunca</b> queda vacía: sin capacidades se muestra el Resumen, que solo lee, y "
         "sus controles explican qué permiso falta."]))

    p.append('<div class="pb"></div>')
    p.append("<h2>Pendientes y deuda visible</h2>")
    p.append('<div class="notes"><ul>'
             '<li><b>La carga inicial cae al juego de datos de ejemplo en silencio.</b> '
             '<code>cargarDesdeBase()</code> sale sin avisar cuando la tabla devuelve cero filas — solo '
             'registra un aviso si hubo error. Un negocio sin pedidos y una consulta rota se ven igual. '
             '<b>Inventario</b>, además, todavía no lee de la base: sigue entero sobre el seed.</li>'
             '<li><b>El indicador de «pagado» no tiene columna propia.</b> La sincronización escribe '
             'estado, método de pago, reparto y cambio, pero no el flag de pagado: hoy vive solo en el '
             'navegador, y se muestra en varias pantallas.</li>'
             '<li><b>Un handoff deja el hilo mudo para siempre.</b> Existe la vuelta al bot, pero falta '
             'la bandeja que la invoque: la deuda está a la vista, no escondida.</li>'
             '<li><b>«Logística» no tiene capacidades propias.</b> La sección la gobierna '
             '<code>preparation.manage</code>, porque inventar un dominio <code>logistics.*</code> '
             'dejaría una sección que ningún rol concede.</li>'
             '<li><b><code>orders.edit</code> y <code>orders.delete</code> están reservadas.</b> '
             'Existen para que el catálogo sea completo; no hay ninguna interfaz que las use.</li>'
             '</ul></div>')

    p.append('<footer>Módulo de Pedidos · NECTO — documento de flujo funcional. '
             'Generado desde el código de <code>packages/apps/web/modules/app/src</code>.</footer>')
    p.append("</div></body></html>")
    return "".join(p)


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "outputs",
                       "pedidos-diagramas-flujo.html")
    out = os.path.normpath(out)
    with open(out, "w", encoding="utf-8") as f:
        f.write(build())
    print("OK ->", out, os.path.getsize(out), "bytes")
