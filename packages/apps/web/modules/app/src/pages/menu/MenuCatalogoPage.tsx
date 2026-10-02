import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Search, ShoppingBag, Plus, Minus, ArrowRight, MapPin, Store, Trash2, X, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
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

  const [productos, setProductos] = useState<ProductoItem[]>(PRODUCTOS_DEFAULT);
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todos');
  const [busqueda, setBusqueda] = useState<string>('');
  const [carrito, setCarrito] = useState<{ [productoId: string]: number }>({});
  const [modalCarritoAbierto, setModalCarritoAbierto] = useState(false);

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
  const costoEnvio = cantidadTotal > 0 ? 5000 : 0;
  const total = subtotal + costoEnvio;

  // Redirigir a GlobalPay
  const irAlCheckout = () => {
    const refOrden = 'NEC-' + Math.floor(1000 + Math.random() * 9000);
    const query = new URLSearchParams({
      cliente,
      total: String(total),
      descripcion: `Necto Pedidos (${cantidadTotal} productos) - ${sede}`,
      ref: refOrden,
    }).toString();

    navigate(`/checkout/${refOrden}?${query}`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-600 selection:text-white pb-24">
      {/* ── CABECERA CORPORATIVA NECTO ── */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
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
                NECTO<span className="text-indigo-400">.</span>
              </span>
            </div>

            <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block"></div>

            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold text-slate-200">Catálogo Digital</span>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <MapPin className="w-3 h-3 text-indigo-400" />
                <span className="truncate max-w-[180px]">{sede}</span>
              </div>
            </div>
          </div>

          {/* Buscador & Carrito */}
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full h-9 pl-9 pr-3 bg-slate-800 text-sm text-white placeholder-slate-400 rounded-lg border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <button
              type="button"
              onClick={() => setModalCarritoAbierto(true)}
              className="relative flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline font-mono font-medium">{formatearCOP(subtotal)}</span>
              {cantidadTotal > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-900 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {cantidadTotal}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Buscador en móviles */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en el catálogo..."
              className="w-full h-9 pl-9 pr-3 bg-slate-800 text-sm text-white placeholder-slate-400 rounded-lg border border-slate-700 focus:border-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* ── BARRA DE CATEGORÍAS ── */}
        <div className="bg-slate-950 border-t border-slate-800 px-4 overflow-x-auto scrollbar-none py-2.5">
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
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
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
      <div className="bg-indigo-50 border-b border-indigo-100 py-2.5 px-4 text-center text-xs text-indigo-900">
        <span>👋 Bienvenido <b>{cliente}</b> • Entrega estimada en: <i>{direccion}</i></span>
      </div>

      {/* ── LISTADO / GRID DE PRODUCTOS ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 flex-1 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {categoriaActiva === 'Todos' ? 'Catálogo de Productos' : categoriaActiva}
            </h1>
            <span className="bg-slate-200 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {productosFiltrados.length}
            </span>
          </div>
          <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Precios con IVA incluido</span>
          </span>
        </div>

        {productosFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <p className="text-slate-500 text-sm">No encontramos productos en esta categoría.</p>
            <button
              onClick={() => { setBusqueda(''); setCategoriaActiva('Todos'); }}
              className="mt-3 text-xs text-indigo-600 font-bold hover:underline"
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
                  className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  {/* Imagen */}
                  <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={prod.imagen}
                      alt={prod.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    {prod.popular && (
                      <span className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs uppercase tracking-wider">
                        Destacado
                      </span>
                    )}
                  </div>

                  {/* Datos del producto */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-semibold uppercase text-indigo-600 tracking-wider mb-0.5">
                        {prod.categoria}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {prod.nombre}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                        {prod.descripcion}
                      </p>
                    </div>

                    {/* Precio y Selector */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900">
                        {formatearCOP(prod.precio)}
                      </span>

                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => agregarItem(prod.id)}
                          className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white flex items-center justify-center transition-transform active:scale-95 shadow-xs cursor-pointer"
                          title="Agregar al pedido"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200">
                          <button
                            type="button"
                            onClick={() => quitarItem(prod.id)}
                            className="w-5 h-5 rounded bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center text-xs font-bold transition-all"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold text-indigo-700 px-1 font-mono">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => agregarItem(prod.id)}
                            className="w-5 h-5 rounded bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center text-xs font-bold transition-all"
                          >
                            <Plus className="w-3 h-3" />
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
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-2xl px-4 py-3 animate-fadeIn">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {cantidadTotal}
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Subtotal orden:</div>
                <div className="text-base font-black text-slate-900">
                  {formatearCOP(subtotal)} <span className="text-xs font-normal text-slate-500">COP</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalCarritoAbierto(true)}
              className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold rounded-lg transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span>Ver pedido</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL DEL CARRITO / CONFIRMAR PEDIDO ── */}
      {modalCarritoAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Cabecera */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                <span>Tu Pedido ({cantidadTotal} productos)</span>
              </div>
              <button
                type="button"
                onClick={() => setModalCarritoAbierto(false)}
                className="text-slate-400 hover:text-white text-xl leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Lista de productos */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {cantidadTotal === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  El carrito está vacío. Agrega productos del catálogo.
                </div>
              ) : (
                Object.entries(carrito).map(([id, qty]) => {
                  const prod = productos.find((p) => p.id === id);
                  if (!prod) return null;
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80 gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={prod.imagen}
                          alt={prod.nombre}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800">{prod.nombre}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            {formatearCOP(prod.precio)} c/u
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-300">
                          <button
                            type="button"
                            onClick={() => quitarItem(id)}
                            className="text-xs text-slate-600 hover:text-black font-bold px-1"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold font-mono px-1">{qty}</span>
                          <button
                            type="button"
                            onClick={() => agregarItem(id)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold px-1"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-xs font-bold text-slate-900 w-16 text-right font-mono">
                          {formatearCOP(prod.precio * qty)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Datos de entrega */}
              {cantidadTotal > 0 && (
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-1.5 mt-4">
                  <div className="font-bold text-slate-800 flex items-center gap-1 mb-1">
                    <Store className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Información de Entrega</span>
                  </div>
                  <div className="text-slate-600"><b>Cliente:</b> {cliente}</div>
                  <div className="text-slate-600"><b>Dirección:</b> {direccion}</div>
                  <div className="text-slate-600"><b>Sede:</b> {sede}</div>
                </div>
              )}
            </div>

            {/* Totales y Botón de pago */}
            {cantidadTotal > 0 && (
              <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal productos:</span>
                    <span className="font-mono font-medium">{formatearCOP(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Costo de envío:</span>
                    <span className="font-mono font-medium">{formatearCOP(costoEnvio)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                    <span>Total a pagar:</span>
                    <span className="text-indigo-600 font-mono">{formatearCOP(total)} COP</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={irAlCheckout}
                    className="w-full py-3 bg-[#ea7a24] hover:bg-[#d96a17] active:bg-[#c2590b] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Proceder al Pago con GlobalPay Redeban</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalCarritoAbierto(false)}
                    className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-medium text-center"
                  >
                    Seguir explorando el catálogo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuCatalogoPage;
