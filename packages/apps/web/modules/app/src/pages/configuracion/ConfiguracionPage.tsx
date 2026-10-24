import { useState, useEffect } from "react";
import { observer } from "mobx-react-lite";
import { useSearchParams } from "react-router";

import { PageMeta } from "@/shell/meta";
import { ChevronLeftIcon } from "@/icons";
import { BanknotesIcon, BuildingOffice2Icon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { organizacionStore } from "@/stores";
import { ConfigHubPagina, ConfigShell, type TarjetaHub } from "@/pages/config-layout";
import { uiStore } from "@/shell/stores";
import type { ThemePreference } from "@/shell/stores/ui.store";
import { TARJETAS_CONFIG, type ClaveConfig } from "./configuracion.catalogo";
import { DatosFiscalesTab } from "./DatosFiscalesTab";
import { DatosBancariosTab } from "./DatosBancariosTab";
import {
  estaBancariosVerificadoEnSesion,
  reiniciarBancariosEnSesion,
} from "./bancarios/VerificacionBancariaGate";

/** Re-exportada: la clave de pestaña es contrato de la URL (`?tab=`). */
export type { ClaveConfig };

import { AparienciaTab } from "./AparienciaTab";
import GeneralOrgTab from "./GeneralOrgTab";
import PersonalizacionTab from "./PersonalizacionTab";
import { ModulosTab } from "@/pages/equipo";
import { CanalesOrgTab, leerCanalesGuardados, type CanalesGuardados } from "./CanalesOrgTab";
import { SparklesIcon } from "@heroicons/react/24/outline";

// ═══════════════════════════════════════════════════════════════════════════
// CENTRO DE CONFIGURACIÓN — /configuracion
// ═══════════════════════════════════════════════════════════════════════════
//
// Al ingresar sin parámetro (`/configuracion`), muestra el selector inicial de
// CUATRO tarjetas:
//   1. «Configuración del negocio» (nombre comercial, logo, país, moneda y rubro)
//      — clave `general`, que es la que viaja en la URL
//   2. «Integraciones» — clave `modulos`
//   3. «Opciones de mensajería» (WhatsApp, Telegram, Instagram, Facebook)
//      — clave `canales`
//   4. «Preferencias» — clave `apariencia`
//
// ═══════════════════════════════════════════════════════════════════════════

/** Cabecera de una vista interna: el camino de vuelta al selector. */
const VolverAlSelector = ({ onVolver }: { onVolver: () => void }) => (
  <div className="mb-6">
    <button
      type="button"
      onClick={onVolver}
      className="group inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
    >
      <ChevronLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      <span>Volver a Configuraciones</span>
    </button>
  </div>
);

/** Vuelta del detalle de negocio a SU menú, no al hub general. */
const VolverANegocio = ({ onVolver }: { onVolver: () => void }) => (
  <div className="mb-6">
    <button
      type="button"
      onClick={onVolver}
      className="group inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
    >
      <ChevronLeftIcon className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      <span>Volver a Configuración del negocio</span>
    </button>
  </div>
);

/** Las cuatro partes de «Configuración del negocio», en el orden del submenú. */
type SeccionNegocio = "organizacion" | "personalizacion" | "fiscales" | "bancarios";

const SECCIONES_NEGOCIO: Record<
  SeccionNegocio,
  { titulo: string; hint: string; metaDescripcion: string }
> = {
  organizacion: {
    titulo: "Datos generales de la organización",
    hint: "Nombre comercial, remitente de guías, teléfono, país y moneda",
    metaDescripcion: "Datos generales y operativos de la organización",
  },
  personalizacion: {
    titulo: "Personalización del negocio",
    hint: "Logo, imagen de portada, descripción y sitio web",
    metaDescripcion: "Identidad visual, portada y enlaces públicos del negocio",
  },
  fiscales: {
    titulo: "Datos fiscales",
    hint: "Identificación tributaria de la organización",
    metaDescripcion: "Razón social, NIT y régimen tributario de la organización",
  },
  bancarios: {
    titulo: "Datos bancarios",
    hint: "Nequi, Daviplata o tu cuenta de banco",
    metaDescripcion: "Dónde recibe los pagos el negocio: Nequi, Daviplata o cuenta de banco",
  },
};

const NOMBRE_CANAL: Record<keyof CanalesGuardados, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  instagram: "Instagram",
  facebook: "Facebook",
};

