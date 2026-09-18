import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { Switch } from "@/elements/form/switch";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { pedidosStore, puedeCrearPedido, puedeGestionarProgramados, motivoSinPermiso } from "@/stores";
import type { Modalidad, PedidoItem, MetodoPago, DireccionEntrega } from "@/stores";
import { ProgramarModal } from "./ProgramarModal";

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const RequiredMark = () => <span className="text-error-500">*</span>;

const inputBase =
  "h-11 w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:text-white/90 dark:placeholder:text-white/30";
const inputOk = "border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700";

/** Fila editable de item en el formulario (antes de mapear a PedidoItem). */
interface ItemFila {
  nombre: string;
  cantidad: number;
  precio?: number;
}

interface CreatedInfo {
  numero: string;
  cliente: string;
  modalidadLabel: string;
  /** ISO programado, si el pedido se creó como programado. */
  programadoPara?: string;
  direccion?: string;
  total?: number;
}

const money = (n: number) => `$${n.toLocaleString("es-CO")}`;

/** Formatea una fecha ISO como "12 sep, 14:30" (es-CO). */
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

/** Icono decorativo de sección (círculo con número de paso). */
const StepBadge = ({ n }: { n: number }) => (
  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
    {n}
  </span>
);

const ModalidadIcon = ({ m }: { m: Modalidad }) => {
  const cls = "h-5 w-5";
  if (m === "domicilio")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H3m10 4h4l3 4v3h-2M5 17H3v-4" />
      </svg>
    );
  if (m === "en_sitio")
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 21v-7m0 0V5a2 2 0 012-2h6m-8 11h8m0 0V5m0 9v7m4-18l4 4m0 0l-4 4m4-4h-8" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={cls}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
};

const MapPinIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const CashIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2" />
    <path d="M6 12h.01M18 12h.01" />
  </svg>
);

const TransferIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </svg>
);

const CardIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const DeliveryHandIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 11V7a4 4 0 0 0-8 0v4" />
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M10 15h4" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export const CrearPedidoPage = observer(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const modalidadesDisponibles = pedidosStore.config.modalidades;
  const catalogo = pedidosStore.config.catalogo;
  const tieneCatalogo = catalogo.length > 0;

  // Capacidades de esta página.
  const puedeCrear = puedeCrearPedido();
  const puedeProgramar = puedeGestionarProgramados();

  const [cliente, setCliente] = useState(() => searchParams.get("cliente") ?? "");
  const [telefono, setTelefono] = useState(() => searchParams.get("telefono") ?? "");
  const [modalidad, setModalidad] = useState<Modalidad>(modalidadesDisponibles[0] ?? "retiro");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState<ItemFila[]>([{ nombre: "", cantidad: 1 }]);
  const [programar, setProgramar] = useState(false);
  /** Fecha/hora programada en ISO (la elige el ProgramarModal). null = sin elegir. */
  const [programadoISO, setProgramadoISO] = useState<string | null>(null);
  const [showProgramar, setShowProgramar] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<CreatedInfo | null>(null);

  // ── Logística, dirección y pago ──
  const [calle, setCalle] = useState("");
  const [barrio, setBarrio] = useState("");
  const [referencia, setReferencia] = useState("");
  const [indicaciones, setIndicaciones] = useState("");
  const [costoEnvio, setCostoEnvio] = useState<number>(5000);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [pagaCon, setPagaCon] = useState<string>("");
  const [repartidor, setRepartidor] = useState<string>("");

  // ── Item handlers ──
  const setItem = (idx: number, patch: Partial<ItemFila>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addItem = () => setItems((prev) => [...prev, { nombre: "", cantidad: 1 }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  /** Al elegir un item del catálogo, autocompleta nombre y precio. */
  const pickCatalogo = (idx: number, itemId: string) => {
    const cat = catalogo.find((c) => c.id === itemId);
    if (cat) setItem(idx, { nombre: cat.nombre, precio: cat.precio });
  };

  const resetForm = () => {
    setCliente("");
    setTelefono("");
    setModalidad(modalidadesDisponibles[0] ?? "retiro");
    setNotas("");
    setItems([{ nombre: "", cantidad: 1 }]);
    setProgramar(false);
    setProgramadoISO(null);
    setCalle("");
    setBarrio("");
    setReferencia("");
    setIndicaciones("");
    setCostoEnvio(5000);
    setMetodoPago("efectivo");
    setPagaCon("");
    setRepartidor("");
    setErrors({});
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!cliente.trim()) e.cliente = "El nombre es obligatorio";
    const phone = telefono.replace(/[^\d+]/g, "");
    if (!telefono.trim()) e.telefono = "El teléfono es obligatorio";
    else if (phone.length < 7) e.telefono = "Teléfono no válido";
    if (modalidad === "domicilio" && !calle.trim()) {
      e.calle = "La dirección de entrega es obligatoria para domicilios";
    }
    if (programar) {
      if (!programadoISO) e.programado = "Elige una fecha y hora";
      else if (new Date(programadoISO).getTime() <= Date.now())
        e.programado = "La fecha debe ser futura";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Derivados para el resumen en vivo ──
  const itemsValidos = items.filter((it) => it.nombre.trim() !== "");
  const subtotalItems = itemsValidos.reduce((s, it) => s + (it.precio ?? 0) * Math.max(1, it.cantidad), 0);
  const costoEnvioEfectivo = modalidad === "domicilio" ? Math.max(0, Number(costoEnvio) || 0) : 0;
  const totalPedido = subtotalItems + costoEnvioEfectivo;
  const direccionesGuardadas = pedidosStore.direccionesDe(telefono);

  const handleCreate = () => {
    // Defensa en profundidad (C5): la ruta exige `orders.create`, pero la
    // acción lo re-comprueba. Fail-closed.
    if (!puedeCrear) return;
    if (!validate()) return;
    const itemsLimpios: PedidoItem[] = items
      .filter((it) => it.nombre.trim() !== "")
      .map((it) => ({
        nombre: it.nombre.trim(),
        cantidad: Math.max(1, Number(it.cantidad) || 1),
        precio: it.precio,
      }));

    // Programar exige `scheduled.manage`: si no se tiene, el pedido se crea
    // activo aunque el estado local hubiera quedado en `true`.
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
      (metodoPago === "efectivo" || metodoPago === "contra_entrega") && Number(pagaCon) > 0
        ? Number(pagaCon)
        : undefined;

    const pedido = pedidosStore.crearPedido({
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      modalidad,
      items: itemsLimpios,
      notas: notas.trim() || undefined,
      origen: "operador",
      programadoPara,
      direccionEntrega,
      costoEnvio: modalidad === "domicilio" ? costoEnvioEfectivo : undefined,
      metodoPago,
      pagaCon: pagaConNum,
      repartidor: repartidor.trim() || undefined,
    });

    setCreated({
      numero: pedido.numero,
      cliente: pedido.cliente,
      modalidadLabel: pedidosStore.modalidadLabel(pedido.modalidad),
      programadoPara: pedido.programadoPara,
      direccion: direccionEntrega
        ? `${direccionEntrega.calle}${direccionEntrega.referencia ? ` (${direccionEntrega.referencia})` : ""}`
        : undefined,
      total: pedidosStore.totalPedido(pedido),
    });
    resetForm();
  };

  // ── Confirmación (reemplaza el formulario) ──
  if (created) {
    return (
      <>
        <PageMeta title="Pedido creado" description="Pedido creado con éxito" />
        <div className="mx-auto max-w-lg">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col items-center gap-3 bg-success-50 px-8 py-8 text-center dark:bg-success-500/10">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success-500 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-7 w-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-success-700 dark:text-success-300">Pedido creado con éxito</p>
            </div>

            <div className="px-8 py-8 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-400">Número de pedido</p>
              <p className="mt-1 text-5xl font-bold text-gray-800 dark:text-white/90">{created.numero}</p>

              <div className="mx-auto mt-6 max-w-xs space-y-2 text-sm">
                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2 dark:border-gray-700">
                  <span className="text-gray-500">Cliente</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{created.cliente}</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-gray-200 pb-2 dark:border-gray-700">
                  <span className="text-gray-500">Modalidad</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">{created.modalidadLabel}</span>
                </div>
                {created.direccion && (
                  <div className="flex justify-between border-b border-dashed border-gray-200 pb-2 dark:border-gray-700">
                    <span className="text-gray-500">Dirección</span>
                    <span className="max-w-[170px] truncate text-right font-medium text-gray-800 dark:text-white/90">
                      {created.direccion}
                    </span>
                  </div>
                )}
                {created.total !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total a cobrar</span>
                    <span className="font-bold text-brand-600 dark:text-brand-400">{money(created.total)}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-left dark:bg-brand-500/10">
                <svg viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 h-5 w-5 shrink-0 text-brand-500">
                  <path d="M12 2a10 10 0 00-8.66 15l-1.3 3.9a.75.75 0 00.95.95l3.9-1.3A10 10 0 1012 2z" />
                </svg>
                {created.programadoPara ? (
                  <p className="text-xs text-brand-700 dark:text-brand-300">
                    El pedido quedó <strong>Programado</strong> para el{" "}
                    <strong>{formatFechaHora(created.programadoPara)}</strong>. Aparece en la sección
                    de programados del tablero y se activará solo al llegar la hora.
                  </p>
                ) : (
                  <p className="text-xs text-brand-700 dark:text-brand-300">
                    El pedido entró como <strong>Nuevo</strong> y ya aparece en el tablero con su logística de entrega.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-200 px-8 py-5 dark:border-gray-800">
              <Button className="flex-1" onClick={() => setCreated(null)}>Crear otro pedido</Button>
              <Button variant="outline" className="flex-1" onClick={() => navigate("/pedidos")}>
                Ver el tablero
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Formulario (layout de dos columnas) ──
  return (
    <>
      <PageMeta title="Crear pedido" description="Registra un pedido para un cliente" />

      {/* Encabezado */}
      <div className="mx-auto mb-6 flex max-w-5xl items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Crear pedido</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Registra un pedido manualmente. El bot de WhatsApp usa este mismo contrato.
          </p>
        </div>
      </div>

      {/* Aviso fuera de horario (si el horario está activo) */}
      {!pedidosStore.estaAbierto() && (
        <div className="mx-auto mb-4 flex max-w-5xl items-start gap-2 rounded-xl border border-warning-300 bg-warning-50 p-3 dark:border-warning-500/40 dark:bg-warning-500/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="mt-0.5 h-5 w-5 shrink-0 text-warning-600 dark:text-warning-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-warning-700 dark:text-warning-300">
            El negocio está fuera de horario de atención. Puedes registrar el pedido igual, o
            <strong> programarlo</strong> para la próxima apertura con el toggle de abajo.
          </p>
        </div>
      )}

      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ══ Columna izquierda: formulario por pasos ══ */}
        <div className="space-y-6">
          {/* Paso 1 · Cliente */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <StepBadge n={1} />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Datos del cliente</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cliente">Nombre <RequiredMark /></Label>
                <Input
                  id="cliente"
                  placeholder="Ej: Juan Carlos"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  error={!!errors.cliente}
                  hint={errors.cliente}
                />
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono (WhatsApp) <RequiredMark /></Label>
                <Input
                  id="telefono"
                  placeholder="Ej: +57 300 123 4567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  error={!!errors.telefono}
                  hint={errors.telefono}
                />
              </div>
            </div>
          </section>

          {/* Paso 2 · Modalidad (tarjetas seleccionables) */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <StepBadge n={2} />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Modalidad de entrega</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {modalidadesDisponibles.map((m) => {
                const activo = modalidad === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModalidad(m)}
                    className={
                      "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors " +
                      (activo
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                        : "border-gray-200 text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:text-gray-300")
                    }
                  >
                    <span className={activo ? "text-brand-500" : "text-gray-400"}>
                      <ModalidadIcon m={m} />
                    </span>
                    <span className="text-sm font-medium">{pedidosStore.modalidadLabel(m)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Paso 3 (Condicional) · Dirección de entrega (si es domicilio) */}
          {modalidad === "domicilio" && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-2">
                <StepBadge n={3} />
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Dirección y despacho</h2>
              </div>

              {direccionesGuardadas.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-gray-50 p-2.5 dark:bg-gray-800/50">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Direcciones frecuentes:
                  </span>
                  {direccionesGuardadas.map((dir, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCalle(dir.calle);
                        if (dir.barrio) setBarrio(dir.barrio);
                        if (dir.referencia) setReferencia(dir.referencia);
                        if (dir.indicaciones) setIndicaciones(dir.indicaciones);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:border-brand-500/30 dark:bg-gray-800 dark:text-brand-300"
                    >
                      <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                      <span>{dir.calle} {dir.barrio ? `(${dir.barrio})` : ""}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="calle">Dirección / Calle y número <RequiredMark /></Label>
                  <Input
                    id="calle"
                    placeholder="Ej: Cra 45 # 12-34"
                    value={calle}
                    onChange={(e) => setCalle(e.target.value)}
                    error={!!errors.calle}
                    hint={errors.calle}
                  />
                </div>
                <div>
                  <Label htmlFor="barrio">Barrio o sector</Label>
                  <Input
                    id="barrio"
                    placeholder="Ej: El Poblado / Laureles"
                    value={barrio}
                    onChange={(e) => setBarrio(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="referencia">Apto, casa o referencia</Label>
                  <Input
                    id="referencia"
                    placeholder="Ej: Torre 2, Apto 501"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="indicaciones">Indicaciones para el repartidor</Label>
                  <Input
                    id="indicaciones"
                    placeholder="Ej: Timbre dañado, llamar al llegar"
                    value={indicaciones}
                    onChange={(e) => setIndicaciones(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="costoEnvio">Costo de envío ($)</Label>
                  <Input
                    id="costoEnvio"
                    type="number"
                    min="0"
                    step="500"
                    placeholder="5000"
                    value={costoEnvio}
                    onChange={(e) => setCostoEnvio(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div>
                  <Label htmlFor="repartidor">Repartidor / Mensajero (opcional)</Label>
                  <Input
                    id="repartidor"
                    placeholder="Ej: Javier Moto 04"
                    value={repartidor}
                    onChange={(e) => setRepartidor(e.target.value)}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Paso · Items */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StepBadge n={modalidad === "domicilio" ? 4 : 3} />
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Items del pedido</h2>
              </div>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                + Añadir item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1">
                    {tieneCatalogo ? (
                      <Select
                        key={`cat-${idx}-${it.nombre}`}
                        options={catalogo.map((c) => ({ value: c.id, label: `${c.nombre} (${money(c.precio)})` }))}
                        defaultValue={catalogo.find((c) => c.nombre === it.nombre)?.id ?? ""}
                        placeholder="Elige un item"
                        onChange={(v) => pickCatalogo(idx, v)}
                      />
                    ) : (
                      <Input
                        placeholder="Nombre del item"
                        value={it.nombre}
                        onChange={(e) => setItem(idx, { nombre: e.target.value })}
                      />
                    )}
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      value={it.cantidad}
                      onChange={(e) => setItem(idx, { cantidad: Math.max(1, Number(e.target.value) || 1) })}
                      className={`${inputBase} ${inputOk}`}
                      aria-label="Cantidad"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
                      aria-label="Quitar item"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {tieneCatalogo
                ? "Elige items del catálogo. Puedes dejar el pedido sin items si aún no se define."
                : "Escribe los items del pedido. Puedes dejarlo sin items si aún no se define."}
            </p>
          </section>

          {/* Paso · Método de pago */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <StepBadge n={modalidad === "domicilio" ? 5 : 4} />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Método de pago</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { id: "efectivo", label: "Efectivo", icon: CashIcon },
                { id: "transferencia", label: "Transferencia", icon: TransferIcon },
                { id: "tarjeta", label: "Tarjeta", icon: CardIcon },
                { id: "contra_entrega", label: "Contra entrega", icon: DeliveryHandIcon },
              ].map((mp) => {
                const activo = metodoPago === mp.id;
                const IconComponent = mp.icon;
                return (
                  <button
                    key={mp.id}
                    type="button"
                    onClick={() => setMetodoPago(mp.id as MetodoPago)}
                    className={
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors " +
                      (activo
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                        : "border-gray-200 text-gray-600 hover:border-brand-300 dark:border-gray-700 dark:text-gray-300")
                    }
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className="text-xs font-semibold">{mp.label}</span>
                  </button>
                );
              })}
            </div>

            {(metodoPago === "efectivo" || metodoPago === "contra_entrega") && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pagaCon">¿Con cuánto abona el cliente?</Label>
                  <Input
                    id="pagaCon"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder={`Ej: ${totalPedido > 0 ? Math.ceil(totalPedido / 10000) * 10000 : 50000}`}
                    value={pagaCon}
                    onChange={(e) => setPagaCon(e.target.value)}
                  />
                </div>
                {Number(pagaCon) > 0 && (
                  <div className="flex flex-col justify-end">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800">
                      <p className="text-gray-500 dark:text-gray-400">Cambio a entregar por el repartidor:</p>
                      <p className="text-base font-bold text-success-600 dark:text-success-400">
                        {Number(pagaCon) >= totalPedido
                          ? money(Number(pagaCon) - totalPedido)
                          : `Faltan ${money(totalPedido - Number(pagaCon))}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Paso · Notas + programación */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-2">
              <StepBadge n={modalidad === "domicilio" ? 6 : 5} />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Detalles finales</h2>
            </div>

            <div>
              <Label htmlFor="notas">Notas (opcional)</Label>
              <textarea
                id="notas"
                rows={3}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: sin cebolla, entregar en portería..."
                className={`${inputBase} h-auto ${inputOk}`}
              />
            </div>

            {/* Programar para más tarde (conserva el ProgramarModal).
                Solo se ofrece si la sesión puede gestionar programados. */}
            {puedeProgramar && (
              <div className="mt-5 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">¿Programar para más tarde?</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      El pedido esperará hasta la hora indicada y se activará solo (o puedes activarlo antes).
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
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setShowProgramar(true)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 text-left transition-colors hover:border-brand-300 dark:bg-gray-900 dark:hover:border-brand-700 ${
                        errors.programado ? "border-error-500" : "border-gray-300 dark:border-gray-700"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-brand-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {programadoISO ? (
                          <span className="text-sm font-medium capitalize text-gray-800 dark:text-white/90">
                            {formatFechaHora(programadoISO)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Elegir fecha y hora…</span>
                        )}
                      </span>
                      <span className="text-xs font-medium text-brand-500">Cambiar</span>
                    </button>
                    {errors.programado && <p className="mt-1.5 text-xs text-error-500">{errors.programado}</p>}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* ══ Columna derecha: resumen en vivo (sticky) ══ */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">Resumen del pedido</h2>
            </div>

            <div className="space-y-4 px-5 py-5">
              {/* Estado que tendrá */}
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-gray-400">Entrará como</span>
                {programar && programadoISO ? (
                  <Badge color="light" size="sm">Programado</Badge>
                ) : (
                  <Badge color="info" size="sm">Nuevo</Badge>
                )}
              </div>

              {/* Cliente */}
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-500">Cliente</span>
                <span className="truncate font-medium text-gray-800 dark:text-white/90">
                  {cliente.trim() || <span className="text-gray-400">—</span>}
                </span>
              </div>

              {/* Modalidad */}
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-500">Modalidad</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-gray-800 dark:text-white/90">
                  <span className="text-brand-500"><ModalidadIcon m={modalidad} /></span>
                  {pedidosStore.modalidadLabel(modalidad)}
                </span>
              </div>

              {/* Dirección si es domicilio */}
              {modalidad === "domicilio" && calle.trim() && (
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-gray-500">Entrega</span>
                  <span className="max-w-[170px] text-right font-medium text-gray-800 dark:text-white/90 truncate">
                    {calle}{referencia ? `, ${referencia}` : ""}
                  </span>
                </div>
              )}

              {/* Método de pago */}
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-500">Pago</span>
                <span className="font-medium capitalize text-gray-800 dark:text-white/90">
                  {metodoPago.replace("_", " ")}
                </span>
              </div>

              {/* Programación */}
              {programar && programadoISO && (
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-gray-500">Programado</span>
                  <span className="font-medium capitalize text-gray-800 dark:text-white/90">{formatFechaHora(programadoISO)}</span>
                </div>
              )}

              {/* Items */}
              <div className="border-t border-dashed border-gray-200 pt-4 dark:border-gray-700">
                <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">
                  Items {itemsValidos.length > 0 && `(${itemsValidos.length})`}
                </p>
                {itemsValidos.length === 0 ? (
                  <p className="text-sm text-gray-400">Sin items aún.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {itemsValidos.map((it, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span className="truncate text-gray-700 dark:text-gray-300">
                          {Math.max(1, it.cantidad)}× {it.nombre.trim()}
                        </span>
                        {it.precio !== undefined && (
                          <span className="shrink-0 text-gray-500 dark:text-gray-400">
                            {money(it.precio * Math.max(1, it.cantidad))}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Desglose Subtotal + Envío */}
              <div className="border-t border-dashed border-gray-200 pt-3 text-xs space-y-1 dark:border-gray-700">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Subtotal productos</span>
                  <span>{money(subtotalItems)}</span>
                </div>
                {modalidad === "domicilio" && (
                  <div className="flex justify-between text-gray-500 dark:text-gray-400">
                    <span>Costo de envío</span>
                    <span>{costoEnvioEfectivo > 0 ? money(costoEnvioEfectivo) : "Gratis"}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              {totalPedido > 0 && (
                <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-base font-semibold dark:border-gray-800">
                  <span className="text-gray-800 dark:text-white/90">Total</span>
                  <span className="text-gray-800 dark:text-white/90">{money(totalPedido)}</span>
                </div>
              )}

              {/* Vuelto / Cambio */}
              {(metodoPago === "efectivo" || metodoPago === "contra_entrega") && Number(pagaCon) > 0 && (
                <div className="rounded-xl bg-success-50 p-2.5 text-xs dark:bg-success-500/10">
                  <div className="flex justify-between text-success-700 dark:text-success-300">
                    <span>Abona con:</span>
                    <span>{money(Number(pagaCon))}</span>
                  </div>
                  <div className="flex justify-between font-bold text-success-800 dark:text-success-200 mt-0.5">
                    <span>Cambio:</span>
                    <span>
                      {Number(pagaCon) >= totalPedido
                        ? money(Number(pagaCon) - totalPedido)
                        : `Faltan ${money(totalPedido - Number(pagaCon))}`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Acción */}
            <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
              <Button className="w-full" size="md" onClick={handleCreate} disabled={!puedeCrear}>
                {programar && puedeProgramar ? "Programar pedido" : "Crear pedido"}
              </Button>
              {!puedeCrear && (
                <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                  {motivoSinPermiso("orders.create")}
                </p>
              )}
              <button
                type="button"
                onClick={() => navigate("/pedidos")}
                className="mt-2 w-full text-center text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                Cancelar
              </button>
            </div>
          </div>
        </aside>
      </div>

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
    </>
  );
});

export default CrearPedidoPage;
