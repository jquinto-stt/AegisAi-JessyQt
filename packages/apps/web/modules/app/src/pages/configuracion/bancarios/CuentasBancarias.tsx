import { useEffect, useState, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import {
  Check,
  Copy,
  Landmark,
  Plus,
  ShieldCheck,
  Smartphone,
  Trash2,
  Wallet,
  CreditCard,
  Building2,
  Briefcase,
  FileText,
  Clock,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

import { Input } from "@/elements/form/input";
import { organizacionStore } from "@/stores/organizacion.store";
import type { CuentaBancariaRegistrada } from "@/stores/organizacion.store";
import { BANCOS, BILLETERAS, medioPorNombre, type MedioPago } from "./medios-pago";
import { reiniciarBancariosEnSesion } from "./VerificacionBancariaGate";

const OTRO = "otro";
const TIPOS_CUENTA = [
  { valor: "Cuenta de ahorros", etiqueta: "Ahorros" },
  { valor: "Cuenta corriente", etiqueta: "Corriente" },
];
const TIPO_BILLETERA = "Billetera digital";

interface Borrador {
  medio: string;
  otroBanco: string;
  tipoCuenta: string;
  numero: string;
  titular: string;
}

const BORRADOR_VACIO: Borrador = {
  medio: "",
  otroBanco: "",
  tipoCuenta: TIPOS_CUENTA[0].valor,
  numero: "",
  titular: "",
};

const enmascarar = (numero: string) => {
  const digitos = numero.replace(/\D/g, "");
  return digitos.length > 4 ? `•••• ${digitos.slice(-4)}` : numero;
};

// ── Ficha de logo del banco ──────────────────────────────────────────────────

const LogoMedio = ({
  medio,
  tamano = "md",
}: {
  medio?: MedioPago;
  tamano?: "sm" | "md" | "lg";
}) => {
  const tamClases = {
    sm: "size-8 rounded-lg",
    md: "size-12 rounded-xl",
    lg: "size-14 rounded-2xl",
  }[tamano];

  if (!medio) {
    return (
      <span
        className={`${tamClases} flex shrink-0 items-center justify-center bg-[#ECECEC] text-[#212121]/60 dark:bg-white/10 dark:text-gray-300`}
        aria-hidden="true"
      >
        <Landmark className="size-6" />
      </span>
    );
  }

  if (medio.logo) {
    return (
      <img
        src={medio.logo}
        alt={medio.nombre}
        className={`${tamClases} shrink-0 object-contain bg-white ring-1 ring-black/5 shadow-xs`}
      />
    );
  }

  return (
    <span
      className={`${tamClases} flex shrink-0 items-center justify-center font-bold tracking-tight shadow-xs ring-1 ring-black/5 ${
        medio.sigla.length > 2 ? "text-[12px]" : "text-[16px]"
      }`}
      style={{ backgroundColor: medio.fondo, color: medio.texto }}
      aria-hidden="true"
    >
      {medio.sigla}
    </span>
  );
};

// ── Tarjeta de Cuenta Corporativa ───────────────────────────────────────────

const TarjetaCuentaCorporativa = observer(({
  cuenta,
  indice,
  esPrincipal,
}: {
  cuenta: CuentaBancariaRegistrada;
  indice: number;
  esPrincipal: boolean;
  totalCuentas: number;
}) => {
  const [copiado, setCopiado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const medio = medioPorNombre(cuenta.banco);

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(t);
  }, [copiado]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(cuenta.numero);
      setCopiado(true);
    } catch {
      // Fallback
    }
  };

  const titular = cuenta.titular || organizacionStore.organizacion?.nombre || "Comercio Registrado";
  const esBilletera = cuenta.tipoCuenta === TIPO_BILLETERA;

  return (
    <div className="flex flex-col w-full transition-all duration-200 font-['DM_Sans',sans-serif]">
      {/* Cinta superior institucional para la cuenta principal */}
      {esPrincipal && (
        <div className="bg-[#190088] text-white px-6 py-2.5 rounded-t-2xl flex flex-wrap items-center justify-between text-[12px] font-bold border-t border-x border-[#190088]">
          <div className="flex items-center gap-2 tracking-wide uppercase">
            <CheckCircle2 className="size-4 text-[#97D6DF]" />
            <span>Cuenta Principal de Liquidaciones & Recaudos</span>
          </div>
          <span className="text-[12px] font-normal text-white/80 hidden sm:inline">
            Dispersión automática prioritaria en 24h
          </span>
        </div>
      )}

      {/* Cuerpo de la tarjeta */}
      <div
        className={`bg-white dark:bg-[#16171d] p-6 sm:p-7 shadow-sm transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
          esPrincipal
            ? "rounded-b-2xl border-2 border-t-0 border-[#190088] dark:border-[#97D6DF]/60"
            : "rounded-2xl border border-[#ECECEC] dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
        }`}
      >
        {/* Columna Izquierda: Logo de Banco, Tipo e Identificación */}
        <div className="flex items-start sm:items-center gap-4 shrink-0 lg:w-56">
          <LogoMedio medio={medio} tamano="lg" />
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-[#212121] dark:text-white leading-tight">
              {cuenta.banco}
            </span>
            <span className="text-[12px] font-light text-[#212121]/60 dark:text-gray-400 mt-0.5">
              {cuenta.tipoCuenta}
            </span>
            <span className="font-mono text-[14px] font-bold text-[#190088] dark:text-[#97D6DF] mt-1">
              {enmascarar(cuenta.numero)}
            </span>
          </div>
        </div>

        {/* Columna Central: Datos de Operación y Especificaciones */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-[20px] font-bold text-[#190088] dark:text-white leading-tight">
              {cuenta.banco}
            </h3>
            {esPrincipal ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#EFE6D3] dark:bg-white/10 text-[12px] font-bold uppercase tracking-wider text-[#190088] dark:text-[#97D6DF]">
                Cuenta Primaria
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-[12px] font-normal text-[#212121]/60 dark:text-gray-400">
                Cuenta Alterna
              </span>
            )}
          </div>

          <p className="text-[14px] font-light text-[#212121]/70 dark:text-gray-300">
            {esBilletera
              ? "Billetera digital habilitada para recaudo y dispersión inmediata."
              : "Cuenta bancaria nacional habilitada para compensación y recaudos de paquetería."}
          </p>

          {/* Especificaciones técnicas */}
          <ul className="mt-2 space-y-1.5 text-[14px] text-[#212121] dark:text-gray-200">
            <li className="flex items-center gap-2">
              <Check className="size-4 text-[#190088] dark:text-[#97D6DF] shrink-0 stroke-[2.5]" />
              <span>
                Dispersión automática de recaudos contraentrega en <strong>24 horas hábiles</strong>.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-[#190088] dark:text-[#97D6DF] shrink-0 stroke-[2.5]" />
              <span>
                Titular certificado: <strong>{titular}</strong>
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-[#190088] dark:text-[#97D6DF] shrink-0 stroke-[2.5]" />
              <span>
                Sin costos de comisión por transferencia en liquidaciones de Necto.
              </span>
            </li>
          </ul>
        </div>

        {/* Columna Derecha: Acciones operativas */}
        <div className="flex flex-col items-start lg:items-end justify-between shrink-0 gap-3 border-t lg:border-t-0 lg:border-l border-[#ECECEC] dark:border-white/10 pt-4 lg:pt-0 lg:pl-6 min-w-[210px]">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECECEC]/60 dark:bg-white/10 text-[12px] font-bold text-[#212121] dark:text-gray-300">
            <ShieldCheck className="size-4 text-[#190088] dark:text-[#97D6DF]" />
            <span>Operativa & Verificada</span>
          </div>

          <div className="flex flex-col w-full gap-2 mt-1">
            <button
              type="button"
              onClick={copiar}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#190088] hover:bg-[#120066] text-white text-[14px] font-bold shadow-sm transition-all cursor-pointer active:scale-95"
            >
              {copiado ? (
                <>
                  <Check className="size-4" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  <span>Copiar número</span>
                </>
              )}
            </button>

            {!esPrincipal && (
              <button
                type="button"
                onClick={() => organizacionStore.marcarCuentaPrincipal(cuenta.id)}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-[#ECECEC] dark:border-white/15 hover:bg-gray-100 dark:hover:bg-white/5 text-[14px] font-normal text-[#212121] dark:text-gray-300 transition-all cursor-pointer"
              >
                <span>Hacer principal</span>
              </button>
            )}
          </div>

          {confirmando ? (
            <div className="flex items-center gap-2 text-[12px]">
              <span className="font-bold text-red-600">¿Eliminar?</span>
              <button
                type="button"
                onClick={() => organizacionStore.eliminarCuentaBancaria(cuenta.id)}
                className="px-2 py-0.5 rounded bg-red-600 text-white font-bold cursor-pointer"
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setConfirmando(false)}
                className="px-2 py-0.5 rounded border border-gray-300 text-gray-600 cursor-pointer"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              className="text-[12px] font-light text-[#212121]/50 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              <span>Eliminar cuenta</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Formulario de Vinculación ───────────────────────────────────────────────

const FormularioNuevaCuenta = ({
  onGuardar,
  onCancelar,
}: {
  onGuardar: (b: Borrador) => void;
  onCancelar: () => void;
}) => {
  const [b, setB] = useState<Borrador>(BORRADOR_VACIO);
  const set = <K extends keyof Borrador>(campo: K, valor: Borrador[K]) =>
    setB((prev) => ({ ...prev, [campo]: valor }));

  const medio = BILLETERAS.concat(BANCOS).find((m) => m.id === b.medio);
  const billetera = Boolean(medio?.billetera);
  const nombreMedio = b.medio === OTRO ? b.otroBanco.trim() || "Otro banco" : medio?.nombre ?? "";
  const valido =
    b.medio !== "" &&
    (b.medio !== OTRO || b.otroBanco.trim().length > 1) &&
    b.numero.replace(/\D/g, "").length >= (billetera ? 10 : 6);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valido) onGuardar({ ...b, medio: b.medio === OTRO ? b.otroBanco.trim() : nombreMedio });
      }}
      className="p-6 sm:p-8 rounded-3xl border border-[#ECECEC] dark:border-white/10 bg-white dark:bg-[#16171d] shadow-xl space-y-6 animate-aparecer font-['DM_Sans',sans-serif]"
    >
      <div className="flex items-center justify-between border-b border-[#ECECEC] dark:border-white/10 pb-4">
        <div>
          <h3 className="text-[24px] font-bold text-[#190088] dark:text-white">
            Vincular nueva cuenta bancaria
          </h3>
          <p className="text-[14px] font-light text-[#212121]/70 dark:text-gray-300">
            Ingresa los datos de la cuenta o billetera digital para recibir tus liquidaciones.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          className="text-[14px] font-bold text-gray-400 hover:text-gray-700 dark:hover:text-white"
        >
          Cerrar
        </button>
      </div>

      {/* Billeteras */}
      <div>
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[#190088] dark:text-[#97D6DF]">
          Billeteras Digitales
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {BILLETERAS.map((m) => {
            const activo = b.medio === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => set("medio", m.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activo
                    ? "border-2 border-[#190088] dark:border-[#97D6DF] bg-[#EFE6D3]/40 dark:bg-white/10 shadow-xs"
                    : "border-[#ECECEC] dark:border-white/10 hover:border-gray-400 bg-white dark:bg-white/5"
                }`}
              >
                <LogoMedio medio={m} tamano="sm" />
                <span className="text-[14px] font-bold text-[#212121] dark:text-white">
                  {m.nombre}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bancos */}
      <div>
        <p className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[#190088] dark:text-[#97D6DF]">
          Bancos Tradicionales
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {BANCOS.map((m) => {
            const activo = b.medio === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => set("medio", m.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  activo
                    ? "border-2 border-[#190088] dark:border-[#97D6DF] bg-[#EFE6D3]/40 dark:bg-white/10 shadow-xs"
                    : "border-[#ECECEC] dark:border-white/10 hover:border-gray-400 bg-white dark:bg-white/5"
                }`}
              >
                <LogoMedio medio={m} tamano="sm" />
                <span className="text-[14px] font-bold text-[#212121] dark:text-white truncate">
                  {m.nombre}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => set("medio", OTRO)}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
              b.medio === OTRO
                ? "border-2 border-[#190088] dark:border-[#97D6DF] bg-[#EFE6D3]/40 dark:bg-white/10 shadow-xs"
                : "border-[#ECECEC] dark:border-white/10 hover:border-gray-400 bg-white dark:bg-white/5"
            }`}
          >
            <span className="size-8 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-white/10 text-gray-500">
              <Landmark className="size-4" />
            </span>
            <span className="text-[14px] font-bold text-[#212121] dark:text-white">
              Otro banco
            </span>
          </button>
        </div>
      </div>

      {/* Inputs */}
      {b.medio !== "" && (
        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-[#ECECEC] dark:border-white/10 space-y-4 animate-aparecer">
          {b.medio === OTRO && (
            <div>
              <label className="block text-[12px] font-bold text-[#212121] dark:text-white mb-1">
                Nombre de la entidad bancaria
              </label>
              <Input
                value={b.otroBanco}
                placeholder="Ej. Banco Agrario, Banco Falabella"
                onChange={(e) => set("otroBanco", e.target.value)}
              />
            </div>
          )}

          {!billetera && (
            <div>
              <label className="block text-[12px] font-bold text-[#212121] dark:text-white mb-1">
                Tipo de cuenta
              </label>
              <div className="flex gap-2">
                {TIPOS_CUENTA.map((t) => (
                  <button
                    key={t.valor}
                    type="button"
                    onClick={() => set("tipoCuenta", t.valor)}
                    className={`px-4 py-2 rounded-xl text-[14px] font-bold transition-all cursor-pointer ${
                      b.tipoCuenta === t.valor
                        ? "bg-[#190088] text-white shadow-xs"
                        : "border border-[#ECECEC] dark:border-white/10 bg-white dark:bg-white/5 text-[#212121] dark:text-gray-300"
                    }`}
                  >
                    {t.etiqueta}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-[#212121] dark:text-white mb-1">
                {billetera ? `Número de celular (${nombreMedio})` : "Número de cuenta"}
              </label>
              <Input
                type="tel"
                value={b.numero}
                placeholder={billetera ? "Ej. 300 123 4567" : "Ej. 001 793431 93"}
                onChange={(e) => set("numero", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-[#212121] dark:text-white mb-1">
                Nombre del titular <span className="font-light text-gray-400">(opcional)</span>
              </label>
              <Input
                value={b.titular}
                placeholder="Ej. Mi Tienda S.A.S / Nombre completo"
                onChange={(e) => set("titular", e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#ECECEC] dark:border-white/10">
        <button
          type="button"
          onClick={onCancelar}
          className="px-5 py-2.5 rounded-xl border border-[#ECECEC] dark:border-white/15 text-[14px] font-normal text-[#212121] dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!valido}
          className="px-7 py-2.5 rounded-xl bg-[#190088] hover:bg-[#120066] text-white text-[14px] font-bold shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Guardar cuenta bancaria
        </button>
      </div>
    </form>
  );
};

// ── PANTALLA PRINCIPAL ──────────────────────────────────────────────────────

export const CuentasBancarias = observer(() => {
  const cuentas = organizacionStore.organizacion?.cuentasBancarias ?? [];
  const [tabActiva, setTabActiva] = useState<"ahorros" | "corrientes" | "billeteras">("corrientes");
  const [agregando, setAgregando] = useState(false);

  // Asegurar cuentas iniciales si está vacío
  useEffect(() => {
    if (cuentas.length === 0 && organizacionStore.tieneOrganizacion) {
      organizacionStore.agregarCuentaBancaria({
        ambito: "local",
        banco: "Bancolombia",
        tipoCuenta: "Cuenta corriente",
        numero: "04892418291",
        titular: organizacionStore.organizacion?.nombre || "Empresa Titular",
        principal: true,
      });
      organizacionStore.agregarCuentaBancaria({
        ambito: "local",
        banco: "Banco de Bogotá",
        tipoCuenta: "Cuenta de ahorros",
        numero: "18492019481",
        titular: organizacionStore.organizacion?.nombre || "Empresa Titular",
        principal: false,
      });
    }
  }, [cuentas.length]);

  const guardar = (b: Borrador) => {
    const billetera = Boolean(medioPorNombre(b.medio)?.billetera);
    organizacionStore.agregarCuentaBancaria({
      ambito: "local",
      banco: b.medio,
      tipoCuenta: billetera ? TIPO_BILLETERA : b.tipoCuenta,
      numero: b.numero.trim(),
      titular: b.titular.trim(),
      principal: cuentas.length === 0,
    });
    setAgregando(false);
  };

  // Filtrado de cuentas
  const cuentasFiltradas = cuentas.filter((c) => {
    if (tabActiva === "ahorros") return c.tipoCuenta.toLowerCase().includes("ahorro");
    if (tabActiva === "corrientes") return c.tipoCuenta.toLowerCase().includes("corriente");
    if (tabActiva === "billeteras") return c.tipoCuenta === TIPO_BILLETERA;
    return true;
  });

  return (
    <div className="flex flex-col gap-12 w-full font-['DM_Sans',sans-serif] pb-12">
      {/* ── HERO BANNER EXACTO AL DE LA REFERENCIA ─────────────────────────── */}
      <div className="relative">
        <div className="relative rounded-[32px] bg-gradient-to-r from-[#0d2861] via-[#0f2f70] to-[#0d2963] text-white p-8 sm:p-11 pb-20 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            {/* Lado Izquierdo: Textos y datos */}
            <div className="flex flex-col gap-4 max-w-xl">
              {/* Badge superior "ONLINE BANKING" con icono de punto central */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0b204f]/90 border border-white/10 text-white text-[12px] font-bold w-fit shadow-xs">
                <span className="flex size-3.5 items-center justify-center rounded-full border-[2px] border-white">
                  <span className="size-1.5 rounded-full bg-white" />
                </span>
                <span className="tracking-wider uppercase text-[11px]">ONLINE BANKING</span>
              </div>

              {/* Título exacto con salto de línea y color Cyan (#48b3fe) resaltado */}
              <h1 className="text-[34px] sm:text-[40px] font-bold tracking-tight text-white leading-[1.15] font-['DM_Sans',sans-serif]">
                Best 5 <span className="text-[#48b3fe]">Checking Accounts</span>
                <br className="hidden sm:inline" /> Companies in 2026
              </h1>

              {/* Metadata de fecha y aviso legal */}
              <div className="flex flex-wrap items-center gap-5 text-[13px] text-white/80 font-normal">
                <span className="flex items-center gap-1.5">
                  <span className="flex size-4 items-center justify-center rounded-full bg-white text-[#0d2861]">
                    <Check className="size-2.5 stroke-[3.5]" />
                  </span>
                  <span>Updated: October 7, 2026</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="size-4 text-white/80" />
                  <span>Advertiser Disclosure</span>
                </span>
              </div>

              {/* Párrafo explicativo */}
              <p className="text-[14px] font-light text-white/85 leading-relaxed max-w-lg mt-0.5">
                Checking accounts provide a convenient way to manage daily expenses and transactions.
                They typically offer features like debit cards, online banking, and check-writing capabilities.
              </p>
            </div>

            {/* Lado Derecho: Mujer sonriendo con celular y tooltip de Current Balance */}
            <div className="relative flex items-end justify-center lg:justify-end shrink-0 lg:w-[420px] min-h-[260px]">
              {/* Tooltip flotante "CURRENT BALANCE: $ 10,000" */}
              <div className="absolute left-2 sm:-left-4 top-4 z-20 flex flex-col bg-white text-[#212121] px-5 py-3 rounded-2xl shadow-2xl border border-gray-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-['DM_Sans',sans-serif]">
                  CURRENT BALANCE
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#10b981] text-white text-[11px] font-bold">
                    $
                  </span>
                  <span className="text-[22px] font-bold text-[#111827] leading-none tracking-tight font-['DM_Sans',sans-serif]">
                    10,000
                  </span>
                </div>

                {/* Flecha curva dibujada estilo chalk apuntando hacia el tooltip */}
                <svg
                  className="absolute -bottom-14 right-1 w-14 h-14 pointer-events-none drop-shadow-sm"
                  viewBox="0 0 60 60"
                  fill="none"
                >
                  <path
                    d="M 12 52 C 28 48, 44 40, 48 16"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 38 18 C 44 14, 48 12, 48 12 C 48 12, 51 20, 52 24"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Imagen de la profesional recortada en el hero */}
              <div className="relative w-64 h-68 sm:w-72 sm:h-72 overflow-hidden rounded-b-2xl">
                <img
                  src="/images/banking_hero_woman.jpg"
                  alt="Online Banking Professional"
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── TABS VERTICALES QUE CUELGAN EN EL BORDE INFERIOR DEL BANNER ── */}
          <div className="absolute -bottom-10 left-6 sm:left-12 flex items-center gap-3.5 z-30">
            {/* Tab 1: Savings Accounts */}
            <button
              type="button"
              onClick={() => setTabActiva("ahorros")}
              className={`flex flex-col items-center justify-center min-w-[125px] sm:min-w-[145px] py-3.5 px-4 rounded-2xl bg-white dark:bg-[#16171d] shadow-lg border transition-all cursor-pointer ${
                tabActiva === "ahorros"
                  ? "border-2 border-[#1E5BF0] dark:border-[#97D6DF] text-[#1E5BF0] dark:text-[#97D6DF] ring-2 ring-[#1E5BF0]/15"
                  : "border-[#ECECEC] dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-gray-300"
              }`}
            >
              <Wallet className={`size-6 ${tabActiva === "ahorros" ? "text-[#1E5BF0] dark:text-[#97D6DF]" : "text-gray-400 dark:text-gray-400"}`} />
              <span className={`text-[13px] font-bold mt-1.5 leading-tight text-center ${tabActiva === "ahorros" ? "text-[#1E5BF0] dark:text-[#97D6DF]" : "text-gray-600 dark:text-gray-300"}`}>
                Savings Accounts
              </span>
            </button>

            {/* Tab 2: Checking Accounts (Activo con borde azul y checkmark superior) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setTabActiva("corrientes")}
                className={`flex flex-col items-center justify-center min-w-[125px] sm:min-w-[145px] py-3.5 px-4 rounded-2xl bg-white dark:bg-[#16171d] shadow-lg border transition-all cursor-pointer ${
                  tabActiva === "corrientes"
                    ? "border-2 border-[#1E5BF0] dark:border-[#97D6DF] text-[#1E5BF0] dark:text-[#97D6DF] ring-2 ring-[#1E5BF0]/15"
                    : "border-[#ECECEC] dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-gray-300"
                }`}
              >
                <FileText className={`size-6 ${tabActiva === "corrientes" ? "text-[#1E5BF0] dark:text-[#97D6DF]" : "text-gray-400 dark:text-gray-400"}`} />
                <span className={`text-[13px] font-bold mt-1.5 leading-tight text-center ${tabActiva === "corrientes" ? "text-[#1E5BF0] dark:text-[#97D6DF]" : "text-gray-600 dark:text-gray-300"}`}>
                  Checking Accounts
                </span>
              </button>
              {tabActiva === "corrientes" && (
                <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-[#1E5BF0] text-white shadow-xs">
                  <Check className="size-3 stroke-[3]" />
                </span>
              )}
            </div>

            {/* Tab 3: Business Banking */}
            <button
              type="button"
              onClick={() => setTabActiva("billeteras")}
              className={`flex flex-col items-center justify-center min-w-[125px] sm:min-w-[145px] py-3.5 px-4 rounded-2xl bg-white dark:bg-[#16171d] shadow-lg border transition-all cursor-pointer ${
                tabActiva === "billeteras"
                  ? "border-2 border-[#1E5BF0] dark:border-[#97D6DF] text-[#1E5BF0] dark:text-[#97D6DF] ring-2 ring-[#1E5BF0]/15"
                  : "border-[#ECECEC] dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-gray-300"
              }`}
            >
              <Briefcase className={`size-6 ${tabActiva === "billeteras" ? "text-[#1E5BF0] dark:text-[#97D6DF]" : "text-gray-400 dark:text-gray-400"}`} />
              <span className={`text-[13px] font-bold mt-1.5 leading-tight text-center ${tabActiva === "billeteras" ? "text-[#1E5BF0] dark:text-[#97D6DF]" : "text-gray-600 dark:text-gray-300"}`}>
                Business Banking
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Espaciador para la solapa de tabs */}
      <div className="h-6" />

      {/* Acciones superiores: botón dev de reinicio y vincular cuenta */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            reiniciarBancariosEnSesion(organizacionStore.organizacion?.id);
            organizacionStore.reiniciarVerificacion();
          }}
          title="Reiniciar proceso de verificación para pruebas de desarrollo"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-[#FF3F1A]/50 bg-[#FF3F1A]/5 hover:bg-[#FF3F1A] hover:text-white hover:border-transparent text-[12px] font-bold text-[#FF3F1A] transition-all cursor-pointer shadow-2xs"
        >
          <RotateCcw className="size-3.5" />
          <span>Reiniciar verificación (dev)</span>
        </button>

        <button
          type="button"
          onClick={() => setAgregando((prev) => !prev)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#ECECEC] dark:border-white/15 bg-white dark:bg-[#16171d] hover:border-[#190088] text-[14px] font-bold text-[#190088] dark:text-white transition-all cursor-pointer shadow-xs"
        >
          <Plus className="size-4" />
          <span>Vincular nueva cuenta</span>
        </button>
      </div>

      {/* Formulario si está agregando */}
      {agregando && (
        <FormularioNuevaCuenta
          onGuardar={guardar}
          onCancelar={() => setAgregando(false)}
        />
      )}

      {/* ── LISTADO DE CUENTAS EN ESTILO CORPORATIVO ──────────────────────── */}
      <div className="flex flex-col gap-6">
        {cuentasFiltradas.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-[#ECECEC] dark:border-white/10 bg-white/50 dark:bg-white/5">
            <p className="text-[16px] font-bold text-[#190088] dark:text-white">
              No hay cuentas registradas en esta categoría
            </p>
            <p className="text-[14px] font-light text-gray-500 mt-1">
              Selecciona otra categoría o vincula una nueva cuenta bancaria.
            </p>
          </div>
        ) : (
          cuentasFiltradas.map((cuenta, idx) => (
            <TarjetaCuentaCorporativa
              key={cuenta.id}
              cuenta={cuenta}
              indice={idx}
              esPrincipal={cuenta.principal}
              totalCuentas={cuentas.length}
            />
          ))
        )}
      </div>

      {/* ── INFORMACIÓN INFERIOR INSTITUCIONAL ──────────────────────────────── */}
      <div className="bg-white dark:bg-[#16171d] rounded-2xl p-8 border border-[#ECECEC] dark:border-white/10 shadow-xs flex flex-col gap-6 text-left">
        <div>
          <h2 className="text-[20px] font-bold text-[#190088] dark:text-white">
            Operativa de Cuentas y Liquidación de Fondos
          </h2>
          <p className="text-[14px] font-light text-[#212121]/75 dark:text-gray-300 mt-1.5 leading-relaxed">
            Las cuentas bancarias registradas en este apartado reciben automáticamente la dispersión de
            los recaudos generados por entregas contraentrega y pagos digitales. Toda transacción se realiza
            a través de canales financieros certificados y regulados.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-[#ECECEC] dark:border-white/10">
          <div>
            <h3 className="text-[14px] font-bold text-[#190088] dark:text-[#97D6DF] mb-1">
              Entidades Financieras
            </h3>
            <p className="text-[12px] font-light text-[#212121]/70 dark:text-gray-300">
              Compatibilidad con la red ACH nacional y transferencias inmediatas a billeteras autorizadas.
            </p>
          </div>

          <div>
            <h3 className="text-[14px] font-bold text-[#190088] dark:text-[#97D6DF] mb-1">
              Ciclos de Dispersión
            </h3>
            <p className="text-[12px] font-light text-[#212121]/70 dark:text-gray-300">
              Liquidación automática consolidada a las 24 horas hábiles tras la entrega efectiva de la guía.
            </p>
          </div>

          <div>
            <h3 className="text-[14px] font-bold text-[#190088] dark:text-[#97D6DF] mb-1">
              Seguridad y Cifrado
            </h3>
            <p className="text-[12px] font-light text-[#212121]/70 dark:text-gray-300">
              Cifrado bancario en reposo y en tránsito. Necto solo realiza abonos autorizados a tus cuentas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default CuentasBancarias;
