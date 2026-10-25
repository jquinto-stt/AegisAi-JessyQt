import { useEffect, useState, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { Link } from "react-router";
import { ShieldCheckIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

import { organizacionStore } from "@/stores/organizacion.store";
import { Alert } from "@/elements/ui/alert";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { BloqueConfig, CampoConfig, ConfigAcciones } from "@/pages/config-layout";
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

export function reiniciarBancariosEnSesion(orgId?: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CLAVE_SESSION(orgId));
    window.dispatchEvent(new Event("necto-bancarios-reset"));
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

  useEffect(() => {
    const sincronizar = () => {
      setVerificadoEnSesion(estaBancariosVerificadoEnSesion(org?.id));
      setPantalla("entrada");
      setAceptaTerminos(false);
      setCodigo("");
      setCodigoEsperado(null);
      setErrorCodigo(null);
    };
    window.addEventListener("necto-bancarios-reset", sincronizar);
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener("necto-bancarios-reset", sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, [org?.id]);

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

  // ── 1. ENTRADA (Mismo diseño y estilo exacto que datos fiscales) ───────────
  if (pantalla === "entrada") {
    return (
      <BloqueConfig
        icono={ShieldCheckIcon}
        pregunta="Registrar documentos del negocio"
        descripcion="Antes de operar con datos fiscales y retiros, necesitamos conocerte. Pueden ser documentos de persona natural o jurídica."
      >
        <div className="rounded-2xl border border-[#ECECEC] bg-[#F6F7F9] p-5 dark:border-gray-800 dark:bg-white/[0.03] font-['DM_Sans',sans-serif]">
          <ul className="space-y-2 text-[14px] leading-5 text-[#212121]/80 dark:text-gray-300">
            <li className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>Revisión manual: una persona del equipo revisa cada documento.</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>Los archivos se piden una sola vez y quedan asociados a tu organización.</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>El proceso suele tardar hasta 5 días hábiles.</span>
            </li>
          </ul>

          <div className="mt-4">
            <Button size="sm" onClick={iniciarVerificacion}>
              Registrar documentos
            </Button>
          </div>
        </div>
      </BloqueConfig>
    );
  }

  // ── 2. TÉRMINOS (Mismo diseño y estilo exacto que datos fiscales) ──────────
  if (pantalla === "terminos") {
    return (
      <BloqueConfig
        icono={DocumentTextIcon}
        pregunta="Tratamiento de tus datos"
        descripcion="Para verificar la identidad del negocio necesitamos tratar datos personales. Esto es lo que se pide y por qué."
      >
        <ul className="space-y-2 text-[14px] leading-5 text-[#212121]/80 dark:text-gray-300 font-['DM_Sans',sans-serif]">
          <li>
            <strong className="font-bold text-ink-title dark:text-white">Qué se recoge:</strong>{" "}
            nombre o razón social, tipo y número de documento, correo electrónico, foto del rostro,
            documento de identidad y comprobante de dirección.
          </li>
          <li>
            <strong className="font-bold text-ink-title dark:text-white">Para qué:</strong>{" "}
            confirmar que el negocio existe y que quien lo registra es su titular. Sin esto no se
            habilitan retiros ni datos fiscales.
          </li>
          <li>
            <strong className="font-bold text-ink-title dark:text-white">Cuánto se guarda:</strong>{" "}
            mientras la organización esté activa. Puedes pedir la eliminación desde soporte.
          </li>
        </ul>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#ECECEC] p-4 text-[14px] leading-5 dark:border-gray-800 font-['DM_Sans',sans-serif]">
          <input
            type="checkbox"
            checked={aceptaTerminos}
            onChange={(e) => setAceptaTerminos(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-500"
          />
          <span className="text-[#212121] dark:text-gray-200">
            He leído y acepto los{" "}
            <Link to="/terminos" className="font-bold text-[#190088] hover:underline dark:text-[#97D6DF]">
              términos y condiciones
            </Link>{" "}
            y la{" "}
            <Link to="/privacidad" className="font-bold text-[#190088] hover:underline dark:text-[#97D6DF]">
              política de tratamiento de datos
            </Link>
            .
          </span>
        </label>

        <div className="mt-6">
          <ConfigAcciones>
            <Button size="sm" variant="outline" onClick={() => setPantalla("entrada")}>
              Cancelar
            </Button>
            <Button size="sm" disabled={!aceptaTerminos} onClick={aceptarTerminosYEnviarCodigo}>
              Aceptar y continuar
            </Button>
          </ConfigAcciones>
        </div>
      </BloqueConfig>
    );
  }

  // ── 3. CÓDIGO (OTP) (Mismo diseño y estilo que datos fiscales) ────────────
  return (
    <BloqueConfig
      icono={ShieldCheckIcon}
      pregunta="Verificación de seguridad"
      descripcion={
        correo
          ? `Para confirmar tu identidad, enviaremos un código de seguridad a ${correo}.`
          : "Para confirmar tu identidad, enviaremos un código de seguridad a tu correo."
      }
    >
      <Alert
        variant="info"
        title="Modo demostración: no se envía correo"
        message={`Necto todavía no tiene servidor de correo, así que tu código se muestra aquí: ${codigoEsperado ?? "——————"}`}
      />

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <CampoConfig
          etiqueta="Código enviado al correo"
          ayuda="Seis caracteres, sin espacios."
          htmlFor="ver-codigo-bancario"
          ancho="max-w-none"
        >
          <Input
            id="ver-codigo-bancario"
            value={codigo}
            maxLength={6}
            placeholder="A1B2C3"
            error={Boolean(errorCodigo)}
            hint={errorCodigo ?? undefined}
            onChange={(e) => {
              setCodigo(e.target.value.toUpperCase());
              setErrorCodigo(null);
            }}
          />
        </CampoConfig>
      </div>

      <p className="mt-3 text-[12px] text-gray-500 dark:text-gray-400">
        No pedimos contraseña: en Necto se entra con Google.
      </p>

      <div className="mt-6">
        <ConfigAcciones>
          <Button size="sm" variant="outline" onClick={() => setPantalla("terminos")}>
            Regresar
          </Button>
          <Button size="sm" variant="ghost" onClick={aceptarTerminosYEnviarCodigo}>
            Reenviar código
          </Button>
          <Button size="sm" disabled={codigo.trim().length < 6} onClick={confirmarCodigo}>
            Validar
          </Button>
        </ConfigAcciones>
      </div>
    </BloqueConfig>
  );
});

export default VerificacionBancariaGate;
