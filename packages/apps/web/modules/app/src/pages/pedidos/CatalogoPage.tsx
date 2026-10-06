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
} from '@/icons';
import { getSupabase, ESQUEMA } from '@/lib/supabase';
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

// Asigna una foto profesional automáticamente analizando el texto del plato
const asignarFotoInteligente = (nombre: string, categoria: string): string => {
  const texto = `${nombre} ${categoria}`.toLowerCase();
  for (const tema of FOTOS_TEMATICAS) {
    if (tema.palabrasClave.some((kw) => texto.includes(kw))) {
      return tema.url;
    }
  }
  return FOTO_POR_DEFECTO;
};

// Menú de demostración listo para activar con 1 clic
const MENU_DEMO_EJEMPLO: ProductoCatalogoItem[] = [
  {
    id: 'demo-1',
    nombre: 'Hamburguesa Doble Queso Artesanal',
    categoria: 'Hamburguesas',
    descripcion: '200g de carne de res, doble queso cheddar fundido, tocineta crocante y salsa especial.',
    precio: 28000,
    imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
    disponible: true,
  },
  {
    id: 'demo-2',
    nombre: 'Pizza Pepperoni Supreme Familiar',
    categoria: 'Pizzas',
    descripcion: 'Masa madre tradicional, salsa pomodoro italiana, abundante mozzarella y pepperoni.',
    precio: 42000,
    imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80',
    disponible: true,
  },
  {
    id: 'demo-3',
    nombre: 'Alitas BBQ Crocantes (8 und)',
    categoria: 'Entradas',
    descripcion: 'Alitas marinadas en salsa BBQ ahumada de la casa, acompañadas de apio y salsa tártara.',
    precio: 22000,
    imagen: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
    disponible: true,
  },
  {
    id: 'demo-4',
    nombre: 'Papas Rústicas Trufadas',
    categoria: 'Acompañamientos',
    descripcion: 'Papas en cascos con aceite de trufa blanca, queso parmesano y sal marina.',
    precio: 14000,
    imagen: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80',
    disponible: true,
  },
  {
    id: 'demo-5',
    nombre: 'Limonada de Coco Caribeña',
    categoria: 'Bebidas',
    descripcion: 'Vaso de 16oz con leche de coco natural, hielo frappé y toque de limón fresco.',
    precio: 9500,
    imagen: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=80',
    disponible: true,
  },
  {
    id: 'demo-6',
    nombre: 'Tiramisú Tradicional de Café',
    categoria: 'Postres',
    descripcion: 'Capas de soletillas empapadas en café espresso y crema sedosa de queso mascarpone.',
    precio: 15000,
    imagen: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&q=80',
    disponible: true,
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

  // Alerta informativa
  const [alerta, setAlerta] = useState<{ tipo: 'exito' | 'error'; mensaje: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
          nombre: String(i.nombre || 'Plato o Producto'),
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
    link.setAttribute('download', 'plantilla_menu_necto.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setAlerta({
      tipo: 'exito',
      mensaje: 'Plantilla descargada. Puedes abrirla en Excel, agregar tus platos y volver a subirla aquí.',
    });
  };

  // 3. Cargar menú de ejemplo instantáneo (Demo)
  const cargarMenuEjemplo = () => {
    setProductos(MENU_DEMO_EJEMPLO);
    setMostrarImportador(false);
    setAlerta({
      tipo: 'exito',
      mensaje: '¡Menú de demostración cargado! Puedes editar los precios, nombres o fotos y hacer clic en "Guardar y Publicar".',
    });
  };

  // 4. Validación y procesamiento del documento
  const validarArchivo = (file: File) => {
    const permitidos = ['.pdf', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg'];
    const esValido = permitidos.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!esValido) {
      setErrorCarga('Por favor sube un documento PDF, una hoja de Excel (.xlsx) o una foto de tu carta.');
      return;
    }
    setArchivo(file);
    setErrorCarga(null);
  };

  const ejecutarImportacion = async () => {
    if (!archivo && !textoManual.trim()) {
      setErrorCarga('Por favor adjunta un archivo o escribe algunos platos antes de continuar.');
      return;
    }

    setProcesandoArchivo(true);
    setErrorCarga(null);
    setMensajeProgreso('Leyendo tu carta o documento...');

    try {
      let bodyPayload: any = {};

      if (metodoCarga === 'archivo' && archivo) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(archivo);
        });

        setMensajeProgreso('Organizando platos, precios y asignando fotos...');
        bodyPayload = {
          fileBase64: base64Data,
          fileName: archivo.name,
          mimeType: archivo.type,
        };
      } else {
        setMensajeProgreso('Interpretando texto y precios de tu carta...');
        bodyPayload = {
          textoPlano: textoManual,
          fileName: 'mi_menu.txt',
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
        throw new Error('No se detectaron platos con precios claros. Prueba con otro archivo o escribe el texto directamente.');
      }
    } catch (err: any) {
      setErrorCarga(err.message || 'Hubo un inconveniente al procesar el archivo.');
    } finally {
      setProcesandoArchivo(false);
      setMensajeProgreso('');
    }
  };

  // 5. Guardar en Supabase
  const guardarMenu = async () => {
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
        mensaje: '¡Tu menú ha sido publicado! Tus clientes ya pueden pedir estos productos en Telegram y en tu carta web.',
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
      categoria: categoriaActiva !== 'Todas' ? categoriaActiva : 'Platos Principales',
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
    <div className="min-h-screen bg-gray-50/70 dark:bg-gray-950 p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ── Encabezado Principal con Colores Oficiales Necto (brand-500) ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-theme-xs">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 flex items-center justify-center text-brand-500 shadow-theme-xs">
            <DocsIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-ink-title dark:text-white tracking-tight">
                Menú y Productos
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-400 border border-accent-200 dark:border-accent-500/20">
                En línea
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Administra los platos y precios que ven tus clientes en Telegram y en la carta web.
            </p>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={() => setMostrarImportador(!mostrarImportador)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/60 dark:bg-brand-500/10 text-brand-500 dark:text-brand-400 text-sm font-semibold hover:bg-brand-100/80 dark:hover:bg-brand-500/20 transition-all"
          >
            <DocsIcon className="w-4 h-4" />
            Cargar Menú (PDF / Excel)
          </button>

          <Link
            to="/menu"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
          >
            <EyeIcon className="w-4 h-4 text-gray-400" />
            Ver Carta Pública
          </Link>

          <button
            onClick={guardarMenu}
            disabled={guardando || (!hayCambiosPendientes && productos.length === 0)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-theme-xs ${
              hayCambiosPendientes
                ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-theme-sm ring-2 ring-brand-500/40 ring-offset-2 dark:ring-offset-gray-900'
                : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-95'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <CheckLineIcon className="w-4 h-4" />
            {guardando ? 'Guardando...' : 'Guardar y Publicar'}
            {hayCambiosPendientes && <span className="w-2 h-2 rounded-full bg-white" />}
          </button>
        </div>
      </div>

      {/* ── Banner de Alerta / Éxito ── */}
      {alerta && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between border ${
            alerta.tipo === 'exito'
              ? 'bg-accent-50 border-accent-200 text-accent-700 dark:bg-accent-500/10 dark:border-accent-500/30 dark:text-accent-400'
              : 'bg-error-50 border-error-200 text-error-700 dark:bg-error-500/10 dark:border-error-500/30 dark:text-error-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {alerta.tipo === 'exito' ? (
              <CheckCircleIcon className="w-5 h-5 text-accent-600 dark:text-accent-400 shrink-0" />
            ) : (
              <AlertIcon className="w-5 h-5 text-error-600 dark:text-error-400 shrink-0" />
            )}
            <p className="text-sm font-medium">{alerta.mensaje}</p>
          </div>
          <button
            onClick={() => setAlerta(null)}
            className="text-xs font-semibold underline hover:opacity-80 ml-4"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* ── Panel Desplegable: Cargar Carta o Menú (PDF / Excel / Plantilla) ── */}
      {mostrarImportador && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-theme-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center">
                <FileIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink-title dark:text-white">
                  Cargar menú desde archivo
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sube cualquier carta en PDF, lista en Excel o foto de tu menú. No necesitas un formato estricto.
                </p>
              </div>
            </div>

            <button
              onClick={() => setMostrarImportador(false)}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <CloseLineIcon className="w-5 h-5" />
            </button>
          </div>

          {/* ── Barra de Facilidades para el Cliente ── */}
          <div className="p-4 bg-brand-50/50 dark:bg-brand-500/5 rounded-2xl border border-brand-100 dark:border-brand-500/20 space-y-3">
            <div className="flex items-start gap-2.5">
              <InfoIcon className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                <span className="font-semibold text-gray-900 dark:text-white">
                  ¿No tienes un archivo con formato especial? ¡No hay problema!
                </span>
                <p className="mt-0.5">
                  Puedes subir tu <strong>volante impreso, carta en PDF o lista de precios actual</strong>. Nuestro sistema extraerá los platos, los precios en pesos colombianos y les asignará automáticamente fotos profesionales de alta resolución.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={descargarPlantillaExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-theme-xs"
              >
                <DownloadIcon className="w-3.5 h-3.5 text-brand-500" />
                Descargar Plantilla Excel de Ejemplo (.csv)
              </button>

              <button
                type="button"
                onClick={cargarMenuEjemplo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-all shadow-theme-xs"
              >
                <CheckCircleIcon className="w-3.5 h-3.5" />
                Cargar Menú de Prueba con 1 Clic (Demo)
              </button>
            </div>
          </div>

          {/* Pestañas: Archivo vs Texto */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
            <button
              onClick={() => setMetodoCarga('archivo')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                metodoCarga === 'archivo'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              Subir Archivo (PDF, Excel o Foto)
            </button>
            <button
              onClick={() => setMetodoCarga('texto')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                metodoCarga === 'texto'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
              }`}
            >
              Escribir / Pegar Texto de la Carta
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
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragActivo
                  ? 'border-brand-500 bg-brand-50/30 dark:bg-brand-500/10'
                  : 'border-gray-300 dark:border-gray-700 hover:border-brand-500 bg-gray-50/50 dark:bg-gray-900/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
                onChange={(e) => e.target.files?.[0] && validarArchivo(e.target.files[0])}
                className="hidden"
              />

              <div className="flex flex-col items-center space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-500">
                  <DocsIcon className="w-6 h-6" />
                </div>

                {archivo ? (
                  <div className="flex items-center gap-3 p-3 bg-brand-50 dark:bg-brand-500/10 rounded-xl border border-brand-200 dark:border-brand-500/30">
                    <FileIcon className="w-5 h-5 text-brand-500" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{archivo.name}</p>
                      <p className="text-xs text-gray-500">{(archivo.size / 1024).toFixed(1)} KB — Listo para procesar</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      Arrastra tu archivo aquí o haz clic para seleccionarlo
                    </p>
                    <p className="text-xs text-gray-400">
                      Compatible con cualquier PDF, Excel (.xlsx, .xls), CSV o foto nítida de tu carta física.
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <textarea
              value={textoManual}
              onChange={(e) => setTextoManual(e.target.value)}
              placeholder="Ejemplo:&#10;Hamburguesa Especial - Carne 200g, tocineta y queso - $26.000&#10;Papas Francesas - Con sal marina - $12.000&#10;Limonada Natural - $6.500"
              className="w-full h-32 p-4 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          )}

          {errorCarga && (
            <div className="p-3 bg-error-50 dark:bg-error-500/10 border border-error-200 dark:border-error-500/30 rounded-xl text-xs text-error-700 dark:text-error-400 flex items-center gap-2">
              <AlertIcon className="w-4 h-4 shrink-0" />
              <span>{errorCarga}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-gray-400">
              Tus productos actuales no se eliminarán; se sumarán o actualizarán con los nuevos.
            </span>

            <button
              onClick={ejecutarImportacion}
              disabled={procesandoArchivo || (!archivo && !textoManual.trim())}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold shadow-theme-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <FileIcon className="w-4 h-4" />
              <span>{procesandoArchivo ? (mensajeProgreso || 'Procesando...') : 'Cargar Productos'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Barra de Filtrado, Búsqueda y Modos de Vista ── */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-theme-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Barra de búsqueda */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por plato, categoría o ingrediente..."
              className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            {/* Toggle Cuadrícula / Lista */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button
                onClick={() => setVistaModo('cuadricula')}
                title="Vista en tarjetas"
                className={`p-2 rounded-lg transition-all ${
                  vistaModo === 'cuadricula'
                    ? 'bg-white dark:bg-gray-700 text-brand-500 shadow-theme-xs'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <GridIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setVistaModo('lista')}
                title="Vista en lista"
                className={`p-2 rounded-lg transition-all ${
                  vistaModo === 'lista'
                    ? 'bg-white dark:bg-gray-700 text-brand-500 shadow-theme-xs'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={abrirModalNuevo}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-theme-xs transition-all"
            >
              <PlusIcon className="w-4 h-4" />
              Nuevo Plato
            </button>
          </div>
        </div>

        {/* Pestañas de categorías */}
        {categorias.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaActiva(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  categoriaActiva === cat
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-theme-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Vista de Productos: Cuadrícula de Tarjetas Visuales ── */}
      {cargandoInicial ? (
        <div className="p-16 text-center text-gray-400 flex flex-col items-center justify-center space-y-3">
          <p className="text-sm font-medium">Cargando catálogo...</p>
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-200/80 dark:border-gray-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-500 mx-auto flex items-center justify-center">
            <DocsIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink-title dark:text-white">
              No hay productos para mostrar
            </h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              Agrega tu primer producto con "Nuevo Plato", carga el menú demo o sube tu archivo en PDF o Excel.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={cargarMenuEjemplo}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold transition-all"
            >
              <CheckCircleIcon className="w-4 h-4 text-brand-500" />
              Cargar Menú de Prueba con 1 Clic
            </button>
            <button
              onClick={() => setMostrarImportador(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold shadow-theme-xs transition-all"
            >
              <DocsIcon className="w-4 h-4" />
              Cargar Menú desde Archivo
            </button>
          </div>
        </div>
      ) : vistaModo === 'cuadricula' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {productosFiltrados.map((item) => (
            <div
              key={item.id}
              onClick={() => abrirModalEditar(item)}
              className={`group bg-white dark:bg-gray-900 rounded-3xl border transition-all duration-200 hover:shadow-theme-md hover:-translate-y-0.5 cursor-pointer overflow-hidden flex flex-col justify-between ${
                item.disponible
                  ? 'border-gray-200/80 dark:border-gray-800'
                  : 'border-gray-200/60 dark:border-gray-800/60 opacity-60'
              }`}
            >
              {/* Imagen del Plato con Badge de Categoría */}
              <div className="relative h-44 w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <img
                  src={item.imagen}
                  alt={item.nombre}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FOTO_POR_DEFECTO;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Categoría Tag */}
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-200 backdrop-blur-md shadow-theme-xs">
                  {item.categoria}
                </span>

                {/* Switch de Disponibilidad */}
                <button
                  onClick={(e) => toggleDisponibilidad(item.id, e)}
                  title={item.disponible ? 'Pausar plato' : 'Habilitar plato'}
                  className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold shadow-theme-xs transition-all ${
                    item.disponible
                      ? 'bg-accent-500 text-white'
                      : 'bg-gray-600 text-gray-200'
                  }`}
                >
                  {item.disponible ? 'Disponible' : 'Agotado'}
                </button>

                {/* Precio en Card */}
                <div className="absolute bottom-3 left-3">
                  <span className="text-xl font-bold text-white drop-shadow-md">
                    {formatearCOP(item.precio)}
                  </span>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h4 className="font-bold text-sm text-ink-title dark:text-white line-clamp-1">
                    {item.nombre}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                    {item.descripcion || 'Sin descripción.'}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-semibold text-brand-500 dark:text-brand-400 flex items-center gap-1">
                    <PencilIcon className="w-3.5 h-3.5" />
                    Editar
                  </span>

                  <button
                    onClick={(e) => eliminarProducto(item.id, e)}
                    title="Eliminar plato"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10 transition-colors"
                  >
                    <TrashBinIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Vista en Lista Rápida ── */
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-theme-xs overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {productosFiltrados.map((item) => (
              <div
                key={item.id}
                onClick={() => abrirModalEditar(item)}
                className="p-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/30 flex items-center justify-between gap-4 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                    <img
                      src={item.imagen}
                      alt={item.nombre}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FOTO_POR_DEFECTO;
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink-title dark:text-white text-sm">
                      {item.nombre}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 max-w-md">
                      {item.descripcion}
                    </p>
                    <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-md font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {item.categoria}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-bold text-base text-gray-900 dark:text-white">
                    {formatearCOP(item.precio)}
                  </span>

                  <button
                    onClick={(e) => toggleDisponibilidad(item.id, e)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      item.disponible
                        ? 'bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-400 border border-accent-200 dark:border-accent-500/30'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {item.disponible ? 'Disponible' : 'Agotado'}
                  </button>

                  <button
                    onClick={(e) => eliminarProducto(item.id, e)}
                    className="p-1.5 text-gray-400 hover:text-error-600 transition-colors"
                  >
                    <TrashBinIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal de Edición Visual de Producto con Galería de Fotos Sugeridas ── */}
      {productoEnEdicion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl p-6 shadow-theme-lg border border-gray-200 dark:border-gray-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-base font-bold text-ink-title dark:text-white">
                {esNuevoProducto ? 'Nuevo Plato o Producto' : 'Editar Plato'}
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
                  Nombre del plato
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
                    Disponible en la carta
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
                Guardar Plato
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default CatalogoPage;
