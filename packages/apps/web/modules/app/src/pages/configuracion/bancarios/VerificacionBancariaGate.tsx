import { useState, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { Link } from "react-router";
import {
  DocumentTextIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

import { Alert } from "@/elements/ui/alert";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Select } from "@/elements/form/select";
import { organizacionStore } from "@/stores/organizacion.store";
import type { TipoPersona } from "@/stores/organizacion.store";
import { BloqueConfig, CampoConfig, ConfigAcciones } from "@/pages/config-layout";
import { StepperVerificacion } from "../verificacion/StepperVerificacion";
import { nuevoCodigo } from "../verificacion/codigo";

const DOCUMENTOS_IDENTIDAD = [
  "Cédula de ciudadanía",
  "Cédula de extranjería",
  "Pasaporte",
  "NIT",
];

type PantallaVerificacion = "entrada" | "terminos" | "identidad" | "codigo";

const PASO_DE: Record<"identidad" | "codigo", number> = {
  identidad: 0,
  codigo: 1,
};

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
  const [acepta, setAcepta] = useState(Boolean(guardada?.terminosAceptadosEn));

  const [persona, setPersona] = useState<TipoPersona>(guardada?.persona ?? "natural");
  const [nombre, setNombre] = useState(guardada?.nombreCompleto ?? org?.nombre ?? "");
  const [tipoDocumento, setTipoDocumento] = useState(
    guardada?.tipoDocumento ?? DOCUMENTOS_IDENTIDAD[0],
  );
  const [numero, setNumero] = useState(guardada?.numeroDocumento ?? "");

  const [codigoEsperado, setCodigoEsperado] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);

  const correo =
    organizacionStore.usuario?.email ??
    org?.datosFiscales?.correoFacturacion ??
    "";

  const nombreValido = nombre.trim().length > 1;
  const numeroValido = numero.trim().length > 3;

  // Si ya está verificado en la sesión activa, muestra la vista completa de Cuentas Bancarias
  if (verificadoEnSesion) {
    return <>{children}</>;
  }

  const generarCodigo = () => {
    const cod = nuevoCodigo();
    setCodigoEsperado(cod);
    setCodigo("");
    setErrorCodigo(null);
    organizacionStore.actualizarVerificacion({
      correo,
      codigoEnviadoEn: new Date().toISOString(),
    });
  };

  const aceptarTerminos = () => {
    organizacionStore.actualizarVerificacion({ terminosAceptadosEn: new Date().toISOString() });
    setPantalla("identidad");
  };

  const confirmarIdentidad = () => {
    organizacionStore.actualizarVerificacion({
      persona,
      nombreCompleto: nombre.trim(),
      tipoDocumento,
      numeroDocumento: numero.trim(),
    });
    generarCodigo();
    setPantalla("codigo");
  };

  const validarCodigo = () => {
    if (!codigoEsperado || codigo.trim().toUpperCase() !== codigoEsperado) {
      setErrorCodigo("El código no coincide. Revisa el que se generó o pide uno nuevo.");
      return;
    }
    setErrorCodigo(null);
    // Aprueba la verificación en la sesión activa y desbloquea el acceso a las cuentas bancarias
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
      <BloqueConfig
        icono={ShieldCheckIcon}
        pregunta="Registrar documentos del negocio"
        descripcion="Antes de operar con datos fiscales y retiros, necesitamos conocerte. Pueden ser documentos de persona natural o jurídica."
      >
        <div className="rounded-2xl border border-[#ECECEC] bg-[#F6F7F9] p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <ul className="space-y-2 text-[13px] leading-5 text-[#212121]/80 dark:text-gray-300">
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
            <Button size="sm" onClick={() => setPantalla("terminos")}>
              Registrar documentos
            </Button>
          </div>
        </div>
      </BloqueConfig>
    );
  }

  // ── 2. TÉRMINOS ───────────────────────────────────────────────────────────
  if (pantalla === "terminos") {
    return (
      <BloqueConfig
        icono={DocumentTextIcon}
        pregunta="Tratamiento de tus datos"
        descripcion="Para verificar la identidad del negocio necesitamos tratar datos personales. Esto es lo que se pide y por qué."
      >
        <ul className="space-y-2 text-[13px] leading-5 text-[#212121]/80 dark:text-gray-300">
          <li>
            <strong className="font-semibold text-ink-title dark:text-white">Qué se recoge:</strong>{" "}
            nombre o razón social, tipo y número de documento, correo electrónico, foto del rostro,
            documento de identidad y comprobante de dirección.
          </li>
          <li>
            <strong className="font-semibold text-ink-title dark:text-white">Para qué:</strong>{" "}
            confirmar que el negocio existe y que quien lo registra es su titular. Sin esto no se
            habilitan retiros ni datos fiscales.
          </li>
          <li>
            <strong className="font-semibold text-ink-title dark:text-white">Cuánto se guarda:</strong>{" "}
            mientras la organización esté activa. Puedes pedir la eliminación desde soporte.
          </li>
        </ul>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#ECECEC] p-4 text-[13px] leading-5 dark:border-gray-800">
          <input
            type="checkbox"
            checked={acepta}
            onChange={(e) => setAcepta(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-500"
          />
          <span className="text-[#212121] dark:text-gray-200">
            He leído y acepto los{" "}
            <Link to="/terminos" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
              términos y condiciones
            </Link>{" "}
            y la{" "}
            <Link to="/privacidad" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
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
            <Button size="sm" disabled={!acepta} onClick={aceptarTerminos}>
              Aceptar y continuar
            </Button>
          </ConfigAcciones>
        </div>
      </BloqueConfig>
    );
  }

  // ── 3. IDENTIDAD ──────────────────────────────────────────────────────────
  if (pantalla === "identidad") {
    return (
      <BloqueConfig
        icono={ShieldCheckIcon}
        pregunta="Datos de identidad"
        descripcion="Completa según seas persona natural o jurídica. Es lo que se contrasta con el documento que subirás después."
      >
        <StepperVerificacion actual={PASO_DE.identidad} />

        <div className="grid gap-5 sm:grid-cols-2">
          <CampoConfig etiqueta="Tipo de persona" ancho="max-w-none">
            <div className="flex gap-2">
              {(["natural", "juridica"] as TipoPersona[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPersona(t)}
                  aria-pressed={persona === t}
                  className={`rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors ${
                    persona === t
                      ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                      : "border-[#ECECEC] text-[#212121]/70 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  {t === "natural" ? "Persona natural" : "Persona jurídica"}
                </button>
              ))}
            </div>
          </CampoConfig>

          <CampoConfig etiqueta="Tipo de documento" htmlFor="ver-tipo" ancho="max-w-none">
            <Select
              key={`tipo-${tipoDocumento}`}
              options={DOCUMENTOS_IDENTIDAD.map((d) => ({ value: d, label: d }))}
              defaultValue={tipoDocumento}
              onChange={setTipoDocumento}
              aria-label="Tipo de documento"
            />
          </CampoConfig>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <CampoConfig
            etiqueta={persona === "natural" ? "Nombre completo" : "Razón social"}
            ayuda={persona === "natural" ? "Tal como aparece en tu documento." : "El nombre legal de la empresa."}
            htmlFor="ver-nombre"
            ancho="max-w-none"
          >
            <Input
              id="ver-nombre"
              value={nombre}
              placeholder={persona === "natural" ? "Ej. Wiltrido Bilbao" : "Ej. Boutique Roma S.A.S."}
              onChange={(e) => setNombre(e.target.value)}
            />
          </CampoConfig>

          <CampoConfig
            etiqueta="Número de documento"
            ayuda="Sin puntos ni espacios."
            htmlFor="ver-numero"
            ancho="max-w-none"
          >
            <Input
              id="ver-numero"
              value={numero}
              placeholder="10005678909"
              onChange={(e) => setNumero(e.target.value)}
            />
          </CampoConfig>
        </div>

        <div className="mt-6">
          <ConfigAcciones>
            <Button size="sm" variant="outline" onClick={() => setPantalla("entrada")}>
              Regresar
            </Button>
            <Button size="sm" disabled={!nombreValido || !numeroValido} onClick={confirmarIdentidad}>
              Siguiente
            </Button>
          </ConfigAcciones>
        </div>
      </BloqueConfig>
    );
  }

  // ── 4. CÓDIGO (OTP) ───────────────────────────────────────────────────────
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
      <StepperVerificacion actual={PASO_DE.codigo} />

      {/* Sin servidor de correo no hay envío: el código se muestra aquí. */}
      <Alert
        variant="info"
        title="Modo demostración: no se envía correo"
        message={`Necto todavía no tiene servidor de correo, así que tu código se muestra aquí: ${codigoEsperado ?? "——————"}`}
      />

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <CampoConfig
          etiqueta="Código enviado al correo"
          ayuda="Seis caracteres, sin espacios."
          htmlFor="ver-codigo"
          ancho="max-w-none"
        >
          <Input
            id="ver-codigo"
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
          <Button size="sm" variant="outline" onClick={() => setPantalla("identidad")}>
            Regresar
          </Button>
          <Button size="sm" variant="ghost" onClick={generarCodigo}>
            Reenviar código
          </Button>
          <Button size="sm" disabled={codigo.trim().length < 6} onClick={validarCodigo}>
            Validar y habilitar cuentas
          </Button>
        </ConfigAcciones>
      </div>
    </BloqueConfig>
  );
});

export default VerificacionBancariaGate;
