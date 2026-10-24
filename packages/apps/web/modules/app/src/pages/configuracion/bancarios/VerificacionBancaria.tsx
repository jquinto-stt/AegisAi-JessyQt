import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Link } from "react-router";

import { Alert } from "@/elements/ui/alert";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Select } from "@/elements/form/select";
import { organizacionStore } from "@/stores/organizacion.store";
import type { ArchivoVerificacion, CuentaBancariaRegistrada } from "@/stores/organizacion.store";
import {
  BuildingLibraryIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { BloqueConfig, CampoConfig, ConfigAcciones } from "@/pages/config-layout";
import { StepperVerificacion } from "../verificacion/StepperVerificacion";
import { CampoArchivo } from "../verificacion/CampoArchivo";
import { nuevoCodigo } from "../verificacion/codigo";

/**
 * Datos bancarios — `?tab=general&seccion=bancarios`.
 *
 * Mismo esqueleto que la verificación fiscal: entrada → código al correo →
 * formulario → certificado → lista de cuentas. La diferencia es el resultado:
 * aquí NO hay un estado «aprobado» global, sino una LISTA de cuentas, cada una
 * con su propio estado, porque un negocio cobra en varias.
 *
 * ── La compuerta que pide el concepto ─────────────────────────────────────
 *
 * «Para registrar cuentas bancarias debes haber completado el registro de
 * documentos de Datos fiscales». Se respeta de verdad: sin la verificación
 * fiscal aprobada, el botón está deshabilitado y se explica por qué, con enlace
 * a la sección. Un botón que abre un flujo que después no se puede completar es
 * peor que un botón apagado.
 */

const PASOS_BANCARIOS = [
  { titulo: "Verificación de seguridad", Icono: LockClosedIcon },
  { titulo: "Información bancaria", Icono: BuildingLibraryIcon },
  { titulo: "Comprobante bancario", Icono: DocumentTextIcon },
];

const BANCOS = [
  "Bancolombia",
  "Davivienda",
  "BBVA",
  "Banco de Bogotá",
  "Banco Popular",
  "Banco Caja Social",
  "Scotiabank Colpatria",
  "Nequi",
  "Daviplata",
  "Nu",
  "Otro",
];

const TIPOS_CUENTA = ["Cuenta de Ahorros", "Cuenta Corriente"];
const TIPOS_DOCUMENTO = ["CC", "CE", "Pasaporte", "NIT"];

type Pantalla = "lista" | "codigo" | "formulario" | "certificado";

interface BorradorCuenta {
  ambito: "local" | "internacional";
  titular: string;
  tipoDocumento: string;
  numeroDocumento: string;
  banco: string;
  tipoCuenta: string;
  numero: string;
}

const BORRADOR_VACIO: BorradorCuenta = {
  ambito: "local",
  titular: "",
  tipoDocumento: TIPOS_DOCUMENTO[0],
  numeroDocumento: "",
  banco: BANCOS[0],
  tipoCuenta: TIPOS_CUENTA[0],
  numero: "",
};

/** Insignia de estado de una cuenta. */
const EstadoCuenta = ({ estado }: { estado: CuentaBancariaRegistrada["estado"] }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
      estado === "aprobada"
        ? "bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300"
        : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${estado === "aprobada" ? "bg-accent-500" : "bg-amber-500"}`}
      aria-hidden="true"
    />
    {estado === "aprobada" ? "Aprobada" : "Sin aprobación"}
  </span>
);

export const VerificacionBancaria = observer(() => {
  const org = organizacionStore.organizacion;
  const cuentas = org?.cuentasBancarias ?? [];
  const fiscalAprobado = org?.verificacion?.estado === "aprobado";

  const [pantalla, setPantalla] = useState<Pantalla>("lista");
  const [borrador, setBorrador] = useState<BorradorCuenta>(BORRADOR_VACIO);
  const [codigoEsperado, setCodigoEsperado] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [certificado, setCertificado] = useState<ArchivoVerificacion | undefined>(undefined);
  const [autorizaPagos, setAutorizaPagos] = useState(false);
  const [comoPrincipal, setComoPrincipal] = useState(cuentas.length === 0);

  const correo = organizacionStore.usuario?.email ?? org?.datosFiscales?.correoFacturacion ?? "";

  const set = <K extends keyof BorradorCuenta>(campo: K, valor: BorradorCuenta[K]) =>
    setBorrador((prev) => ({ ...prev, [campo]: valor }));

  const formularioValido =
    borrador.titular.trim().length > 1 &&
    borrador.numeroDocumento.trim().length > 3 &&
    borrador.numero.trim().length > 3;

  const iniciar = () => {
    setBorrador(BORRADOR_VACIO);
    setCertificado(undefined);
    setAutorizaPagos(false);
    setComoPrincipal(cuentas.length === 0);
    setCodigo("");
    setCodigoEsperado(nuevoCodigo());
    setErrorCodigo(null);
    setPantalla("codigo");
  };

  const validarCodigo = () => {
    if (!codigoEsperado || codigo.trim().toUpperCase() !== codigoEsperado) {
      setErrorCodigo("El código no coincide. Revisa el que se generó o pide uno nuevo.");
      return;
    }
    setErrorCodigo(null);
    setPantalla("formulario");
  };

  const finalizar = () => {
    organizacionStore.agregarCuentaBancaria({
      ambito: borrador.ambito,
      banco: borrador.banco,
      tipoCuenta: borrador.tipoCuenta,
      numero: borrador.numero.trim(),
      titular: borrador.titular.trim(),
      tipoDocumento: borrador.tipoDocumento,
      numeroDocumento: borrador.numeroDocumento.trim(),
      principal: comoPrincipal,
      certificado,
      autorizacionPagos: autorizaPagos,
    });
    setPantalla("lista");
  };

  // ── LISTA / ENTRADA ──────────────────────────────────────────────────────
  if (pantalla === "lista") {
    return (
      <>
        {cuentas.length === 0 ? (
          <BloqueConfig
            icono={BuildingLibraryIcon}
            pregunta="Registrar datos bancarios"
            descripcion="Para poder registrar cuentas bancarias debes haber completado el registro de documentos de Datos fiscales. Puedes asociar diferentes cuentas bancarias."
          >
            <div className="rounded-2xl border border-[#ECECEC] bg-[#F6F7F9] p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              {!fiscalAprobado && (
                <Alert
                  variant="warning"
                  title="Falta la verificación fiscal"
                  message="La cuenta se registra a nombre del titular verificado. Aprueba primero los documentos en Datos fiscales."
                />
              )}

              <div className={fiscalAprobado ? "" : "mt-4"}>
                <Button size="sm" disabled={!fiscalAprobado} onClick={iniciar}>
                  Registrar Cuenta Bancaria
                </Button>
                {!fiscalAprobado && (
                  <Link
                    to="/configuracion?tab=general&seccion=fiscales"
                    className="ml-3 text-[13px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    Ir a Datos fiscales →
                  </Link>
                )}
              </div>
            </div>
          </BloqueConfig>
        ) : (
          <BloqueConfig
            icono={BuildingLibraryIcon}
            pregunta="Cuentas Bancarias"
            descripcion="Estas son las cuentas de bancos nacionales e internacionales que has registrado para el retiro del dinero de la billetera de tu negocio."
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#ECECEC] text-[11px] uppercase tracking-wide text-gray-400 dark:border-gray-800 dark:text-gray-500">
                    <th className="pb-2 pr-4 font-semibold">Banco</th>
                    <th className="pb-2 pr-4 font-semibold">Tipo de cuenta</th>
                    <th className="pb-2 pr-4 font-semibold">Número de cuenta</th>
                    <th className="pb-2 pr-4 font-semibold">Titular</th>
                    <th className="pb-2 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cuentas.map((c) => (
                    <tr key={c.id} className="border-b border-[#F3F3F3] last:border-b-0 dark:border-gray-800/60">
                      <td className="py-3 pr-4 font-semibold text-ink-title dark:text-white">
                        {c.banco}
                        {c.principal && (
                          <span className="ml-2 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-700 dark:text-brand-300">
                            Principal
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-[#212121]/80 dark:text-gray-300">
                        {c.tipoCuenta}
                        {c.ambito === "internacional" && " · internacional"}
                      </td>
                      <td className="py-3 pr-4 font-mono text-[12px] text-[#212121]/80 dark:text-gray-300">
                        {c.numero}
                      </td>
                      <td className="py-3 pr-4 text-[#212121]/80 dark:text-gray-300">{c.titular}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <EstadoCuenta estado={c.estado} />
                          {c.estado === "sin_aprobacion" && (
                            <button
                              type="button"
                              onClick={() => organizacionStore.aprobarCuentaBancaria(c.id)}
                              title="Aprobación de demostración: no hay equipo revisor en esta versión."
                              className="cursor-pointer text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                            >
                              Aprobar (demo)
                            </button>
                          )}
                          {!c.principal && (
                            <button
                              type="button"
                              onClick={() => organizacionStore.marcarCuentaPrincipal(c.id)}
                              className="cursor-pointer text-[11px] font-semibold text-gray-500 hover:underline dark:text-gray-400"
                            >
                              Hacer principal
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={iniciar}>
                Nueva cuenta
              </Button>
              <span className="text-[12px] text-gray-500 dark:text-gray-400">
                La aprobación de esta versión es manual: la marca el enlace «Aprobar (demo)», no un
                revisor real.
              </span>
            </div>
          </BloqueConfig>
        )}
      </>
    );
  }

  // ── CÓDIGO ───────────────────────────────────────────────────────────────
  if (pantalla === "codigo") {
    return (
      <BloqueConfig
        icono={LockClosedIcon}
        pregunta="Verificación de seguridad"
        descripcion={
          correo
            ? `Para confirmar tu identidad, enviaremos un código de seguridad a ${correo}.`
            : "Para confirmar tu identidad, enviaremos un código de seguridad a tu correo."
        }
      >
        <StepperVerificacion actual={0} pasos={PASOS_BANCARIOS} />

        <Alert
          variant="info"
          title="Modo demostración: no se envía correo"
          message={`Necto todavía no tiene servidor de correo, así que tu código se muestra aquí: ${codigoEsperado ?? "——————"}`}
        />

        <div className="mt-5 max-w-sm">
          <CampoConfig
            etiqueta="Código enviado al correo"
            ayuda="Seis caracteres, sin espacios."
            htmlFor="ban-codigo"
            ancho="max-w-none"
          >
            <Input
              id="ban-codigo"
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
            <Button size="sm" variant="outline" onClick={() => setPantalla("lista")}>
              Regresar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setCodigoEsperado(nuevoCodigo());
                setCodigo("");
                setErrorCodigo(null);
              }}
            >
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

  // ── FORMULARIO ───────────────────────────────────────────────────────────
  if (pantalla === "formulario") {
    return (
      <BloqueConfig
        icono={BuildingLibraryIcon}
        pregunta="Información bancaria"
        descripcion="La información registrada es tu responsabilidad y debe coincidir con tu banco. Si los datos no coinciden, el equipo no la aprueba."
      >
        <StepperVerificacion actual={1} pasos={PASOS_BANCARIOS} />

        {/* Dos pestañas del concepto: moneda local o banco internacional. */}
        <div className="mb-5 flex gap-1 border-b border-[#ECECEC] dark:border-gray-800">
          {(
            [
              { valor: "local", etiqueta: "Bancos (moneda local)" },
              { valor: "internacional", etiqueta: "Banco internacional" },
            ] as const
          ).map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => set("ambito", t.valor)}
              aria-pressed={borrador.ambito === t.valor}
              className={`-mb-px cursor-pointer border-b-2 px-4 py-2 text-[13px] font-semibold transition-colors ${
                borrador.ambito === t.valor
                  ? "border-brand-500 text-brand-700 dark:text-brand-300"
                  : "border-transparent text-gray-500 hover:text-ink-title dark:text-gray-400"
              }`}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <CampoConfig etiqueta="Nombre del beneficiario" htmlFor="ban-titular" ancho="max-w-none">
            <Input
              id="ban-titular"
              value={borrador.titular}
              placeholder="Ej. Eddiberto Saez"
              onChange={(e) => set("titular", e.target.value)}
            />
          </CampoConfig>

          <div className="grid grid-cols-2 gap-3">
            <CampoConfig etiqueta="Tipo de documento" ancho="max-w-none">
              <Select
                key={`doc-${borrador.tipoDocumento}`}
                options={TIPOS_DOCUMENTO.map((d) => ({ value: d, label: d }))}
                defaultValue={borrador.tipoDocumento}
                onChange={(v) => set("tipoDocumento", v)}
                aria-label="Tipo de documento"
              />
            </CampoConfig>
            <CampoConfig etiqueta="Número de documento" htmlFor="ban-numdoc" ancho="max-w-none">
              <Input
                id="ban-numdoc"
                value={borrador.numeroDocumento}
                placeholder="1000567890"
                onChange={(e) => set("numeroDocumento", e.target.value)}
              />
            </CampoConfig>
          </div>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <CampoConfig etiqueta="Banco" ancho="max-w-none">
            <Select
              key={`banco-${borrador.banco}`}
              options={BANCOS.map((b) => ({ value: b, label: b }))}
              defaultValue={borrador.banco}
              onChange={(v) => set("banco", v)}
              aria-label="Banco"
            />
          </CampoConfig>

          <CampoConfig etiqueta="Tipo de cuenta" ancho="max-w-none">
            <Select
              key={`tipo-${borrador.tipoCuenta}`}
              options={TIPOS_CUENTA.map((t) => ({ value: t, label: t }))}
              defaultValue={borrador.tipoCuenta}
              onChange={(v) => set("tipoCuenta", v)}
              aria-label="Tipo de cuenta"
            />
          </CampoConfig>
        </div>

        <div className="mt-5 max-w-md">
          <CampoConfig etiqueta="Número de cuenta" htmlFor="ban-numero" ancho="max-w-none">
            <Input
              id="ban-numero"
              value={borrador.numero}
              placeholder="00179343193"
              onChange={(e) => set("numero", e.target.value)}
            />
          </CampoConfig>
        </div>

        <div className="mt-6">
          <ConfigAcciones>
            <Button size="sm" variant="outline" onClick={() => setPantalla("codigo")}>
              Regresar
            </Button>
            <Button size="sm" disabled={!formularioValido} onClick={() => setPantalla("certificado")}>
              Siguiente
            </Button>
          </ConfigAcciones>
        </div>
      </BloqueConfig>
    );
  }

  // ── CERTIFICADO ──────────────────────────────────────────────────────────
  return (
    <BloqueConfig
      icono={DocumentTextIcon}
      pregunta="Comprobante bancario"
      descripcion="Un certificado emitido por tu banco, con emisión inferior a un año y legible. Debe contener el nombre completo del titular, su documento y el número de cuenta completo."
    >
      <StepperVerificacion actual={2} pasos={PASOS_BANCARIOS} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[13px] font-bold text-ink-title dark:text-white">Ejemplos válidos</p>
          <p className="mt-1 text-[12px] leading-5 text-gray-500 dark:text-gray-400">
            Informe de rendimiento, comprobante de titularidad, certificación bancaria.
          </p>
        </div>
        <div>
          <p className="text-[13px] font-bold text-ink-title dark:text-white">Documentos no aceptados</p>
          <ul className="mt-1 list-disc pl-4 text-[12px] leading-5 text-gray-500 dark:text-gray-400">
            <li>Foto de la tarjeta de crédito o débito</li>
            <li>Comprobante de depósito o de transferencia</li>
            <li>Captura de pantalla de la app del banco</li>
          </ul>
        </div>
      </div>

      <CampoArchivo
        id="ban-certificado"
        etiqueta="Certificado bancario"
        accept=".pdf"
        valor={certificado}
        onChange={setCertificado}
        nota="Solo PDF · máximo 300 KB"
      />

      <div className="mt-5 space-y-3 rounded-xl border border-[#ECECEC] p-4 dark:border-gray-800">
        <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-5 text-[#212121] dark:text-gray-200">
          <input
            type="checkbox"
            checked={autorizaPagos}
            onChange={(e) => setAutorizaPagos(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-500"
          />
          <span>
            Solicito y autorizo que se realicen pagos de los retiros de la billetera a la cuenta{" "}
            <strong className="font-semibold">{borrador.numero || "—"}</strong>, a nombre de{" "}
            <strong className="font-semibold">{borrador.titular || "—"}</strong>.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-5 text-[#212121] dark:text-gray-200">
          <input
            type="checkbox"
            checked={comoPrincipal}
            onChange={(e) => setComoPrincipal(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-500"
          />
          <span>Marcar esta cuenta bancaria como la principal para este negocio.</span>
        </label>
      </div>

      <div className="mt-6">
        <ConfigAcciones>
          <Button size="sm" variant="outline" onClick={() => setPantalla("formulario")}>
            Regresar
          </Button>
          <Button size="sm" disabled={!certificado || !autorizaPagos} onClick={finalizar}>
            Finalizar
          </Button>
        </ConfigAcciones>
      </div>
    </BloqueConfig>
  );
});

export default VerificacionBancaria;
