#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
sellar-pdf.py — copia las propiedades del .docx a los metadatos del PDF.

Word NO propaga docProps al PDF con `ExportAsFixedFormat` por COM: el PDF sale
con Title y Author vacios aunque el .docx los tenga. Un PDF sin titulo se
muestra como el nombre del archivo en el lector.

Uso:
    python sellar-pdf.py <docx> <pdf>
"""
import os
import re
import sys
import zipfile

import pymupdf


def props_docx(ruta):
    x = zipfile.ZipFile(ruta).read("docProps/core.xml").decode("utf8")

    def leer(tag):
        m = re.search(rf"<{tag}[^>]*>(.*?)</{tag}>", x, re.S)
        if not m:
            return None
        return (m.group(1).strip()
                .replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">"))

    return {t: leer(t) for t in ("dc:title", "dc:subject", "dc:description", "dc:creator")}


def main(docx, pdf):
    p = props_docx(docx)
    d = pymupdf.open(pdf)
    meta = dict(d.metadata)
    meta.update({
        "title": p["dc:title"] or os.path.splitext(os.path.basename(pdf))[0],
        "author": "Jessy Quinto",
        "subject": p["dc:subject"] or "",
        "keywords": "backlog, épicas, historias de usuario, ST&T, Necto",
    })
    d.set_metadata(meta)
    tmp = pdf + ".tmp"
    d.save(tmp, garbage=3, deflate=True)
    d.close()
    os.replace(tmp, pdf)

    d = pymupdf.open(pdf)
    print("sellado ->", os.path.basename(pdf), f"({d.page_count} páginas, "
          f"{round(os.path.getsize(pdf) / 1024)} KB)")
    for k in ("title", "author", "subject", "creator", "producer"):
        print(f"   {k:9} = {d.metadata.get(k)!r}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
