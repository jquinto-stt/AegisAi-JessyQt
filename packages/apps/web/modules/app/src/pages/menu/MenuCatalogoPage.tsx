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
const CATEGORIAS_BASE = [
  'Todos',
  'Combos y Platos',
  'Acompañamientos',
  'Bebidas',
  'Postres',
] as const;

// Catálogo por defecto para Necto
const PRODUCTOS_DEFAULT: ProductoItem[] = [
  {
    id: 'cat-f1',
    nombre: 'Combo Hamburguesa Clásica',
    categoria: 'Combos y Platos',
    descripcion: 'Carne 100% de res a la parrilla, queso cheddar, lechuga fresca, tomate y salsa especial de la casa con papas.',
    precio: 25000,
    imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80',
    popular: true,
  },
  {
    id: 'cat-f2',
    nombre: 'Papas Rústicas con Queso',
    categoria: 'Acompañamientos',
    descripcion: 'Papas en cascos doradas sazonadas con especias artesanales y bañadas en fondue de queso fundido.',
    precio: 12000,
    imagen: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&q=80',
  },
  {
    id: 'cat-f3',
    nombre: 'Bebida Gaseosa 350ml',
    categoria: 'Bebidas',
    descripcion: 'Refresco frío en lata para acompañar tu orden.',
    precio: 4000,
    imagen: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
  },
  {
    id: 'cat-f4',
    nombre: 'Postre Cheesecake de Frutos Rojos',
    categoria: 'Postres',
    descripcion: 'Cremoso cheesecake neoyorquino con base crocante y coulis artesanal de frutos del bosque.',
    precio: 9000,
    imagen: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500&q=80',
    popular: true,
  },
  {
    id: 'cat-f5',
    nombre: 'Bowl Saludable de Pollo Teriyaki',
    categoria: 'Combos y Platos',
    descripcion: 'Pechuga a la plancha glaseada en salsa teriyaki, arroz integral, aguacate, ajonjolí y vegetales al vapor.',
    precio: 27500,
    imagen: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80',
  },
  {
    id: 'cat-f6',
    nombre: 'Limonada Natural Hierbabuena',
    categoria: 'Bebidas',
    descripcion: 'Limonada frappé recién preparada con hojas de hierbabuena fresca y toque de panela.',
    precio: 7500,
    imagen: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80',
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
              const defaultImgs = [
                'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80',
                'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&q=80',
                'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
                'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=500&q=80',
              ];
              return {
                id: String(i.id || `prod-${idx}`),
                nombre: String(i.nombre),
                categoria: i.categoria || (idx % 2 === 0 ? 'Combos y Platos' : 'Acompañamientos'),
                descripcion: i.descripcion || 'Producto fresco preparado al momento con los más altos estándares.',
                precio: Number(i.precio) || 0,
                imagen: i.imagen || defaultImgs[idx % defaultImgs.length],
                popular: idx === 0,
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800 antialiased selection:bg-secondary-600 selection:text-white pb-24">
      {/* ── CABECERA CORPORATIVA NECTO ── */}
      <header className="sticky top-0 z-30 bg-gray-900 text-white shadow-md border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Logo Necto & Sede */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img
                src="/images/logo/necto-full-white.svg"
                alt="NECTO"
                className="h-7 w-auto"
                onError={(e) => {
                  // Fallback si no carga imagen estática
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-xl font-black tracking-tight text-white flex items-center">
                NECTO<span className="text-secondary-400">.</span>
              </span>
            </div>

            <div className="h-5 w-px bg-gray-700 mx-1 hidden sm:block"></div>

            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold text-gray-200">Catálogo Digital</span>
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <MapPinIcon className="w-3 h-3 text-secondary-400" />
                <span className="truncate max-w-[180px]">{sede}</span>
              </div>
            </div>
          </div>

          {/* Buscador & Carrito */}
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-64">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full h-9 pl-9 pr-3 bg-gray-800 text-sm text-white placeholder-gray-400 rounded-lg border border-gray-700 focus:border-secondary-500 focus:ring-1 focus:ring-secondary-500 outline-none transition-all"
              />
            </div>

            <button
              type="button"
              onClick={() => setModalCarritoAbierto(true)}
              className="relative flex items-center gap-2 bg-secondary-600 dark:bg-accent-300 dark:text-ink-body hover:bg-secondary-700 active:bg-secondary-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <ShoppingBagIcon className="w-4 h-4" />
              <span className="hidden sm:inline font-mono font-medium">{formatearCOP(subtotal)}</span>
              {cantidadTotal > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand-400 text-gray-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {cantidadTotal}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Buscador en móviles */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative w-full">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en el catálogo..."
              className="w-full h-9 pl-9 pr-3 bg-gray-800 text-sm text-white placeholder-gray-400 rounded-lg border border-gray-700 focus:border-secondary-500 outline-none"
            />
          </div>
        </div>

        {/* ── BARRA DE CATEGORÍAS ── */}
        <div className="bg-gray-950 border-t border-gray-800 px-4 overflow-x-auto scrollbar-none py-2.5">
          <div className="max-w-6xl mx-auto flex items-center gap-2">
            {CATEGORIAS_BASE.map((cat) => {
              const activa = categoriaActiva === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoriaActiva(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    activa
                      ? 'bg-secondary-600 dark:bg-accent-300 dark:text-ink-body text-white font-semibold shadow-xs'
                      : 'bg-gray-800/80 text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── BANNER SENCILLO NECTO ── */}
      <div className="bg-secondary-50 border-b border-secondary-100 py-2.5 px-4 text-center text-xs text-secondary-900">
        <span>👋 Bienvenido <b>{cliente}</b> • Entrega estimada en: <i>{direccion}</i></span>
      </div>

      {/* ── LISTADO / GRID DE PRODUCTOS ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 flex-1 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-ink-title tracking-tight">
              {categoriaActiva === 'Todos' ? 'Catálogo de Productos' : categoriaActiva}
            </h1>
            <span className="bg-gray-200 text-gray-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {productosFiltrados.length}
            </span>
          </div>
          <span className="text-xs text-gray-500 flex items-center gap-1 font-medium">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-accent-600" />
            <span>Precios con IVA incluido</span>
          </span>
        </div>

        {productosFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-2xs">
            <p className="text-gray-500 text-sm">No encontramos productos en esta categoría.</p>
            <button
              onClick={() => { setBusqueda(''); setCategoriaActiva('Todos'); }}
              className="mt-3 text-xs text-secondary-600 dark:text-accent-300 font-bold hover:underline"
            >
              Ver todos los productos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {productosFiltrados.map((prod) => {
              const qty = carrito[prod.id] || 0;
              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-xl border border-gray-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  {/* Imagen */}
                  <div className="relative aspect-4/3 w-full bg-gray-100 overflow-hidden">
                    <img
                      src={prod.imagen}
                      alt={prod.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {prod.popular && (
                      <span className="absolute top-2 left-2 bg-secondary-600 dark:bg-accent-300 dark:text-ink-body text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                        Destacado
                      </span>
                    )}
                  </div>

                  {/* Datos del producto */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-semibold uppercase text-secondary-600 dark:text-accent-300 tracking-wider mb-0.5">
                        {prod.categoria}
                      </div>
                      <h3 className="text-sm font-bold text-ink-title leading-snug">
                        {prod.nombre}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                        {prod.descripcion}
                      </p>
                    </div>

                    {/* Precio y Selector */}
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-sm font-black text-gray-900">
                        {formatearCOP(prod.precio)}
                      </span>

                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => agregarItem(prod.id)}
                          className="w-8 h-8 rounded-lg bg-secondary-600 dark:bg-accent-300 dark:text-ink-body hover:bg-secondary-700 active:bg-secondary-800 text-white flex items-center justify-center transition-transform active:scale-95 shadow-xs cursor-pointer"
                          title="Agregar al pedido"
                        >
                          <PlusIcon className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-secondary-50 px-2 py-1 rounded-lg border border-secondary-200">
                          <button
                            type="button"
                            onClick={() => quitarItem(prod.id)}
                            className="w-5 h-5 rounded bg-white text-gray-700 hover:bg-gray-100 flex items-center justify-center text-xs font-bold transition-all"
                          >
                            <MinusIcon className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-secondary-700 px-1 font-mono">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => agregarItem(prod.id)}
                            className="w-5 h-5 rounded bg-secondary-600 dark:bg-accent-300 dark:text-ink-body text-white hover:bg-secondary-700 flex items-center justify-center text-xs font-bold transition-all"
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
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-2xl px-4 py-3 animate-fadeIn">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary-600 dark:bg-accent-300 dark:text-ink-body text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {cantidadTotal}
              </div>
              <div>
                <div className="text-xs text-gray-500 font-medium">Subtotal orden:</div>
                <div className="text-base font-black text-gray-900">
                  {formatearCOP(subtotal)} <span className="text-xs font-normal text-gray-500">COP</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalCarritoAbierto(true)}
              className="py-2.5 px-6 bg-secondary-600 dark:bg-accent-300 dark:text-ink-body hover:bg-secondary-700 active:bg-secondary-800 text-white text-sm font-bold rounded-lg transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span>Ver pedido</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL DEL CARRITO / CONFIRMAR PEDIDO (2 PASOS) ── */}
      {modalCarritoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Cabecera del modal */}
            <div className="bg-gray-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShoppingBagIcon className="w-4 h-4 text-secondary-400" />
                <span>
                  {seleccionEnviada
                    ? 'Selección enviada a Telegram'
                    : `Tu Pedido (${cantidadTotal} productos)`}
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
                className="text-gray-400 hover:text-white text-xl leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* ── PASO 2: SELECCIÓN ENVIADA A TELEGRAM (SIN PASARELA EN WEB) ── */}
            {seleccionEnviada ? (
              <div className="p-6 text-center space-y-5 animate-fadeIn overflow-y-auto">
                <div className="w-16 h-16 bg-secondary-100 text-secondary-600 dark:text-accent-300 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircleIcon className="w-10 h-10" />
                </div>
                <div>
                  <span className="inline-block bg-secondary-100 text-secondary-800 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                    ¡Selección enviada a Telegram!
                  </span>
                  <h2 className="text-xl font-black text-ink-title">
                    Tu pedido ya está en el bot
                  </h2>
                  <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto">
                    Hemos transferido los {seleccionEnviada.cantidad} productos seleccionados a tu conversación con Sofía.
                  </p>
                </div>

                {/* Resumen de la selección enviada */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-left text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cliente:</span>
                    <span className="font-semibold text-gray-800">{cliente}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Modalidad:</span>
                    <span className="font-semibold text-gray-800">
                      {modalidad === 'domicilio' ? `🛵 Domicilio (${direccion})` : `🛍️ Retiro en ${sede}`}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-sm">
                    <span className="text-gray-900">Total a liquidar:</span>
                    <span className="text-secondary-600 dark:text-accent-300 font-mono">{formatearCOP(seleccionEnviada.total)} COP</span>
                  </div>
                </div>

                <div className="p-3.5 bg-brand-50 rounded-xl border border-brand-200 text-brand-800 text-xs text-left leading-relaxed">
                  💬 <b>Siguiente paso en Telegram:</b> Abre tu chat con el bot para revisar tu orden. Allí podrás <b>confirmar tu pedido para recibir el link de pago seguro</b>, o <b>editar / cancelar</b> si deseas cambiar algo.
                </div>

                <div className="pt-2 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => window.open('https://t.me/NectoPedidosBot', '_blank')}
                    className="w-full py-3.5 bg-secondary-600 dark:bg-accent-300 dark:text-ink-body hover:bg-secondary-700 active:bg-secondary-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
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
                    className="w-full py-2.5 text-xs text-gray-500 hover:text-gray-800 font-medium text-center"
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
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200/80 gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={prod.imagen}
                              alt={prod.nombre}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                            <div>
                              <div className="text-xs font-bold text-gray-800">{prod.nombre}</div>
                              <div className="text-xs text-gray-500 font-mono">
                                {formatearCOP(prod.precio)} c/u
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-300">
                              <button
                                type="button"
                                onClick={() => quitarItem(id)}
                                className="text-xs text-gray-600 hover:text-black font-bold px-1"
                              >
                                <MinusIcon className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold font-mono px-1">{qty}</span>
                              <button
                                type="button"
                                onClick={() => agregarItem(id)}
                                className="text-xs text-secondary-600 dark:text-accent-300 hover:text-secondary-800 font-bold px-1"
                              >
                                <PlusIcon className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-xs font-bold text-gray-900 w-16 text-right font-mono">
                              {formatearCOP(prod.precio * qty)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Datos de entrega */}
                  {cantidadTotal > 0 && (
                    <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200 text-xs space-y-1.5 mt-4">
                      <div className="font-bold text-gray-800 flex items-center gap-1 mb-1">
                        <BuildingStorefrontIcon className="w-3.5 h-3.5 text-secondary-600 dark:text-accent-300" />
                        <span>Información de Entrega</span>
                      </div>
                      <div className="text-gray-600"><b>Cliente:</b> {cliente}</div>
                      <div className="text-gray-600"><b>Modalidad:</b> {modalidad === 'domicilio' ? 'Envío a domicilio 🛵' : 'Retiro en local 🛍️'}</div>
                      {modalidad === 'domicilio' && (
                        <div className="text-gray-600"><b>Dirección:</b> {direccion}</div>
                      )}
                      <div className="text-gray-600"><b>Sede:</b> {sede}</div>
                    </div>
                  )}
                </div>

                {/* Totales y Botón de Confirmación */}
                {cantidadTotal > 0 && (
                  <div className="p-5 bg-gray-50 border-t border-gray-200 space-y-3">
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal productos:</span>
                        <span className="font-mono font-medium">{formatearCOP(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Costo de envío:</span>
                        <span className="font-mono font-medium">
                          {costoEnvio === 0 ? 'Gratis (Retiro en local)' : formatearCOP(costoEnvio)}
                        </span>
                      </div>
                      <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
                        <span>Total pedido:</span>
                        <span className="text-secondary-600 dark:text-accent-300 font-mono">{formatearCOP(total)} COP</span>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={enviarSeleccionATelegram}
                        disabled={guardandoPedido}
                        className="w-full py-3 bg-secondary-600 dark:bg-accent-300 dark:text-ink-body hover:bg-secondary-700 active:bg-secondary-800 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
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
                        className="w-full py-2 text-xs text-gray-500 hover:text-gray-800 font-medium text-center"
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
  );
};

export default MenuCatalogoPage;
