import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import {
  ArrowPathIcon,
  ArrowRightIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  MinusIcon,
  PlusIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";
import { getSupabase, ESQUEMA } from '../../lib/supabase';
import { PageMeta } from '../../shell/meta';
import { NectoLogo } from '../../compositions/shared/NectoLogo';

interface ProductoItem {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  precio: number;
  imagen: string;
  popular?: boolean;
}

// Categorías base para filtrado
//
// Genéricas a propósito: el catálogo sirve a cualquier negocio, no solo a uno
// de comida. Las categorías reales salen del catálogo guardado; estas son solo
// las de la vista de ejemplo.
const CATEGORIAS_BASE = [
  'Todos',
  'Categoría A',
  'Categoría B',
  'Categoría C',
  'Ofertas',
] as const;

// Catálogo de ejemplo para Necto
//
// Los productos son genéricos, no gastronómicos: lo que el ejemplo enseña es la
// FORMA del dato (nombre, categoría, descripción, precio, imagen), no un rubro
// concreto. Un catálogo de hamburguesas le dice a una ferretería que esto no es
// para ella.
const PRODUCTOS_DEFAULT: ProductoItem[] = [
  {
    id: 'cat-f1',
    nombre: 'Producto de ejemplo A1',
    categoria: 'Categoría A',
    descripcion: 'Descripción breve del producto. Aquí va lo que el cliente necesita saber para decidirse.',
    precio: 25000,
    imagen: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
  },
  {
    id: 'cat-f2',
    nombre: 'Producto de ejemplo A2',
    categoria: 'Categoría A',
    descripcion: 'Un segundo artículo de la misma categoría, para que se vea cómo se agrupa el catálogo.',
    precio: 12000,
    imagen: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80',
  },
  {
    id: 'cat-f3',
    nombre: 'Producto de ejemplo B1',
    categoria: 'Categoría B',
    descripcion: 'Artículo de otra categoría. Las categorías son texto libre: escribe las que use tu negocio.',
    precio: 4000,
    imagen: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=500&q=80',
  },
  {
    id: 'cat-f4',
    nombre: 'Producto de ejemplo B2',
    categoria: 'Categoría B',
    descripcion: 'El precio, la imagen y la descripción se ajustan a lo que vendas. No hay un formato obligatorio.',
    precio: 9000,
    imagen: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80',
  },
  {
    id: 'cat-f5',
    nombre: 'Producto de ejemplo C1',
    categoria: 'Categoría C',
    descripcion: 'Este bloque muestra cómo se ve un producto con todos sus datos completos.',
    precio: 27500,
    imagen: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=500&q=80',
  },
  {
    id: 'cat-f6',
    nombre: 'Producto de ejemplo C2',
    categoria: 'Categoría C',
    descripcion: 'Puedes tener tantos productos y categorías como necesites.',
    precio: 7500,
    imagen: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500&q=80',
  },
];

export const MenuCatalogoPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const cliente = searchParams.get('cliente') || 'Jessy Quinto';
  const sede = searchParams.get('sede') || 'Sede Principal';
  const direccion = searchParams.get('direccion') || 'Medellín, Colombia';
  const chatId = searchParams.get('chatId') || '';
  const modalidad = searchParams.get('modalidad') || (direccion ? 'domicilio' : 'retiro');

  const [productos, setProductos] = useState<ProductoItem[]>(PRODUCTOS_DEFAULT);
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [carrito, setCarrito] = useState<{ [productoId: string]: number }>({});
  const [modalCarritoAbierto, setModalCarritoAbierto] = useState(false);
  const [seleccionEnviada, setSeleccionEnviada] = useState<{
    total: number;
    cantidad: number;
  } | null>(null);
  const [guardandoPedido, setGuardandoPedido] = useState(false);

  // Cargar catálogo desde Supabase si existe configuración personalizada
  useEffect(() => {
    const cargarCatalogoBD = async () => {
      const sb = getSupabase();
      if (!sb) return;

      try {
        const { data, error } = await sb
          .schema(ESQUEMA)
          .from('config_pedidos')
          .select('catalogo, perfil_comercial')
          .limit(1)
          .maybeSingle();

        if (!error && data?.catalogo && Array.isArray(data.catalogo) && data.catalogo.length > 0) {
          const cargados: ProductoItem[] = data.catalogo
            .filter((i: any) => i && i.disponible !== false)
            .map((i: any, idx: number) => {
              // Asignar imagen coherente por defecto si no viene
              // Imágenes e textos de reserva, genéricos: se usan solo cuando el
              // producto guardado no trae los suyos, y no deben sugerir un rubro.
              const defaultImgs = [
                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80',
                'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80',
                'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=500&q=80',
                'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80',
              ];
              return {
                id: String(i.id || `prod-${idx}`),
                nombre: String(i.nombre),
                categoria: i.categoria || (idx % 2 === 0 ? 'Categoría A' : 'Categoría B'),
                descripcion: i.descripcion || 'Descripción pendiente de completar.',
                precio: Number(i.precio) || 0,
                imagen: i.imagen || defaultImgs[idx % defaultImgs.length],
                // El sello «Destacado» sale del dato, no de la posición en la lista:
                // marcar idx===0 convertía «el primero» en «el que el negocio destaca»,
                // y el sello aparecía sobre un producto que nadie destacó.
                popular: i.popular === true,
              };
            });

          // Mezclar con los adicionales para tener un catálogo rico
          const idsExistentes = new Set(cargados.map((c) => c.id));
          const complementos = PRODUCTOS_DEFAULT.filter((p) => !idsExistentes.has(p.id));
          setProductos([...cargados, ...complementos]);
        }
      } catch (e) {
        console.warn('[MenuCatalogoPage] Usando catálogo base local', e);
      }
    };

    cargarCatalogoBD();
  }, []);

  // Formatear COP
  const formatearCOP = (valor: number) => {
    return `$ ${valor.toLocaleString('es-CO')}`;
  };

  // Manejo de cantidades
  const agregarItem = (id: string) => {
    setCarrito((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const quitarItem = (id: string) => {
    setCarrito((prev) => {
      const nuevo = { ...prev };
      if ((nuevo[id] || 0) <= 1) {
        delete nuevo[id];
      } else {
        nuevo[id] -= 1;
      }
      return nuevo;
    });
  };

  /**
   * Categorías que se pintan en la barra: las del catálogo real, en el orden en
   * que aparecen los productos. Se cae a `CATEGORIAS_BASE` solo si el catálogo
   * todavía no ha cargado — nunca para ofrecer una categoría que no existe.
   */
  const categoriasDisponibles = useMemo(() => {
    const vistas: string[] = [];
    for (const p of productos) {
      const c = (p.categoria || '').trim();
      if (c && !vistas.includes(c)) vistas.push(c);
    }
    return vistas.length > 0 ? ['Todos', ...vistas] : [...CATEGORIAS_BASE];
  }, [productos]);

  // Filtrado
  const productosFiltrados = useMemo(() => {
    return productos.filter((prod) => {
      const coincideCat = categoriaActiva === 'Todos' || prod.categoria === categoriaActiva;
      const coincideBusqueda =
        busqueda.trim() === '' ||
        prod.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        prod.descripcion.toLowerCase().includes(busqueda.toLowerCase());
      return coincideCat && coincideBusqueda;
    });
  }, [productos, categoriaActiva, busqueda]);

  // Totales
  const cantidadTotal = Object.values(carrito).reduce((acc, curr) => acc + curr, 0);
  const subtotal = Object.entries(carrito).reduce((acc, [id, qty]) => {
    const prod = productos.find((p) => p.id === id);
    return acc + (prod ? prod.precio * qty : 0);
  }, 0);
  const costoEnvio = cantidadTotal > 0 && modalidad === 'domicilio' ? 5000 : 0;
  const total = subtotal + costoEnvio;

  // Enviar selección de productos a Telegram para revisión y confirmación en el bot
  const enviarSeleccionATelegram = async () => {
    if (cantidadTotal === 0) return;
    setGuardandoPedido(true);

    try {
      const lineas = Object.entries(carrito).map(([id, qty]) => {
        const prod = productos.find((p) => p.id === id);
        return {
          productId: id,
          nombre: prod?.nombre || 'Producto',
          cantidad: qty,
          precioUnitario: prod?.precio || 0,
        };
      });

      const sb = getSupabase();
      if (sb && chatId) {
        // Actualizar el borrador y estado de la conversación en Supabase
        const { data: contacto } = await sb
          .schema(ESQUEMA)
          .from('contacto')
          .select('id')
          .eq('organizacion_id', 'fc009b85-73b8-47b3-8d1a-080b65ac7120')
          .ilike('telefono', `%${chatId}%`)
          .maybeSingle();

        if (contacto?.id) {
          const { data: conv } = await sb
            .schema(ESQUEMA)
            .from('conversacion')
            .select('id, estado_respuesta')
            .eq('contacto_id', contacto.id)
            .maybeSingle();

          if (conv?.id) {
            const previo = (conv.estado_respuesta as Record<string, any>) || {};
            const draftObj = {
              lineas,
              modalidad: modalidad || 'retiro',
              direccion: modalidad === 'domicilio' ? direccion : null,
              destinatario: previo?.draft?.destinatario || { tipo: 'propio', nombre: cliente },
              updatedAt: new Date().toISOString(),
            };

            await sb
              .schema(ESQUEMA)
              .from('conversacion')
              .update({
                estado_respuesta: {
                  ...previo,
                  fsmState: 'CONFIRMANDO_PEDIDO',
                  draft: draftObj,
                  enCurso: draftObj,
                },
                actualizada_en: new Date().toISOString(),
              })
              .eq('id', conv.id);
          }
        }
      }

      // Notificar al bot de Telegram directamente con el resumen y botones
      const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      if (chatId && botToken) {
        const resumenProds = lineas
          .map((l) => `• ${l.cantidad} × <b>${l.nombre}</b> — <code>$${(l.precioUnitario * l.cantidad).toLocaleString('es-CO')} COP</code>`)
          .join('\n');

        const entregaDesc = modalidad === 'domicilio'
          ? `🛵 <b>Domicilio en:</b> <i>${direccion}</i>`
          : `🛍️ <b>Retiro en:</b> <i>${sede}</i>`;

        const mensajeTelegram = `📋 <b>RESUMEN DE TU PEDIDO SELECCIONADO</b>\n<blockquote>` +
          `${resumenProds}\n` +
          `──────────────────────────\n` +
          `<b>Subtotal:</b> <code>$${subtotal.toLocaleString('es-CO')} COP</code>\n` +
          `<b>Envío:</b> <code>$${costoEnvio.toLocaleString('es-CO')} COP</code>\n` +
          `<b>Total a pagar:</b> <code>$${total.toLocaleString('es-CO')} COP</code>\n` +
          `${entregaDesc}</blockquote>\n\n` +
          `¿Estás a gusto con tu orden o deseas cambiar algo?`;

        const keyboardRows = [
          [{ text: 'Confirmar y Pagar 💳' }],
          [{ text: '✏️ Modificar pedido' }, { text: '❌ Cancelar orden' }],
        ];

        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: mensajeTelegram,
            parse_mode: 'HTML',
            reply_markup: {
              keyboard: keyboardRows,
              resize_keyboard: true,
              one_time_keyboard: false,
            },
          }),
        }).catch((err) => console.warn('[MenuCatalogoPage] Error notificando Telegram:', err));
      }

      setSeleccionEnviada({
        total,
        cantidad: cantidadTotal,
      });
    } catch (e) {
      console.error('[MenuCatalogoPage] Error al enviar selección al bot:', e);
      setSeleccionEnviada({
        total,
        cantidad: cantidadTotal,
      });
    } finally {
      setGuardandoPedido(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Catálogo"
        description="Catálogo de productos del negocio"
      />
      <div className="min-h-screen bg-gray-50/60 dark:bg-gray-950 flex flex-col font-sans text-gray-800 dark:text-gray-200 antialiased selection:bg-[#190088] selection:text-white pb-24">
        {/* ── CABECERA CORPORATIVA NECTO ── */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">
            {/* Logo Necto & Sede */}
            <div className="flex items-center gap-3">
              <NectoLogo size="xs" />

              <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <MapPinIcon className="w-3.5 h-3.5 text-[#FF3F1A]" />
                <span className="truncate max-w-[140px] md:max-w-[200px]">{sede}</span>
              </div>
            </div>

            {/* Buscador & Carrito */}
            <div className="flex items-center gap-2.5">
              <div className="relative hidden md:block w-64 lg:w-80">
                <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar producto o categoría..."
                  className="w-full h-9 pl-9 pr-8 bg-gray-50 dark:bg-gray-950 text-xs text-gray-900 dark:text-white placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-800 focus:border-[#190088] dark:focus:border-[#97D6DF] outline-none transition-all"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              <span className="hidden lg:inline text-xs text-gray-500 dark:text-gray-400">
                Hola, <strong className="text-[#190088] dark:text-white">{cliente}</strong>
              </span>

              <button
                type="button"
                onClick={() => setModalCarritoAbierto(true)}
                className="relative flex items-center gap-2 bg-[#190088] hover:bg-[#190088]/90 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
              >
                <ShoppingBagIcon className="w-4 h-4" />
                <span className="hidden sm:inline font-mono">{formatearCOP(subtotal)}</span>
                {cantidadTotal > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-[#FF3F1A] text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                    {cantidadTotal}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Buscador en móviles */}
          <div className="md:hidden px-4 pb-2.5">
            <div className="relative w-full">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en el catálogo..."
                className="w-full h-9 pl-9 pr-3 bg-gray-50 dark:bg-gray-950 text-xs text-gray-900 dark:text-white placeholder-gray-400 rounded-xl border border-gray-200 dark:border-gray-800 focus:border-[#190088] outline-none"
              />
            </div>
          </div>

          {/* ── BARRA DE CATEGORÍAS ── */}
          <div className="border-t border-gray-100 dark:border-gray-800/80 px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto scrollbar-none bg-gray-50/50 dark:bg-gray-900/50">
            <div className="max-w-7xl mx-auto flex items-center gap-1.5">
              {categoriasDisponibles.map((cat) => {
                const activa = categoriaActiva === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaActiva(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer ${
                      activa
                        ? 'bg-[#190088] text-white font-semibold shadow-2xs dark:bg-white dark:text-gray-900'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium border border-gray-200/60 dark:border-gray-700/60'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* ── BANNER SENCILLO INFORMATIVO ── */}
        <div className="bg-[#97D6DF]/15 dark:bg-[#97D6DF]/10 border-b border-[#97D6DF]/30 py-2 px-4 text-center text-xs text-gray-700 dark:text-gray-300">
          <span>Bienvenido <b>{cliente}</b> • Entrega estimada en: <i>{direccion}</i></span>
        </div>

        {/* ── LISTADO / GRID DE PRODUCTOS DE ALTA DENSIDAD ── */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1 w-full space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#190088] dark:text-white tracking-tight">
                Catálogo
              </h1>
              {categoriaActiva !== 'Todos' && (
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  · {categoriaActiva}
                </span>
              )}
              <span className="bg-[#97D6DF]/25 dark:bg-[#97D6DF]/15 text-[#190088] dark:text-[#97D6DF] text-xs font-bold px-2 py-0.5 rounded-full">
                {productosFiltrados.length}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Precios con IVA incluido</span>
            </span>
          </div>

          {productosFiltrados.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs space-y-2">
              <p className="text-gray-500 text-sm">No encontramos productos en esta categoría.</p>
              <button
                type="button"
                onClick={() => { setBusqueda(''); setCategoriaActiva('Todos'); }}
                className="text-xs text-[#FF3F1A] font-bold hover:underline"
              >
                Ver todos los productos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
              {productosFiltrados.map((prod) => {
                const qty = carrito[prod.id] || 0;
                return (
                  <div
                    key={prod.id}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Imagen */}
                    <div className="relative aspect-4/3 w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <img
                        src={prod.imagen}
                        alt={prod.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />

                      {/* Tag de Categoría */}
                      <span className="absolute top-2 left-2 bg-white/95 dark:bg-gray-900/95 text-gray-800 dark:text-gray-200 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs backdrop-blur-xs truncate max-w-[65%]">
                        {prod.categoria}
                      </span>

                      {prod.popular && (
                        <span className="absolute top-2 right-2 bg-[#FF3F1A] text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs uppercase tracking-wider">
                          Destacado
                        </span>
                      )}

                      {/* Precio superpuesto en la foto */}
                      <div className="absolute bottom-1.5 left-2">
                        <span className="text-xs sm:text-sm font-bold text-white drop-shadow-md tabular-nums">
                          {formatearCOP(prod.precio)}
                        </span>
                      </div>
                    </div>

                    {/* Datos del producto */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                      <div>
                        <h3 className="text-xs sm:text-[13px] font-bold text-[#190088] dark:text-white line-clamp-1 group-hover:text-[#FF3F1A] transition-colors leading-tight">
                          {prod.nombre}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-tight">
                          {prod.descripcion}
                        </p>
                      </div>

                      {/* Selector de cantidad / Botón de agregar */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80">
                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => agregarItem(prod.id)}
                            className="w-full py-1.5 px-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-[#190088] hover:text-white dark:hover:bg-[#190088] text-gray-800 dark:text-gray-200 text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
                            title="Agregar al pedido"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>Agregar</span>
                          </button>
                        ) : (
                          <div className="w-full py-1 px-2 rounded-xl bg-[#97D6DF]/15 border border-[#97D6DF]/60 dark:border-[#97D6DF]/30 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => quitarItem(prod.id)}
                              className="w-6 h-6 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 flex items-center justify-center text-xs font-bold transition-all shadow-2xs"
                              title="Disminuir"
                            >
                              <MinusIcon className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-[#190088] dark:text-white tabular-nums font-mono px-2">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => agregarItem(prod.id)}
                              className="w-6 h-6 rounded-lg bg-[#190088] text-white hover:bg-[#190088]/90 flex items-center justify-center text-xs font-bold transition-all shadow-2xs"
                              title="Aumentar"
                            >
                              <PlusIcon className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ── BARRA FLOTANTE DE RESUMEN ── */}
        {cantidadTotal > 0 && (
          <div className="fixed bottom-4 inset-x-0 z-40 max-w-lg mx-auto px-4 animate-fadeIn">
            <div className="bg-[#190088] text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-4 border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FF3F1A] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {cantidadTotal}
                </div>
                <div>
                  <div className="text-[11px] text-gray-200 font-medium">Subtotal orden:</div>
                  <div className="text-sm sm:text-base font-black text-white tabular-nums">
                    {formatearCOP(subtotal)} <span className="text-xs font-normal text-gray-300">COP</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalCarritoAbierto(true)}
                className="py-2.5 px-5 bg-[#FF3F1A] hover:bg-[#FF3F1A]/90 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                <span>Ver pedido</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── MODAL DEL CARRITO / CONFIRMAR PEDIDO (2 PASOS) ── */}
        {modalCarritoAbierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Cabecera del modal */}
              <div className="bg-[#190088] text-white px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <ShoppingBagIcon className="w-4 h-4 text-[#97D6DF]" />
                  <span>
                    {seleccionEnviada
                      ? 'Selección enviada a Telegram'
                      : `Tu Pedido (${cantidadTotal} ${cantidadTotal === 1 ? 'producto' : 'productos'})`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setModalCarritoAbierto(false);
                    if (seleccionEnviada) {
                      setCarrito({});
                      setSeleccionEnviada(null);
                    }
                  }}
                  className="text-gray-300 hover:text-white text-xl leading-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* ── PASO 2: SELECCIÓN ENVIADA A TELEGRAM (SIN PASARELA EN WEB) ── */}
              {seleccionEnviada ? (
                <div className="p-6 text-center space-y-5 animate-fadeIn overflow-y-auto">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircleIcon className="w-10 h-10" />
                  </div>
                  <div>
                    <span className="inline-block bg-[#97D6DF]/20 text-[#190088] dark:text-[#97D6DF] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                      ¡Selección enviada a Telegram!
                    </span>
                    <h2 className="text-xl font-bold text-[#190088] dark:text-white">
                      Tu pedido ya está en el bot
                    </h2>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                      Hemos transferido los {seleccionEnviada.cantidad} productos seleccionados a tu conversación.
                    </p>
                  </div>

                  {/* Resumen de la selección enviada */}
                  <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 text-left text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Cliente:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{cliente}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Modalidad:</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {modalidad === 'domicilio' ? `🛵 Domicilio (${direccion})` : `🛍️ Retiro en ${sede}`}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 font-bold text-sm">
                      <span className="text-gray-900 dark:text-white">Total a liquidar:</span>
                      <span className="text-[#FF3F1A] font-mono">{formatearCOP(seleccionEnviada.total)} COP</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-brand-50 dark:bg-brand-500/10 rounded-2xl border border-brand-200 dark:border-brand-500/30 text-brand-800 dark:text-brand-300 text-xs text-left leading-relaxed">
                    💬 <b>Siguiente paso en Telegram:</b> Abre tu chat con el bot para revisar tu orden. Allí podrás <b>confirmar tu pedido para recibir el link de pago seguro</b>, o <b>editar / cancelar</b> si deseas cambiar algo.
                  </div>

                  <div className="pt-2 flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => window.open('https://t.me/NectoPedidosBot', '_blank')}
                      className="w-full py-3.5 bg-[#FF3F1A] hover:bg-[#FF3F1A]/90 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Volver al Bot de Telegram 🤖</span>
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModalCarritoAbierto(false);
                        setSeleccionEnviada(null);
                      }}
                      className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white font-medium text-center"
                    >
                      Seguir explorando el catálogo
                    </button>
                  </div>
                </div>
              ) : (
                /* ── PASO 1: REVISIÓN DE PRODUCTOS Y CONFIRMAR PEDIDO ── */
                <>
                  {/* Lista de productos */}
                  <div className="p-5 overflow-y-auto space-y-3 flex-1">
                    {cantidadTotal === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        El carrito está vacío. Agrega productos del catálogo.
                      </div>
                    ) : (
                      Object.entries(carrito).map(([id, qty]) => {
                        const prod = productos.find((p) => p.id === id);
                        if (!prod) return null;
                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={prod.imagen}
                                alt={prod.nombre}
                                className="w-12 h-12 rounded-xl object-cover shrink-0"
                              />
                              <div>
                                <div className="text-xs font-bold text-gray-800 dark:text-gray-200">{prod.nombre}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                  {formatearCOP(prod.precio)} c/u
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 bg-white dark:bg-gray-700 px-2 py-1 rounded-xl border border-gray-200 dark:border-gray-600 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => quitarItem(id)}
                                  className="text-xs text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white font-bold px-1"
                                >
                                  <MinusIcon className="w-3 h-3" />
                                </button>
                                <span className="text-xs font-bold font-mono px-1 text-gray-900 dark:text-white">{qty}</span>
                                <button
                                  type="button"
                                  onClick={() => agregarItem(id)}
                                  className="text-xs text-[#190088] dark:text-[#97D6DF] hover:opacity-80 font-bold px-1"
                                >
                                  <PlusIcon className="w-3 h-3" />
                                </button>
                              </div>
                              <span className="text-xs font-bold text-gray-900 dark:text-white w-16 text-right font-mono">
                                {formatearCOP(prod.precio * qty)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* Datos de entrega */}
                    {cantidadTotal > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-3.5 border border-gray-200 dark:border-gray-700 text-xs space-y-1.5 mt-4">
                        <div className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1 mb-1">
                          <BuildingStorefrontIcon className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF]" />
                          <span>Información de Entrega</span>
                        </div>
                        <div className="text-gray-600 dark:text-gray-400"><b>Cliente:</b> {cliente}</div>
                        <div className="text-gray-600 dark:text-gray-400"><b>Modalidad:</b> {modalidad === 'domicilio' ? 'Envío a domicilio 🛵' : 'Retiro en local 🛍️'}</div>
                        {modalidad === 'domicilio' && (
                          <div className="text-gray-600 dark:text-gray-400"><b>Dirección:</b> {direccion}</div>
                        )}
                        <div className="text-gray-600 dark:text-gray-400"><b>Sede:</b> {sede}</div>
                      </div>
                    )}
                  </div>

                  {/* Totales y Botón de Confirmación */}
                  {cantidadTotal > 0 && (
                    <div className="p-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 space-y-3">
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>Subtotal productos:</span>
                          <span className="font-mono font-medium">{formatearCOP(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>Costo de envío:</span>
                          <span className="font-mono font-medium">
                            {costoEnvio === 0 ? 'Gratis (Retiro en local)' : formatearCOP(costoEnvio)}
                          </span>
                        </div>
                        <div className="flex justify-between text-base font-black text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span>Total pedido:</span>
                          <span className="text-[#FF3F1A] font-mono">{formatearCOP(total)} COP</span>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={enviarSeleccionATelegram}
                          disabled={guardandoPedido}
                          className="w-full py-3 bg-[#FF3F1A] hover:bg-[#FF3F1A]/90 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          {guardandoPedido ? (
                            <>
                              <ArrowPathIcon className="w-4 h-4 animate-spin" />
                              <span>Enviando al bot de Telegram...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="w-4 h-4" />
                              <span>Confirmar selección y enviar al Bot 📲</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setModalCarritoAbierto(false)}
                          className="w-full py-2 text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white font-medium text-center"
                        >
                          Seguir explorando el catálogo
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MenuCatalogoPage;