const TEMA: Record<ThemePreference, string> = {
  light: "claro",
  dark: "oscuro",
  system: "según el sistema",
};

export const ConfiguracionPage = observer(() => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") as ClaveConfig | null;
  const seccion = searchParams.get("seccion") as SeccionNegocio | null;

  const [, setTick] = useState(0);
  useEffect(() => {
    const onReset = () => setTick((t) => t + 1);
    window.addEventListener("necto-bancarios-reset", onReset);
    return () => window.removeEventListener("necto-bancarios-reset", onReset);
  }, []);

  const nombreOrg = organizacionStore.organizacion?.nombre;

  const irA = (clave: ClaveConfig) => {
    setSearchParams({ tab: clave });
  };

  const volverAlHub = () => {
    setSearchParams({});
  };

  const irASeccion = (clave: SeccionNegocio) => {
    setSearchParams({ tab: "general", seccion: clave });
  };

  const volverANegocio = () => {
    setSearchParams({ tab: "general" });
  };

  // ── CONFIGURACIÓN DEL NEGOCIO ────────────────────────────────────────────
  //
  // Dos niveles: `?tab=general` es el submenú de las tres partes y
  // `?tab=general&seccion=…` es el detalle. Sin el submenú, fiscales y
  // bancarios no tenían dónde vivir y el formulario general cargaba con todo.
  if (tab === "general") {
    if (!seccion || !SECCIONES_NEGOCIO[seccion]) {
      const fiscal = organizacionStore.organizacion?.datosFiscales;
      const verificacion = organizacionStore.organizacion?.verificacion;
      const banco = organizacionStore.organizacion?.cuentasBancarias?.[0];
      const totalCuentas = organizacionStore.organizacion?.cuentasBancarias?.length ?? 0;
      const pais = organizacionStore.organizacion?.pais;
      const moneda = organizacionStore.organizacion?.moneda;
      const estaVerificadoBancario = estaBancariosVerificadoEnSesion(
        organizacionStore.organizacion?.id,
      );

      const tarjetasNegocio: TarjetaHub[] = [
        {
          key: "organizacion",
          label: "Datos generales de la organización",
          hint: "Nombre comercial, remitente de guías, teléfono, país y moneda.",
          ajustes: ["Nombre del negocio", "Nombre remitente", "Teléfono", "País y zona horaria", "Moneda"],
          estado: [nombreOrg, pais, moneda].filter(Boolean).join(" · "),
          icono: BuildingOffice2Icon,
          palabrasClave: ["general", "nombre", "telefono", "remitente", "pais", "moneda", "zona", "rubro"],
        },
        {
          key: "personalizacion",
          label: "Personalización del negocio",
          hint: "Logo, imagen de portada, descripción comercial y sitio web.",
          ajustes: ["Logo de la tienda", "Portada / Banner", "Descripción", "Sitio web", "Vista previa"],
          estado: [
            organizacionStore.organizacion?.logoUrl ? "Logo activo" : undefined,
            organizacionStore.organizacion?.portadaUrl ? "Portada activa" : undefined,
          ].filter(Boolean).join(" · ") || "Sin personalizar",
          icono: SparklesIcon,
          palabrasClave: ["personalizacion", "logo", "portada", "banner", "descripcion", "sitio", "web", "marca"],
        },
        {
          key: "fiscales",
          label: "Datos fiscales",
          hint: "Identificación tributaria para tus documentos. Opcional.",
          ajustes: ["Razón social", "NIT", "Régimen", "Dirección fiscal", "Correo de facturación"],
          // Opcional: vacío no es un aviso. Un vendedor ocasional sin NIT no
          // tiene nada pendiente aquí.
          estado:
            verificacion?.estado === "aprobado"
              ? "Documentos aprobados"
              : verificacion?.estado === "en_revision"
                ? "Documentos en revisión"
                : fiscal?.nit
                  ? `NIT ${fiscal.nit}`
                  : "Sin registrar",
          estadoTono: "neutro",
          icono: DocumentTextIcon,
          palabrasClave: ["fiscal", "nit", "rut", "razon social", "regimen", "iva", "impuestos", "facturacion"],
          onReset: () => {
            organizacionStore.reiniciarVerificacion();
            setTick((t) => t + 1);
          },
          resetLabel: "Reiniciar",
        },
        {
          key: "bancarios",
          label: "Datos bancarios",
          hint: "Dónde recibes tus pagos: Nequi, Daviplata o tu banco. Opcional.",
          ajustes: ["Nequi", "Daviplata", "Bancos de Colombia", "Titular"],
          estado:
            !estaVerificadoBancario
              ? "Verificación pendiente"
              : totalCuentas > 1
                ? `${totalCuentas} cuentas · ${banco?.banco ?? ""}`.trim()
                : banco
                  ? `${banco.banco} · ${banco.tipoCuenta}`
                  : "Sin registrar",
          estadoTono: !estaVerificadoBancario ? "aviso" : "neutro",
          icono: BanknotesIcon,
          palabrasClave: ["banco", "cuenta", "bancarios", "ahorros", "corriente", "transferencia", "titular", "nequi", "daviplata", "billetera"],
          onReset: () => {
            reiniciarBancariosEnSesion(organizacionStore.organizacion?.id);
            organizacionStore.reiniciarVerificacion();
            setTick((t) => t + 1);
          },
          resetLabel: "Reiniciar",
        },
      ];

      return (
        <div className="mx-auto max-w-5xl pb-12">
          <PageMeta
            title="Configuraciones · Configuración del negocio"
            description="Datos generales, personalización, fiscales y bancarios de la organización"
          />

          <VolverAlSelector onVolver={volverAlHub} />

          <div className="animate-aparecer">
            <ConfigHubPagina
              titulo={nombreOrg ? `Configuración del negocio · ${nombreOrg}` : "Configuración del negocio"}
              descripcion="Los datos de la organización, personalización de marca, identificación fiscal y cuentas bancarias."
              tarjetas={tarjetasNegocio}
              onEntrar={(k) => irASeccion(k as SeccionNegocio)}
            />
          </div>
        </div>
      );
    }

    const meta = SECCIONES_NEGOCIO[seccion];
    const estaVerificadoBancario = estaBancariosVerificadoEnSesion(
      organizacionStore.organizacion?.id,
    );

    return (
      <div className="mx-auto max-w-5xl pb-12">
        <PageMeta
          title={`Configuraciones · ${meta.titulo}`}
          description={meta.metaDescripcion}
        />

        <VolverANegocio onVolver={volverANegocio} />

        <div className="animate-aparecer">
          {seccion === "bancarios" ? (
            <DatosBancariosTab />
          ) : (
            <ConfigShell seccionKey={`general-${seccion}`} titulo={meta.titulo} hint={meta.hint}>
              {seccion === "fiscales" ? (
                <DatosFiscalesTab />
              ) : seccion === "personalizacion" ? (
                <PersonalizacionTab />
              ) : (
                <GeneralOrgTab />
              )}
            </ConfigShell>
          )}
        </div>
      </div>
    );
  }

  // ── VISTA INTERNA: MÓDULOS DE LA PLATAFORMA ──────────────────────────────
  if (tab === "modulos") {
    return (
      <div className="mx-auto max-w-5xl pb-12">
        <PageMeta
          title="Configuraciones · Integraciones"
          description="Servicios y extensiones activas de la organización"
        />

        <VolverAlSelector onVolver={volverAlHub} />

        <div className="animate-aparecer">
          <ConfigShell
            seccionKey="modulos"
            titulo="Integraciones"
            hint="Activa o desactiva capacidades instaladas en tu organización"
          >
            <ModulosTab />
          </ConfigShell>
        </div>
      </div>
    );
  }

  // ── VISTA INTERNA: CANALES DE MENSAJERÍA ──────────────────────────────────
  if (tab === "canales") {
    return (
      <div className="mx-auto max-w-5xl pb-12">
        <PageMeta
          title="Configuraciones · Opciones de mensajería"
          description="Conexión centralizada de WhatsApp, Telegram, Instagram y Facebook"
        />

        <VolverAlSelector onVolver={volverAlHub} />

        <div className="animate-aparecer">
          <ConfigShell
            seccionKey="canales"
            titulo="Opciones de mensajería"
            hint="Centraliza la recepción de mensajes, pedidos y atención omnicanal"
          >
            <CanalesOrgTab />
          </ConfigShell>
        </div>
      </div>
    );
  }

  // ── VISTA INTERNA: PREFERENCIAS ──────────────────────────────────────────
  //
  // Es la administración de las preferencias de interfaz de la aplicación
  // entera: el tema y las dos densidades. Se aplican al instante y se persisten
  // en `uiStore`; por eso esta vista no tiene botón de guardar.
  if (tab === "apariencia") {
    return (
      <div className="mx-auto max-w-5xl pb-12">
        <PageMeta
          title="Configuraciones · Preferencias"
          description="Tema y densidad de la interfaz"
        />

        <VolverAlSelector onVolver={volverAlHub} />

        <div className="animate-aparecer">
          <ConfigShell
            seccionKey="apariencia"
            titulo="Preferencias"
            hint="Tema y densidad de la interfaz. Se aplican al instante"
          >
            <AparienciaTab />
          </ConfigShell>
        </div>
      </div>
    );
  }

  // ── VISTA INICIAL: HUB DE SELECCIÓN ───────────────────────────────────────
  //
  // Mismo hub que las configuraciones de módulo (`ConfigHubPagina`): cada
  // tarjeta lista los ajustes que contiene y cómo están hoy.
  const org = organizacionStore.organizacion;
  const nModulos = organizacionStore.modulosActivos.length;
  const canales = leerCanalesGuardados();
  const conectados = (Object.keys(canales) as (keyof typeof canales)[])
    .filter((k) => canales[k])
    .map((k) => NOMBRE_CANAL[k]);
  const estado: Record<ClaveConfig, { texto: string; aviso?: boolean }> = {
    general: org
      ? { texto: [org.nombre, org.pais, org.moneda].filter(Boolean).join(" · ") }
      : { texto: "Faltan los datos de la organización", aviso: true },
    modulos: { texto: `${nModulos} ${nModulos === 1 ? "módulo activo" : "módulos activos"}` },
    canales:
      conectados.length > 0
        ? { texto: `Conectado: ${conectados.join(", ")}` }
        : { texto: "Ningún canal conectado", aviso: true },
    apariencia: { texto: `Tema ${TEMA[uiStore.themePreference]}` },
  };

  const tarjetas: TarjetaHub[] = TARJETAS_CONFIG.map((t) => ({
    key: t.key,
    label: t.label,
    hint: t.hint,
    icono: t.icono,
    ajustes: t.ajustes,
    estado: estado[t.key].texto,
    estadoTono: estado[t.key].aviso ? "aviso" : "neutro",
    palabrasClave: t.palabrasClave,
    accion: t.accion,
  }));

  return (
    <>
      <PageMeta
        title="Configuraciones"
        description="Centro de configuraciones de la organización"
      />
      <ConfigHubPagina
        titulo={nombreOrg ? `Configuraciones · ${nombreOrg}` : "Configuraciones"}
        descripcion="Lo que vale para toda la organización: sus datos, las integraciones, las opciones de mensajería y las preferencias."
        tarjetas={tarjetas}
        onEntrar={(k) => irA(k as ClaveConfig)}
      />
    </>
  );
});

export default ConfiguracionPage;
