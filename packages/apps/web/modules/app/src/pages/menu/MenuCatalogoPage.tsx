import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  HeartIcon,
  CheckIcon,
  TicketIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  ShoppingBagIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  QrCodeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import QRCode from 'qrcode';
import { getSupabase, ESQUEMA } from '../../lib/supabase';
import { PageMeta } from '../../shell/meta';
import { asignarFotoInteligente } from '../pedidos/CatalogoPage';

interface ProductoItem {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  subtexto?: string;
  precio: number;
  imagen: string;
  badge?: string;
}

const CATEGORIAS_MOCK = [
  'Todos',
  'Pizzas',
  'Hamburguesas',
  'Pastas',
  'Arroces',
  'Ensaladas',
  'Bebidas',
  'Postres',
] as const;

const FOTO_RESPALDO = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80';

const PRODUCTOS_DEFAULT: ProductoItem[] = [
  {
    id: 'prod-pizza-bbq',
    nombre: 'Pizza BBQ Artesanal',
    categoria: 'Pizzas',
    descripcion: 'Masa artesanal con salsa BBQ, queso mozzarella y pollo desmechado.',
    subtexto: 'Porción 7-8 pulgadas',
    precio: 28000,
    imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80',
    badge: 'Más Vendido',
  },
  {
    id: 'prod-biryani',
    nombre: 'Arroz Especial de la Casa',
    categoria: 'Arroces',
    descripcion: 'Arroz especiado con pollo tierno aromatizado con finas hierbas.',
    subtexto: 'Porción 380-500g',
    precio: 25000,
    imagen: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80',
    badge: 'Destacado',
  },
  {
    id: 'prod-pasta-pesto',
    nombre: 'Pasta Penne al Pesto',
    categoria: 'Pastas',
    descripcion: 'Pasta penne al dente con salsa pesto genovés y queso parmesano.',
    subtexto: 'Porción 80-100g',
    precio: 20000,
    imagen: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&q=80',
    badge: '9% Descuento',
  },
  {
    id: 'prod-noodles',
    nombre: 'Fideos Salteados al Wok',
    categoria: 'Pastas',
    descripcion: 'Fideos orientales salteados con vegetales frescos y salsa de la casa.',
    subtexto: 'Porción 100-150g',
    precio: 22000,
    imagen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&q=80',
    badge: 'Más Vendido',
  },
  {
    id: 'prod-pasta-bolognesa',
    nombre: 'Pasta Bolognesa Tradicional',
    categoria: 'Pastas',
    descripcion: 'Pasta con salsa boloñesa tradicional y carne de res seleccionada.',
    subtexto: 'Porción 250-320g',
    precio: 24000,
    imagen: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=500&q=80',
    badge: 'Destacado',
  },
  {
    id: 'prod-pizza-pepperoni',
    nombre: 'Pizza Pepperoni Clásica',
    categoria: 'Pizzas',
    descripcion: 'Crocante con generosa capa de queso mozzarella y pepperoni.',
    subtexto: 'Porción 6-7 pulgadas',
    precio: 26000,
    imagen: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&q=80',
    badge: 'Nuevo',
  },
  {
    id: 'prod-burger',
    nombre: 'Hamburguesa Clásica Angus',
    categoria: 'Hamburguesas',
    descripcion: 'Carne Angus 150g con queso cheddar fundido y vegetales frescos.',
    subtexto: 'Porción 200-250g',
    precio: 25000,
    imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80',
    badge: 'Más Vendido',
  },
  {
    id: 'prod-papas',
    nombre: 'Papas Rústicas con Queso',
    categoria: 'Ensaladas',
    descripcion: 'Papas doradas al romero acompañadas de queso fundido artesanal.',
    subtexto: 'Porción 180-220g',
    precio: 12000,
    imagen: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&q=80',
    badge: '9% Descuento',
  },
  {
    id: 'prod-bebida',
    nombre: 'Bebida Refrescante Natural',
    categoria: 'Bebidas',
    descripcion: 'Jugo natural de fruta fresca o soda aromatizada.',
    subtexto: 'Vaso 350ml',
    precio: 5000,
    imagen: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80',
  },
  {
    id: 'prod-postre',
    nombre: 'Cheesecake de Frutos Rojos',
    categoria: 'Postres',
    descripcion: 'Suave pastel de queso bañado en salsa de frutos silvestres.',
    subtexto: 'Porción 120g',
    precio: 11000,
    imagen: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&q=80',
    badge: 'Nuevo',
  },
];

