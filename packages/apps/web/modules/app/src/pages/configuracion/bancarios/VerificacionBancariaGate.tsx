import { useState, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { Link } from "react-router";
import { ShieldCheck, FileText, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";

import { organizacionStore } from "@/stores/organizacion.store";
import { Input } from "@/elements/form/input";
import { nuevoCodigo } from "../verificacion/codigo";

type PantallaVerificacion = "entrada" | "terminos" | "codigo";

const CLAVE_SESSION = (orgId?: string) => `necto_bancarios_verificado_${orgId || "default"}`;

export function estaBancariosVerificadoEnSesion(orgId?: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(CLAVE_SESSION(orgId)) === "true";
  } catch {
    return false;
  }
}

export function marcarBancariosVerificadoEnSesion(orgId?: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CLAVE_SESSION(orgId), "true");
  } catch {
    // Fallback
  }
}

export interface VerificacionBancariaGateProps {
  children: ReactNode;
}

export const VerificacionBancariaGate = observer(({ children }: VerificacionBancariaGateProps) => {
  const org = organizacionStore.organizacion;
  const guardada = org?.verificacion;

  // Verificación por sesión: al cerrar sesión o cerrar pestaña, vuelve a pedir comprobación
  const [verificadoEnSesion, setVerificadoEnSesion] = useState(() =>
    estaBancariosVerificadoEnSesion(org?.id),
  );

  const [pantalla, setPantalla] = useState<PantallaVerificacion>("entrada");
  const [aceptaTerminos, setAceptaTerminos] = useState(Boolean(guardada?.terminosAceptadosEn));

  const [codigoEsperado, setCodigoEsperado] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);

  const correo =
    organizacionStore.usuario?.email ??
    org?.datosFiscales?.correoFacturacion ??
    "tu-correo@empresa.com";

  // Si ya está verificado en la sesión activa, muestra la vista completa de Cuentas Bancarias
  if (verificadoEnSesion) {
    return <>{children}</>;
  }

  const iniciarVerificacion = () => {
    setPantalla("terminos");
  };

  // Directo de términos a enviar el código
  const aceptarTerminosYEnviarCodigo = () => {
    organizacionStore.actualizarVerificacion({ terminosAceptadosEn: new Date().toISOString() });
    const cod = nuevoCodigo();
    setCodigoEsperado(cod);
    setCodigo("");
    setErrorCodigo(null);
    organizacionStore.actualizarVerificacion({
      correo,
      codigoEnviadoEn: new Date().toISOString(),
    });
    setPantalla("codigo");
  };

  const confirmarCodigo = () => {
    if (!codigoEsperado || codigo.trim().toUpperCase() !== codigoEsperado) {
      setErrorCodigo("El código no coincide. Revisa el que se generó o pide uno nuevo.");
      return;
    }

    setErrorCodigo(null);
    // Aprueba la sesión activa y guarda la verificación
    marcarBancariosVerificadoEnSesion(org?.id);
    setVerificadoEnSesion(true);
    organizacionStore.actualizarVerificacion({
      verificadoEn: new Date().toISOString(),
      estado: "aprobado",
    });
  };

  // ── 1. ENTRADA ────────────────────────────────────────────────────────────
  if (pantalla === "entrada") {
    return (
      <div className="flex flex-col gap-8 w-full max-w-4xl font-['DM_Sans',sans-serif] pb-12">
        <div className="bg-white dark:bg-[#16171d] rounded-3xl p-7 sm:p-10 border border-[#ECECEC] dark:border-white/10 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#190088]/10 text-[#190088] dark:bg-white/10 dark:text-[#97D6DF]">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <h1 className="text-[24px] font-bold text-[#190088] dark:text-white leading-tight">
                Registrar documentos del negocio
              </h1>
              <p className="text-[14px] font-light text-[#212121]/80 dark:text-gray-300 mt-0.5">
                Antes de operar con datos fiscales y retiros, necesitamos conocerte. Pueden ser documentos de persona natural o jurídica.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#ECECEC] bg-[#F6F7F9] dark:bg-white/5 dark:border-white/10 p-6">
            <ul className="space-y-3 text-[14px] font-normal leading-relaxed text-[#212121]/80 dark:text-gray-300">
              <li className="flex items-start gap-2.5">
                <span className="text-[#190088] dark:text-[#97D6DF] font-bold">•</span>
                <span><strong>Revisión manual:</strong> una persona del equipo revisa cada documento.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#190088] dark:text-[#97D6DF] font-bold">•</span>
                <span>Los archivos se piden una sola vez y quedan asociados a tu organización.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-[#190088] dark:text-[#97D6DF] font-bold">•</span>
                <span>El proceso suele tardar hasta 5 días hábiles.</span>
              </li>
            </ul>

            <div className="mt-6 flex items-center justify-start">
              <button
                type="button"
                onClick={iniciarVerificacion}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#190088] hover:bg-[#120066] text-white text-[14px] font-bold shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <span>Registrar documentos</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 2. TÉRMINOS ───────────────────────────────────────────────────────────
  if (pantalla === "terminos") {
    return (
      <div className="flex flex-col gap-8 w-full max-w-4xl font-['DM_Sans',sans-serif] pb-12">
        <div className="bg-white dark:bg-[#16171d] rounded-3xl p-7 sm:p-10 border border-[#ECECEC] dark:border-white/10 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#190088]/10 text-[#190088] dark:bg-white/10 dark:text-[#97D6DF]">
              <FileText className="size-6" />
            </span>
            <div>
              <h2 className="text-[24px] font-bold text-[#190088] dark:text-white leading-tight">
                Tratamiento de tus datos
              </h2>
              <p className="text-[14px] font-light text-[#212121]/80 dark:text-gray-300 mt-0.5">
                Para verificar la identidad del negocio necesitamos tratar datos personales. Esto es lo que se pide y por qué.
              </p>
            </div>
          </div>

          <div className="space-y-4 text-[14px] font-normal leading-relaxed text-[#212121]/80 dark:text-gray-300">
            <div className="p-4 rounded-xl border border-[#ECECEC] dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
              <p className="font-bold text-[#190088] dark:text-[#97D6DF] text-[14px]">Qué se recoge:</p>
              <p className="font-light mt-1 text-[14px]">
                Nombre o razón social, tipo y número de documento, correo electrónico, foto del rostro, documento de identidad y comprobante de dirección.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#ECECEC] dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
              <p className="font-bold text-[#190088] dark:text-[#97D6DF] text-[14px]">Para qué:</p>
              <p className="font-light mt-1 text-[14px]">
                Confirmar que el negocio existe y que quien lo registra es su titular. Sin esto no se habilitan retiros ni datos fiscales.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#ECECEC] dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
              <p className="font-bold text-[#190088] dark:text-[#97D6DF] text-[14px]">Cuánto se guarda:</p>
              <p className="font-light mt-1 text-[14px]">
                Mientras la organización esté activa. Puedes pedir la eliminación desde soporte.
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#ECECEC] dark:border-white/10 p-5 text-[14px] leading-relaxed bg-white dark:bg-white/5">
            <input
              type="checkbox"
              checked={aceptaTerminos}
              onChange={(e) => setAceptaTerminos(e.target.checked)}
              className="mt-1 size-4 accent-[#190088] rounded cursor-pointer"
            />
            <span className="text-[#212121] dark:text-gray-200">
              He leído y acepto los{" "}
              <Link to="/terminos" className="font-bold text-[#190088] dark:text-[#97D6DF] hover:underline">
                términos y condiciones
              </Link>{" "}
              y la{" "}
              <Link to="/privacidad" className="font-bold text-[#190088] dark:text-[#97D6DF] hover:underline">
                política de tratamiento de datos
              </Link>
              .
            </span>
          </label>

          <div className="flex items-center justify-between pt-4 border-t border-[#ECECEC] dark:border-white/10">
            <button
              type="button"
              onClick={() => setPantalla("entrada")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#ECECEC] dark:border-white/15 text-[14px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              <ArrowLeft className="size-4" />
              <span>Cancelar</span>
            </button>

            <button
              type="button"
              disabled={!aceptaTerminos}
              onClick={aceptarTerminosYEnviarCodigo}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
                aceptaTerminos
                  ? "bg-[#190088] hover:bg-[#120066] text-white shadow-sm cursor-pointer active:scale-95"
                  : "bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed"
              }`}
            >
              <span>Aceptar y continuar</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 3. CÓDIGO (OTP) ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl font-['DM_Sans',sans-serif] pb-12">
      <div className="bg-white dark:bg-[#16171d] rounded-3xl p-7 sm:p-10 border border-[#ECECEC] dark:border-white/10 shadow-sm flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#190088]/10 text-[#190088] dark:bg-white/10 dark:text-[#97D6DF]">
            <CheckCircle2 className="size-6" />
          </span>
          <div>
            <h2 className="text-[24px] font-bold text-[#190088] dark:text-white leading-tight">
              Verificación de seguridad
            </h2>
            <p className="text-[14px] font-light text-[#212121]/80 dark:text-gray-300 mt-0.5">
              Para confirmar tu identidad, enviaremos un código de seguridad a <strong>{correo}</strong>.
            </p>
          </div>
        </div>

        {/* Banner de Modo Demostración */}
        <div className="rounded-2xl border border-[#97D6DF]/60 bg-[#97D6DF]/10 p-5 dark:bg-[#97D6DF]/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="size-5 text-[#190088] dark:text-[#97D6DF] shrink-0 mt-0.5" />
            <div>
              <p className="text-[14px] font-bold text-[#190088] dark:text-[#97D6DF]">
                Modo demostración: no se envía correo
              </p>
              <p className="text-[14px] font-light text-[#212121]/80 dark:text-gray-300 mt-1">
                Necto todavía no tiene servidor de correo, así que tu código se muestra aquí:{" "}
                <span className="font-mono text-[16px] font-bold text-[#190088] dark:text-white bg-white dark:bg-white/10 px-2.5 py-1 rounded-md border border-[#ECECEC] dark:border-white/20">
                  {codigoEsperado ?? "——————"}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-md">
          <label className="block text-[12px] font-bold text-[#212121] dark:text-white mb-1">
            Código enviado al correo
          </label>
          <p className="text-[12px] font-light text-gray-500 mb-2">
            Seis caracteres, sin espacios.
          </p>
          <Input
            value={codigo}
            maxLength={6}
            placeholder="A1B2C3"
            onChange={(e) => {
              setCodigo(e.target.value.toUpperCase());
              setErrorCodigo(null);
            }}
          />

          {errorCodigo && (
            <p className="text-[12px] font-bold text-red-600 mt-2">
              {errorCodigo}
            </p>
          )}

          <p className="text-[12px] font-light text-[#212121]/60 dark:text-gray-400 mt-3">
            No pedimos contraseña: en Necto se entra con Google.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#ECECEC] dark:border-white/10">
          <button
            type="button"
            onClick={() => setPantalla("terminos")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#ECECEC] dark:border-white/15 text-[14px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Regresar</span>
          </button>

          <button
            type="button"
            disabled={codigo.trim().length !== 6}
            onClick={confirmarCodigo}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
              codigo.trim().length === 6
                ? "bg-[#190088] hover:bg-[#120066] text-white shadow-sm cursor-pointer active:scale-95"
                : "bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed"
            }`}
          >
            <span>Confirmar código</span>
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default VerificacionBancariaGate;
