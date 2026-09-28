import pymupdf
doc = pymupdf.open(r"C:/Users/Jessy/Documents/GitHub/StockFlow/outputs/inventario-diagramas-flujo.pdf")
def rects(pg):
    out=[]
    for b in pg.get_text("dict")["blocks"]:
        if b.get("type")!=0: continue
        for l in b["lines"]:
            for s in l["spans"]:
                t=s["text"].strip()
                if not t: continue
                out.append((pymupdf.Rect(s["bbox"]), t))
    return out
for i,pg in enumerate(doc,1):
    rs=rects(pg)
    hits=[]
    for a in range(len(rs)):
        for b in range(a+1,len(rs)):
            r1,t1=rs[a]; r2,t2=rs[b]
            inter=r1 & r2
            if inter.is_empty: continue
            w=min(inter.width,inter.height)
            # only flag real overlaps: horizontal AND vertical intersection of area
            area=inter.width*inter.height
            if area < 1.0: continue
            if inter.height < 3.0: continue   # same-line kerning neighbours
            hits.append((r1.y0,r1.x0,r1.x1,t1,r2.x0,r2.x1,t2,area))
    if hits:
        print(f"=== pagina {i} === {len(hits)} solapes")
        seen=set()
        for y,x1a,x1b,t1,x2a,x2b,t2,area in hits[:14]:
            k=(round(y),t1[:25],t2[:25])
            if k in seen: continue
            seen.add(k)
            print(f"  y={y:6.1f} area={area:6.1f}")
            print(f"     A x={x1a:6.1f}..{x1b:6.1f} | {t1[:70]}")
            print(f"     B x={x2a:6.1f}..{x2b:6.1f} | {t2[:70]}")
    else:
        print(f"=== pagina {i} === sin solapes")
