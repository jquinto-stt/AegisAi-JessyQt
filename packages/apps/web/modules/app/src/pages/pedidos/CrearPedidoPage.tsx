import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Switch } from "@/elements/form/switch";
import { Button } from "@/elements/ui/button";
import { pedidosStore, puedeCrearPedido, puedeGestionarProgramados, motivoSinPermiso } from "@/stores";
import type { ModalidadPedido, PedidoItem, MetodoPago, DireccionEntrega } from "@/stores";
import { BUSINESS_PROFILES } from "@/domain/pedidos/pedidos.profiles";
import { ProgramarModal } from "./ProgramarModal";
import {
  datosParaTransferir,
  mediosDeCobroHabilitados,
  mensajeDeCobro,
  enlaceDePago,
} from "./cobros";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { sessionStore } from "@/stores/session.store";
import QRCode from "qrcode";
import { QrCodeIcon } from "@heroicons/react/24/outline";
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

// ═══════════════════════════════════════════════════════════════════════════
// ICONOGRAFÍA VECTORIAL
// ═══════════════════════════════════════════════════════════════════════════

const DomicilioIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H3m10 4h4l3 4v3h-2M5 17H3v-4" />
  </svg>
);

const RetiroIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);

const EnSitioIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 21v-7m0 0V5a2 2 0 012-2h6m-8 11h8m0 0V5m0 9v7m4-18l4 4m0 0l-4 4m4-4h-8" />
  </svg>
);

const SearchIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className={className} aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PlusIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const MinusIcon = ({ className = "size-3" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={className} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
  </svg>
);

const TrashIcon = ({ className = "size-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const MapPinIcon = ({ className = "size-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
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
  const perfilActivo = pedidosStore.config.perfilComercial ?? "food";
  const perfilPreset = BUSINESS_PROFILES[perfilActivo] ?? BUSINESS_PROFILES.food;

  const puedeCrear = puedeCrearPedido();
  const puedeProgramar = puedeGestionarProgramados();

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
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("All");

  // Logística y dirección
  const [calle, setCalle] = useState(() => initialCalle);
  const [barrio, setBarrio] = useState(() => initialBarrio);
  const [referencia, setReferencia] = useState(() => initialReferencia);
  const [indicaciones, setIndicaciones] = useState(() => initialIndicaciones);
  const [costoEnvio, setCostoEnvio] = useState<number>(5000);
  const [repartidor, setRepartidor] = useState<string>("");
  const [mesa, setMesa] = useState<string>("");

  // Pagos y cobros
  const mediosDeCobro = mediosDeCobroHabilitados(pedidosStore.config.datosBancarios);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(
    () => mediosDeCobro[0]?.id ?? "efectivo"
  );
  const [pagaCon, setPagaCon] = useState<string>("");
  const transferencia = datosParaTransferir(pedidosStore.config.datosBancarios);

  // Programación
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
    if (qCliente !== null) setCliente(qCliente);
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
      setRepartidor("");
      setErrors((prev) => (prev.calle ? { ...prev, calle: "" } : prev));
    }
    if (m !== "en_sitio") setMesa("");
  };

  // ── Categorías y Filtrado ──
  const categorias = useMemo(() => {
    const cats = new Set<string>();
    catalogo.forEach((c) => {
      const catName = (c as any).categoria?.trim();
      if (catName) cats.add(catName);
    });
    return ["All", ...Array.from(cats)];
  }, [catalogo]);

  const catalogoFiltrado = useMemo(() => {
    return catalogo.filter((c) => {
      const matchCat =
        categoriaSeleccionada === "All" || (c as any).categoria === categoriaSeleccionada;
      const q = busquedaCatalogo.toLowerCase().trim();
      const matchBusq =
        !q ||
        c.nombre.toLowerCase().includes(q) ||
        ((c as any).categoria && (c as any).categoria.toLowerCase().includes(q));
      return matchCat && matchBusq;
    });
  }, [catalogo, busquedaCatalogo, categoriaSeleccionada]);

  // ── Handlers de Items ──
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
  };

  // ── Derivados del Pedido ──
  const subtotalItems = items.reduce(
    (acc, it) => acc + Math.max(0, it.precio ?? 0) * Math.max(1, it.cantidad),
    0
  );
  const costoEnvioEfectivo = modalidad === "domicilio" ? Math.max(0, Number(costoEnvio) || 0) : 0;
  const totalPedido = subtotalItems + costoEnvioEfectivo;
  const esPagoEnEntrega = metodoPago === "efectivo" || metodoPago === "contra_entrega";
  const direccionesGuardadas = pedidosStore.direccionesDe(telefono);

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

    const itemsLimpios: PedidoItem[] = items.map((it) => {
      const nombreFinal = it.variante ? `${it.nombre.trim()} (${it.variante})` : it.nombre.trim();
      return {
        nombre: nombreFinal,
        cantidad: Math.max(1, Number(it.cantidad) || 1),
        precio: it.precio === undefined ? undefined : Math.max(0, Number(it.precio) || 0),
      };
    });

    const programadoPara = programar && puedeProgramar && programadoISO ? programadoISO : undefined;
    const direccionEntrega: DireccionEntrega | undefined =
      modalidad === "domicilio" && calle.trim()
        ? {
            calle: calle.trim(),
            barrio: barrio.trim() || undefined,
            referencia: referencia.trim() || undefined,
            indicaciones: indicaciones.trim() || undefined,
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
      repartidor: modalidad === "domicilio" ? repartidor.trim() || undefined : undefined,
    });

    const targetChatId = chatId || conversacionesStore.porTelefono(pedido.telefono)?.id;

    setCreated({
      numero: pedido.numero,
      cliente: pedido.cliente,
      telefono: pedido.telefono,
      modalidad: pedido.modalidad,
      modalidadLabel: pedidosStore.modalidadLabel(pedido.modalidad),
      metodoPago,
      programadoPara: pedido.programadoPara,
      direccion: direccionEntrega
        ? `${direccionEntrega.calle}${direccionEntrega.referencia ? ` (${direccionEntrega.referencia})` : ""}`
        : undefined,
      mesa: modalidad === "en_sitio" && mesa.trim() ? mesa.trim() : undefined,
      total: pedidosStore.totalPedido(pedido),
      itemsCount: itemsLimpios.length,
      items: pedido.items,
      chatId: targetChatId,
    });

    setCliente("");
    setTelefono("");
    setModalidad(modalidadesDisponibles[0] ?? "retiro");
    setNotas("");
    setItems([]);
    setProgramar(false);
    setProgramadoISO(null);
    setCalle("");
    setBarrio("");
    setReferencia("");
    setIndicaciones("");
    setCostoEnvio(5000);
    setMetodoPago(mediosDeCobro[0]?.id ?? "efectivo");
    setPagaCon("");
    setRepartidor("");
    setMesa("");
    setErrors({});
  };

  // ═════════════════════════════════════════════════════════════════════════
  // PANTALLA DE ÉXITO (RECIBO ELEGANTE NECTO)
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

    return (
      <div className="w-full max-w-xl mx-auto py-8 px-4 font-['DM_Sans',sans-serif]">
        <PageMeta title={`Factura Digital - ${created.numero}`} description="Comprobante digital de pedido registrado" />

        {/* ── CONTENEDOR ESTILO FACTURA DIGITAL ── */}
        <div className="relative rounded-3xl border border-[#ECECEC] bg-white shadow-2xl overflow-hidden">
          {/* Cabecera superior de la factura */}
          <div className="bg-[#190088] text-white p-6 sm:p-8 text-center relative">
            <div className="flex items-center justify-between text-[12px] font-bold text-[#97D6DF] pb-3 border-b border-white/10">
              <span>COMPROBANTE DIGITAL</span>
              <span>NECTO PEDIDOS</span>
            </div>

            <div className="mx-auto size-14 rounded-2xl bg-[#FF3F1A] text-white font-bold flex items-center justify-center shadow-md my-4 text-[24px]">
              ✓
            </div>

            <span className="inline-block text-[12px] font-bold uppercase tracking-wider text-[#190088] bg-[#97D6DF] px-3.5 py-1 rounded-full mb-1">
              Pedido Registrado
            </span>

            <h1 className="text-[36px] font-bold text-white mt-1">
              {created.numero}
            </h1>

            <p className="text-[14px] font-normal text-white/80 mt-1">
              Registrado con éxito y sincronizado con el tablero en vivo
            </p>
          </div>

          {/* Línea perforada de ticket con muescas laterales */}
          <div className="relative flex items-center justify-between -my-3 z-10">
            <div className="size-6 rounded-full bg-[#ECECEC] -ml-3" />
            <div className="flex-1 border-b-2 border-dashed border-[#ECECEC] mx-2" />
            <div className="size-6 rounded-full bg-[#ECECEC] -mr-3" />
          </div>

          {/* Cuerpo del comprobante */}
          <div className="p-6 sm:p-8 space-y-5 bg-white">
            {/* Metadatos del cliente y pedido */}
            <div className="rounded-2xl bg-[#EFE6D3]/30 p-4 space-y-2.5 text-[14px] border border-[#ECECEC]">
              <div className="flex justify-between items-center">
                <span className="font-normal text-[#212121]/70">Cliente:</span>
                <span className="font-bold text-[#190088]">{created.cliente}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-normal text-[#212121]/70">Modalidad:</span>
                <span className="font-bold text-[#212121]">{created.modalidadLabel}</span>
              </div>
              {created.telefono && (
                <div className="flex justify-between items-center">
                  <span className="font-normal text-[#212121]/70">Teléfono:</span>
                  <span className="font-normal text-[#212121]">{created.telefono}</span>
                </div>
              )}
              {created.direccion && (
                <div className="flex justify-between items-start">
                  <span className="font-normal text-[#212121]/70">Entrega:</span>
                  <span className="font-bold text-right text-[#212121] max-w-[240px]">
                    {created.direccion}
                  </span>
                </div>
              )}
              {created.mesa && (
                <div className="flex justify-between items-center">
                  <span className="font-normal text-[#212121]/70">Mesa / Salón:</span>
                  <span className="font-bold text-[#212121]">{created.mesa}</span>
                </div>
              )}

              {/* Ítems registrados si existen */}
              {created.items && created.items.length > 0 && (
                <div className="border-t border-[#ECECEC] pt-2 space-y-1">
                  {created.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[12px]">
                      <span className="font-normal text-[#212121]">
                        {it.cantidad}× {it.nombre}
                      </span>
                      <span className="font-bold text-[#212121]">
                        {money((it.precio ?? 0) * it.cantidad)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Total a cobrar */}
              {created.total !== undefined && (
                <div className="flex justify-between items-center pt-2.5 border-t border-[#ECECEC]">
                  <span className="font-bold text-[#190088]">Total a cobrar:</span>
                  <span className="text-[24px] font-bold text-[#FF3F1A]">
                    {money(created.total)}
                  </span>
                </div>
              )}
            </div>

            {/* ── BLOQUE 1: CÓDIGO QR DE PAGO (Exclusivo para consumo / cobro en el negocio en sitio) ── */}
            {created.modalidad === "en_sitio" && (
              <div className="rounded-2xl border border-[#ECECEC] bg-white p-5 text-center shadow-2xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#ECECEC]">
                  <div className="flex items-center gap-2">
                    <QrCodeIcon className="w-5 h-5 text-[#190088]" />
                    <span className="text-[14px] font-bold text-[#190088]">
                      Código QR de Pago en Sitio
                    </span>
                  </div>
                  <span className="text-[12px] font-bold text-[#FF3F1A] bg-[#EFE6D3] px-2.5 py-0.5 rounded-full">
                    Cobro en Caja
                  </span>
                </div>

                <p className="text-[12px] font-light text-[#212121]/70">
                  Muestra o escanea desde la cámara del celular o datáfono para cobrar este pedido en el negocio.
                </p>

                {qrDataUrl ? (
                  <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-[#ECECEC] max-w-[240px] mx-auto shadow-2xs">
                    <img
                      src={qrDataUrl}
                      alt={`QR Pedido ${created.numero}`}
                      className="size-44 rounded-xl object-contain"
                    />
                    <span className="mt-2 text-[12px] font-bold text-[#190088]">
                      {created.modalidadLabel} · {created.numero}
                    </span>
                    <span className="text-[16px] font-bold text-[#FF3F1A]">
                      {money(created.total ?? 0)}
                    </span>
                  </div>
                ) : (
                  <div className="size-44 mx-auto rounded-2xl bg-[#ECECEC]/30 flex items-center justify-center text-[12px] font-normal text-[#212121]/60">
                    Generando código QR...
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 pt-1">
                  {qrDataUrl && (
                    <a
                      href={qrDataUrl}
                      download={`QR-Factura-${created.numero}.png`}
                      className="px-4 py-2 rounded-xl text-[12px] font-bold bg-[#190088] hover:bg-[#190088]/90 text-white transition-all cursor-pointer"
                    >
                      Descargar QR
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(urlPago);
                      setCopiadoLink(true);
                      setTimeout(() => setCopiadoLink(false), 2000);
                    }}
                    className="px-4 py-2 rounded-xl text-[12px] font-bold bg-white text-[#190088] border border-[#ECECEC] hover:border-[#97D6DF] transition-all cursor-pointer"
                  >
                    {copiadoLink ? "✓ Enlace copiado" : "Copiar enlace del QR"}
                  </button>
                </div>
              </div>
            )}

            {/* ── BLOQUE 2: ENLACE DE PAGO DIRECTO ── */}
            <div className="rounded-2xl border border-[#97D6DF] bg-[#97D6DF]/15 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[12px] font-bold text-[#190088] block">
                    Enlace de Pago para {created.modalidadLabel}
                  </span>
                  <p className="text-[12px] font-light text-[#212121]/70">
                    Comparte este link para que el cliente pague su pedido en línea
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(urlPago);
                    setCopiadoLink(true);
                    setTimeout(() => setCopiadoLink(false), 2000);
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-xl text-[12px] font-bold bg-white text-[#190088] shadow-2xs border border-[#97D6DF] hover:bg-[#97D6DF]/20 transition-all cursor-pointer"
                >
                  {copiadoLink ? "✓ Enlace copiado" : "Copiar enlace"}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-white text-[12px] font-normal text-[#212121] border border-[#ECECEC] break-all select-all leading-relaxed">
                {urlPago}
              </div>
            </div>

            {/* ── BLOQUE 3: ACCIONES CON EL CHAT / WHATSAPP ── */}
            {convDestinoId && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    await enviarAlChat();
                    navigate(`/pedidos/chats?id=${convDestinoId}`);
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-[#190088] hover:bg-[#190088]/90 text-white font-bold text-[14px] shadow-md transition-all cursor-pointer text-center"
                >
                  {enviadoAlChat ? "✓ Enlace enviado · Volver al chat" : "Enviar enlace y volver al chat"}
                </button>
                <button
                  type="button"
                  onClick={enviarAlChat}
                  disabled={enviadoAlChat}
                  className="px-5 py-3.5 rounded-2xl bg-[#97D6DF]/30 hover:bg-[#97D6DF]/50 text-[#190088] font-bold text-[14px] border border-[#97D6DF] transition-all cursor-pointer text-center"
                >
                  {enviadoAlChat ? "✓ Enviado" : "Enviar al chat"}
                </button>
              </div>
            )}

            {/* ── BLOQUE 4: MENSAJE DE COBRO COMPLETO (DATOS BANCARIOS) ── */}
            {mensajeCobro !== "" && (
              <div className="rounded-2xl border border-[#ECECEC] bg-white p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#190088]">
                    Mensaje de cobro completo
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(mensajeCobro);
                      setCopiadoCobro(true);
                      setTimeout(() => setCopiadoCobro(false), 2000);
                    }}
                    className="px-3 py-1 rounded-xl text-[12px] font-bold bg-white text-[#190088] shadow-2xs border border-[#ECECEC] hover:border-[#97D6DF] transition-colors cursor-pointer"
                  >
                    {copiadoCobro ? "✓ Copiado" : "Copiar mensaje"}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-['DM_Sans',sans-serif] text-[12px] text-[#212121] leading-relaxed bg-[#ECECEC]/30 p-3 rounded-xl border border-[#ECECEC]">
                  {mensajeCobro}
                </pre>
              </div>
            )}

            {/* ── PIE DE FACTURA: ACCIONES DE NAVEGACIÓN ── */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 border-t border-[#ECECEC]">
              <button
                type="button"
                onClick={() => {
                  setCreated(null);
                  setEnviadoAlChat(false);
                }}
                className="flex-1 py-3.5 rounded-2xl bg-[#FF3F1A] hover:bg-[#FF3F1A]/90 text-white font-bold text-[14px] shadow-md transition-all cursor-pointer text-center"
              >
                + Crear otro pedido
              </button>
              {convDestinoId ? (
                <button
                  type="button"
                  className="flex-1 py-3.5 text-[14px] font-bold rounded-2xl border border-[#ECECEC] bg-white text-[#212121] hover:bg-[#EFE6D3]/40 transition-colors cursor-pointer text-center"
                  onClick={() => navigate(`/pedidos/chats?id=${convDestinoId}`)}
                >
                  Volver al chat
                </button>
              ) : (
                <button
                  type="button"
                  className="flex-1 py-3.5 text-[14px] font-bold rounded-2xl border border-[#ECECEC] bg-white text-[#212121] hover:bg-[#EFE6D3]/40 transition-colors cursor-pointer text-center"
                  onClick={() => navigate("/pedidos")}
                >
                  Volver al chat
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VISTA PRINCIPAL (DISEÑO MOCKUP + TIPOGRAFÍA Y COLORES NECTO)
  // ═════════════════════════════════════════════════════════════════════════
  const negocioAbierto = pedidosStore.estaAbierto();

  return (
    <div className="w-full max-w-[1700px] mx-auto pb-16 font-['DM_Sans',sans-serif] text-[#212121] dark:text-gray-100">
      <PageMeta title="Terminal de Pedidos" description="Crea y gestiona pedidos rápidamente" />

      {/* ── BARRA SUPERIOR ELEGANTE CON MODALIDADES ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 rounded-3xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[36px] font-bold tracking-tight text-[#190088] dark:text-white">
              Terminal de Pedidos
            </h1>
            {negocioAbierto ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-[#97D6DF]/20 text-[#190088] dark:bg-[#97D6DF]/15 dark:text-[#97D6DF]">
                <span className="size-1.5 rounded-full bg-[#190088] dark:bg-[#97D6DF] animate-pulse" />
                Abierto
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-bold bg-[#FF3F1A]/10 text-[#FF3F1A]">
                <span className="size-1.5 rounded-full bg-[#FF3F1A]" />
                Fuera de horario
              </span>
            )}
          </div>
          <p className="text-[12px] font-light text-gray-500 dark:text-gray-400 mt-0.5">
            Registro inmediato de mostrador, domicilios y salón en tiempo real.
          </p>
        </div>

        {/* Selector de Modalidades Segmentado */}
        <div className="flex items-center gap-1.5 bg-[#ECECEC]/60 dark:bg-gray-800 p-1.5 rounded-2xl">
          {modalidadesDisponibles.map((m) => {
            const activo = modalidad === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => cambiarModalidad(m)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                  activo
                    ? "bg-[#FF3F1A] text-white shadow-xs scale-102"
                    : "text-[#212121] hover:text-[#190088] dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {m === "domicilio" && <DomicilioIcon className="size-3.5" />}
                {m === "retiro" && <RetiroIcon className="size-3.5" />}
                {m === "en_sitio" && <EnSitioIcon className="size-3.5" />}
                <span>{pedidosStore.modalidadLabel(m)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── GRID PRINCIPAL: 7 COLS (DATOS + CATALOGO MOCKUP + PAGO/PROGRAMAR) Y 5 COLS (RESUMEN MOCKUP) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ══════════════════════════════════════════════════════════════════
            COLUMNA IZQUIERDA: CLIENTE + CATALOGO MOCKUP + PAGO Y PROGRAMAR (7 COLS)
           ══════════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">

          {/* 1. DATOS DEL CLIENTE Y LOGÍSTICA DE ENTREGA */}
          <div className="bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-bold text-[#190088] dark:text-white">
                Datos del Cliente & Despacho
              </h2>
              {direccionesGuardadas.length > 0 && modalidad === "domicilio" && (
                <span className="text-[12px] font-normal text-gray-400">
                  {direccionesGuardadas.length} direcciones guardadas
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cliente" className="text-[12px] font-bold text-[#212121] dark:text-gray-200">
                  Nombre del Cliente <span className="text-[#FF3F1A]">*</span>
                </Label>
                <div className="mt-1">
                  <Input
                    id="cliente"
                    placeholder="Ej: Jhon Mendoza"
                    value={cliente}
                    onChange={(e) => {
                      setCliente(e.target.value);
                      if (errors.cliente) setErrors((prev) => ({ ...prev, cliente: "" }));
                    }}
                    error={!!errors.cliente}
                    hint={errors.cliente}
                    className="text-[14px] font-normal"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="telefono" className="text-[12px] font-bold text-[#212121] dark:text-gray-200">
                  WhatsApp / Teléfono <span className="text-[#FF3F1A]">*</span>
                </Label>
                <div className="mt-1">
                  <Input
                    id="telefono"
                    placeholder="Ej: +57 300 123 4567"
                    value={telefono}
                    onChange={(e) => {
                      setTelefono(e.target.value);
                      if (errors.telefono) setErrors((prev) => ({ ...prev, telefono: "" }));
                    }}
                    error={!!errors.telefono}
                    hint={errors.telefono}
                    className="text-[14px] font-normal"
                  />
                </div>
              </div>
            </div>

            {/* Dirección si es Domicilio */}
            {modalidad === "domicilio" && (
              <div className="mt-4 pt-4 border-t border-[#ECECEC] dark:border-gray-800 space-y-3.5">
                {direccionesGuardadas.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] font-bold text-[#190088]">Frecuentes:</span>
                    {direccionesGuardadas.map((dir, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCalle(dir.calle);
                          if (dir.barrio) setBarrio(dir.barrio);
                          if (dir.referencia) setReferencia(dir.referencia);
                          if (dir.indicaciones) setIndicaciones(dir.indicaciones);
                          if (errors.calle) setErrors((prev) => ({ ...prev, calle: "" }));
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[12px] font-normal bg-[#EFE6D3]/50 hover:bg-[#97D6DF]/30 border border-[#ECECEC] dark:bg-gray-800 dark:border-gray-700 transition-colors cursor-pointer text-[#212121] dark:text-gray-200"
                      >
                        <MapPinIcon className="size-3 text-[#FF3F1A]" />
                        <span>{dir.calle}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                  <div className="sm:col-span-8">
                    <Label htmlFor="calle" className="text-[12px] font-bold text-[#212121] dark:text-gray-200">
                      Dirección de Entrega <span className="text-[#FF3F1A]">*</span>
                    </Label>
                    <div className="mt-1">
                      <Input
                        id="calle"
                        placeholder="Ej: Cra 43A # 1-50"
                        value={calle}
                        onChange={(e) => {
                          setCalle(e.target.value);
                          if (errors.calle) setErrors((prev) => ({ ...prev, calle: "" }));
                        }}
                        error={!!errors.calle}
                        hint={errors.calle}
                        className="text-[14px] font-normal"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <Label htmlFor="barrio" className="text-[12px] font-bold text-[#212121] dark:text-gray-200">
                      Barrio / Sector
                    </Label>
                    <div className="mt-1">
                      <Input id="barrio" placeholder="Ej: Laureles" value={barrio} onChange={(e) => setBarrio(e.target.value)} className="text-[14px] font-normal" />
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <Label htmlFor="referencia" className="text-[12px] font-bold text-[#212121] dark:text-gray-200">
                      Apto / Casa / Torre
                    </Label>
                    <div className="mt-1">
                      <Input id="referencia" placeholder="Ej: Torre 2, Apto 502" value={referencia} onChange={(e) => setReferencia(e.target.value)} className="text-[14px] font-normal" />
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <Label htmlFor="costoEnvio" className="text-[12px] font-bold text-[#212121] dark:text-gray-200">
                      Costo de Envío ($COP)
                    </Label>
                    <div className="mt-1">
                      <Input
                        id="costoEnvio"
                        type="number"
                        min="0"
                        step={500}
                        placeholder="5000"
                        value={costoEnvio}
                        onChange={(e) => setCostoEnvio(Math.max(0, Number(e.target.value) || 0))}
                        className="text-[14px] font-normal"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <Label htmlFor="repartidor" className="text-[12px] font-bold text-[#212121] dark:text-gray-200">
                      Mensajero / Repartidor
                    </Label>
                    <div className="mt-1">
                      <Input id="repartidor" placeholder="Ej: Moto 04" value={repartidor} onChange={(e) => setRepartidor(e.target.value)} className="text-[14px] font-normal" />
                    </div>
                  </div>

                  <div className="sm:col-span-12">
                    <Label htmlFor="indicaciones" className="text-[12px] font-bold text-[#212121] dark:text-gray-200">
                      Indicaciones para el repartidor
                    </Label>
                    <div className="mt-1">
                      <Input id="indicaciones" placeholder="Ej: Timbre dañado, dejar con el portero" value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} className="text-[14px] font-normal" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mesa si es En Sitio */}
            {modalidad === "en_sitio" && pedidosStore.tieneCapacidad("table_service") && (
              <div className="mt-4 pt-4 border-t border-[#ECECEC] dark:border-gray-800">
                <Label htmlFor="mesa" className="text-[12px] font-bold text-[#212121] dark:text-gray-200">
                  Ubicación en Salón / Mesa
                </Label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Barra", "Terraza"].map((mOpt) => (
                    <button
                      key={mOpt}
                      type="button"
                      onClick={() => setMesa(mOpt)}
                      className={`px-3 py-1.5 rounded-xl text-[12px] font-bold border transition-all cursor-pointer ${
                        mesa === mOpt
                          ? "bg-[#FF3F1A] border-[#FF3F1A] text-white"
                          : "bg-white border-[#ECECEC] text-[#212121] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {mOpt}
                    </button>
                  ))}
                  <div className="w-44">
                    <Input id="mesa" placeholder="Otra ubicación..." value={mesa} onChange={(e) => setMesa(e.target.value)} className="text-[14px] font-normal" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. CATÁLOGO VISUAL DE PLATILLOS (DISEÑO DEL MOCKUP: CART PRODUCTS) */}
          <div className="bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xs">
            {/* Header del Catálogo con Buscador */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-[24px] font-bold text-[#190088] dark:text-white tracking-tight">
                Cart Products
              </h2>

              <div className="relative w-full sm:w-64">
                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <input
                  type="text"
                  value={busquedaCatalogo}
                  onChange={(e) => setBusquedaCatalogo(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 text-[14px] font-normal rounded-2xl border border-[#ECECEC] bg-gray-50/70 text-[#212121] placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#97D6DF] dark:border-gray-700 dark:bg-gray-800/80 dark:text-white"
                />
              </div>
            </div>

            {/* Píldoras de Categorías con la Activa en Naranja NECTO */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
              {categorias.map((cat) => {
                const activo = categoriaSeleccionada === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaSeleccionada(cat)}
                    className={`px-4 py-2 rounded-2xl text-[12px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                      activo
                        ? "bg-[#FF3F1A] text-white shadow-xs scale-102"
                        : "bg-white dark:bg-gray-800 text-[#212121] dark:text-gray-300 border border-[#ECECEC] dark:border-gray-700 hover:border-[#97D6DF]"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Grid de Productos con Contenedor de Scroll y Platos Redondos con Botón '+' Naranja NECTO */}
            {tieneCatalogo && (
              <div className="max-h-[560px] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {catalogoFiltrado.map((cat, idx) => {
                    const itemsEnTicket = items.filter((it) => it.nombre === cat.nombre);
                    const cantidadEnTicket = itemsEnTicket.reduce((s, it) => s + it.cantidad, 0);
                    const fotoUrl = (cat as any).imagen || asignarFotoInteligente(cat.nombre, (cat as any).categoria);

                    // Etiquetas superiores decorativas del mockup con colores de marca
                    const badgeLabel = idx === 0 ? "BEST SALE" : idx === 1 ? "9% Offer" : idx === 3 ? "TOP SALE" : idx === 5 ? "NEW ITEM" : null;
                    const badgeColor = idx === 0 ? "bg-[#190088] text-white" : idx === 1 ? "bg-[#FF3F1A] text-white" : idx === 3 ? "bg-[#190088] text-white" : "bg-[#97D6DF] text-[#190088]";

                    return (
                      <div
                        key={cat.id}
                        onClick={() => {
                          if (!cat.variantesDisponibles || cat.variantesDisponibles.length === 0) {
                            agregarItemDesdeCatalogo(cat);
                          }
                        }}
                        className={`group relative flex flex-col justify-between p-4 rounded-3xl border transition-all duration-200 cursor-pointer bg-white dark:bg-gray-900 ${
                          cantidadEnTicket > 0
                            ? "border-[#FF3F1A] shadow-md ring-1 ring-[#FF3F1A]"
                            : "border-[#ECECEC] hover:border-[#97D6DF] hover:shadow-md dark:border-gray-800 dark:hover:border-gray-700"
                        }`}
                      >
                        {badgeLabel && (
                          <span className={`absolute top-3 left-3 px-2 py-0.5 rounded-lg text-[12px] font-bold uppercase shadow-xs z-10 ${badgeColor}`}>
                            {badgeLabel}
                          </span>
                        )}

                        {/* Plato Redondo Estilo Mockup */}
                        <div className="relative w-full aspect-square max-h-36 mx-auto my-2 flex items-center justify-center">
                          <div className="size-28 sm:size-32 rounded-full overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-200 bg-gray-50 dark:bg-gray-800">
                            <img
                              src={fotoUrl}
                              alt={cat.nombre}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          {cantidadEnTicket > 0 && (
                            <span className="absolute bottom-0 right-2 size-6 rounded-full bg-[#190088] text-white font-bold text-[12px] flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-900">
                              {cantidadEnTicket}
                            </span>
                          )}
                        </div>

                        {/* Nombre y Categoría */}
                        <div className="mt-2">
                          <h3 className="text-[14px] font-bold text-[#190088] dark:text-white line-clamp-1" title={cat.nombre}>
                            {cat.nombre}
                          </h3>
                          <p className="text-[12px] font-light text-gray-500">
                            {(cat as any).categoria || "Especialidad"}
                          </p>
                        </div>

                        {/* Fila de Precio y Botón Circular '+' Naranja NECTO */}
                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#ECECEC] dark:border-gray-800">
                          <span className="text-[16px] font-bold text-[#212121] dark:text-white">
                            {money(cat.precio)}
                          </span>

                          {cat.variantesDisponibles && cat.variantesDisponibles.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {cat.variantesDisponibles.map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => agregarItemDesdeCatalogo(cat, v)}
                                  className="px-2 py-0.5 rounded-lg text-[12px] font-bold bg-[#FF3F1A] text-white hover:scale-105 transition-transform cursor-pointer"
                                >
                                  + {v}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                agregarItemDesdeCatalogo(cat);
                              }}
                              className="size-8 sm:size-9 rounded-full bg-[#FF3F1A] hover:bg-[#FF3F1A]/90 text-white font-bold flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                              title="Añadir al pedido"
                            >
                              <PlusIcon className="size-4 stroke-[3]" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {catalogoFiltrado.length === 0 && (
                  <div className="py-16 text-center text-[14px] font-light text-gray-400">
                    No se encontraron productos con "{busquedaCatalogo}".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. MÉTODOS DE PAGO, NOTAS Y PROGRAMACIÓN */}
          <div className="bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-xs">
            <h2 className="text-[16px] font-bold text-[#190088] dark:text-white mb-4">
              Cobro, Observaciones & Programación
            </h2>

            {/* Medios de Pago */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {mediosDeCobro.map((mp) => {
                const activo = metodoPago === mp.id;
                return (
                  <button
                    key={mp.id}
                    type="button"
                    onClick={() => setMetodoPago(mp.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                      activo
                        ? "bg-[#190088] border-[#190088] text-white font-bold text-[12px] shadow-xs scale-102"
                        : "bg-white border-[#ECECEC] text-[#212121] dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 font-normal text-[12px]"
                    }`}
                  >
                    <span>{mp.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Si es efectivo: cálculo de cambio con billetes COP */}
            {esPagoEnEntrega && (
              <div className="rounded-2xl bg-[#EFE6D3]/40 dark:bg-gray-800/50 p-4 border border-[#ECECEC] dark:border-gray-700 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <Label htmlFor="pagaCon" className="text-[12px] font-bold text-[#212121] dark:text-gray-200">
                      ¿Con cuánto abona el cliente?
                    </Label>
                    <div className="mt-1">
                      <Input
                        id="pagaCon"
                        type="number"
                        min="0"
                        step={1000}
                        placeholder={`Ej: ${totalPedido > 0 ? Math.ceil(totalPedido / 10000) * 10000 : 50000}`}
                        value={pagaCon}
                        onChange={(e) => {
                          setPagaCon(e.target.value);
                          if (errors.pagaCon) setErrors((prev) => ({ ...prev, pagaCon: "" }));
                        }}
                        error={!!errors.pagaCon}
                        hint={errors.pagaCon}
                        className="text-[14px] font-normal"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => setPagaCon(String(totalPedido))}
                        className="px-2 py-0.5 rounded-md text-[12px] font-bold bg-white border border-[#ECECEC] text-[#212121] hover:bg-[#97D6DF]/20 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 cursor-pointer"
                      >
                        Exacto
                      </button>
                      {[20000, 50000, 100000].map((monto) => (
                        <button
                          key={monto}
                          type="button"
                          onClick={() => setPagaCon(String(monto))}
                          className="px-2 py-0.5 rounded-md text-[12px] font-bold bg-white border border-[#ECECEC] text-[#212121] hover:bg-[#97D6DF]/20 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 cursor-pointer"
                        >
                          ${monto / 1000}k
                        </button>
                      ))}
                    </div>
                  </div>

                  {Number(pagaCon) > 0 && (
                    <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-700">
                      <span className="text-[12px] font-light text-[#212121]/70 dark:text-gray-400">Vuelto / Cambio a entregar:</span>
                      <p className={`text-[16px] font-bold mt-0.5 ${
                        Number(pagaCon) >= totalPedido
                          ? "text-[#190088] dark:text-[#97D6DF]"
                          : "text-[#FF3F1A]"
                      }`}>
                        {Number(pagaCon) >= totalPedido
                          ? money(Number(pagaCon) - totalPedido)
                          : `Faltan ${money(totalPedido - Number(pagaCon))}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Si es transferencia: cuentas registradas */}
            {metodoPago === "transferencia" && transferencia && (
              <div className="rounded-2xl bg-[#EFE6D3]/40 dark:bg-gray-800/50 p-3.5 border border-[#ECECEC] dark:border-gray-700 mb-4 text-[12px]">
                <span className="font-bold text-[#190088] dark:text-gray-300">Cuentas para transferencia:</span>
                <div className="mt-1.5 space-y-1">
                  {transferencia.cuentas.map((c) => (
                    <div key={c.etiqueta} className="flex justify-between items-center text-[#212121] dark:text-gray-300">
                      <span className="font-normal">{c.etiqueta}:</span>
                      <span className="font-bold text-[#190088] dark:text-white select-all">{c.valor}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notas y Programación */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="notas" className="text-[12px] font-bold text-[#212121] dark:text-gray-300">
                  Notas / Observaciones de cocina
                </Label>
                <textarea
                  id="notas"
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej: Sin cebolla, salsas aparte..."
                  className="mt-1 w-full rounded-xl border border-[#ECECEC] bg-transparent px-3 py-2 text-[14px] font-normal text-[#212121] placeholder:text-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#97D6DF] dark:border-gray-700 dark:text-white"
                />
              </div>

              {/* ¿Programar para más tarde? */}
              {puedeProgramar && (
                <div className="flex flex-col justify-between p-3.5 rounded-2xl bg-[#ECECEC]/40 dark:bg-gray-800/40 border border-[#ECECEC] dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[12px] font-bold text-[#190088] dark:text-white">
                        ¿Programar para más tarde?
                      </span>
                      <p className="text-[12px] font-light text-gray-500">
                        Se activará automáticamente al llegar la hora
                      </p>
                    </div>
                    <Switch
                      checked={programar}
                      onChange={(v) => {
                        setProgramar(v);
                        if (v && !programadoISO) setShowProgramar(true);
                        if (!v) setErrors((prev) => ({ ...prev, programado: "" }));
                      }}
                    />
                  </div>

                  {programar && (
                    <div className="mt-2.5 flex items-center justify-between bg-white dark:bg-gray-900 px-3 py-1.5 rounded-xl border border-[#ECECEC] dark:border-gray-700">
                      <span className="text-[12px] font-bold text-[#190088] dark:text-white">
                        ⏰ {programadoISO ? formatFechaHora(programadoISO) : "Sin definir"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowProgramar(true)}
                        className="text-[12px] font-bold text-[#190088] bg-[#97D6DF]/30 px-2 py-0.5 rounded-lg hover:scale-105 transition-transform cursor-pointer"
                      >
                        Cambiar hora
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            COLUMNA DERECHA: RESUMEN DE PRODUCTOS (DISEÑO DEL MOCKUP: PRODUCTS) (5 COLS)
           ══════════════════════════════════════════════════════════════════ */}
        <aside className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-6 bg-white dark:bg-gray-900 border border-[#ECECEC] dark:border-gray-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          
          <div>
            {/* Header del Carrito: "Products" + "Delete All" */}
            <div className="flex items-center justify-between pb-4 border-b border-[#ECECEC] dark:border-gray-800">
              <div className="flex items-center gap-2">
                <h2 className="text-[24px] font-bold text-[#190088] dark:text-white tracking-tight">
                  Products
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold ${
                  programar
                    ? "bg-[#EFE6D3] text-[#190088] dark:bg-gray-800 dark:text-[#97D6DF]"
                    : "bg-[#97D6DF]/30 text-[#190088] dark:bg-[#97D6DF]/20 dark:text-[#97D6DF]"
                }`}>
                  {programar ? "Programado" : "Nuevo"}
                </span>
              </div>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={vaciarTicket}
                  className="text-[12px] font-bold text-[#FF3F1A] hover:underline transition-colors cursor-pointer"
                >
                  Delete All
                </button>
              )}
            </div>

            {/* Datos del Cliente Activo en la Comanda */}
            <div className="my-3 p-3 rounded-2xl bg-[#EFE6D3]/50 dark:bg-gray-800/40 border border-[#ECECEC] dark:border-gray-700/60 flex items-center justify-between text-[12px]">
              <div>
                <span className="font-bold text-[#190088] dark:text-white">
                  {cliente.trim() || "Cliente no asignado"}
                </span>
                <span className="block text-[12px] font-light text-gray-500">
                  {telefono.trim() || "Sin WhatsApp"}
                </span>
              </div>
              <span className="font-bold text-[#212121] dark:text-white capitalize">
                {pedidosStore.modalidadLabel(modalidad)}
              </span>
            </div>

            {/* Lista de Productos Agregados Estilo Mockup */}
            <div className="py-2 space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <p className="text-[14px] font-bold text-gray-600 dark:text-gray-300">Tu carrito está vacío</p>
                  <p className="text-[12px] font-light text-gray-400 mt-1">
                    Toca productos del catálogo para armar la comanda
                  </p>
                </div>
              ) : (
                items.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-gray-800/50 border border-[#ECECEC] dark:border-gray-700/60 shadow-2xs"
                  >
                    {/* Checkbox y Foto Redonda */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="size-5 rounded-md bg-[#190088] text-white font-bold text-[12px] flex items-center justify-center shrink-0">
                        ✓
                      </span>
                      <img
                        src={it.imagen || asignarFotoInteligente(it.nombre)}
                        alt={it.nombre}
                        className="size-12 rounded-xl object-cover shrink-0 shadow-xs"
                      />
                      <div className="min-w-0">
                        <h4 className="text-[14px] font-bold text-[#190088] dark:text-white truncate">
                          {it.nombre}
                        </h4>
                        <p className="text-[12px] font-light text-gray-500">
                          Total {money((it.precio ?? 0) * it.cantidad)}
                        </p>
                      </div>
                    </div>

                    {/* Controles de Cantidad y Basura */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => eliminarItem(idx)}
                        className="text-gray-400 hover:text-[#FF3F1A] transition-colors cursor-pointer p-0.5"
                        title="Quitar ítem"
                      >
                        <TrashIcon className="size-3.5" />
                      </button>

                      {/* Stepper Estilo Mockup */}
                      <div className="flex items-center gap-1.5 bg-[#212121] text-white rounded-full px-2 py-0.5 text-[12px] font-bold">
                        <button
                          type="button"
                          onClick={() => modificarCantidad(idx, -1)}
                          className="hover:text-[#97D6DF] transition-colors cursor-pointer"
                        >
                          <MinusIcon className="size-3" />
                        </button>
                        <span className="w-3 text-center">
                          {it.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => modificarCantidad(idx, 1)}
                          className="hover:text-[#97D6DF] transition-colors cursor-pointer"
                        >
                          <PlusIcon className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Desglose Financiero Estilo Mockup */}
          <div className="pt-4 border-t border-[#ECECEC] dark:border-gray-800 space-y-2 text-[14px]">
            <div className="flex justify-between text-gray-600 dark:text-gray-400 font-normal">
              <span>Total Product Price</span>
              <span className="font-bold text-[#212121] dark:text-white">{money(subtotalItems)}</span>
            </div>
            {modalidad === "domicilio" && (
              <div className="flex justify-between text-gray-600 dark:text-gray-400 font-normal">
                <span>Delivery Fee</span>
                <span className="font-bold text-[#212121] dark:text-white">
                  {costoEnvioEfectivo > 0 ? money(costoEnvioEfectivo) : "Free"}
                </span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-[#ECECEC] dark:border-gray-800">
              <span className="text-[16px] font-bold text-[#190088] dark:text-white">Total Payment</span>
              <span className="text-[36px] font-bold text-[#190088] dark:text-white">
                {money(totalPedido)}
              </span>
            </div>

            {/* Botón Naranja NECTO: Proceed to Payment */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleCreate}
                disabled={!puedeCrear}
                className="w-full py-4 rounded-2xl bg-[#FF3F1A] hover:bg-[#FF3F1A]/90 text-white font-bold text-[16px] shadow-md shadow-[#FF3F1A]/20 transition-all active:scale-98 cursor-pointer text-center"
              >
                {programar ? "Programar Pedido" : "Proceed to Payment"} ({money(totalPedido)})
              </button>

              {!puedeCrear && (
                <p className="mt-2 text-center text-[12px] font-normal text-[#FF3F1A]">
                  {motivoSinPermiso("orders.create")}
                </p>
              )}

              {Object.keys(errors).length > 0 && (
                <p className="mt-2 text-center text-[12px] font-bold text-[#FF3F1A]">
                  {errors.cliente || errors.telefono || errors.calle || errors.items || errors.programado || "Completa los campos obligatorios"}
                </p>
              )}
            </div>
          </div>
        </aside>

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
