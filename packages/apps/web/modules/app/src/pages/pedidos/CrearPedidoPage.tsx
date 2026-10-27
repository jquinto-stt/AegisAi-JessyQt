import { useState, useEffect, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import {
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  CreditCardIcon,
  MapPinIcon,
  MinusIcon,
  PaperAirplaneIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
  TruckIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  pedidosStore,
  puedeCrearPedido,
  puedeGestionarProgramados,
  motivoSinPermiso,
  organizacionStore,
} from "@/stores";
import type { ModalidadPedido, PedidoItem, MetodoPago, DireccionEntrega } from "@/stores";
import { ProgramarModal } from "./ProgramarModal";
import { TRANSPORTADORAS } from "@/domain/pedidos/transportadoras.catalogo";
import {
  transportadorasDisponibles,
  transportadoraFavorita,
} from "@/domain/pedidos/transportadoras.seleccion";
import {
  datosParaTransferir,
  mediosDeCobroHabilitados,
  mensajeDeCobro,
  enlaceDePago,
} from "./cobros";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { sessionStore } from "@/stores/session.store";
import QRCode from "qrcode";
import { asignarFotoInteligente } from "./CatalogoPage";
import { getSupabase, ESQUEMA } from "@/lib/supabase";

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS Y UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

interface ItemFila {
  nombre: string;
  cantidad: number;
  precio?: number;
  variante?: string;
  imagen?: string;
}

/**
 * Un cargo que NO es producto (empaque, instalación, domicilio adicional).
 *
 * Vive aparte de `items` mientras se arma el pedido para que el resumen pueda
 * enseñarlo en su propio grupo y no como si fuera una referencia del catálogo.
 * Al guardar se convierte en una línea más del pedido, que es lo que el negocio
 * cobra y lo que debe quedar congelado en el comprobante.
 */
interface CargoFila {
  concepto: string;
  monto: string;
}

interface CreatedInfo {
  numero: string;
  cliente: string;
  telefono: string;
  modalidad: ModalidadPedido;
  modalidadLabel: string;
  metodoPago?: MetodoPago;
  programadoPara?: string;
  direccion?: string;
  mesa?: string;
  total?: number;
  costoEnvio?: number;
  /** ISO del momento de creación: el comprobante lo pinta como «Fecha». */
  creadoEn: string;
  /** Estado con el que nace el pedido, ya resuelto a su etiqueta visible. */
  estadoLabel: string;
  itemsCount: number;
  items?: PedidoItem[];
  chatId?: string;
}

const money = (n: number) => `$${n.toLocaleString("es-CO")}`;

const formatFechaHora = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("es-CO", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

/**
 * Transportadoras que el operador puede asignar al despacho.
 *
 * La lista ya NO se declara aquí: vive en `domain/pedidos/transportadoras.catalogo`
 * porque la comparten esta pantalla, la tabla de pedidos y las recolecciones, y
 * una copia local se desactualizaba en dos de los tres sitios. Tampoco se pinta
 * el catálogo entero: se pintan las que el negocio dejó encendidas en Ajustes de
 * pedidos → Transportadoras, que es lo que hace que apagar una la saque de las
 * cotizaciones de envío.
 *
 * `fondoLogo` sigue importando: los logos vienen en dos familias. Unos son tinta
 * oscura sobre transparente o blanco (Coordinadora, TCC, Envía) y otros son
 * blancos (Interrapidísimo) o ya vienen dentro de su propio recuadro de marca
 * (Servientrega). Pintar el recuadro del color correcto es lo que evita que el
 * logo desaparezca —en modo oscuro el blanco se pierde y el negro también.
 */

/** Prefijo telefónico del país de la organización. Colombia por defecto. */
const PREFIJO_PAIS: Record<string, string> = {
  Colombia: "+57",
  México: "+52",
  Argentina: "+54",
  Chile: "+56",
  Perú: "+51",
  Ecuador: "+593",
  España: "+34",
  "Estados Unidos": "+1",
};

/** Departamentos de Colombia para el selector de destino. */
const DEPARTAMENTOS_CO = [
  "Amazonas",
  "Antioquia",
  "Arauca",
  "Atlántico",
  "Bogotá D.C.",
  "Bolívar",
  "Boyacá",
  "Caldas",
  "Caquetá",
  "Casanare",
  "Cauca",
  "Cesar",
  "Chocó",
  "Córdoba",
  "Cundinamarca",
  "Guainía",
  "Guaviare",
  "Huila",
  "La Guajira",
  "Magdalena",
  "Meta",
  "Nariño",
  "Norte de Santander",
  "Putumayo",
  "Quindío",
  "Risaralda",
  "San Andrés y Providencia",
  "Santander",
  "Sucre",
  "Tolima",
  "Valle del Cauca",
  "Vaupés",
  "Vichada",
];

const numeroDe = (valor: string) => Math.max(0, Number(valor) || 0);

// ═══════════════════════════════════════════════════════════════════════════
// LOGO DE TRANSPORTADORA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Recuadro del logo de la transportadora.
 *
 * Los cinco logos vienen recortados a su propio tamaño —Coordinadora es una tira
 * de 5:1, Servientrega un cuadrado de marca, Interrapidísimo un wordmark— así que
 * el recuadro fija la caja y `object-contain` hace el resto. El ancho (88px) es
 * el mínimo con el que el wordmark más alargado, Coordinadora, se sigue leyendo
 * dentro de una tarjeta de dos columnas.
 *
 * El fondo NO es decorativo: sin él, los logos de tinta oscura se pierden en modo
 * oscuro y el de Interrapidísimo (blanco puro) se pierde en modo claro.
 *
 * `alt` va vacío a propósito: el nombre de la transportadora está escrito al lado,
 * y repetirlo en el `alt` hace que un lector de pantalla lo diga dos veces.
 */
const LogoTransportadora = ({
  transportadora,
}: {
  transportadora: (typeof TRANSPORTADORAS)[number];
}) => {
  const fondoOscuro = transportadora.fondoLogo === "oscuro";
  const fondo = !transportadora.logo
    ? "bg-[#ECECEC] dark:bg-white/[0.08]"
    : fondoOscuro
      ? "bg-[#212121] ring-1 ring-black/10 dark:ring-white/15"
      : "bg-white ring-1 ring-[#ECECEC] dark:ring-white/10";

  return (
    <span
      className={`flex h-9 w-[96px] shrink-0 items-center justify-center overflow-hidden rounded-md px-1.5 ${fondo}`}
    >
      {transportadora.logo ? (
        <img
          src={transportadora.logo}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain"
        />
      ) : (
        <TruckIcon className="size-5 text-white/40" aria-hidden="true" />
      )}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// FILA DEL COMPROBANTE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Una línea «Rótulo: dato» del comprobante, con su icono en un círculo tenue.
 *
 * Es el equivalente de las filas «Name / Date / Address» del referente. El
 * rótulo va en negrita y el dato en regular, no al revés: lo que se escanea de
 * un comprobante es el dato, y el rótulo solo dice de qué es.
 */
const FilaDetalle = ({
  icono: Icono,
  etiqueta,
  children,
}: {
  icono: typeof UserIcon;
  etiqueta: string;
  children: ReactNode;
}) => (
  <div className="flex items-start gap-2.5">
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#ECECEC] dark:bg-white/[0.06]">
      <Icono className="size-3.5 text-[#190088] dark:text-[#97D6DF]" aria-hidden="true" />
    </span>
    <p className="min-w-0 text-[14px] leading-7">
      <span className="font-bold text-[#190088] dark:text-white">{etiqueta}:</span>{" "}
      <span className="font-light text-[#212121] dark:text-white/70">{children}</span>
    </p>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// CAMPOS DEL FORMULARIO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Estilo único de los campos sobre el lienzo.
 *
 * Sigue la escala DM Sans y los tokens oficiales NECTO:
 * borde #ECECEC, foco #97D6DF, error #FF3F1A, texto #212121.
 */
const CAMPO =
  "w-full rounded-xl border border-[#ECECEC] bg-white px-3 py-2.5 text-[14px] font-normal text-[#212121] placeholder:text-[#212121]/35 outline-hidden transition-colors focus:border-[#97D6DF] focus:ring-2 focus:ring-[#97D6DF]/25 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:placeholder:text-white/25";

const campo = (error?: string) =>
  error
    ? `${CAMPO} border-[#FF3F1A] focus:border-[#FF3F1A] focus:ring-[#FF3F1A]/20 dark:border-[#FF3F1A] dark:focus:border-[#FF3F1A]`
    : CAMPO;

/**
 * Campo con su rótulo y su error. Sustituye al par `Label` + `Input` para que un
 * mensaje de validación no se pierda cuando el formulario está a media captura.
 */
const Campo = ({
  id,
  etiqueta,
  requerido = false,
  error,
  className = "",
  children,
}: {
  id?: string;
  etiqueta: string;
  requerido?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}) => (
  <div className={className}>
    <label htmlFor={id} className="block text-[12px] font-bold text-[#190088] dark:text-white/90">
      {etiqueta}
      {requerido && <span className="ml-0.5 text-[#FF3F1A]">*</span>}
    </label>
    <div className="mt-1.5">{children}</div>
    {error && (
      <p className="mt-1 text-[12px] font-normal text-[#FF3F1A]">{error}</p>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export const CrearPedidoPage = observer(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const modalidadesDisponibles = pedidosStore.config.modalidades;
  const catalogo = pedidosStore.config.catalogo;
  const tieneCatalogo = catalogo.length > 0;

  const puedeCrear = puedeCrearPedido();
  const puedeProgramar = puedeGestionarProgramados();
  const puedeConfirmar = pedidosStore.estadosActivos.includes("confirmado");

  // Precarga desde URL y vinculación con Chat
  const initialCliente = searchParams.get("cliente") ?? "";
  const initialTelefono = searchParams.get("telefono") ?? "";
  const chatId = searchParams.get("chatId") ?? searchParams.get("convId") ?? "";
  const paramModalidad = searchParams.get("modalidad") as ModalidadPedido | null;
  const initialDirs = initialTelefono ? pedidosStore.direccionesDe(initialTelefono) : [];
  const initialCalle = searchParams.get("calle") ?? initialDirs[0]?.calle ?? "";
  const initialBarrio = searchParams.get("barrio") ?? initialDirs[0]?.barrio ?? "";
  const initialReferencia = searchParams.get("referencia") ?? initialDirs[0]?.referencia ?? "";
  const initialIndicaciones = searchParams.get("indicaciones") ?? initialDirs[0]?.indicaciones ?? "";
  const initialCiudad = initialDirs[0]?.ciudad ?? "";
  const initialDepartamento = initialDirs[0]?.departamento ?? "";

  // Estado del formulario (por defecto a domicilio cuando viene de chat o si está disponible)
  const [cliente, setCliente] = useState(() => initialCliente);
  const [telefono, setTelefono] = useState(() => initialTelefono);
  const [modalidad, setModalidad] = useState<ModalidadPedido>(() => {
    if (paramModalidad && modalidadesDisponibles.includes(paramModalidad)) return paramModalidad;
    if (chatId && modalidadesDisponibles.includes("domicilio")) return "domicilio";
    if (initialCalle && modalidadesDisponibles.includes("domicilio")) return "domicilio";
    return modalidadesDisponibles.includes("domicilio") ? "domicilio" : (modalidadesDisponibles[0] ?? "retiro");
  });
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<ItemFila[]>([]);
  const [cargos, setCargos] = useState<CargoFila[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);

  // Logística y dirección
  const [calle, setCalle] = useState(() => initialCalle);
  const [barrio, setBarrio] = useState(() => initialBarrio);
  const [referencia, setReferencia] = useState(() => initialReferencia);
  const [indicaciones, setIndicaciones] = useState(() => initialIndicaciones);
  const [ciudad, setCiudad] = useState(() => initialCiudad);
  const [departamento, setDepartamento] = useState(() => initialDepartamento);
  const [costoEnvio, setCostoEnvio] = useState<number>(0);
  /**
   * Transportadoras que este negocio dejó encendidas.
   *
   * No es el catálogo: es el catálogo menos las que se apagaron en Ajustes de
   * pedidos → Transportadoras. Se lee del store en cada render (el store muta en
   * sitio, así que memoizar por identidad dejaría la lista congelada).
   *
   * Si el negocio las apagó TODAS, la lista queda vacía y se dice en pantalla:
   * rellenarla con el catálogo entero sería deshacer en silencio el ajuste que
   * el usuario acaba de guardar.
   */
  const prefsTransportadoras = {
    habilitadas: pedidosStore.config.transportadorasHabilitadas,
    favorita: pedidosStore.config.transportadoraFavorita,
  };
  const transportadorasDisponiblesHoy = transportadorasDisponibles(prefsTransportadoras);
  /**
   * Con qué transportadora nace el formulario.
   *
   * La favorita que el negocio marcó en Ajustes; si no hay —o está apagada— la
   * primera disponible. Nunca un id fijo: «propio» puede ser una de las que se
   * apagaron, y entonces el formulario arrancaría en una opción que no se pinta.
   */
  const transportePorDefecto =
    transportadoraFavorita(prefsTransportadoras)?.id ??
    transportadorasDisponiblesHoy[0]?.id ??
    "";
  const [transporte, setTransporte] = useState<string>(transportePorDefecto);
  const [mensajero, setMensajero] = useState<string>("");
  const [mesa, setMesa] = useState<string>("");

  // Pagos y cobros
  const mediosDeCobro = mediosDeCobroHabilitados(pedidosStore.config.datosBancarios);

  /**
   * Las dos formas de pago que se ofrecen, derivadas de lo que el negocio
   * encendió: contra entrega y pago anticipado. Si el negocio apagó ambas —o
   * solo acepta efectivo en caja— se cae a la lista configurada para no dejar
   * el pedido sin ninguna opción.
   *
   * Se calcula ANTES del estado del medio de pago para que un pedido nuevo nazca
   * con una opción que de verdad se pinta: con el orden anterior, el medio por
   * defecto era el primero configurado (`efectivo`), que no es ninguna de las dos
   * tarjetas, y el resumen abría con «Pago sin definir» sobre un formulario
   * recién cargado.
   */
  const opcionesPago: { id: MetodoPago; label: string; descripcion: string }[] = (() => {
    const ids = new Set(mediosDeCobro.map((m) => m.id));
    const anticipado: MetodoPago | null = ids.has("transferencia")
      ? "transferencia"
      : ids.has("tarjeta")
        ? "tarjeta"
        : null;
    const opciones: { id: MetodoPago; label: string; descripcion: string }[] = [];
    if (ids.has("contra_entrega")) {
      opciones.push({
        id: "contra_entrega",
        label: "Contra entrega",
        descripcion: "El cliente paga al recibir el pedido.",
      });
    }
    if (anticipado) {
      opciones.push({
        id: anticipado,
        label: "Pago anticipado",
        descripcion:
          anticipado === "tarjeta"
            ? "Se cobra con link de pago antes del despacho."
            : "El cliente transfiere antes del despacho.",
      });
    }
    return opciones.length > 0
      ? opciones
      : mediosDeCobro.map((m) => ({ id: m.id, label: m.label, descripcion: m.descripcion }));
  })();

  const [metodoPago, setMetodoPago] = useState<MetodoPago>(
    () => opcionesPago[0]?.id ?? "efectivo"
  );
  const [pagaCon, setPagaCon] = useState<string>("");
  const transferencia = datosParaTransferir(pedidosStore.config.datosBancarios);

  // Confirmación y programación
  const [confirmarAlCrear, setConfirmarAlCrear] = useState(false);
  const [programar, setProgramar] = useState(false);
  const [programadoISO, setProgramadoISO] = useState<string | null>(null);
  const [showProgramar, setShowProgramar] = useState(false);

  // Feedback y confirmación
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<CreatedInfo | null>(null);
  const [copiadoCobro, setCopiadoCobro] = useState(false);
  const [copiadoLink, setCopiadoLink] = useState(false);
  const [enviadoAlChat, setEnviadoAlChat] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Generación reactiva de QR solo para cobro en el negocio (en sitio)
  useEffect(() => {
    if (created && created.modalidad === "en_sitio") {
      const urlPago = enlaceDePago(
        pedidosStore.config.datosBancarios,
        created.numero,
        window.location.origin
      );
      QRCode.toDataURL(urlPago, {
        width: 260,
        margin: 2,
        color: {
          dark: "#190088",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("Error generando QR:", err));
    } else {
      setQrDataUrl("");
    }
  }, [created]);

  // Sincronización de URL params y Catálogo de Supabase
  useEffect(() => {
    const qCliente = searchParams.get("cliente");
    const qTelefono = searchParams.get("telefono");
    const qModalidad = searchParams.get("modalidad") as ModalidadPedido | null;
    const qChatId = searchParams.get("chatId") ?? searchParams.get("convId");

    if (qCliente !== null) setCliente(qCliente);
    if (qModalidad && modalidadesDisponibles.includes(qModalidad)) {
      setModalidad(qModalidad);
    } else if (qChatId && modalidadesDisponibles.includes("domicilio")) {
      setModalidad("domicilio");
    }
    if (qTelefono !== null) {
      setTelefono(qTelefono);
      const dirs = pedidosStore.direccionesDe(qTelefono);
      const qCalle = searchParams.get("calle") ?? dirs[0]?.calle;
      const qBarrio = searchParams.get("barrio") ?? dirs[0]?.barrio;
      const qRef = searchParams.get("referencia") ?? dirs[0]?.referencia;
      const qInd = searchParams.get("indicaciones") ?? dirs[0]?.indicaciones;
      if (qCalle) {
        setCalle(qCalle);
        if (modalidadesDisponibles.includes("domicilio")) setModalidad("domicilio");
      }
      if (qBarrio) setBarrio(qBarrio);
      if (qRef) setReferencia(qRef);
      if (qInd) setIndicaciones(qInd);
      if (dirs[0]?.ciudad) setCiudad(dirs[0].ciudad);
      if (dirs[0]?.departamento) setDepartamento(dirs[0].departamento);
    }

    const sb = getSupabase();
    if (sb) {
      void (async () => {
        try {
          const { data, error } = await sb
            .schema(ESQUEMA)
            .from("config_pedidos")
            .select("catalogo")
            .limit(1)
            .maybeSingle();

          if (!error && data?.catalogo && Array.isArray(data.catalogo) && data.catalogo.length > 0) {
            (pedidosStore.config as any).catalogo = data.catalogo;
          }
        } catch (err: unknown) {
          console.warn("[CrearPedidoPage] Error cargando catálogo de Supabase:", err);
        }
      })();
    }
  }, [searchParams, modalidadesDisponibles]);

  const cambiarModalidad = (m: ModalidadPedido) => {
    setModalidad(m);
    if (m !== "domicilio") {
      setMensajero("");
      setErrors((prev) => (prev.calle ? { ...prev, calle: "" } : prev));
    }
    if (m !== "en_sitio") setMesa("");
  };

  // ── Productos: búsqueda y líneas del pedido ──
  const resultadosCatalogo = catalogo
    .filter((c) => {
      const q = busquedaProducto.toLowerCase().trim();
      if (!q) return true;
      return (
        c.nombre.toLowerCase().includes(q) ||
        ((c as any).categoria && String((c as any).categoria).toLowerCase().includes(q))
      );
    })
    .slice(0, 8);

  const agregarItemDesdeCatalogo = (catItem: typeof catalogo[0], varianteElegida?: string) => {
    const varFinal = varianteElegida ?? catItem.variantesDisponibles?.[0];
    const foto = (catItem as any).imagen || asignarFotoInteligente(catItem.nombre, (catItem as any).categoria);

    setItems((prev) => {
      const idxExistente = prev.findIndex(
        (it) => it.nombre === catItem.nombre && it.variante === varFinal
      );
      if (idxExistente >= 0) {
        return prev.map((it, i) =>
          i === idxExistente ? { ...it, cantidad: it.cantidad + 1 } : it
        );
      }
      return [
        ...prev,
        {
          nombre: catItem.nombre,
          precio: catItem.precio,
          cantidad: 1,
          variante: varFinal,
          imagen: foto,
        },
      ];
    });

    setBusquedaProducto("");
    setBuscadorAbierto(false);
    if (errors.items) setErrors((prev) => ({ ...prev, items: "" }));
  };

  const modificarCantidad = (index: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((it, i) => {
          if (i !== index) return it;
          const nuevaCantidad = it.cantidad + delta;
          return { ...it, cantidad: nuevaCantidad };
        })
        .filter((it) => it.cantidad > 0)
    );
  };

  const eliminarItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const vaciarTicket = () => {
    setItems([]);
    setCargos([]);
  };

  // ── Cargos adicionales ──
  const agregarCargo = () => setCargos((prev) => [...prev, { concepto: "", monto: "" }]);

  const editarCargo = (index: number, cambio: Partial<CargoFila>) =>
    setCargos((prev) => prev.map((c, i) => (i === index ? { ...c, ...cambio } : c)));

  const eliminarCargo = (index: number) =>
    setCargos((prev) => prev.filter((_, i) => i !== index));

  // ── Derivados del Pedido ──
  const subtotalProductos = items.reduce(
    (acc, it) => acc + Math.max(0, it.precio ?? 0) * Math.max(1, it.cantidad),
    0
  );
  const subtotalCargos = cargos.reduce((acc, c) => acc + numeroDe(c.monto), 0);
  const costoEnvioEfectivo = modalidad === "domicilio" ? Math.max(0, Number(costoEnvio) || 0) : 0;
  const totalPedido = subtotalProductos + subtotalCargos + costoEnvioEfectivo;
  const esPagoEnEntrega = metodoPago === "efectivo" || metodoPago === "contra_entrega";
  const direccionesGuardadas = pedidosStore.direccionesDe(telefono);

  /**
   * Si la configuración de cobro cambia mientras la pantalla está abierta (o el
   * medio elegido deja de estar habilitado), el pedido no puede quedarse con un
   * método que ya no se ofrece.
   */
  useEffect(() => {
    if (!opcionesPago.some((o) => o.id === metodoPago)) {
      setMetodoPago(opcionesPago[0]?.id ?? "efectivo");
    }
  }, [metodoPago, opcionesPago]);

  const transportadora =
    transportadorasDisponiblesHoy.find((t) => t.id === transporte) ??
    transportadorasDisponiblesHoy[0] ??
    TRANSPORTADORAS[0];
  // Sin ninguna transportadora encendida no hay despacho que asignar: el
  // resumen dice «Sin asignar» en vez de inventar la primera del catálogo.
  const repartidorFinal =
    transportadorasDisponiblesHoy.length === 0
      ? ""
      : transporte === "propio"
        ? mensajero.trim()
        : transportadora.nombre;
  const pagoLabel = opcionesPago.find((o) => o.id === metodoPago)?.label ?? "";

  const pais = organizacionStore.organizacion?.pais ?? "Colombia";
  const prefijo = PREFIJO_PAIS[pais] ?? "+57";
  const esColombia = pais === "Colombia";
  const origenDespacho =
    organizacionStore.organizacion?.nombrePublico?.trim() ||
    organizacionStore.organizacion?.nombre?.trim() ||
    "Bodega principal";

  // ── Validación y Guardado ──
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!cliente.trim()) e.cliente = "El nombre del cliente es obligatorio";
    const phone = telefono.replace(/[^\d+]/g, "");
    if (!telefono.trim()) e.telefono = "El teléfono de WhatsApp es obligatorio";
    else if (phone.length < 7) e.telefono = "Número de teléfono no válido";

    if (modalidad === "domicilio" && !calle.trim()) {
      e.calle = "Ingresa la dirección de entrega";
    }

    if (items.length === 0) {
      e.items = "Añade al menos un producto al pedido";
    }

    if (esPagoEnEntrega && pagaCon.trim() !== "" && Number(pagaCon) > 0) {
      if (Number(pagaCon) < totalPedido) {
        e.pagaCon = `El pago recibido (${money(Number(pagaCon))}) es menor al total (${money(totalPedido)}).`;
      }
    }

    if (programar) {
      if (!programadoISO) e.programado = "Selecciona la fecha y hora programada";
      else if (new Date(programadoISO).getTime() <= Date.now()) {
        e.programado = "La fecha y hora deben ser futuras";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = () => {
    if (!puedeCrear || !validate()) return;

    const itemsLimpios: PedidoItem[] = [
      ...items.map((it) => {
        const nombreFinal = it.variante ? `${it.nombre.trim()} (${it.variante})` : it.nombre.trim();
        return {
          nombre: nombreFinal,
          cantidad: Math.max(1, Number(it.cantidad) || 1),
          precio: it.precio === undefined ? undefined : Math.max(0, Number(it.precio) || 0),
        };
      }),
      ...cargos
        .filter((c) => c.concepto.trim() && numeroDe(c.monto) > 0)
        .map((c) => ({
          nombre: c.concepto.trim(),
          cantidad: 1,
          precio: numeroDe(c.monto),
        })),
    ];

    const programadoPara = programar && puedeProgramar && programadoISO ? programadoISO : undefined;
    const direccionEntrega: DireccionEntrega | undefined =
      modalidad === "domicilio" && calle.trim()
        ? {
            calle: calle.trim(),
            barrio: barrio.trim() || undefined,
            referencia: referencia.trim() || undefined,
            indicaciones: indicaciones.trim() || undefined,
            ciudad: ciudad.trim() || undefined,
            departamento: departamento.trim() || undefined,
          }
        : undefined;

    const pagaConNum =
      esPagoEnEntrega && Number(pagaCon) > 0 ? Number(pagaCon) : undefined;

    const notasLimpias = [
      modalidad === "en_sitio" && mesa.trim() ? `Mesa: ${mesa.trim()}` : "",
      notas.trim(),
    ].filter(Boolean).join(" · ") || undefined;

    const pedido = pedidosStore.crearPedido({
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      modalidad,
      items: itemsLimpios,
      notas: notasLimpias,
      origen: "operador",
      programadoPara,
      direccionEntrega,
      costoEnvio: modalidad === "domicilio" ? costoEnvioEfectivo : undefined,
      metodoPago,
      pagaCon: pagaConNum,
      repartidor: modalidad === "domicilio" ? repartidorFinal || undefined : undefined,
    });

    // «Confirmar pedido al crearlo» mueve el pedido recién nacido a `confirmado`
    // por la misma puerta que el tablero (`moverAColumna`), que valida la
    // transición y deja el rastro en la auditoría. Si la etapa está apagada en
    // la configuración, el control ni se pinta.
    if (confirmarAlCrear && puedeConfirmar) {
      pedidosStore.moverAColumna(pedido.id, "confirmado");
    }

    // Se relee el pedido: si se confirmó, el estado ya no es el de nacimiento y
    // el comprobante debe decir el que quedó, no el que se pidió.
    const pedidoFinal = pedidosStore.getPedido(pedido.id) ?? pedido;

    const targetChatId = chatId || conversacionesStore.porTelefono(pedido.telefono)?.id;

    setCreated({
      numero: pedidoFinal.numero,
      cliente: pedidoFinal.cliente,
      telefono: pedidoFinal.telefono,
      modalidad: pedidoFinal.modalidad,
      modalidadLabel: pedidosStore.modalidadLabel(pedidoFinal.modalidad),
      metodoPago,
      programadoPara: pedidoFinal.programadoPara,
      creadoEn: pedidoFinal.createdAt,
      estadoLabel: pedidosStore.estadoLabel(pedidoFinal.estado),
      direccion: direccionEntrega
        ? `${direccionEntrega.calle}${direccionEntrega.referencia ? ` (${direccionEntrega.referencia})` : ""}`
        : undefined,
      mesa: modalidad === "en_sitio" && mesa.trim() ? mesa.trim() : undefined,
      total: pedidosStore.totalPedido(pedidoFinal),
      costoEnvio: pedidoFinal.costoEnvio,
      itemsCount: itemsLimpios.length,
      items: pedidoFinal.items,
      chatId: targetChatId,
    });

    setCliente("");
    setTelefono("");
    setModalidad(modalidadesDisponibles[0] ?? "retiro");
    setNotas("");
    setItems([]);
    setCargos([]);
    setBusquedaProducto("");
    setBuscadorAbierto(false);
    setProgramar(false);
    setProgramadoISO(null);
    setConfirmarAlCrear(false);
    setCalle("");
    setBarrio("");
    setReferencia("");
    setIndicaciones("");
    setCiudad("");
    setDepartamento("");
    setCostoEnvio(0);
    // El formulario limpio vuelve a la preferencia del negocio, no a un id fijo.
    setTransporte(transportePorDefecto);
    setMensajero("");
    setMetodoPago(opcionesPago[0]?.id ?? "efectivo");
    setPagaCon("");
    setMesa("");
    setErrors({});
  };

  // ═════════════════════════════════════════════════════════════════════════
  // PANTALLA DE ÉXITO — el comprobante del pedido recién creado
  // ═════════════════════════════════════════════════════════════════════════
  if (created) {
    const urlPago = enlaceDePago(
      pedidosStore.config.datosBancarios,
      created.numero,
      window.location.origin
    );
    const mensajeCobro = mensajeDeCobro(
      pedidosStore.config.datosBancarios,
      created.numero,
      window.location.origin
    );
    const convDestinoId = created.chatId || conversacionesStore.porTelefono(created.telefono)?.id;

    const enviarAlChat = async () => {
      if (!convDestinoId) return;
      const conv = conversacionesStore.getConversacion(convDestinoId);
      if (conv && conv.atencion !== "humano") {
        const opId =
          sessionStore.accessContext.operadorId ??
          sessionStore.accessContext.rolId ??
          "operador";
        conversacionesStore.tomar(convDestinoId, opId);
      }
      const mensajeAEnviar =
        mensajeCobro !== ""
          ? mensajeCobro
          : `¡Hola ${created.cliente}! Tu pedido #${created.numero} fue registrado. Puedes realizar el pago en línea aquí:\n${urlPago}`;
      await conversacionesStore.enviarComoNegocio(convDestinoId, mensajeAEnviar);
      setEnviadoAlChat(true);
    };

    const copiar = (texto: string, marcar: (valor: boolean) => void) => {
      void navigator.clipboard?.writeText(texto);
      marcar(true);
      setTimeout(() => marcar(false), 2000);
    };

    return (
      <div className="flex w-full justify-center">
        <PageMeta
          title={`Pedido ${created.numero}`}
          description="Comprobante del pedido registrado"
        />

        <div className="w-full max-w-[940px] rounded-[28px] bg-white p-6 text-[#212121] shadow-xl shadow-black/5 ring-1 ring-[#ECECEC] dark:bg-[#1A1A1A] dark:text-white dark:ring-white/[0.06] sm:p-8 lg:min-h-[540px] lg:p-10 font-sans">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-10">
            {/* ══════════════════════════════════════════════════════════════
                IZQUIERDA — identidad, detalle y acciones
               ══════════════════════════════════════════════════════════════ */}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#FF3F1A] text-[14px] font-bold text-white shadow-sm shadow-[#FF3F1A]/20">
                  N
                </span>
                <span className="truncate text-[14px] font-bold text-[#190088] dark:text-white">{origenDespacho}</span>
              </div>

              <h1 className="mt-7 text-[36px] font-bold leading-tight tracking-tight text-[#190088] dark:text-white">
                ¡Pedido registrado!
              </h1>

              <p className="mt-4 text-[14px] font-bold text-[#190088] dark:text-white">Hola {created.cliente.split(" ")[0]},</p>
              <p className="mt-1.5 max-w-[38ch] text-[14px] font-light leading-relaxed text-[#212121]/75 dark:text-white/60">
                El pedido entró al tablero en estado{" "}
                <span className="font-bold text-[#190088] dark:text-[#97D6DF]">{created.estadoLabel}</span>.
                Puedes enviarle el comprobante al cliente o copiar el enlace de pago.
              </p>

              <p className="mt-6 text-[16px] font-bold text-[#190088] dark:text-white">Detalle del pedido #{created.numero}</p>

              <div className="mt-3 space-y-2.5">
                <FilaDetalle icono={UserIcon} etiqueta="Cliente">
                  {created.cliente}
                  <span className="text-[#212121]/40 dark:text-white/35"> · {created.telefono}</span>
                </FilaDetalle>

                <FilaDetalle icono={CalendarDaysIcon} etiqueta="Fecha">
                  {formatFechaHora(created.creadoEn)}
                </FilaDetalle>

                <FilaDetalle icono={MapPinIcon} etiqueta="Entrega">
                  {created.direccion ?? created.modalidadLabel}
                  {created.mesa ? ` · ${created.mesa}` : ""}
                </FilaDetalle>

                <FilaDetalle icono={CreditCardIcon} etiqueta="Pago">
                  {pedidosStore.medioPagoLabel(created.metodoPago)}
                </FilaDetalle>
              </div>

              {/* Acciones */}
              <div className="mt-6 space-y-2">
                {convDestinoId ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await enviarAlChat();
                      navigate(`/pedidos/chats?id=${convDestinoId}`);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#97D6DF] py-3 text-[14px] font-bold text-[#190088] transition-colors hover:bg-[#97D6DF]/80 cursor-pointer shadow-sm shadow-[#97D6DF]/30"
                  >
                    <PaperAirplaneIcon className="size-4" aria-hidden="true" />
                    {enviadoAlChat ? "Enviado · volver al chat" : "Enviar comprobante al chat"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => copiar(mensajeCobro || urlPago, setCopiadoLink)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#97D6DF] py-3 text-[14px] font-bold text-[#190088] transition-colors hover:bg-[#97D6DF]/80 cursor-pointer shadow-sm shadow-[#97D6DF]/30"
                  >
                    <ClipboardDocumentIcon className="size-4" aria-hidden="true" />
                    {copiadoLink ? "Copiado" : "Copiar enlace de pago"}
                  </button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreated(null);
                      setEnviadoAlChat(false);
                      setCopiadoLink(false);
                      setCopiadoCobro(false);
                    }}
                    className="rounded-xl border border-[#ECECEC] py-2.5 text-[12px] font-bold text-[#212121] transition-colors hover:border-[#FF3F1A] hover:text-[#FF3F1A] dark:border-white/10 dark:text-white cursor-pointer"
                  >
                    Crear otro pedido
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/pedidos")}
                    className="rounded-xl border border-[#ECECEC] py-2.5 text-[12px] font-bold text-[#212121] transition-colors hover:border-[#97D6DF] hover:text-[#190088] dark:border-white/10 dark:text-white cursor-pointer"
                  >
                    Ver tablero
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
                  {convDestinoId && (
                    <button
                      type="button"
                      onClick={() => copiar(urlPago, setCopiadoLink)}
                      className="text-[12px] font-bold text-[#212121]/60 transition-colors hover:text-[#190088] dark:text-white/40 dark:hover:text-white cursor-pointer"
                    >
                      {copiadoLink ? "✓ Enlace copiado" : "Copiar enlace de pago"}
                    </button>
                  )}
                  {mensajeCobro !== "" && (
                    <button
                      type="button"
                      onClick={() => copiar(mensajeCobro, setCopiadoCobro)}
                      className="text-[12px] font-bold text-[#212121]/60 transition-colors hover:text-[#190088] dark:text-white/40 dark:hover:text-white cursor-pointer"
                    >
                      {copiadoCobro ? "✓ Mensaje copiado" : "Copiar mensaje de cobro"}
                    </button>
                  )}
                </div>
              </div>

              {/* QR de cobro en el local */}
              {created.modalidad === "en_sitio" && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#ECECEC] p-3 dark:border-white/10">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR del pedido ${created.numero}`}
                      className="size-20 shrink-0 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-[#ECECEC]/60 text-[12px] font-light text-[#212121]/40 dark:bg-white/[0.06]">
                      QR
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-[#190088] dark:text-white">Código QR de cobro</p>
                    <p className="text-[12px] font-light text-[#212121]/60 dark:text-white/40">
                      Muéstralo en caja para cobrar este pedido.
                    </p>
                    {qrDataUrl && (
                      <a
                        href={qrDataUrl}
                        download={`QR-${created.numero}.png`}
                        className="mt-1 inline-flex items-center gap-1 text-[12px] font-bold text-[#FF3F1A] hover:underline"
                      >
                        <ArrowDownTrayIcon className="size-3.5" aria-hidden="true" />
                        Descargar QR
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════════════════════════
                DERECHA — los ítems y el total
               ══════════════════════════════════════════════════════════════ */}
            <div className="flex min-w-0 flex-col rounded-2xl bg-[#F7F7F5] p-5 ring-1 ring-[#ECECEC] dark:bg-white/[0.04] dark:ring-white/[0.04]">
              <div className="flex items-center gap-4 pb-3 text-[12px] font-bold text-[#190088] dark:text-white/60">
                <span className="size-14 shrink-0" />
                <span className="flex-1">Producto</span>
                <span className="w-8 text-center">Cant.</span>
                <span className="w-20 text-right">Precio</span>
              </div>

              <ul className="divide-y divide-[#ECECEC] dark:divide-white/[0.06]">
                {(created.items ?? []).map((it, idx) => (
                  <li key={idx} className="flex items-center gap-4 py-3.5">
                    <img
                      src={asignarFotoInteligente(it.nombre)}
                      alt=""
                      loading="lazy"
                      className="size-14 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold text-[#212121] dark:text-white">{it.nombre}</p>
                      <p className="truncate text-[12px] font-light text-[#212121]/60 dark:text-white/40">
                        {money(it.precio ?? 0)} c/u
                      </p>
                    </div>
                    <span className="w-8 shrink-0 text-center text-[12px] font-bold tabular-nums text-[#212121] dark:text-white">
                      {it.cantidad}
                    </span>
                    <span className="w-20 shrink-0 text-right text-[14px] font-bold tabular-nums text-[#212121] dark:text-white">
                      {money((it.precio ?? 0) * it.cantidad)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto border-t border-[#ECECEC] pt-4 dark:border-white/10">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[16px] font-bold text-[#190088] dark:text-white">Total</span>
                  <span className="text-[24px] font-bold tabular-nums text-[#190088] dark:text-[#97D6DF]">
                    {money(created.total ?? 0)}
                  </span>
                </div>
                {created.costoEnvio ? (
                  <div className="mt-1">
                    <span className="inline-block rounded-md bg-[#EFE6D3] px-2 py-0.5 text-[12px] font-bold text-[#212121]">
                      Envío incluido
                    </span>
                  </div>
                ) : (
                  <p className="mt-1 text-[12px] font-light text-[#212121]/50 dark:text-white/30">
                    {created.itemsCount} ítem{created.itemsCount === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VISTA PRINCIPAL — tarjeta compacta: captura a la izquierda, pedido a la derecha
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex w-full justify-center">
      <PageMeta
        title="Nuevo pedido"
        description="Registra un pedido manual con productos, cliente y despacho"
      />

      <div className="w-full max-w-[1120px] rounded-[28px] bg-white dark:bg-[#1A1A1A] p-6 text-[#212121] dark:text-white shadow-xl shadow-black/5 ring-1 ring-[#ECECEC] dark:ring-white/[0.06] sm:p-7 lg:p-8 font-sans">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] lg:gap-10">
          {/* ══════════════════════════════════════════════════════════════════
              IZQUIERDA — identidad y datos del pedido
             ══════════════════════════════════════════════════════════════════ */}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#FF3F1A] text-[14px] font-bold text-white shadow-sm shadow-[#FF3F1A]/20">
                N
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-bold text-[#190088] dark:text-white">{origenDespacho}</p>
                <p className="truncate text-[12px] font-light text-[#212121]/60 dark:text-white/40">
                  Bodega de origen · {pais}
                </p>
              </div>
            </div>

            <h1 className="mt-6 text-[36px] font-bold leading-tight tracking-tight text-[#190088] dark:text-white">
              Nuevo pedido
            </h1>
            <p className="mt-2 max-w-[40ch] text-[14px] font-light leading-relaxed text-[#212121]/75 dark:text-white/60">
              Completa los datos del cliente y elige cómo se entrega. Los productos y el total se
              arman a la derecha.
            </p>

            <div className="mt-5 inline-flex rounded-xl bg-[#ECECEC] dark:bg-white/[0.06] p-1">
              {modalidadesDisponibles.map((m) => {
                const activo = modalidad === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => cambiarModalidad(m)}
                    aria-pressed={activo}
                    className={`rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors cursor-pointer ${
                      activo
                        ? "bg-[#FF3F1A] text-white shadow-sm shadow-[#FF3F1A]/25"
                        : "text-[#212121]/70 dark:text-white/60 hover:text-[#190088] dark:hover:text-white"
                    }`}
                  >
                    {pedidosStore.modalidadLabel(m)}
                  </button>
                );
              })}
            </div>

            {/* ── Cliente ── */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Campo
                id="telefono"
                etiqueta="Teléfono"
                requerido
                error={errors.telefono}
              >
                <div className="flex items-stretch gap-2">
                  <span className="inline-flex shrink-0 items-center rounded-xl border border-[#ECECEC] dark:border-white/10 bg-[#FAFAF9] dark:bg-white/[0.03] px-2.5 text-[12px] font-bold text-[#190088] dark:text-white/60">
                    {prefijo}
                  </span>
                  <input
                    id="telefono"
                    inputMode="tel"
                    value={telefono}
                    onChange={(e) => {
                      setTelefono(e.target.value);
                      if (errors.telefono) setErrors((prev) => ({ ...prev, telefono: "" }));
                    }}
                    placeholder="300 123 4567"
                    className={campo(errors.telefono)}
                  />
                </div>
              </Campo>

              <Campo
                id="cliente"
                etiqueta="Nombre y apellido"
                requerido
                error={errors.cliente}
              >
                <input
                  id="cliente"
                  value={cliente}
                  onChange={(e) => {
                    setCliente(e.target.value);
                    if (errors.cliente) setErrors((prev) => ({ ...prev, cliente: "" }));
                  }}
                  placeholder="Ej: Juan Pérez"
                  className={campo(errors.cliente)}
                />
              </Campo>
            </div>

            {/* ── Dirección ── */}
            {modalidad === "domicilio" && (
              <div className="mt-5 space-y-3 border-t border-[#ECECEC] dark:border-white/10 pt-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <MapPinIcon className="size-4 text-[#190088] dark:text-[#97D6DF]" />
                    <h2 className="text-[14px] font-bold text-[#190088] dark:text-white">Dirección de entrega</h2>
                  </div>
                  {direccionesGuardadas.filter((d) => d.calle.trim() !== calle.trim()).length > 0 && (
                    <span className="text-[12px] font-light text-[#212121]/50 dark:text-white/40">Usar guardada</span>
                  )}
                </div>

                {direccionesGuardadas.filter((d) => d.calle.trim() !== calle.trim()).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {direccionesGuardadas
                      .filter((d) => d.calle.trim() !== calle.trim())
                      .map((dir, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCalle(dir.calle);
                            setBarrio(dir.barrio ?? "");
                            setReferencia(dir.referencia ?? "");
                            setIndicaciones(dir.indicaciones ?? "");
                            setCiudad(dir.ciudad ?? "");
                            setDepartamento(dir.departamento ?? "");
                            if (errors.calle) setErrors((prev) => ({ ...prev, calle: "" }));
                          }}
                          className="max-w-full truncate rounded-lg border border-[#ECECEC] dark:border-white/10 bg-[#EFE6D3]/60 dark:bg-white/[0.04] px-2 py-1 text-[12px] font-normal text-[#212121] dark:text-white/80 transition-colors hover:border-[#97D6DF] hover:text-[#190088] dark:hover:text-white cursor-pointer"
                        >
                          {dir.calle}
                        </button>
                      ))}
                  </div>
                )}

                <Campo id="calle" etiqueta="Dirección" requerido error={errors.calle}>
                  <input
                    id="calle"
                    value={calle}
                    onChange={(e) => {
                      setCalle(e.target.value);
                      if (errors.calle) setErrors((prev) => ({ ...prev, calle: "" }));
                    }}
                    placeholder="Ej: Cra 43A # 1-50"
                    className={campo(errors.calle)}
                  />
                </Campo>

                <div className="grid grid-cols-2 gap-3">
                  <Campo id="barrio" etiqueta="Barrio">
                    <input
                      id="barrio"
                      value={barrio}
                      onChange={(e) => setBarrio(e.target.value)}
                      placeholder="Ej: Laureles"
                      className={campo()}
                    />
                  </Campo>
                  <Campo id="referencia" etiqueta="Referencia">
                    <input
                      id="referencia"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      placeholder="Torre, apto"
                      className={campo()}
                    />
                  </Campo>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Campo id="departamento" etiqueta="Departamento">
                    {esColombia ? (
                      <select
                        id="departamento"
                        value={departamento}
                        onChange={(e) => setDepartamento(e.target.value)}
                        className={`${campo()} appearance-none bg-white dark:bg-[#242424]`}
                      >
                        <option value="">Selecciona</option>
                        {DEPARTAMENTOS_CO.map((d) => (
                          <option key={d} value={d} className="bg-white dark:bg-[#242424] text-[#212121] dark:text-white">
                            {d}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="departamento"
                        value={departamento}
                        onChange={(e) => setDepartamento(e.target.value)}
                        placeholder="Estado"
                        className={campo()}
                      />
                    )}
                  </Campo>
                  <Campo id="ciudad" etiqueta="Ciudad">
                    <input
                      id="ciudad"
                      value={ciudad}
                      onChange={(e) => setCiudad(e.target.value)}
                      placeholder="Ej: Cali"
                      className={campo()}
                    />
                  </Campo>
                </div>

                <Campo id="indicaciones" etiqueta="Información adicional">
                  <textarea
                    id="indicaciones"
                    rows={2}
                    value={indicaciones}
                    onChange={(e) => setIndicaciones(e.target.value)}
                    placeholder="Torre, color de fachada, con quién dejar el paquete..."
                    className={`${campo()} resize-none`}
                  />
                </Campo>
              </div>
            )}

            {/* ── Mesa ── */}
            {modalidad === "en_sitio" && pedidosStore.tieneCapacidad("table_service") && (
              <div className="mt-3 border-t border-[#ECECEC] dark:border-white/10 pt-3">
                <p className="text-[14px] font-bold text-[#190088] dark:text-white">Ubicación en salón</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {["Mesa 1", "Mesa 2", "Mesa 3", "Barra", "Terraza"].map((mOpt) => (
                    <button
                      key={mOpt}
                      type="button"
                      onClick={() => setMesa(mOpt)}
                      className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-bold transition-colors cursor-pointer ${
                        mesa === mOpt
                          ? "border-[#FF3F1A] bg-[#FF3F1A] text-white"
                          : "border-[#ECECEC] dark:border-white/10 bg-[#FAFAF9] dark:bg-white/[0.04] text-[#212121]/70 dark:text-white/60 hover:text-[#190088] hover:border-[#97D6DF] dark:hover:text-white"
                      }`}
                    >
                      {mOpt}
                    </button>
                  ))}
                  <input
                    value={mesa}
                    onChange={(e) => setMesa(e.target.value)}
                    placeholder="Otra"
                    className={`${campo()} w-24`}
                  />
                </div>
              </div>
            )}


            {/* ── Notas ── */}
            <div className="mt-3 border-t border-[#ECECEC] dark:border-white/10 pt-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <ClipboardDocumentIcon className="size-4 text-[#190088] dark:text-[#97D6DF]" />
                <h2 className="text-[14px] font-bold text-[#190088] dark:text-white">Notas del pedido</h2>
              </div>
              <Campo id="notas" etiqueta="">
                <textarea
                  id="notas"
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: Sin cebolla, llamar antes de llegar..."
                  className={`${campo()} resize-none`}
                />
              </Campo>
            </div>
            {/* ── Pago ── */}
            <div className="mt-3 border-t border-[#ECECEC] dark:border-white/10 pt-3">
              <div className="flex items-center gap-1.5">
                <CreditCardIcon className="size-4 text-[#190088] dark:text-[#97D6DF]" />
                <h2 className="text-[14px] font-bold text-[#190088] dark:text-white">Método de pago</h2>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                {opcionesPago.map((op) => {
                  const activo = metodoPago === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setMetodoPago(op.id)}
                      aria-pressed={activo}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                        activo
                          ? "border-[#FF3F1A] bg-[#FF3F1A]/10 text-[#212121] dark:text-white ring-1 ring-[#FF3F1A]"
                          : "border-[#ECECEC] dark:border-white/10 bg-[#FAFAF9] dark:bg-white/[0.03] text-[#212121] dark:text-white hover:border-[#97D6DF]"
                      }`}
                    >
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          activo ? "border-[#FF3F1A]" : "border-[#ECECEC] dark:border-white/25"
                        }`}
                      >
                        {activo && <span className="size-2 rounded-full bg-[#FF3F1A]" />}
                      </span>
                      <span className="truncate text-[12px] font-bold">{op.label}</span>
                    </button>
                  );
                })}
              </div>

              {metodoPago === "transferencia" && transferencia && (
                <div className="mt-2 rounded-xl border border-[#ECECEC] dark:border-white/10 bg-[#FAFAF9] dark:bg-white/[0.03] px-3 py-2 text-[12px]">
                  {transferencia.cuentas.map((c) => (
                    <div key={c.etiqueta} className="flex items-center justify-between gap-3">
                      <span className="font-light text-[#212121]/60 dark:text-white/40">{c.etiqueta}</span>
                      <span className="select-all font-bold text-[#190088] dark:text-white">{c.valor}</span>
                    </div>
                  ))}
                </div>
              )}

              {esPagoEnEntrega && (
                <div className="mt-2 flex items-end gap-3">
                  <Campo id="pagaCon" etiqueta="Paga con" error={errors.pagaCon} className="flex-1">
                    <input
                      id="pagaCon"
                      inputMode="numeric"
                      value={pagaCon}
                      onChange={(e) => {
                        setPagaCon(e.target.value);
                        if (errors.pagaCon) setErrors((prev) => ({ ...prev, pagaCon: "" }));
                      }}
                      placeholder={`${totalPedido > 0 ? Math.ceil(totalPedido / 10000) * 10000 : 50000}`}
                      className={campo(errors.pagaCon)}
                    />
                  </Campo>
                  {Number(pagaCon) > 0 && (
                    <p className="pb-3 text-[12px] font-bold text-[#190088] dark:text-[#97D6DF]">
                      {Number(pagaCon) >= totalPedido
                        ? `Vuelto ${money(Number(pagaCon) - totalPedido)}`
                        : `Faltan ${money(totalPedido - Number(pagaCon))}`}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Transportadora ── */}
            {modalidad === "domicilio" && (
              <div className="mt-3 border-t border-[#ECECEC] dark:border-white/10 pt-3">
                <div className="flex items-center gap-1.5">
                  <TruckIcon className="size-4 text-[#190088] dark:text-[#97D6DF]" />
                  <h2 className="text-[14px] font-bold text-[#190088] dark:text-white">Transportadora</h2>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  {transportadorasDisponiblesHoy.length === 0 && (
                    <p className="col-span-2 rounded-xl border border-dashed border-[#ECECEC] px-3 py-2.5 text-[12px] font-normal leading-snug text-[#212121]/60 dark:border-white/15 dark:text-white/50">
                      No tienes transportadoras habilitadas. Enciende al menos una en Ajustes de
                      pedidos → Transportadoras para poder asignar el despacho.
                    </p>
                  )}
                  {transportadorasDisponiblesHoy.map((t) => {
                    const activo = transporte === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTransporte(t.id)}
                        aria-pressed={activo}
                        className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition-colors cursor-pointer ${
                          activo
                            ? "border-[#FF3F1A] bg-[#FF3F1A]/10 text-[#212121] dark:text-white ring-1 ring-[#FF3F1A]"
                            : "border-[#ECECEC] dark:border-white/10 bg-[#FAFAF9] dark:bg-white/[0.03] text-[#212121] dark:text-white hover:border-[#97D6DF]"
                        }`}
                      >
                        <LogoTransportadora transportadora={t} />
                        <span className="truncate text-[12px] font-bold">{t.nombre}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-3">
                  {transporte === "propio" && (
                    <Campo id="mensajero" etiqueta="Mensajero">
                      <input
                        id="mensajero"
                        value={mensajero}
                        onChange={(e) => setMensajero(e.target.value)}
                        placeholder="Ej: Moto 04"
                        className={campo()}
                      />
                    </Campo>
                  )}
                  <Campo id="costoEnvio" etiqueta="Flete (COP)">
                    <input
                      id="costoEnvio"
                      inputMode="numeric"
                      value={costoEnvio}
                      onChange={(e) => setCostoEnvio(Math.max(0, Number(e.target.value) || 0))}
                      className={campo()}
                    />
                  </Campo>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              DERECHA — el pedido: productos, cargos y total
             ══════════════════════════════════════════════════════════════════ */}
          <div className="min-w-0">
            <div className="flex h-full flex-col rounded-2xl bg-[#F7F7F5] dark:bg-white/[0.04] p-5 ring-1 ring-[#ECECEC] dark:ring-white/[0.06]">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[16px] font-bold text-[#190088] dark:text-white">Resumen del pedido</p>
                <span className="text-[12px] font-light text-[#212121]/60 dark:text-white/40">
                  {items.length === 0
                    ? "Sin productos"
                    : `${items.reduce((acc, it) => acc + it.cantidad, 0)} ítem${
                        items.reduce((acc, it) => acc + it.cantidad, 0) === 1 ? "" : "s"
                      }`}
                </span>
              </div>

              {/* Ficha en vivo: Cliente y dirección, Método de pago, Bodega */}
              <div className="mt-3 space-y-2.5 rounded-xl bg-white dark:bg-white/[0.03] p-3.5 border border-[#ECECEC] dark:border-white/10">
                <div>
                  <div className="flex items-center gap-1.5 text-[14px] font-bold text-[#190088] dark:text-white">
                    <UserIcon className="size-4 text-[#190088] dark:text-[#97D6DF]" />
                    <span>Cliente y dirección</span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-[12px]">
                    <li className="flex items-center gap-1.5">
                      <span className="size-1 rounded-full bg-[#FF3F1A]" />
                      <span className="font-bold text-[#212121] dark:text-white">
                        {cliente.trim() || "Cliente sin registrar"}
                      </span>
                    </li>
                    {telefono && (
                      <li className="flex items-center gap-1.5 text-[#212121]/70 dark:text-white/60">
                        <span className="size-1 rounded-full bg-[#ECECEC] dark:bg-white/30" />
                        <span className="font-light">{prefijo} {telefono}</span>
                      </li>
                    )}
                    {modalidad === "domicilio" ? (
                      <li className="flex items-start gap-1.5 text-[#212121]/70 dark:text-white/60">
                        <span className="mt-1 size-1 shrink-0 rounded-full bg-[#ECECEC] dark:bg-white/30" />
                        <span className="font-light truncate">
                          {calle.trim()
                            ? `${calle}${barrio ? `, ${barrio}` : ""}${ciudad ? `, ${ciudad}` : ""}${departamento ? ` (${departamento})` : ""}`
                            : "Dirección pendiente"}
                        </span>
                      </li>
                    ) : (
                      <li className="flex items-center gap-1.5 text-[#212121]/70 dark:text-white/60">
                        <span className="size-1 rounded-full bg-[#ECECEC] dark:bg-white/30" />
                        <span className="font-light">
                          {modalidad === "en_sitio"
                            ? mesa
                              ? `En sitio · ${mesa}`
                              : "Consumo en el local"
                            : "Retiro en tienda"}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                <div className="border-t border-[#ECECEC] dark:border-white/10 pt-2 grid grid-cols-2 gap-2 text-[12px]">
                  <div>
                    <span className="text-[12px] font-bold text-[#190088] dark:text-white block">
                      Método de pago
                    </span>
                    <span className="font-normal text-[#212121]/80 dark:text-white/70 block truncate">
                      {pagoLabel || "Sin definir"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[12px] font-bold text-[#190088] dark:text-white block">
                      Bodega de origen
                    </span>
                    <span className="font-normal text-[#212121]/80 dark:text-white/70 block truncate">
                      {origenDespacho}
                    </span>
                  </div>
                </div>

                {modalidad === "domicilio" && (
                  <div className="border-t border-[#ECECEC] dark:border-white/10 pt-2 flex items-center justify-between text-[12px]">
                    <span className="font-bold text-[#190088] dark:text-white">
                      Transportadora
                    </span>
                    <span className="font-normal text-[#212121]/80 dark:text-white/70">
                      {repartidorFinal || "Sin asignar"} {costoEnvioEfectivo > 0 ? `· ${money(costoEnvioEfectivo)}` : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Buscador */}
              <div className="relative mt-3">
                <div
                  className={`flex items-center gap-2 rounded-xl border bg-white dark:bg-white/[0.05] px-3 py-2.5 transition-colors ${
                    buscadorAbierto ? "border-[#97D6DF] ring-2 ring-[#97D6DF]/20" : "border-[#ECECEC] dark:border-white/10"
                  }`}
                >
                  <PlusIcon className="size-4 shrink-0 text-[#212121]/40 dark:text-white/40" aria-hidden="true" />
                  <input
                    type="text"
                    value={busquedaProducto}
                    onChange={(e) => {
                      setBusquedaProducto(e.target.value);
                      setBuscadorAbierto(true);
                    }}
                    onFocus={() => setBuscadorAbierto(true)}
                    placeholder="Añade un producto"
                    aria-label="Buscar producto en el catálogo"
                    className="w-full bg-transparent text-[14px] font-normal text-[#212121] dark:text-white outline-hidden placeholder:text-[#212121]/35 dark:placeholder:text-white/25"
                  />
                  {busquedaProducto && (
                    <button
                      type="button"
                      onClick={() => setBusquedaProducto("")}
                      aria-label="Limpiar búsqueda"
                      className="shrink-0 text-[#212121]/40 hover:text-[#FF3F1A] dark:text-white/40 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <XMarkIcon className="size-4" />
                    </button>
                  )}
                </div>

                {buscadorAbierto && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setBuscadorAbierto(false)} />
                    <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[#ECECEC] dark:border-white/10 bg-white dark:bg-[#242424] py-1 shadow-2xl shadow-black/20">
                      {resultadosCatalogo.length === 0 ? (
                        <p className="px-3 py-6 text-center text-[12px] font-light text-[#212121]/60 dark:text-white/40">
                          {tieneCatalogo
                            ? "Ningún producto coincide con la búsqueda."
                            : "Tu catálogo está vacío. Cárgalo desde Catálogo."}
                        </p>
                      ) : (
                        resultadosCatalogo.map((cat) => {
                          const fotoUrl =
                            (cat as any).imagen ||
                            asignarFotoInteligente(cat.nombre, (cat as any).categoria);
                          const variantes = cat.variantesDisponibles ?? [];
                          return (
                            <div
                              key={cat.id}
                              className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-[#ECECEC]/60 dark:hover:bg-white/[0.06]"
                              onClick={() => agregarItemDesdeCatalogo(cat)}
                            >
                              <img
                                src={fotoUrl}
                                alt=""
                                loading="lazy"
                                className="size-9 shrink-0 rounded-lg object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-normal text-[#212121] dark:text-white">
                                  {cat.nombre}
                                </p>
                                <p className="truncate text-[12px] font-light text-[#212121]/60 dark:text-white/40">
                                  {(cat as any).categoria || "Sin categoría"}
                                </p>
                              </div>
                              {variantes.length > 0 ? (
                                <div
                                  className="flex flex-wrap items-center justify-end gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {variantes.map((v) => (
                                    <button
                                      key={v}
                                      type="button"
                                      onClick={() => agregarItemDesdeCatalogo(cat, v)}
                                      className="rounded-md border border-[#ECECEC] dark:border-white/15 px-1.5 py-0.5 text-[12px] font-bold text-[#190088] dark:text-[#97D6DF] transition-colors hover:border-[#97D6DF] hover:bg-[#97D6DF]/10 cursor-pointer"
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="shrink-0 text-[14px] font-bold text-[#190088] dark:text-[#97D6DF]">
                                  {money(cat.precio)}
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Tabla */}
              <div className="mt-4 flex-1">
                <div className="flex items-center gap-3 pb-2 text-[12px] font-bold text-[#190088] dark:text-white/60">
                  <span className="size-11 shrink-0" />
                  <span className="flex-1">Producto</span>
                  <span className="w-[70px] text-center">Cantidad</span>
                  <span className="w-[74px] text-right">Precio</span>
                  <span className="size-4 shrink-0" />
                </div>

                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#ECECEC] dark:border-white/10 py-12">
                    <ShoppingBagIcon className="size-6 text-[#212121]/20 dark:text-white/20" aria-hidden="true" />
                    <p className="mt-2 text-[14px] font-normal text-[#212121]/70 dark:text-white/60">Aún sin productos</p>
                    <p className="text-[12px] font-light text-[#212121]/50 dark:text-white/40">
                      Búscalos arriba y agrégalos al pedido.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-[#ECECEC] dark:divide-white/[0.06]">
                    {items.map((it, idx) => (
                      <li
                        key={`${it.nombre}-${it.variante ?? ""}-${idx}`}
                        className="flex items-center gap-3 py-3"
                      >
                        <img
                          src={it.imagen || asignarFotoInteligente(it.nombre)}
                          alt=""
                          loading="lazy"
                          className="size-11 shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-bold text-[#212121] dark:text-white">{it.nombre}</p>
                          <p className="truncate text-[12px] font-light text-[#212121]/60 dark:text-white/40">
                            {it.variante ? it.variante : `${money(it.precio ?? 0)} c/u`}
                          </p>
                        </div>

                        <div className="flex w-[70px] shrink-0 items-center justify-between rounded-lg bg-[#ECECEC] dark:bg-white/[0.06] px-1 py-1">
                          <button
                            type="button"
                            onClick={() => modificarCantidad(idx, -1)}
                            aria-label={`Quitar una unidad de ${it.nombre}`}
                            className="rounded p-0.5 text-[#212121]/70 dark:text-white/60 transition-colors hover:text-[#FF3F1A] cursor-pointer"
                          >
                            <MinusIcon className="size-3.5" />
                          </button>
                          <span className="text-[12px] font-bold tabular-nums text-[#212121] dark:text-white">
                            {it.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => modificarCantidad(idx, 1)}
                            aria-label={`Añadir una unidad de ${it.nombre}`}
                            className="rounded p-0.5 text-[#212121]/70 dark:text-white/60 transition-colors hover:text-[#FF3F1A] cursor-pointer"
                          >
                            <PlusIcon className="size-3.5" />
                          </button>
                        </div>

                        <span className="w-[74px] shrink-0 text-right text-[14px] font-bold tabular-nums text-[#212121] dark:text-white">
                          {money((it.precio ?? 0) * it.cantidad)}
                        </span>

                        <button
                          type="button"
                          onClick={() => eliminarItem(idx)}
                          aria-label={`Quitar ${it.nombre} del pedido`}
                          className="shrink-0 text-[#212121]/40 dark:text-white/30 transition-colors hover:text-[#FF3F1A] cursor-pointer"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Cargos */}
              <div className="mt-3 border-t border-[#ECECEC] dark:border-white/[0.06] pt-3">
                {cargos.length === 0 ? (
                  <button
                    type="button"
                    onClick={agregarCargo}
                    className="flex w-full items-center gap-2 rounded-lg border border-dashed border-[#ECECEC] dark:border-white/10 px-2.5 py-2 text-[12px] font-normal text-[#212121]/70 dark:text-white/60 transition-colors hover:border-[#97D6DF] hover:text-[#190088] dark:hover:text-white cursor-pointer"
                  >
                    <PlusIcon className="size-3.5" />
                    Añadir un cargo (empaque, instalación…)
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-bold text-[#190088] dark:text-white">Cargos adicionales</span>
                      <button
                        type="button"
                        onClick={agregarCargo}
                        aria-label="Añadir otro cargo"
                        className="text-[#212121]/40 dark:text-white/40 transition-colors hover:text-[#FF3F1A] cursor-pointer"
                      >
                        <PlusIcon className="size-4" />
                      </button>
                    </div>
                    {cargos.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          value={c.concepto}
                          onChange={(e) => editarCargo(idx, { concepto: e.target.value })}
                          placeholder="Concepto"
                          aria-label={`Concepto del cargo ${idx + 1}`}
                          className={`${campo()} flex-1`}
                        />
                        <input
                          inputMode="numeric"
                          value={c.monto}
                          onChange={(e) => editarCargo(idx, { monto: e.target.value })}
                          placeholder="0"
                          aria-label={`Valor del cargo ${idx + 1}`}
                          className={`${campo()} w-24 shrink-0 text-right`}
                        />
                        <button
                          type="button"
                          onClick={() => eliminarCargo(idx)}
                          aria-label={`Quitar el cargo ${idx + 1}`}
                          className="shrink-0 text-[#212121]/40 dark:text-white/30 transition-colors hover:text-[#FF3F1A] cursor-pointer"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>


              {/* Totales */}
              <div className="mt-4 space-y-1.5 border-t border-[#ECECEC] dark:border-white/10 pt-4 text-[12px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-light text-[#212121]/70 dark:text-white/60">Precio de venta</span>
                  <span className="font-bold tabular-nums text-[#212121] dark:text-white">
                    {money(subtotalProductos)}
                  </span>
                </div>
                {subtotalCargos > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-light text-[#212121]/70 dark:text-white/60">Cargos adicionales</span>
                    <span className="font-bold tabular-nums text-[#212121] dark:text-white">
                      {money(subtotalCargos)}
                    </span>
                  </div>
                )}
                {modalidad === "domicilio" && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-light text-[#212121]/70 dark:text-white/60">Costo de envío</span>
                    <span className="font-bold tabular-nums text-[#212121] dark:text-white">
                      {money(costoEnvioEfectivo)}
                    </span>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-3 border-t border-[#ECECEC] dark:border-white/10 pt-3">
                  <span className="text-[16px] font-bold text-[#190088] dark:text-white">Total</span>
                  <span className="text-[24px] font-bold tabular-nums text-[#190088] dark:text-[#97D6DF]">
                    {money(totalPedido)}
                  </span>
                </div>
                {modalidad === "domicilio" && costoEnvioEfectivo > 0 && (
                  <div className="text-right">
                    <span className="inline-block rounded-md bg-[#EFE6D3] px-2 py-0.5 text-[12px] font-bold text-[#212121]">
                      Envío incluido
                    </span>
                  </div>
                )}
              </div>

              {/* Opciones */}
              <div className="mt-3 space-y-2.5 border-t border-[#ECECEC] dark:border-white/10 pt-3">
                {puedeConfirmar && (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={confirmarAlCrear}
                    onClick={() => setConfirmarAlCrear((v) => !v)}
                    className="flex w-full items-center gap-2 text-left cursor-pointer"
                  >
                    <span
                      className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
                        confirmarAlCrear ? "border-[#FF3F1A] bg-[#FF3F1A]" : "border-[#ECECEC] dark:border-white/25"
                      }`}
                    >
                      {confirmarAlCrear && <CheckIcon className="size-3 text-white" />}
                    </span>
                    <span className="text-[12px] font-normal text-[#212121]/80 dark:text-white/70">
                      Confirmar pedido al crearlo
                    </span>
                  </button>
                )}

                {puedeProgramar && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] font-normal text-[#212121]/80 dark:text-white/70">
                      Programar para más tarde
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={programar}
                      aria-label="Programar para más tarde"
                      onClick={() => {
                        const siguiente = !programar;
                        setProgramar(siguiente);
                        if (siguiente && !programadoISO) setShowProgramar(true);
                        if (!siguiente) setErrors((prev) => ({ ...prev, programado: "" }));
                      }}
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer ${
                        programar ? "bg-[#FF3F1A]" : "bg-[#ECECEC] dark:bg-white/15"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 size-4 rounded-full bg-white transition-all ${
                          programar ? "left-[18px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                )}

                {programar && (
                  <button
                    type="button"
                    onClick={() => setShowProgramar(true)}
                    className="w-full rounded-lg border border-[#97D6DF]/50 bg-[#97D6DF]/15 px-2.5 py-1.5 text-[12px] font-bold text-[#190088] dark:text-[#97D6DF] transition-colors hover:bg-[#97D6DF]/25 cursor-pointer"
                  >
                    {programadoISO ? formatFechaHora(programadoISO) : "Elegir fecha y hora"}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleCreate}
                disabled={!puedeCrear}
                className="mt-4 w-full rounded-xl bg-[#FF3F1A] py-3.5 text-[16px] font-bold text-white transition-all hover:bg-[#FF3F1A]/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#ECECEC] dark:disabled:bg-white/10 disabled:text-[#212121]/30 dark:disabled:text-white/30 cursor-pointer shadow-md shadow-[#FF3F1A]/20"
              >
                {programar ? "Programar pedido" : "Crear pedido"}
              </button>

              {!puedeCrear && (
                <p className="mt-2 text-center text-[12px] font-normal text-[#FF3F1A]">
                  {motivoSinPermiso("orders.create")}
                </p>
              )}

              {Object.keys(errors).length > 0 && (
                <p className="mt-2 text-center text-[12px] font-bold text-[#FF3F1A]">
                  {errors.cliente ||
                    errors.telefono ||
                    errors.calle ||
                    errors.items ||
                    errors.pagaCon ||
                    errors.programado ||
                    "Completa los campos obligatorios"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Programación */}
      {showProgramar && (
        <ProgramarModal
          valorInicial={programadoISO ? new Date(programadoISO) : null}
          onClose={() => setShowProgramar(false)}
          onConfirmar={(iso) => {
            setProgramadoISO(iso);
            setProgramar(true);
            setErrors((prev) => ({ ...prev, programado: "" }));
            setShowProgramar(false);
          }}
          onVerPedido={(id) => {
            setShowProgramar(false);
            navigate(`/pedidos?focus=${id}`);
          }}
        />
      )}
    </div>
  );
});

export default CrearPedidoPage;