export const MenuCatalogoPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const cliente = searchParams.get('cliente') || 'Jessy Quinto';
  const sede = searchParams.get('sede') || 'Sede Principal';
  const direccion = searchParams.get('direccion') || 'Medellín, Colombia';
  const chatId = searchParams.get('chatId') || '';
  const paramModalidad = searchParams.get('modalidad');

  const [modalidad, setModalidad] = useState<string>(
    paramModalidad || (direccion ? 'domicilio' : 'retiro')
  );
  const [productos, setProductos] = useState<ProductoItem[]>(PRODUCTOS_DEFAULT);
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [carrito, setCarrito] = useState<{ [productoId: string]: number }>({
    'prod-pizza-bbq': 2,
    'prod-biryani': 1,
    'prod-pasta-pesto': 2,
  });
  const [favoritos, setFavoritos] = useState<{ [productoId: string]: boolean }>({
    'prod-pizza-bbq': true,
    'prod-biryani': true,
  });
  const [promoActiva, setPromoActiva] = useState<boolean>(true);
  const [modalPagoAbierto, setModalPagoAbierto] = useState<boolean>(false);
  const [codigoQrDataUrl, setCodigoQrDataUrl] = useState<string>('');
  const [guardandoPedido, setGuardandoPedido] = useState<boolean>(false);
  const [notificacionBotEnviada, setNotificacionBotEnviada] = useState<boolean>(false);

  // Cargar catálogo desde Supabase si existe configuración personalizada
  useEffect(() => {
    const cargarCatalogoBD = async () => {
      const sb = getSupabase();
      if (!sb) return;

      try {
        const { data, error } = await sb
          .schema(ESQUEMA)
          .from('config_pedidos')
          .select('catalogo')
          .limit(1)
          .maybeSingle();

        if (!error && data?.catalogo && Array.isArray(data.catalogo) && data.catalogo.length > 0) {
          const cargados: ProductoItem[] = data.catalogo
            .filter((i: any) => i && i.disponible !== false)
            .map((i: any, idx: number) => {
              const foto = i.imagen || asignarFotoInteligente(i.nombre, i.categoria);
              return {
                id: String(i.id || `prod-${idx}`),
                nombre: String(i.nombre),
                categoria: i.categoria || 'Pizzas',
                descripcion: i.descripcion || 'Producto elaborado con ingredientes selectos.',
                subtexto: i.descripcion ? i.descripcion.slice(0, 20) : 'Porción estándar',
                precio: Number(i.precio) || 0,
                imagen: foto,
                badge: i.popular ? 'Destacado' : idx % 3 === 0 ? 'Más Vendido' : undefined,
              };
            });

          const idsExistentes = new Set(cargados.map((c) => c.id));
          const complementos = PRODUCTOS_DEFAULT.filter((p) => !idsExistentes.has(p.id));
          setProductos([...cargados, ...complementos]);
        }
      } catch (e) {
        console.warn('[MenuCatalogoPage] Usando catálogo base:', e);
      }
    };

    cargarCatalogoBD();
  }, []);

  const formatearCOP = (valor: number) => {
    return `$ ${valor.toLocaleString('es-CO')}`;
  };

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

  const eliminarItemTotal = (id: string) => {
    setCarrito((prev) => {
      const nuevo = { ...prev };
      delete nuevo[id];
      return nuevo;
    });
  };

  const toggleFavorito = (id: string) => {
    setFavoritos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const categoriasDisponibles = useMemo(() => {
    const vistas: string[] = [];
    for (const p of productos) {
      const c = (p.categoria || '').trim();
      if (c && !vistas.includes(c)) vistas.push(c);
    }
    const unicas = Array.from(new Set([...CATEGORIAS_MOCK.filter((c) => c !== 'Todos'), ...vistas]));
    return ['Todos', ...unicas];
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    return productos.filter((prod) => {
      const coincideCat =
        categoriaActiva === 'Todos' ||
        prod.categoria.toLowerCase() === categoriaActiva.toLowerCase();
      const coincideBusqueda =
        busqueda.trim() === '' ||
        prod.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        prod.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        prod.categoria.toLowerCase().includes(busqueda.toLowerCase());
      return coincideCat && coincideBusqueda;
    });
  }, [productos, categoriaActiva, busqueda]);

  const cantidadTotal = Object.values(carrito).reduce((acc, curr) => acc + curr, 0);
  const subtotal = Object.entries(carrito).reduce((acc, [id, qty]) => {
    const prod = productos.find((p) => p.id === id);
    return acc + (prod ? prod.precio * qty : 0);
  }, 0);

  const descuento = promoActiva && cantidadTotal > 0 ? Math.round(subtotal * 0.1) : 0;
  const costoEnvio = cantidadTotal > 0 && modalidad === 'domicilio' ? 5000 : 0;
  const total = Math.max(0, subtotal - descuento + costoEnvio);

  const referenciaOrden = useMemo(() => {
    return `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  }, []);

  // Generar QR para pago en sitio
  useEffect(() => {
    if (modalPagoAbierto) {
      const urlPago = `${window.location.origin}/checkout?ref=${referenciaOrden}&total=${total}&cliente=${encodeURIComponent(cliente)}`;
      QRCode.toDataURL(urlPago, {
        width: 220,
        margin: 1,
        color: { dark: '#190088', light: '#FFFFFF' },
      })
        .then((url) => setCodigoQrDataUrl(url))
        .catch((err) => console.warn('[MenuCatalogoPage] Error generando QR:', err));
    }
  }, [modalPagoAbierto, referenciaOrden, total, cliente]);

  const enviarSeleccionAlBot = async () => {
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
              referencia: referenciaOrden,
              lineas,
              modalidad,
              direccion: modalidad === 'domicilio' ? direccion : null,
              destinatario: previo?.draft?.destinatario || { tipo: 'propio', nombre: cliente },
              subtotal,
              descuento,
              costoEnvio,
              total,
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

      const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
      if (chatId && botToken) {
        const resumenProds = lineas
          .map(
            (l) =>
              `• ${l.cantidad} × <b>${l.nombre}</b> — <code>$${(l.precioUnitario * l.cantidad).toLocaleString('es-CO')} COP</code>`
          )
          .join('\n');

        const entregaDesc =
          modalidad === 'domicilio'
            ? `🛵 <b>Domicilio en:</b> <i>${direccion}</i>`
            : `🛍️ <b>Retiro en:</b> <i>${sede}</i>`;

        const mensajeTelegram =
          `📋 <b>RESUMEN DE TU PEDIDO NECTO</b>\n<blockquote>` +
          `${resumenProds}\n` +
          `──────────────────────────\n` +
          `<b>Subtotal:</b> <code>$${subtotal.toLocaleString('es-CO')} COP</code>\n` +
          `<b>Descuento:</b> <code>-$${descuento.toLocaleString('es-CO')} COP</code>\n` +
          `<b>Envío:</b> <code>$${costoEnvio.toLocaleString('es-CO')} COP</code>\n` +
          `<b>Total a pagar:</b> <code>$${total.toLocaleString('es-CO')} COP</code>\n` +
          `${entregaDesc}</blockquote>\n\n` +
          `¡Tu orden ${referenciaOrden} está lista para procesar el pago!`;

        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: mensajeTelegram,
            parse_mode: 'HTML',
          }),
        }).catch((err) => console.warn('[MenuCatalogoPage] Error Telegram:', err));
      }

      setNotificacionBotEnviada(true);
    } catch (e) {
      console.error('[MenuCatalogoPage] Error registrando comanda:', e);
    } finally {
      setGuardandoPedido(false);
    }
  };

  const handleProcederAlPago = () => {
    if (cantidadTotal === 0) return;
    setModalPagoAbierto(true);
    enviarSeleccionAlBot();
  };

  const irAlCheckoutEnLinea = () => {
    const params = new URLSearchParams({
      ref: referenciaOrden,
      total: String(total),
      cliente,
      chatId,
      modalidad,
    });
    navigate(`/checkout?${params.toString()}`);
  };

  const obtenerEstiloBadge = (badge: string) => {
    if (badge.includes('Vendido') || badge.includes('Destacado')) {
      return 'bg-[#190088] text-white';
    }
    if (badge.includes('Descuento') || badge.includes('Nuevo')) {
      return 'bg-[#FF3F1A] text-white';
    }
    return 'bg-[#97D6DF] text-[#190088]';
  };

  return (
    <>
      <PageMeta
        title="Productos"
        description="Selecciona tus platos y productos favoritos"
      />

      <div
        style={{ fontFamily: "'DM Sans', sans-serif" }}
        className="min-h-screen bg-[#ECECEC]/30 text-[#212121] p-4 sm:p-6 lg:p-8 antialiased selection:bg-[#190088] selection:text-white"
      >
        <div className="max-w-[1500px] mx-auto space-y-6">
          {/* ── ENCABEZADO SUPERIOR: TÍTULO PRODUCTOS Y BUSCADOR CON FILTRO ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-[24px] font-bold text-[#190088] tracking-tight">
              Productos
            </h1>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-72">
                <MagnifyingGlassIcon className="w-4 h-4 text-[#212121]/50 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full h-11 pl-11 pr-8 bg-white text-[#212121] text-[14px] font-normal placeholder-[#212121]/40 rounded-full border border-[#ECECEC] focus:border-[#97D6DF] focus:outline-none shadow-2xs transition-colors"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-[#212121]/50 hover:text-[#FF3F1A]"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                className="h-11 px-4 bg-white border border-[#ECECEC] text-[#212121] rounded-full text-[14px] font-normal flex items-center gap-2 hover:bg-[#EFE6D3]/40 shadow-2xs transition-colors shrink-0"
              >
                <FunnelIcon className="w-4 h-4 text-[#212121]/70" />
                <span>Filtrar</span>
              </button>
            </div>
          </div>

          {/* ── BARRA DE CATEGORÍAS HORIZONTAL ── */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {categoriasDisponibles.map((cat) => {
              const activa = categoriaActiva === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoriaActiva(cat)}
                  className={`px-5 py-2.5 rounded-full text-[14px] transition-all shrink-0 cursor-pointer shadow-2xs ${
                    activa
                      ? 'bg-[#FF3F1A] text-white font-bold'
                      : 'bg-white text-[#212121] font-normal border border-[#ECECEC] hover:bg-[#EFE6D3]/50'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* ── CUERPO PRINCIPAL CON 2 COLUMNAS PERFECTAMENTE SIMÉTRICAS ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* ── COLUMNA IZQUIERDA: GRID DE PRODUCTOS ── */}
            <div className="lg:col-span-7 xl:col-span-8">
              {productosFiltrados.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-[#ECECEC] shadow-2xs space-y-3">
                  <p className="text-[16px] font-normal text-[#212121]/70">
                    No hay productos disponibles en esta categoría.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setBusqueda('');
                      setCategoriaActiva('Todos');
                    }}
                    className="text-[14px] font-bold text-[#FF3F1A] hover:underline cursor-pointer"
                  >
                    Ver todos los productos
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {productosFiltrados.map((prod) => {
                    const esFav = favoritos[prod.id] || false;
                    return (
                      <div
                        key={prod.id}
                        className="bg-white rounded-3xl p-5 border border-[#ECECEC] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between relative group"
                      >
                        {/* Cabecera de la tarjeta: Badge promocional y botón de favorito */}
                        <div className="flex items-center justify-between gap-2 h-7">
                          {prod.badge ? (
                            <span
                              className={`px-3 py-1 rounded-full text-[12px] font-bold tracking-wider shadow-2xs ${obtenerEstiloBadge(
                                prod.badge
                              )}`}
                            >
                              {prod.badge}
                            </span>
                          ) : (
                            <span />
                          )}

                          <button
                            type="button"
                            onClick={() => toggleFavorito(prod.id)}
                            className="w-8 h-8 rounded-full bg-white border border-[#ECECEC] flex items-center justify-center text-[#212121] hover:text-[#FF3F1A] transition-colors shadow-2xs cursor-pointer"
                            title="Favorito"
                          >
                            <HeartIcon
                              className={`w-4 h-4 ${
                                esFav ? 'fill-[#FF3F1A] text-[#FF3F1A]' : 'text-[#212121]/60'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Foto del plato circular */}
                        <div className="my-3 flex items-center justify-center">
                          <div className="w-36 h-36 rounded-full overflow-hidden p-1 bg-[#EFE6D3]/40 shadow-inner flex items-center justify-center">
                            <img
                              src={prod.imagen}
                              alt={prod.nombre}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = FOTO_RESPALDO;
                              }}
                              className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          </div>
                        </div>

                        {/* Datos del producto */}
                        <div className="space-y-1">
                          <h3 className="text-[16px] font-bold text-[#190088] line-clamp-1">
                            {prod.nombre}
                          </h3>
                          <p className="text-[12px] font-light text-[#212121]/70 line-clamp-1">
                            {prod.subtexto || prod.categoria}
                          </p>
                        </div>

                        {/* Pie de tarjeta: Precio y botón + */}
                        <div className="flex items-center justify-between pt-3 mt-2 border-t border-[#ECECEC]">
                          <span className="text-[16px] font-bold text-[#212121]">
                            {formatearCOP(prod.precio)}
                          </span>

                          <button
                            type="button"
                            onClick={() => agregarItem(prod.id)}
                            className="w-10 h-10 rounded-full bg-[#FF3F1A] hover:bg-[#FF3F1A]/90 active:scale-95 text-white flex items-center justify-center shadow-md transition-all cursor-pointer"
                            title="Agregar al pedido"
                          >
                            <PlusIcon className="w-5 h-5 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── COLUMNA DERECHA: TARJETA DE TU PEDIDO ALINEADA SIMÉTRICAMENTE ── */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="bg-white rounded-3xl p-6 border border-[#ECECEC] shadow-sm flex flex-col space-y-5 lg:sticky lg:top-8">
                {/* Cabecera del carrito */}
                <div className="flex items-center justify-between">
                  <h2 className="text-[24px] font-bold text-[#190088] tracking-tight">
                    Tu Pedido
                  </h2>

                  {cantidadTotal > 0 && (
                    <button
                      type="button"
                      onClick={() => setCarrito({})}
                      className="text-[12px] font-bold text-[#FF3F1A] hover:underline cursor-pointer"
                    >
                      Vaciar todo
                    </button>
                  )}
                </div>

                {/* Lista de productos en la comanda */}
                {cantidadTotal === 0 ? (
                  <div className="py-12 text-center space-y-3 bg-[#EFE6D3]/20 rounded-2xl border border-dashed border-[#ECECEC]">
                    <ShoppingBagIcon className="w-10 h-10 text-[#212121]/30 mx-auto" />
                    <p className="text-[14px] font-normal text-[#212121]/70">
                      Tu carrito está vacío. Agrega tus platos favoritos.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {Object.entries(carrito).map(([id, qty]) => {
                      const prod = productos.find((p) => p.id === id);
                      if (!prod) return null;
                      return (
                        <div
                          key={id}
                          className="bg-[#EFE6D3]/30 border border-[#ECECEC] rounded-2xl p-3 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          {/* Izquierda: Checkbox, foto circular y datos */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-5 h-5 rounded-md bg-[#212121] text-white flex items-center justify-center shrink-0">
                              <CheckIcon className="w-3.5 h-3.5 stroke-[3]" />
                            </div>

                            <img
                              src={prod.imagen}
                              alt={prod.nombre}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src = FOTO_RESPALDO;
                              }}
                              className="w-14 h-14 rounded-full object-cover shrink-0 shadow-2xs"
                            />

                            <div className="min-w-0">
                              <h4 className="text-[14px] font-bold text-[#190088] truncate">
                                {prod.nombre}
                              </h4>
                              <p className="text-[12px] font-light text-[#212121]/70 truncate">
                                {prod.subtexto || prod.categoria}
                              </p>
                              <p className="text-[14px] font-bold text-[#212121] mt-0.5">
                                Total {formatearCOP(prod.precio * qty)}
                              </p>
                            </div>
                          </div>

                          {/* Derecha: Eliminar y cápsula selectora de cantidad */}
                          <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => eliminarItemTotal(id)}
                              className="text-[#212121]/40 hover:text-[#FF3F1A] transition-colors cursor-pointer"
                              title="Eliminar producto"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>

                            <div className="flex items-center bg-white border border-[#ECECEC] rounded-full px-2 py-0.5 shadow-2xs gap-2">
                              <button
                                type="button"
                                onClick={() => quitarItem(id)}
                                className="text-[14px] font-bold text-[#212121] hover:text-[#FF3F1A] px-1 cursor-pointer"
                                title="Disminuir"
                              >
                                −
                              </button>
                              <span className="text-[14px] font-bold text-[#212121] min-w-[16px] text-center">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => agregarItem(id)}
                                className="w-5 h-5 rounded-full bg-[#212121] hover:bg-[#FF3F1A] text-white flex items-center justify-center text-[12px] font-bold cursor-pointer transition-colors"
                                title="Aumentar"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Banner de cupón / promoción en español */}
                <div className="bg-[#EFE6D3] rounded-2xl p-3 border border-[#ECECEC] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TicketIcon className="w-4 h-4 text-[#190088]" />
                    <span className="text-[12px] font-bold text-[#190088]">
                      Descuento Especial (10%)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPromoActiva(!promoActiva)}
                    className="px-3 py-1 bg-white text-[#FF3F1A] rounded-full text-[12px] font-bold border border-[#ECECEC] hover:bg-[#FF3F1A] hover:text-white transition-colors cursor-pointer"
                  >
                    {promoActiva ? 'Quitar' : 'Aplicar'}
                  </button>
                </div>

                {/* Selector de modalidad (Domicilio / Retiro en local) */}
                <div className="bg-white rounded-2xl p-3 border border-[#ECECEC] flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <TruckIcon className="w-4 h-4 text-[#FF3F1A] shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[12px] font-bold text-[#190088] block truncate">
                        {modalidad === 'domicilio' ? 'Entrega a Domicilio' : 'Retiro en Local'}
                      </span>
                      <span className="text-[12px] font-light text-[#212121]/70 block truncate">
                        {modalidad === 'domicilio' ? direccion : sede}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalidad(modalidad === 'domicilio' ? 'retiro' : 'domicilio')}
                    className="text-[12px] font-bold text-[#FF3F1A] hover:underline cursor-pointer shrink-0"
                  >
                    Cambiar
                  </button>
                </div>

                {/* Desglose financiero */}
                <div className="space-y-2 border-t border-[#ECECEC] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-normal text-[#212121]">
                      Subtotal productos
                    </span>
                    <span className="text-[14px] font-bold text-[#212121]">
                      {formatearCOP(subtotal)}
                    </span>
                  </div>

                  {descuento > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-normal text-[#212121]">Descuento</span>
                      <span className="text-[14px] font-bold text-[#FF3F1A]">
                        -{formatearCOP(descuento)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-normal text-[#212121]">Costo de envío</span>
                    <span className="text-[14px] font-bold text-[#212121]">
                      {costoEnvio === 0 ? 'Gratis' : formatearCOP(costoEnvio)}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-2 border-t border-[#ECECEC]">
                    <span className="text-[16px] font-bold text-[#212121]">Total a pagar</span>
                    <span className="text-[36px] font-bold text-[#190088] leading-none">
                      {formatearCOP(total)}
                    </span>
                  </div>
                </div>

                {/* Botón principal CTA: Proceder al Pago */}
                <button
                  type="button"
                  onClick={handleProcederAlPago}
                  disabled={cantidadTotal === 0}
                  className="w-full py-4 rounded-full bg-[#FF3F1A] hover:bg-[#FF3F1A]/90 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[16px] font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceder al Pago</span>
                  <ArrowRightIcon className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── MODAL DE PROCEDER AL PAGO (EN LÍNEA / QR / BOT) ── */}
        {modalPagoAbierto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#ECECEC] overflow-hidden flex flex-col max-h-[90vh]">
              {/* Cabecera del modal */}
              <div className="bg-[#190088] text-white px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBagIcon className="w-5 h-5 text-[#97D6DF]" />
                  <span className="text-[16px] font-bold text-white">
                    Confirmar Pedido {referenciaOrden}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalPagoAbierto(false)}
                  className="text-white/80 hover:text-white text-[16px] font-bold cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido del modal */}
              <div className="p-6 overflow-y-auto space-y-5">
                <div className="text-center space-y-1">
                  <h3 className="text-[24px] font-bold text-[#190088]">
                    {formatearCOP(total)} COP
                  </h3>
                  <p className="text-[14px] font-normal text-[#212121]/70">
                    Cliente: <b>{cliente}</b> • {modalidad === 'domicilio' ? 'Entrega a Domicilio' : 'Retiro en Sede'}
                  </p>
                </div>

                {/* Tarjeta de detalles de entrega */}
                <div className="bg-[#EFE6D3]/40 rounded-2xl p-4 border border-[#ECECEC] space-y-2 text-[14px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-normal text-[#212121]">Destino:</span>
                    <span className="text-[14px] font-bold text-[#212121]">
                      {modalidad === 'domicilio' ? direccion : sede}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-normal text-[#212121]">Total artículos:</span>
                    <span className="text-[14px] font-bold text-[#212121]">{cantidadTotal} unidades</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-[#ECECEC] pt-2">
                    <span className="text-[14px] font-normal text-[#212121]">Estado sincronización:</span>
                    <span className="text-[12px] font-bold text-[#190088]">
                      {guardandoPedido ? 'Sincronizando...' : notificacionBotEnviada ? 'Enviado al chat' : 'Listo'}
                    </span>
                  </div>
                </div>

                {/* Código QR si es para pago presencial o escaneo */}
                {codigoQrDataUrl && (
                  <div className="text-center space-y-2 py-2">
                    <div className="inline-block p-3 bg-white border border-[#ECECEC] rounded-2xl shadow-2xs">
                      <img
                        src={codigoQrDataUrl}
                        alt="Código QR de Pago"
                        className="w-40 h-40 mx-auto"
                      />
                    </div>
                    <p className="text-[12px] font-light text-[#212121]/70">
                      Escanea para pagar en caja o abrir el checkout directo
                    </p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={irAlCheckoutEnLinea}
                    className="w-full py-4 rounded-full bg-[#FF3F1A] hover:bg-[#FF3F1A]/90 text-white text-[16px] font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Pagar con Tarjeta / PSE en Línea</span>
                    <ArrowRightIcon className="w-4 h-4 stroke-[2.5]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalPagoAbierto(false)}
                    className="w-full py-3 text-[14px] font-normal text-[#212121]/70 hover:text-[#212121] text-center cursor-pointer"
                  >
                    Continuar comprando
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MenuCatalogoPage;
