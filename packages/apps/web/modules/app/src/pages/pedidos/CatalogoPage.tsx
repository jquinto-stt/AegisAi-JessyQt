import React, { useState, useEffect, useMemo, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { Link } from 'react-router';
import {
  PlusIcon,
  CloseLineIcon,
  CheckCircleIcon,
  CheckLineIcon,
  AlertIcon,
  InfoIcon,
  GridIcon,
  ListIcon,
  FileIcon,
  DocsIcon,
  DownloadIcon,
  TrashBinIcon,
  PencilIcon,
  EyeIcon,
  ChevronDownIcon,
} from '@/icons';
import { getSupabase, ESQUEMA } from '@/lib/supabase';
import { PageMeta } from '@/shell/meta';
import { pedidosStore } from '@/stores';

export interface ProductoCatalogoItem {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  precio: number;
  imagen?: string;
  disponible: boolean;
}

// Catálogo de fotos gastronómicas de alta resolución para asignación automática
const FOTOS_TEMATICAS: { palabrasClave: string[]; url: string }[] = [
  {
    palabrasClave: ['hamburguesa', 'burger', 'tocineta', 'angus', 'doble carne', 'cheddar'],
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  },
  {
    palabrasClave: ['pizza', 'pepperoni', 'mozzarella', 'margarita', 'calzone'],
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
  },
  {
    palabrasClave: ['papa', 'papas', 'francesa', 'rustica', 'croqueta', 'nachos', 'aros'],
    url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80',
  },
  {
    palabrasClave: ['limonada', 'jugo', 'bebida', 'gaseosa', 'refresco', 'soda', 'agua', 'te '],
    url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=80',
  },
  {
    palabrasClave: ['cerveza', 'ipa', 'artesanal', 'club', 'corona', 'heineken'],
    url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&q=80',
  },
  {
    palabrasClave: ['costilla', 'carne', 'asado', 'parrilla', 'steak', 'churrasco'],
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80',
  },
  {
    palabrasClave: ['pollo', 'alita', 'alitas', 'crispy', 'nugget', 'tenders'],
    url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
  },
  {
    palabrasClave: ['postre', 'torta', 'helado', 'dulce', 'tiramisu', 'brownie', 'cheesecake'],
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&q=80',
  },
  {
    palabrasClave: ['cafe', 'espresso', 'cappuccino', 'latte', 'moka'],
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80',
  },
  {
    palabrasClave: ['ensalada', 'cesar', 'verde', 'healthy', 'bowl'],
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  },
];

const FOTO_POR_DEFECTO = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80';

// Asigna una foto profesional automáticamente analizando el texto del producto
export const asignarFotoInteligente = (nombre: string, categoria: string = ''): string => {
  const texto = `${nombre} ${categoria}`.toLowerCase();
  for (const tema of FOTOS_TEMATICAS) {
    if (tema.palabrasClave.some((kw) => texto.includes(kw))) {
      return tema.url;
    }
  }
  return FOTO_POR_DEFECTO;
};

// Catálogo de ejemplo listo para activar con 1 clic
//
// ── Por qué este catálogo es genérico y no de restaurante ─────────────────
//
// Antes eran seis platos (hamburguesa, pizza, alitas, papas, limonada,
// tiramisú) con categorías de carta —«Entradas», «Acompañamientos», «Postres»—.
// El catálogo es universal: lo usa una ferretería, una tienda de ropa y una
// panadería igual de bien, y un ejemplo gastronómico le dice a esos negocios
// que la herramienta no es para ellos antes de que lean una sola palabra.
//
// El ejemplo no enseña a vender comida: enseña la FORMA del dato —nombre,
// categoría, descripción, precio, imagen, disponibilidad—. Se eligen productos
// de uso corriente y categorías que existen en cualquier catálogo.
const CATALOGO_DEMO_EJEMPLO: ProductoCatalogoItem[] = [
  {
    id: 'demo-1',
    nombre: 'Producto de ejemplo — categoría A',
    categoria: 'Categoría A',
    descripcion: 'Descripción breve del producto. Aquí va lo que el cliente necesita saber para decidirse.',
    precio: 28000,
    imagen: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
    disponible: true,
  },
  {
    id: 'demo-2',
    nombre: 'Producto de ejemplo — categoría A (variante)',
    categoria: 'Categoría A',
    descripcion: 'Un segundo producto de la misma categoría, para que se vea cómo agrupa el catálogo.',
    precio: 42000,
    imagen: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
    disponible: true,
  },
  {
    id: 'demo-3',
    nombre: 'Producto de ejemplo — categoría B',
    categoria: 'Categoría B',
    descripcion: 'Un producto de otra categoría. La categoría es texto libre: escribe la que use tu negocio.',
    precio: 22000,
    imagen: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&q=80',
    disponible: true,
  },
  {
    id: 'demo-4',
    nombre: 'Producto de ejemplo — categoría B (variante)',
    categoria: 'Categoría B',
    descripcion: 'La categoría se puede renombrar o reemplazar: no hay una lista cerrada que respetar.',
    precio: 14000,
    imagen: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
    disponible: true,
  },
  {
    id: 'demo-5',
    nombre: 'Producto de ejemplo — categoría C',
    categoria: 'Categoría C',
    descripcion: 'Precio, disponibilidad e imagen son opcionales. Este bloque muestra cómo se ve un producto completo.',
    precio: 9500,
    imagen: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80',
    disponible: true,
  },
  {
    id: 'demo-6',
    nombre: 'Producto de ejemplo — sin stock',
    categoria: 'Categoría C',
    descripcion: 'Un producto pausado: sigue en el catálogo pero el cliente no puede pedirlo.',
    precio: 15000,
    imagen: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80',
    disponible: false,
  },
];

export const CatalogoPage: React.FC = observer(() => {
  // Datos del catálogo
  const [productos, setProductos] = useState<ProductoCatalogoItem[]>([]);
  const [originalProductos, setOriginalProductos] = useState<ProductoCatalogoItem[]>([]);
  const [cargandoInicial, setCargandoInicial] = useState<boolean>(true);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [organizacionId, setOrganizacionId] = useState<string>('fc009b85-73b8-47b3-8d1a-080b65ac7120');

  // Importación desde documento (PDF / Excel)
  const [mostrarImportador, setMostrarImportador] = useState<boolean>(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [dragActivo, setDragActivo] = useState<boolean>(false);
  const [procesandoArchivo, setProcesandoArchivo] = useState<boolean>(false);
  const [mensajeProgreso, setMensajeProgreso] = useState<string>('');
  const [textoManual, setTextoManual] = useState<string>('');
  const [metodoCarga, setMetodoCarga] = useState<'archivo' | 'texto'>('archivo');
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Vistas y Filtrado
  const [vistaModo, setVistaModo] = useState<'cuadricula' | 'lista'>('cuadricula');
  const [busqueda, setBusqueda] = useState<string>('');
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todas');

  // Modal de Edición de Producto
  const [productoEnEdicion, setProductoEnEdicion] = useState<ProductoCatalogoItem | null>(null);
  const [esNuevoProducto, setEsNuevoProducto] = useState<boolean>(false);

  // Menú desplegable "Agregar productos"
  const [menuAgregarAbierto, setMenuAgregarAbierto] = useState<boolean>(false);
  const menuAgregarRef = useRef<HTMLDivElement>(null);

  // Alerta informativa
  const [alerta, setAlerta] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cerrar menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickAfuera = (e: MouseEvent) => {
      if (menuAgregarRef.current && !menuAgregarRef.current.contains(e.target as Node)) {
        setMenuAgregarAbierto(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAgregarAbierto(false);
    };
    document.addEventListener('mousedown', handleClickAfuera);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickAfuera);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 1. Cargar catálogo de Supabase al montar
  useEffect(() => {
    cargarCatalogo();
  }, []);

  const cargarCatalogo = async () => {
    setCargandoInicial(true);
    const sb = getSupabase();
    if (!sb) {
      setCargandoInicial(false);
      return;
    }

    try {
      const { data: org } = await sb.schema(ESQUEMA).from('organizacion').select('id').limit(1).maybeSingle();
      const orgId = org?.id || 'fc009b85-73b8-47b3-8d1a-080b65ac7120';
      setOrganizacionId(orgId);

      const { data, error } = await sb
        .schema(ESQUEMA)
        .from('config_pedidos')
        .select('catalogo')
        .eq('organizacion_id', orgId)
        .maybeSingle();

      if (!error && data?.catalogo && Array.isArray(data.catalogo)) {
        const formateados: ProductoCatalogoItem[] = data.catalogo.map((i: any, idx: number) => ({
          id: String(i.id || `prod-${idx + 1}`),
          nombre: String(i.nombre || 'Producto'),
          categoria: String(i.categoria || 'Generales'),
          descripcion: String(i.descripcion || 'Preparado fresco con ingredientes seleccionados.'),
          precio: Number(i.precio) || 0,
          imagen: i.imagen || asignarFotoInteligente(i.nombre, i.categoria),
          disponible: i.disponible !== false,
        }));
        setProductos(formateados);
        setOriginalProductos(formateados);
      }
    } catch (err) {
      console.warn('[CatalogoPage] Error cargando catálogo:', err);
    } finally {
      setCargandoInicial(false);
    }
  };

  // 2. Descargar Plantilla Excel lista para usar
  const descargarPlantillaExcel = () => {
    const encabezados = 'Producto,Categoria,Descripcion,Precio COP\n';
    const filas = [
      '"Hamburguesa Clásica","Hamburguesas","Carne 150g, lechuga, tomate y queso americano",22000',
      '"Pizza Pepperoni Mediana","Pizzas","Masa artesanal con doble pepperoni y mozzarella",34000',
      '"Papas Francesas","Acompañamientos","Porción personal con sal marina",9000',
      '"Limonada Natural","Bebidas","Vaso 16oz preparada al momento",6500',
      '"Brownie con Arequipe","Postres","Porción tibia con arequipe tradicional",11000',
    ].join('\n');

    const contenidoCompleto = '\uFEFF' + encabezados + filas;
    const blob = new Blob([contenidoCompleto], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_catalogo_necto.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setAlerta({
      tipo: 'exito',
      mensaje: 'Plantilla descargada. Puedes abrirla en Excel, agregar tus productos y volver a subirla aquí.',
    });
  };

  // 3. Cargar catálogo de ejemplo (Demo)
  const cargarCatalogoEjemplo = () => {
    setProductos(CATALOGO_DEMO_EJEMPLO);
    setMostrarImportador(false);
    setAlerta({
      tipo: 'exito',
      mensaje: '¡Catálogo de ejemplo cargado! Puedes editar los precios, nombres o fotos y hacer clic en "Guardar y Publicar".',
    });
  };

  // 4. Validación y procesamiento del documento
  const validarArchivo = (file: File) => {
    const permitidos = ['.pdf', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg'];
    const esValido = permitidos.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!esValido) {
      setErrorCarga('Por favor sube un documento PDF, una hoja de Excel (.xlsx) o una foto de tu lista de precios.');
      return;
    }
    setArchivo(file);
    setErrorCarga(null);
  };

  const ejecutarImportacion = async () => {
    if (!archivo && !textoManual.trim()) {
      setErrorCarga('Por favor adjunta un archivo o escribe algunos productos antes de continuar.');
      return;
    }

    setProcesandoArchivo(true);
    setErrorCarga(null);
    setMensajeProgreso('Leyendo tu documento...');

    try {
      let bodyPayload: any = {};

      if (metodoCarga === 'archivo' && archivo) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(archivo);
        });

        setMensajeProgreso('Organizando productos, precios y asignando fotos...');
        bodyPayload = {
          fileBase64: base64Data,
          fileName: archivo.name,
          mimeType: archivo.type,
        };
      } else {
        setMensajeProgreso('Interpretando texto y precios...');
        bodyPayload = {
          textoPlano: textoManual,
          fileName: 'mi_catalogo.txt',
        };
      }

      const res = await fetch('/api/pedidos/catalogo/importar-ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'No se pudo interpretar el archivo.');
      }

      if (Array.isArray(data.productos) && data.productos.length > 0) {
        // Asegurar que cada producto tenga su foto gastronómica temática asignada
        const conFotos = data.productos.map((prod: any) => ({
          ...prod,
          imagen: prod.imagen || asignarFotoInteligente(prod.nombre, prod.categoria),
        }));

        setProductos(conFotos);
        setMostrarImportador(false);
        setArchivo(null);
        setTextoManual('');
        setAlerta({
          tipo: 'exito',
          mensaje: `Se cargaron ${data.total} productos con fotos sugeridas. Revisa los precios y haz clic en "Guardar y Publicar" para confirmarlos.`,
        });
      } else {
        throw new Error('No se detectaron productos con precios claros. Prueba con otro archivo o escribe el texto directamente.');
      }
    } catch (err: any) {
      setErrorCarga(err.message || 'Hubo un inconveniente al procesar el archivo.');
    } finally {
      setProcesandoArchivo(false);
      setMensajeProgreso('');
    }
  };

  // 5. Guardar en Supabase
  const guardarCatalogo = async () => {
    setGuardando(true);
    setAlerta(null);
    const sb = getSupabase();
    if (!sb) {
      setAlerta({ tipo: 'error', mensaje: 'No fue posible conectar con la base de datos.' });
      setGuardando(false);
      return;
    }

    try {
      const payload = {
        organizacion_id: organizacionId,
        catalogo: productos,
      };

      const { error } = await sb
        .schema(ESQUEMA)
        .from('config_pedidos')
        .upsert(payload, { onConflict: 'organizacion_id' });

      if (error) throw error;

      setOriginalProductos(productos);
      setAlerta({
        tipo: 'exito',
        mensaje: '¡Tu catálogo ha sido publicado! Tus clientes ya pueden pedir estos productos en Telegram y en tu catálogo web.',
      });

      if (pedidosStore?.config) {
        (pedidosStore.config as any).catalogo = productos;
      }
    } catch (err: any) {
      setAlerta({ tipo: 'error', mensaje: `No se pudieron guardar los cambios: ${err.message}` });
    } finally {
      setGuardando(false);
    }
  };

  // Acciones sobre productos
  const toggleDisponibilidad = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProductos((prev) =>
      prev.map((item) => (item.id === id ? { ...item, disponible: !item.disponible } : item))
    );
  };

  const eliminarProducto = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProductos((prev) => prev.filter((p) => p.id !== id));
    if (productoEnEdicion?.id === id) {
      setProductoEnEdicion(null);
    }
  };

  const abrirModalNuevo = () => {
    const nuevo: ProductoCatalogoItem = {
      id: `prod-${Date.now()}`,
      nombre: '',
      categoria: categoriaActiva !== 'Todas' ? categoriaActiva : 'General',
      descripcion: '',
      precio: 18000,
      imagen: FOTO_POR_DEFECTO,
      disponible: true,
    };
    setProductoEnEdicion(nuevo);
    setEsNuevoProducto(true);
  };

  const abrirModalEditar = (prod: ProductoCatalogoItem) => {
    setProductoEnEdicion({ ...prod });
    setEsNuevoProducto(false);
  };

  const guardarProductoModal = () => {
    if (!productoEnEdicion || !productoEnEdicion.nombre.trim()) return;

    if (esNuevoProducto) {
      setProductos((prev) => [productoEnEdicion, ...prev]);
    } else {
      setProductos((prev) =>
        prev.map((p) => (p.id === productoEnEdicion.id ? productoEnEdicion : p))
      );
    }
    setProductoEnEdicion(null);
  };

  // Categorías calculadas
  const categorias = useMemo(() => {
    const set = new Set<string>();
    productos.forEach((p) => {
      if (p.categoria?.trim()) set.add(p.categoria.trim());
    });
    return ['Todas', ...Array.from(set)];
  }, [productos]);

  // Filtrado de productos
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchCat = categoriaActiva === 'Todas' || p.categoria === categoriaActiva;
      const matchBusq =
        busqueda.trim() === '' ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.categoria.toLowerCase().includes(busqueda.toLowerCase());
      return matchCat && matchBusq;
    });
  }, [productos, categoriaActiva, busqueda]);

  const hayCambiosPendientes = useMemo(() => {
    return JSON.stringify(productos) !== JSON.stringify(originalProductos);
  }, [productos, originalProductos]);

  const formatearCOP = (num: number) => {
    return `$ ${num.toLocaleString('es-CO')}`;
  };

  return (
    <>
      <PageMeta
        title="Catálogo"
        description="Productos y precios que ven tus clientes"
      />
      <div className="w-full min-h-screen bg-gray-50/50 dark:bg-gray-950 px-4 sm:px-6 lg:px-8 py-5 space-y-4 font-sans">
        {/* ── Barra Superior Unificada: Cabecera, Acciones y Filtros ── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-4 shadow-2xs space-y-3.5">
          {/* Fila 1: Título y Botones de Acción */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#97D6DF]/20 dark:bg-[#97D6DF]/15 flex items-center justify-center text-[#190088] dark:text-[#97D6DF] shrink-0">
                <DocsIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold text-[#190088] dark:text-white tracking-tight">
                    Catálogo
                  </h1>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    · {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  Administra los productos y precios que ven tus clientes en Telegram y en tu catálogo web.
                </p>
              </div>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <Link
                to="/catalogo-clientes"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition-colors"
              >
                <EyeIcon className="w-3.5 h-3.5 text-gray-400" />
                <span>Ver catálogo</span>
              </Link>

              {/* Menú desplegable unificado: Agregar productos */}
              <div className="relative" ref={menuAgregarRef}>
                <button
                  type="button"
                  onClick={() => setMenuAgregarAbierto(!menuAgregarAbierto)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold hover:opacity-90 active:scale-98 shadow-2xs transition-all cursor-pointer"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Agregar productos</span>
                  <ChevronDownIcon
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      menuAgregarAbierto ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {menuAgregarAbierto && (
                  <div className="absolute right-0 mt-1.5 w-64 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/90 dark:border-gray-800 shadow-xl py-1.5 z-40 animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuAgregarAbierto(false);
                        abrirModalNuevo();
                      }}
                      className="w-full flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors cursor-pointer group"
                    >
                      <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 group-hover:bg-[#190088] group-hover:text-white transition-colors shrink-0">
                        <PlusIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">Nuevo producto</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          Crear un producto individualmente
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMenuAgregarAbierto(false);
                        setMostrarImportador(true);
                      }}
                      className="w-full flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors cursor-pointer group"
                    >
                      <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 group-hover:bg-[#190088] group-hover:text-white transition-colors shrink-0">
                        <DocsIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">Importar productos</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          Subir archivo Excel, CSV o PDF
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {hayCambiosPendientes && (
                <button
                  type="button"
                  onClick={guardarCatalogo}
                  disabled={guardando}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs bg-[#FF3F1A] hover:bg-[#FF3F1A]/90 text-white shadow-sm ring-2 ring-[#FF3F1A]/30 ring-offset-1 dark:ring-offset-gray-900 animate-pulse cursor-pointer"
                >
                  <CheckLineIcon className="w-3.5 h-3.5" />
                  <span>{guardando ? 'Guardando...' : 'Guardar y Publicar'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Fila 2: Buscador, Categorías y Toggle de Vista */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              {/* Buscador */}
              <div className="relative w-full max-w-xs shrink-0">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por producto, categoría..."
                  className="w-full pl-3.5 pr-8 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#190088] dark:focus:border-[#97D6DF]"
                />
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <CloseLineIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Pestañas de categorías */}
              {categorias.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1">
                  {categorias.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoriaActiva(cat)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                        categoriaActiva === cat
                          ? 'bg-[#190088] text-white shadow-2xs dark:bg-white dark:text-gray-900'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle de Cuadrícula / Lista */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setVistaModo('cuadricula')}
                title="Vista en tarjetas"
                className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                  vistaModo === 'cuadricula'
                    ? 'bg-white dark:bg-gray-700 text-[#190088] dark:text-white shadow-2xs'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <GridIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setVistaModo('lista')}
                title="Vista en tabla"
                className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                  vistaModo === 'lista'
                    ? 'bg-white dark:bg-gray-700 text-[#190088] dark:text-white shadow-2xs'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Banner de Alerta / Éxito ── */}
        {alerta && (
          <div
            className={`p-3.5 rounded-2xl flex items-center justify-between border shadow-2xs animate-fadeIn ${
              alerta.tipo === 'exito'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400'
                : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {alerta.tipo === 'exito' ? (
                <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertIcon className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              )}
              <p className="text-xs sm:text-sm font-medium">{alerta.mensaje}</p>
            </div>
            <button
              type="button"
              onClick={() => setAlerta(null)}
              className="text-xs font-semibold underline hover:opacity-80 ml-3 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* ── Modal de Carga de Archivo (Upload File) ── */}
        {mostrarImportador && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
            <div className="bg-white dark:bg-gray-900 w-full max-w-5xl xl:max-w-6xl rounded-3xl p-5 sm:p-7 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-6 max-h-[92vh] overflow-y-auto">
              {/* Header del modal */}
              <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#190088] dark:text-white">
                    Importar productos
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Sube tu catálogo o lista de precios en PDF, Excel o foto para importar productos automáticamente.
                    {' '}¿Prefieres registrar uno a uno?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarImportador(false);
                        abrirModalNuevo();
                      }}
                      className="text-[#FF3F1A] font-bold hover:underline cursor-pointer"
                    >
                      Crear producto individual
                    </button>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarImportador(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <CloseLineIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Grid 2 columnas: Izquierda (Upload form) | Derecha (Guía & Reglas) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* ── Columna Izquierda: Carga de archivo y texto (7 cols) ── */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Pestañas: Archivo vs Texto */}
                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setMetodoCarga('archivo')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                        metodoCarga === 'archivo'
                          ? 'bg-white dark:bg-gray-700 text-[#190088] dark:text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      Subir Archivo (PDF, Excel o Foto)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodoCarga('texto')}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                        metodoCarga === 'texto'
                          ? 'bg-white dark:bg-gray-700 text-[#190088] dark:text-white shadow-xs'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      Escribir o pegar texto
                    </button>
                  </div>

                  {metodoCarga === 'archivo' ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragActivo(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setDragActivo(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActivo(false);
                        if (e.dataTransfer.files?.[0]) validarArchivo(e.dataTransfer.files[0]);
                      }}
                      className={`relative border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center transition-all ${
                        dragActivo
                          ? 'border-[#FF3F1A] bg-[#FF3F1A]/5'
                          : 'border-[#97D6DF] dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 hover:border-[#FF3F1A]/70'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                        onChange={(e) => e.target.files?.[0] && validarArchivo(e.target.files[0])}
                        className="hidden"
                      />

                      <div className="flex flex-col items-center">
                        {/* Icono central de capas / upload */}
                        <div className="w-14 h-14 rounded-2xl bg-[#FF3F1A]/10 text-[#FF3F1A] flex items-center justify-center shadow-xs mb-3">
                          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 2 7 12 12 22 7 12 2" />
                            <polyline points="2 17 12 22 22 17" />
                            <polyline points="2 12 12 17 22 12" />
                          </svg>
                        </div>

                        {archivo ? (
                          <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs max-w-md w-full">
                            <div className="p-2 rounded-lg bg-[#FF3F1A]/10 text-[#FF3F1A]">
                              <FileIcon className="w-5 h-5" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{archivo.name}</p>
                              <p className="text-xs text-gray-500">{(archivo.size / 1024).toFixed(1)} KB — Listo para procesar</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setArchivo(null); }}
                              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600"
                              title="Quitar archivo"
                            >
                              <CloseLineIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Arrastra y suelta tu archivo aquí, o
                            </p>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="mt-3 px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition-all hover:scale-[1.02] cursor-pointer"
                            >
                              Examinar archivos
                            </button>
                          </>
                        )}

                        {/* Bullet points de especificaciones */}
                        <div className="mt-5 pt-4 border-t border-gray-200/80 dark:border-gray-700/80 w-full text-left text-xs text-gray-500 dark:text-gray-400 space-y-1.5 max-w-md mx-auto">
                          <p className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                            Puedes subir archivos PDF, Excel (.xlsx, .xls), CSV o imágenes (PNG, JPG)
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                            Tamaño máximo de archivo: 10 MB
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                            Extracción automática de productos, precios y fotos temáticas sugeridas
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        value={textoManual}
                        onChange={(e) => setTextoManual(e.target.value)}
                        placeholder="Ejemplo:&#10;Producto A - Descripción breve del producto - $28.000&#10;Producto B - Variante de producto - $15.000&#10;Producto C - Con empaque ecológico - $8.500"
                        className="w-full h-44 p-4 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#FF3F1A] focus:ring-1 focus:ring-[#FF3F1A]"
                      />
                      <p className="text-xs text-gray-400">
                        Escribe un producto por línea con su precio y descripción.
                      </p>
                    </div>
                  )}

                  {errorCarga && (
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-xs text-red-700 dark:text-red-400 flex items-center gap-2">
                      <AlertIcon className="w-4 h-4 shrink-0" />
                      <span>{errorCarga}</span>
                    </div>
                  )}
                </div>

                {/* ── Columna Derecha: Guía de Pasos y Reglas (5 cols) ── */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Tarjeta 1: ¿Cómo funciona? / Pasos */}
                  <div className="rounded-2xl border border-gray-200/90 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/20 p-4 sm:p-5 space-y-3.5">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <InfoIcon className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
                        ¿Cómo funciona la importación?
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Sigue este proceso de 4 pasos para subir tu catálogo:
                      </p>
                    </div>

                    <div className="space-y-2.5 text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 shadow-2xs">
                        <span className="w-5 h-5 rounded-md bg-[#190088]/10 text-[#190088] dark:bg-white/10 dark:text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                          1
                        </span>
                        <p className="leading-snug">
                          <strong className="text-gray-900 dark:text-white">Descarga la plantilla:</strong> Descarga el archivo base (.csv) para ver las columnas requeridas.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 shadow-2xs">
                        <span className="w-5 h-5 rounded-md bg-[#190088]/10 text-[#190088] dark:bg-white/10 dark:text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                          2
                        </span>
                        <p className="leading-snug">
                          <strong className="text-gray-900 dark:text-white">Completa los datos:</strong> Llena los nombres, precios numéricos y categorías de tus productos.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 shadow-2xs">
                        <span className="w-5 h-5 rounded-md bg-[#190088]/10 text-[#190088] dark:bg-white/10 dark:text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                          3
                        </span>
                        <p className="leading-snug">
                          <strong className="text-gray-900 dark:text-white">Sube tu archivo:</strong> Arrastra tu Excel, CSV, PDF o foto del menú al recuadro y presiona <em>Cargar Productos</em>.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/60 shadow-2xs">
                        <span className="w-5 h-5 rounded-md bg-[#190088]/10 text-[#190088] dark:bg-white/10 dark:text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                          4
                        </span>
                        <p className="leading-snug">
                          <strong className="text-gray-900 dark:text-white">Revisa y publica:</strong> El sistema extraerá los productos y podrás editarlos o asignarles fotos antes de guardar.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta 2: Reglas clave de formato */}
                  <div className="rounded-2xl border border-gray-200/90 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/20 p-4 sm:p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Reglas y recomendaciones
                    </h4>

                    <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF3F1A] mt-1.5 shrink-0" />
                        <p>
                          <strong className="text-gray-800 dark:text-gray-200">Precios numéricos:</strong> Escribe valores enteros como <code>25000</code> o <code>25.000</code> sin el signo de pesos <code>$</code>.
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF3F1A] mt-1.5 shrink-0" />
                        <p>
                          <strong className="text-gray-800 dark:text-gray-200">Columnas reconocidas:</strong> <code>Producto</code>, <code>Categoria</code>, <code>Descripcion</code>, <code>Precio COP</code>.
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF3F1A] mt-1.5 shrink-0" />
                        <p>
                          <strong className="text-gray-800 dark:text-gray-200">Fotos o PDFs físicos:</strong> Asegúrate de que el texto y los precios tengan buena iluminación y legibilidad.
                        </p>
                      </div>
                    </div>

                    {/* Botones de descarga y demo como en la referencia */}
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={descargarPlantillaExcel}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 shadow-2xs transition-all cursor-pointer"
                      >
                        <DownloadIcon className="w-3.5 h-3.5 text-[#FF3F1A]" />
                        <span>Descargar plantilla (.csv)</span>
                      </button>
                      <button
                        type="button"
                        onClick={cargarCatalogoEjemplo}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#97D6DF]/20 hover:bg-[#97D6DF]/30 text-xs font-semibold text-[#190088] dark:text-[#97D6DF] transition-all cursor-pointer"
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        <span>Cargar demo</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barra inferior de acciones */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={descargarPlantillaExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                  >
                    <DownloadIcon className="w-3.5 h-3.5 text-gray-500" />
                    <span>Descargar plantilla (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={cargarCatalogoEjemplo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#97D6DF]/20 hover:bg-[#97D6DF]/30 text-xs font-semibold text-[#190088] dark:text-[#97D6DF] transition-colors cursor-pointer"
                  >
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    <span>Cargar demo</span>
                  </button>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMostrarImportador(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={ejecutarImportacion}
                    disabled={procesandoArchivo || (!archivo && !textoManual.trim())}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF3F1A] hover:bg-[#FF3F1A]/90 text-white text-xs font-bold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <FileIcon className="w-4 h-4" />
                    <span>{procesandoArchivo ? (mensajeProgreso || 'Procesando...') : 'Cargar Productos'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Vista de Productos: Cuadrícula o Tabla ── */}
        {cargandoInicial ? (
          <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
            <p className="text-sm font-medium">Cargando catálogo...</p>
          </div>
        ) : productosFiltrados.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-200/80 dark:border-gray-800 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#97D6DF]/20 dark:bg-[#97D6DF]/15 text-[#190088] dark:text-[#97D6DF] mx-auto flex items-center justify-center">
              <DocsIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                No hay productos para mostrar
              </h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                Agrega tu primer producto con "Nuevo producto", carga el catálogo de ejemplo o sube tu archivo en PDF o Excel.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={cargarCatalogoEjemplo}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold transition-all"
              >
                <CheckCircleIcon className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
                Cargar catálogo de ejemplo
              </button>
              <button
                type="button"
                onClick={() => setMostrarImportador(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FF3F1A] hover:bg-[#FF3F1A]/90 text-white text-sm font-semibold shadow-2xs transition-all"
              >
                <DocsIcon className="w-4 h-4" />
                Cargar catálogo desde archivo
              </button>
            </div>
          </div>
        ) : vistaModo === 'cuadricula' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
            {productosFiltrados.map((item) => (
              <div
                key={item.id}
                onClick={() => abrirModalEditar(item)}
                className={`group bg-white dark:bg-gray-900 rounded-2xl border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer overflow-hidden flex flex-col justify-between ${
                  item.disponible
                    ? 'border-gray-200/80 dark:border-gray-800'
                    : 'border-gray-200/60 dark:border-gray-800/60 opacity-60'
                }`}
              >
                {/* Imagen del producto con badge de categoría */}
                <div className="relative h-36 sm:h-40 w-full bg-gray-900 dark:bg-gray-800 overflow-hidden">
                  <img
                    src={item.imagen}
                    alt={item.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FOTO_POR_DEFECTO;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />

                  {/* Categoría Tag */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/95 dark:bg-gray-900/95 text-gray-800 dark:text-gray-200 backdrop-blur-xs shadow-2xs truncate max-w-[55%]">
                    {item.categoria}
                  </span>

                  {/* Switch de Disponibilidad */}
                  <button
                    type="button"
                    onClick={(e) => toggleDisponibilidad(item.id, e)}
                    title={item.disponible ? 'Pausar producto' : 'Habilitar producto'}
                    className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-2xs transition-all ${
                      item.disponible
                        ? 'bg-emerald-500 text-white'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    {item.disponible ? 'Disponible' : 'Agotado'}
                  </button>

                  {/* Precio en Card */}
                  <div className="absolute bottom-2 left-2">
                    <span className="text-sm sm:text-base font-bold text-white drop-shadow-md tabular-nums">
                      {formatearCOP(item.precio)}
                    </span>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-1.5">
                  <div>
                    <h4 className="font-bold text-xs sm:text-[13px] text-[#190088] dark:text-white line-clamp-1 group-hover:text-[#FF3F1A] transition-colors">
                      {item.nombre}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                      {item.descripcion || 'Sin descripción'}
                    </p>
                  </div>

                  <div className="pt-1.5 flex items-center justify-between border-t border-gray-100 dark:border-gray-800/80">
                    <span className="text-[11px] font-semibold text-gray-500 hover:text-[#190088] dark:text-gray-400 dark:hover:text-white flex items-center gap-1 transition-colors">
                      <PencilIcon className="w-3 h-3" />
                      Editar
                    </span>

                    <button
                      type="button"
                      onClick={(e) => eliminarProducto(item.id, e)}
                      title="Eliminar producto"
                      className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <TrashBinIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Vista en Lista / Tabla Operativa ── */
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/75 dark:bg-gray-800/50 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Precio ($COP)</th>
                    <th className="py-3 px-4 text-center">Disponibilidad</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {productosFiltrados.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => abrirModalEditar(item)}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-200/60 dark:border-gray-700">
                            <img
                              src={item.imagen}
                              alt={item.nombre}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = FOTO_POR_DEFECTO;
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-[#190088] dark:text-white truncate">
                              {item.nombre}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs md:max-w-md">
                              {item.descripcion || 'Sin descripción'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block text-xs px-2.5 py-0.5 rounded-md font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-sm text-gray-900 dark:text-white tabular-nums">
                          {formatearCOP(item.precio)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => toggleDisponibilidad(item.id, e)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all shadow-2xs ${
                            item.disponible
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                              : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {item.disponible ? 'Disponible' : 'Agotado'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => abrirModalEditar(item)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#190088] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            title="Editar producto"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => eliminarProducto(item.id, e)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            title="Eliminar producto"
                          >
                            <TrashBinIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* ── Modal de Edición Visual de Producto con Galería de Fotos Sugeridas ── */}
      {productoEnEdicion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl p-6 shadow-theme-lg border border-gray-200 dark:border-gray-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-ink-title dark:text-white">
                {esNuevoProducto ? 'Nuevo producto' : 'Editar producto'}
              </h3>
              <button
                onClick={() => setProductoEnEdicion(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <CloseLineIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Vista previa de imagen y selector rápido */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Foto del producto
              </label>
              <div className="h-40 w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                <img
                  src={productoEnEdicion.imagen}
                  alt="Vista previa"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Galería de fotos sugeridas */}
              <div className="space-y-1">
                <span className="text-[11px] text-gray-400">Selecciona una imagen sugerida:</span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {FOTOS_TEMATICAS.map((tema, i) => (
                    <img
                      key={i}
                      src={tema.url}
                      alt="Opción"
                      onClick={() => setProductoEnEdicion({ ...productoEnEdicion, imagen: tema.url })}
                      className={`w-12 h-12 rounded-xl object-cover cursor-pointer border-2 transition-all shrink-0 ${
                        productoEnEdicion.imagen === tema.url
                          ? 'border-brand-500 scale-105'
                          : 'border-transparent hover:opacity-80'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Formulario */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Nombre del producto
                </label>
                <input
                  type="text"
                  value={productoEnEdicion.nombre}
                  onChange={(e) => {
                    const nuevoNombre = e.target.value;
                    const autoFoto = esNuevoProducto
                      ? asignarFotoInteligente(nuevoNombre, productoEnEdicion.categoria)
                      : productoEnEdicion.imagen;
                    setProductoEnEdicion({
                      ...productoEnEdicion,
                      nombre: nuevoNombre,
                      imagen: autoFoto,
                    });
                  }}
                  placeholder="Ej: Hamburguesa Doble Carne con Queso"
                  className="w-full px-3.5 py-2 mt-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm font-semibold text-gray-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={productoEnEdicion.categoria}
                    onChange={(e) =>
                      setProductoEnEdicion({ ...productoEnEdicion, categoria: e.target.value })
                    }
                    placeholder="Ej: Hamburguesas, Bebidas"
                    className="w-full px-3.5 py-2 mt-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Precio ($COP)
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={productoEnEdicion.precio}
                      onChange={(e) =>
                        setProductoEnEdicion({
                          ...productoEnEdicion,
                          precio: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm font-bold text-gray-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Descripción o Ingredientes
                </label>
                <textarea
                  rows={3}
                  value={productoEnEdicion.descripcion}
                  onChange={(e) =>
                    setProductoEnEdicion({ ...productoEnEdicion, descripcion: e.target.value })
                  }
                  placeholder="Describe los ingredientes o acompañamientos..."
                  className="w-full px-3.5 py-2 mt-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <div>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Disponible en el catálogo
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Si se agota, apágalo para que tus clientes no lo pidan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setProductoEnEdicion({
                      ...productoEnEdicion,
                      disponible: !productoEnEdicion.disponible,
                    })
                  }
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    productoEnEdicion.disponible
                      ? 'bg-accent-500 text-white'
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {productoEnEdicion.disponible ? 'Activo' : 'Agotado'}
                </button>
              </div>
            </div>

            {/* Botones de acción modal */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setProductoEnEdicion(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={guardarProductoModal}
                className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-theme-xs"
              >
                Guardar producto
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
});

export default CatalogoPage;
