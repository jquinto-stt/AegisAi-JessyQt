/**
 * Fotos de referencia del catálogo de inventario.
 *
 * Son imágenes de Wikimedia Commons con licencia libre, descargadas al proyecto
 * para que la demo no dependa de una URL externa. No son fotografías del
 * producto real de la organización: son material de muestra y deben sustituirse
 * por las fotos del catálogo cuando existan. El crédito y la licencia se
 * conservan para que la atribución sea posible.
 */
export interface FotoProducto {
  src: string;
  alt: string;
  title: string;
  credit: string;
  license: string;
  page: string;
}

export const FOTOS_PRODUCTO: Record<string, FotoProducto> = {
  "art-ofi-1001": {
    src: "/images/productos/art-ofi-1001.jpg",
    alt: "Papel bond carta 75 g",
    title: "File:80 GSM A4 PAPER.jpg",
    credit: "\"80 GSM A4 PAPER.jpg\" by Nitol Paper, CC BY-SA 4.0, via Wikimedia Commons",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File%3A80_GSM_A4_PAPER.jpg",
  },
  "art-ofi-1002": {
    src: "/images/productos/art-ofi-1002.jpg",
    alt: "Bolígrafo tinta negra x12",
    title: "File:4 Bic Cristal pens and caps.jpg",
    credit: "\"4 Bic Cristal pens and caps.jpg\" by Carlos Delgado, CC BY-SA 3.0, via Wikimedia Commons",
    license: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File%3A4_Bic_Cristal_pens_and_caps.jpg",
  },
  "art-ofi-1003": {
    src: "/images/productos/art-ofi-1003.jpg",
    alt: "Resaltador amarillo x6",
    title: "File:Markeerstift-01 (xndr).jpg",
    credit: "\"Markeerstift-01 (xndr).jpg\" by Svdmolen, CC BY 2.5, via Wikimedia Commons",
    license: "CC BY 2.5",
    page: "https://commons.wikimedia.org/wiki/File%3AMarkeerstift-01_(xndr).jpg",
  },
  "art-ofi-1004": {
    src: "/images/productos/art-ofi-1004.jpg",
    alt: "Carpeta legajadora AZ",
    title: "File:Schnellhefter Kunststoff.jpg",
    credit: "\"Schnellhefter Kunststoff.jpg\" by Rico Heil (silmaril), CC BY-SA 3.0, via Wikimedia Commons",
    license: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File%3ASchnellhefter_Kunststoff.jpg",
  },
  "art-ofi-1005": {
    src: "/images/productos/art-ofi-1005.jpg",
    alt: "Notas adhesivas 3x3 x12",
    title: "File:Post-it.jpg",
    credit: "\"Post-it.jpg\" by The original uploader was Consequencefree at English Wikipedia., CC BY-SA 3.0, via Wikimedia Commons",
    license: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File%3APost-it.jpg",
  },
  "art-ofi-1006": {
    src: "/images/productos/art-ofi-1006.jpg",
    alt: "Tóner HP 105A",
    title: "File:Samsung laser toner cartridge front view.jpg",
    credit: "\"Samsung laser toner cartridge front view.jpg\" by W.carter, CC BY-SA 4.0, via Wikimedia Commons",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File%3ASamsung_laser_toner_cartridge_front_view.jpg",
  },
  "art-emb-2001": {
    src: "/images/productos/art-emb-2001.jpg",
    alt: "Caja de cartón 40x30x30",
    title: "File:Box.agr.jpg",
    credit: "\"Box.agr.jpg\" by ArnoldReinhold, CC BY-SA 3.0, via Wikimedia Commons",
    license: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File%3ABox.agr.jpg",
  },
  "art-emb-2002": {
    src: "/images/productos/art-emb-2002.jpg",
    alt: "Cinta de embalar transparente 48 mm",
    title: "File:Sticky tape.jpg",
    credit: "\"Sticky tape.jpg\" by André Karwath aka Aka, CC BY-SA 2.5, via Wikimedia Commons",
    license: "CC BY-SA 2.5",
    page: "https://commons.wikimedia.org/wiki/File%3ASticky_tape.jpg",
  },
  "art-emb-2003": {
    src: "/images/productos/art-emb-2003.jpg",
    alt: "Plástico stretch 18\"",
    title: "File:FEMA - 42142 - Commodities in a warehouse in American Samoa.jpg",
    credit: "\"FEMA - 42142 - Commodities in a warehouse in American Samoa.jpg\" by Casey Deshong, Public domain, via Wikimedia Commons",
    license: "Public domain",
    page: "https://commons.wikimedia.org/wiki/File%3AFEMA_-_42142_-_Commodities_in_a_warehouse_in_American_Samoa.jpg",
  },
  "art-emb-2004": {
    src: "/images/productos/art-emb-2004.jpg",
    alt: "Bolsa burbuja 30x40 x100",
    title: "File:Puchipuchi.jpg",
    credit: "\"Puchipuchi.jpg\" by Wikimedia Commons, Public domain, via Wikimedia Commons",
    license: "Public domain",
    page: "https://commons.wikimedia.org/wiki/File%3APuchipuchi.jpg",
  },
  "art-emb-2005": {
    src: "/images/productos/art-emb-2005.jpg",
    alt: "Etiqueta térmica 100x150 x500",
    title: "File:Roll of Swedish Flygpost - Par Avion, airmail etiquettes 1.jpg",
    credit: "\"Roll of Swedish Flygpost - Par Avion, airmail etiquettes 1.jpg\" by W.carter, CC BY-SA 4.0, via Wikimedia Commons",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File%3ARoll_of_Swedish_Flygpost_-_Par_Avion%2C_airmail_etiquettes_1.jpg",
  },
  "art-fer-3001": {
    src: "/images/productos/art-fer-3001.jpg",
    alt: "Taladro percutor 1/2\" 750 W",
    title: "File:Hammer drill-1.jpg",
    credit: "\"Hammer drill-1.jpg\" by Shakespeare at en.wikipedia, CC BY-SA 3.0, via Wikimedia Commons",
    license: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File%3AHammer_drill-1.jpg",
  },
  "art-fer-3002": {
    src: "/images/productos/art-fer-3002.jpg",
    alt: "Juego de destornilladores x10",
    title: "File:Robertson screwdriver set.jpg",
    credit: "\"Robertson screwdriver set.jpg\" by Luigi Zanasi, CC BY-SA 2.0 ca, via Wikimedia Commons",
    license: "CC BY-SA 2.0 ca",
    page: "https://commons.wikimedia.org/wiki/File%3ARobertson_screwdriver_set.jpg",
  },
  "art-fer-3003": {
    src: "/images/productos/art-fer-3003.jpg",
    alt: "Tornillo drywall 6x1\" x1000",
    title: "File:Skruvar.jpg",
    credit: "\"Skruvar.jpg\" by User DaRy on sv.wikipedia, CC BY-SA 3.0, via Wikimedia Commons",
    license: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File%3ASkruvar.jpg",
  },
  "art-fer-3004": {
    src: "/images/productos/art-fer-3004.jpg",
    alt: "Guantes de nitrilo talla M x100",
    title: "File:Nitrile rubber balles.jpg",
    credit: "\"Nitrile rubber balles.jpg\" by Cjp24, CC BY-SA 3.0, via Wikimedia Commons",
    license: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File%3ANitrile_rubber_balles.jpg",
  },
  "art-fer-3005": {
    src: "/images/productos/art-fer-3005.jpg",
    alt: "Cinta métrica 8 m",
    title: "File:Tape measure colored.jpeg",
    credit: "\"Tape measure colored.jpeg\" by Simon A. Eugster, CC BY-SA 3.0, via Wikimedia Commons",
    license: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File%3ATape_measure_colored.jpeg",
  },
  "art-ele-4001": {
    src: "/images/productos/art-ele-4001.jpg",
    alt: "Pilas alcalinas AA x48",
    title: "File:Energizer NiMH rechargeable AA batteries (four) (various positions).jpg",
    credit: "\"Energizer NiMH rechargeable AA batteries (four) (various positions).jpg\" by Multicherry, CC BY-SA 4.0, via Wikimedia Commons",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File%3AEnergizer_NiMH_rechargeable_AA_batteries_(four)_(various_positions).jpg",
  },
  "art-ele-4002": {
    src: "/images/productos/art-ele-4002.jpg",
    alt: "Cable HDMI 2 m",
    title: "File:HDMI Cable.JPG",
    credit: "\"HDMI Cable.JPG\" by Kannan shanmugam,shanmugam studio, Kollam, CC BY-SA 4.0, via Wikimedia Commons",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File%3AHDMI_Cable.JPG",
  },
  "art-ele-4003": {
    src: "/images/productos/art-ele-4003.jpg",
    alt: "Mouse inalámbrico",
    title: "File:A wireless computer mouse.jpg",
    credit: "\"A wireless computer mouse.jpg\" by Pixloom, CC BY-SA 4.0, via Wikimedia Commons",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File%3AA_wireless_computer_mouse.jpg",
  },
  "art-ele-4004": {
    src: "/images/productos/art-ele-4004.jpg",
    alt: "Regleta 6 tomas con protección",
    title: "File:REML power strip.JPG",
    credit: "\"REML power strip.JPG\" by Dmitry G, CC BY-SA 3.0, via Wikimedia Commons",
    license: "CC BY-SA 3.0",
    page: "https://commons.wikimedia.org/wiki/File%3AREML_power_strip.JPG",
  },
  "art-ele-4005": {
    src: "/images/productos/art-ele-4005.jpg",
    alt: "Lector de código de barras USB",
    title: "File:CCD Barcode Scanner-1.jpg",
    credit: "\"CCD Barcode Scanner-1.jpg\" by Network.nt, Public domain, via Wikimedia Commons",
    license: "Public domain",
    page: "https://commons.wikimedia.org/wiki/File%3ACCD_Barcode_Scanner-1.jpg",
  },
  "art-ase-5001": {
    src: "/images/productos/art-ase-5001.jpg",
    alt: "Gel antibacterial 1 L",
    title: "File:Hand sanitizer bottle.jpg",
    credit: "\"Hand sanitizer bottle.jpg\" by Wikibantu, CC BY-SA 4.0, via Wikimedia Commons",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File%3AHand_sanitizer_bottle.jpg",
  },
  "art-ase-5002": {
    src: "/images/productos/art-ase-5002.jpg",
    alt: "Toalla de papel interfoliada x150",
    title: "File:Paper towel.jpg",
    credit: "\"Paper towel.jpg\" by Santeri Viinamäki, CC BY-SA 4.0, via Wikimedia Commons",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File%3APaper_towel.jpg",
  },
  "art-ase-5003": {
    src: "/images/productos/art-ase-5003.jpg",
    alt: "Bolsa de basura negra 90x110 x10",
    title: "File:Black garbage bag.jpg",
    credit: "\"Black garbage bag.jpg\" by Wiki Farazi, public domain, via Wikimedia Commons",
    license: "Public domain",
    page: "https://commons.wikimedia.org/wiki/File%3ABlack_garbage_bag.jpg",
  },
  "art-ase-5004": {
    src: "/images/productos/art-ase-5004.jpg",
    alt: "Desinfectante multiusos 3.8 L",
    title: "File:Hynaut-Inohv alcohol spray in two formats (20221224162547).jpg",
    credit: "\"Hynaut-Inohv alcohol spray in two formats (20221224162547).jpg\" by N509FZ, CC BY-SA 4.0, via Wikimedia Commons",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File%3AHynaut-Inohv_alcohol_spray_in_two_formats_(20221224162547).jpg",
  },
  "art-rep-6001": {
    src: "/images/productos/art-rep-6001.jpg",
    alt: "Rodamiento 6000-2RS",
    title: "File:1984 deep groove ball bearing UR 6304 made in Czechoslovakia by ZKL.jpg",
    credit: "\"1984 deep groove ball bearing UR 6304 made in Czechoslovakia by ZKL.jpg\" by R. Henrik Nilsson, CC BY 4.0, via Wikimedia Commons",
    license: "CC BY 4.0",
    page: "https://commons.wikimedia.org/wiki/File%3A1984_deep_groove_ball_bearing_UR_6304_made_in_Czechoslovakia_by_ZKL.jpg",
  },
  "art-rep-6002": {
    src: "/images/productos/art-rep-6002.jpg",
    alt: "Correa de transmisión 4L220",
    title: "File:02010 Belt drives market in Poland Roulunds.JPG",
    credit: "\"02010 Belt drives market in Poland Roulunds.JPG\" by Silar, CC BY-SA 4.0, via Wikimedia Commons",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File%3A02010_Belt_drives_market_in_Poland_Roulunds.JPG",
  },
  "art-rep-6003": {
    src: "/images/productos/art-rep-6003.jpg",
    alt: "Kit de empaques tóricos surtidos",
    title: "File:O-ring collection.jpg",
    credit: "\"O-ring collection.jpg\" by Ahellwig, CC BY 2.5, via Wikimedia Commons",
    license: "CC BY 2.5",
    page: "https://commons.wikimedia.org/wiki/File%3AO-ring_collection.jpg",
  },
  "art-mob-7001": {
    src: "/images/productos/art-mob-7001.jpg",
    alt: "Silla ergonómica operativa",
    title: "File:Prototype ergonomic office chair, V&A London.jpg",
    credit: "\"Prototype ergonomic office chair, V&A London.jpg\" by 14GTR, CC0, via Wikimedia Commons",
    license: "CC0",
    page: "https://commons.wikimedia.org/wiki/File%3APrototype_ergonomic_office_chair%2C_V%26A_London.jpg",
  },
  "art-mob-7002": {
    src: "/images/productos/art-mob-7002.jpg",
    alt: "Estantería metálica 5 niveles",
    title: "File:EFTA00002724 - Grey metal shelving unit in utility room with two black storage bins on lower shelf and empty shelves above.jpg",
    credit: "\"EFTA00002724 - Grey metal shelving unit in utility room with two black storage bins on lower shelf and empty shelves above.jpg\" by Federal Bureau of Investigation, Public domain, via Wikimedia Commons",
    license: "Public domain",
    page: "https://commons.wikimedia.org/wiki/File%3AEFTA00002724_-_Grey_metal_shelving_unit_in_utility_room_with_two_black_storage_bins_on_lower_shelf_and_empty_shelves_above.jpg",
  },
};

export function fotoDeProducto(articuloId: string): FotoProducto | undefined {
  return FOTOS_PRODUCTO[articuloId];
}
