import { useState, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { Link } from "react-router";

import { Alert } from "@/elements/ui/alert";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Select } from "@/elements/form/select";
import { organizacionStore } from "@/stores/organizacion.store";
import type { ArchivoVerificacion, TipoPersona } from "@/stores/organizacion.store";
import {
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { BloqueConfig, CampoConfig, ConfigAcciones } from "@/pages/config-layout";
import { StepperVerificacion } from "./StepperVerificacion";
import { CampoArchivo } from "./CampoArchivo";
import { EstadoAprobado } from "./EstadoAprobado";
import { nuevoCodigo } from "./codigo";

/**
 * Verificación de identidad del negocio — dentro de `?tab=general&seccion=fiscales`.
 *
 * ── Qué hace y qué NO puede hacer ─────────────────────────────────────────
 *
 * Reproduce el flujo del concepto: entrada → términos → datos → código al
 * correo → documento y selfie → comprobante de dirección → «en revisión».
 *
 * **Nada de esto sale del navegador.** No hay servidor de correo (el código se
 * muestra en pantalla, marcado como demostración), no hay almacenamiento de
 * archivos (van como data URL a `localStorage`, con tope real) y no hay un
 * equipo que revise: el estado se queda en `en_revision` y no avanza solo. Cada
 * una de esas tres cosas se dice donde ocurre, en vez de prometerlas.
 *
 * ── Por qué los pasos son pantallas y no un modal ─────────────────────────
 *
 * El concepto lo pintaba como modal. Aquí es una pantalla dentro de la sección:
 * un formulario largo con adjuntos dentro de un diálogo obliga a pelear con el
 * scroll del modal, y el botón «atrás» del navegador deja de funcionar como la
 * gente espera.
 */

type Pantalla =
  | "entrada"
  | "terminos"
  | "identidad"
  | "codigo"
  | "documentos"
  | "comprobante"
  | "listo"
  | "aprobado";

/** Índice del paso en la barra de progreso para cada pantalla. */
const PASO_DE: Record<Exclude<Pantalla, "entrada" | "terminos" | "listo" | "aprobado">, number> = {
  identidad: 0,
  codigo: 1,
  documentos: 2,
  comprobante: 3,
};

const DOCUMENTOS_IDENTIDAD = ["Cédula de ciudadanía", "Cédula de extranjería", "Pasaporte", "NIT"];

export interface VerificacionFiscalProps {
  /** Contenido que se pinta cuando NO se está dentro del flujo (el formulario fiscal). */
  children?: ReactNode;
}

export const VerificacionFiscal = observer(({ children }: VerificacionFiscalProps) => {
  const org = organizacionStore.organizacion;
  const guardada = org?.verificacion;

  const [pantalla, setPantalla] = useState<Pantalla>(
    guardada?.estado === "aprobado"
      ? "aprobado"
      : guardada?.estado === "en_revision"
        ? "listo"
        : "entrada",
  );
  const [acepta, setAcepta] = useState(Boolean(guardada?.terminosAceptadosEn));

  const [persona, setPersona] = useState<TipoPersona>(guardada?.persona ?? "natural");
  const [nombre, setNombre] = useState(guardada?.nombreCompleto ?? "");
  const [tipoDocumento, setTipoDocumento] = useState(
    guardada?.tipoDocumento ?? DOCUMENTOS_IDENTIDAD[0],
  );
  const [numero, setNumero] = useState(guardada?.numeroDocumento ?? "");

  const [codigoEsperado, setCodigoEsperado] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);

  const [documento, setDocumento] = useState<ArchivoVerificacion | undefined>(guardada?.documento);
  const [selfie, setSelfie] = useState<ArchivoVerificacion | undefined>(guardada?.selfie);
  const [comprobante, setComprobante] = useState<ArchivoVerificacion | undefined>(guardada?.comprobante);

  const correo =
    organizacionStore.usuario?.email ??
    org?.datosFiscales?.correoFacturacion ??
    "";

  const nombreValido = nombre.trim().length > 1;
  const numeroValido = numero.trim().length > 3;

  const generarCodigo = () => {
    setCodigoEsperado(nuevoCodigo());
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
    organizacionStore.actualizarVerificacion({ verificadoEn: new Date().toISOString() });
    setPantalla("documentos");
  };

  const confirmarDocumentos = () => {
    organizacionStore.actualizarVerificacion({ documento, selfie });
    setPantalla("comprobante");
  };

  const finalizar = () => {
    organizacionStore.actualizarVerificacion({
      comprobante,
      estado: "en_revision",
      enviadoEn: new Date().toISOString(),
    });
    setPantalla("listo");
  };

  /**
   * Marca la verificación como aprobada.
   *
   * **Es un paso de DEMOSTRACIÓN**: aquí no hay revisor que valide nada. Existe
   * para poder ver y probar la pantalla de aprobado, y el botón lo dice en su
   * propio texto. Cuando haya backend, esto lo escribe el webhook de revisión y
   * el botón desaparece.
   */
  const aprobarEnDemo = () => {
    organizacionStore.actualizarVerificacion({
      estado: "aprobado",
      aprobadoEn: new Date().toISOString(),
    });
    setPantalla("aprobado");
  };

  const reiniciar = () => {
    organizacionStore.reiniciarVerificacion();
    setAcepta(false);
    setNombre("");
    setNumero("");
    setDocumento(undefined);
    setSelfie(undefined);
    setComprobante(undefined);
    setCodigoEsperado(null);
    setCodigo("");
    setPantalla("entrada");
  };

  // ── ENTRADA ──────────────────────────────────────────────────────────────
  if (pantalla === "entrada") {
    return (
      <>
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

        {children}
      </>
    );
  }

  // ── TÉRMINOS ─────────────────────────────────────────────────────────────
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

  // ── IDENTIDAD ────────────────────────────────────────────────────────────
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

  // ── CÓDIGO ───────────────────────────────────────────────────────────────
  if (pantalla === "codigo") {
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

        {/* Sin servidor de correo no hay envío: el código se muestra aquí. Es
            la única forma honesta de dejar seguir el flujo en este mock. */}
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
              Validar
            </Button>
          </ConfigAcciones>
        </div>
      </BloqueConfig>
    );
  }

  // ── DOCUMENTOS ───────────────────────────────────────────────────────────
  if (pantalla === "documentos") {
    return (
      <BloqueConfig
        icono={ShieldCheckIcon}
        pregunta="Documento de identificación y foto del rostro"
        descripcion="Sube el documento por ambas caras y una selfie. Estos documentos serán revisados por el equipo."
      >
        <StepperVerificacion actual={PASO_DE.documentos} />

        <div className="grid gap-6 sm:grid-cols-2">
          <CampoArchivo
            id="ver-documento"
            etiqueta={`Documento de identificación · ${tipoDocumento}`}
            descripcion="Foto de ambas caras. Si lo tienes, adjunta también el RUT: no sustituye al documento."
            accept="image/*,.pdf"
            valor={documento}
            onChange={setDocumento}
            nota="JPG, PNG o PDF · máximo 300 KB"
          />

          <CampoArchivo
            id="ver-selfie"
            etiqueta="Foto del rostro (selfie)"
            descripcion="Para confirmar la titularidad. Tu rostro debe estar visible y sin accesorios."
            accept="image/*"
            valor={selfie}
            onChange={setSelfie}
            nota="JPG o PNG · máximo 300 KB"
          />
        </div>

        <div className="mt-6">
          <ConfigAcciones>
            <Button size="sm" variant="outline" onClick={() => setPantalla("codigo")}>
              Regresar
            </Button>
            <Button size="sm" disabled={!documento || !selfie} onClick={confirmarDocumentos}>
              Siguiente
            </Button>
          </ConfigAcciones>
        </div>
      </BloqueConfig>
    );
  }

  // ── COMPROBANTE ──────────────────────────────────────────────────────────
  if (pantalla === "comprobante") {
    return (
      <BloqueConfig
        icono={ShieldCheckIcon}
        pregunta="Comprobante de dirección"
        descripcion="Un documento emitido hace menos de tres meses a nombre del titular: cuenta de servicios, factura de luz, internet o recibo telefónico."
      >
        <StepperVerificacion actual={PASO_DE.comprobante} />

        <CampoArchivo
          id="ver-comprobante"
          etiqueta="Comprobante de dirección"
          accept=".pdf,image/*"
          valor={comprobante}
          onChange={setComprobante}
          nota="PDF, JPG o PNG · máximo 300 KB"
        />

        <div className="mt-6">
          <ConfigAcciones>
            <Button size="sm" variant="outline" onClick={() => setPantalla("documentos")}>
              Regresar
            </Button>
            <Button size="sm" disabled={!comprobante} onClick={finalizar}>
              Finalizar
            </Button>
          </ConfigAcciones>
        </div>
      </BloqueConfig>
    );
  }

  // ── APROBADO ─────────────────────────────────────────────────────────────
  if (pantalla === "aprobado" && org?.verificacion) {
    return (
      <>
        <EstadoAprobado verificacion={org.verificacion} onReiniciar={reiniciar} />
        {children}
      </>
    );
  }

  // ── LISTO ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="rounded-2xl border border-accent-200 bg-accent-50 p-4 dark:border-accent-500/30 dark:bg-accent-500/10">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="h-5 w-5 shrink-0 text-accent-600 dark:text-accent-400" aria-hidden="true" />
          <p className="text-[14px] font-bold text-accent-700 dark:text-accent-300">
            Se enviaron los datos con éxito
          </p>
        </div>
      </div>

      {/* La tarjeta ámbar del concepto: el trámite quedó EN REVISIÓN, no aprobado. */}
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-500/30 dark:bg-amber-500/10">
        <div className="flex items-start gap-3">
          <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <div>
            <p className="text-[14px] font-bold text-amber-800 dark:text-amber-300">
              Documentos registrados
            </p>
            <p className="mt-1 text-[13px] leading-5 text-amber-800/80 dark:text-amber-200/80">
              Tu registro está siendo evaluado. Este proceso puede durar hasta 5 días hábiles.
              Cuando el estado se actualice, también recibirás una notificación por correo.
            </p>
          </div>
        </div>
      </div>

      {/* Sin equipo de revisión ni envío de correos, prometer seguimiento sería
          mentir. Se dice aquí, en pequeño, y el estado no avanza solo. */}
      <p className="mt-3 text-[12px] leading-5 text-gray-500 dark:text-gray-400">
        En esta versión no hay un equipo que revise los documentos ni envío de correos: el estado
        queda guardado en este navegador y no cambia por sí solo.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={reiniciar}>
          Reiniciar verificación
        </Button>
        {/* Sin backend no hay revisor: este botón permite ver la pantalla de
            aprobado. Se llama «demostración» en el propio texto para que nadie
            lo confunda con una validación real. */}
        <Button size="sm" variant="ghost" onClick={aprobarEnDemo}>
          Marcar como aprobado (demostración)
        </Button>
      </div>

      {children}
    </>
  );
});

export default VerificacionFiscal;
