import pymupdf
doc = pymupdf.open(r"C:/Users/Jessy/Documents/GitHub/StockFlow/outputs/inventario-diagramas-flujo.pdf")
SVG_R = 554.7   # unit 940 -> pt
for i, pg in enumerate(doc, 1):
    rows = {}
    for x0,y0,x1,y1,w,*_ in pg.get_text("words"):
        rows.setdefault(round(y0,0), []).append((x0,x1,w))
    worst = []
    for k in sorted(rows):
        xs1 = max(r[1] for r in rows[k])
        xs0 = min(r[0] for r in rows[k])
        if xs1 > SVG_R + 0.5:
            worst.append((k, xs0, xs1, " ".join(r[2] for r in rows[k])[-60:]))
    if worst:
        print(f"--- pagina {i} ---")
        for k,xs0,xs1,t in worst:
            print(f"  y={k:6.1f} x={xs0:6.1f}..{xs1:6.1f}  |...{t}")
    else:
        mx = max(max(r[1] for r in v) for v in rows.values())
        print(f"--- pagina {i} --- OK (max x1 = {mx:.1f})")
