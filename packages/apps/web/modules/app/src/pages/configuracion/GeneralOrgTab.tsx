import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Link } from "react-router";

import { Alert } from "@/elements/ui/alert";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Select } from "@/elements/form/select";
import {
  organizacionStore,
  PAISES_CONFIG,
  TAMANO_EQUIPO_POR_DEFECTO,
  TAMANOS_EQUIPO,
  TIPO_EMPRESA_POR_DEFECTO,
  TIPOS_EMPRESA,
  slugDe,
  type OrganizacionWorkspace,
} from "@/stores/organizacion.store";
import {
  BuildingStorefrontIcon,
  GlobeAltIcon,
  GroupIcon,
  IdentificationIcon,
  UserIcon,
} from "@/icons";
import { TruckIcon, PhoneIcon } from "@heroicons/react/24/outline";
import {
  BloqueConfig,
  CampoConfig,
  ConfigAcciones,
  RejillaOpciones,
  type OpcionConIcono,
} from "@/pages/config-layout";

// ═══════════════════════════════════════════════════════════════════════════
// PESTAÑA "DATOS GENERALES DE LA ORGANIZACIÓN"
// ═══════════════════════════════════════════════════════════════════════════

interface Borrador {
  nombre: string;
  nombrePublico: string;
  telefono: string;
  pais: string;
  moneda: string;
  zonaHoraria: string;
  tipoEmpresa: string;
  tamanoEquipo: string;
}

const ZONAS_HORARIAS: string[] = [
  ...new Set(Object.values(PAISES_CONFIG).map((c) => c.zonaHoraria)),
].sort();

const PAISES: string[] = Object.keys(PAISES_CONFIG);

function opcionesDeTipo(valorGuardado: string): string[] {
  const catalogo: string[] = [...TIPOS_EMPRESA];
  return catalogo.includes(valorGuardado) || !valorGuardado
    ? catalogo
    : [valorGuardado, ...catalogo];
}

const OPCIONES_TAMANO: OpcionConIcono<string>[] = TAMANOS_EQUIPO.map((t) => ({
  value: t,
  label: t,
  icono: /^Solo yo/.test(t) ? UserIcon : GroupIcon,
}));

function desfaseDeZona(zona: string): string | null {
  try {
    const partes = new Intl.DateTimeFormat("es-CO", {
      timeZone: zona,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());
    return partes.find((p) => p.type === "timeZoneName")?.value ?? null;
  } catch {
    return null;
  }
}

const SinOrganizacion = () => (
  <BloqueConfig
    icono={IdentificationIcon}
    pregunta="Todavía no hay ninguna organización creada"
    descripcion="Crea una organización para configurar sus datos de operación, país y moneda."
  >
    <Link to="/onboarding/organizacion">
      <Button size="sm">Crear mi organización</Button>
    </Link>
  </BloqueConfig>
);

const FormularioGeneral = observer(({ org }: { org: OrganizacionWorkspace }) => {
  const sembrar = (): Borrador => {
    const o = organizacionStore.organizacion ?? org;
    return {
      nombre: o.nombre,
      nombrePublico: o.nombrePublico ?? o.nombre,
      telefono: o.telefono ?? "",
      pais: o.pais,
      moneda: o.moneda,
      zonaHoraria: o.zonaHoraria,
      tipoEmpresa: o.tipoEmpresa ?? TIPO_EMPRESA_POR_DEFECTO,
      tamanoEquipo: o.tamanoEquipo ?? TAMANO_EQUIPO_POR_DEFECTO,
    };
  };

  const [borrador, setBorrador] = useState<Borrador>(sembrar);
  const [guardado, setGuardado] = useState(false);

  const set = <K extends keyof Borrador>(campo: K, valor: Borrador[K]) => {
    setBorrador((prev) => ({ ...prev, [campo]: valor }));
    setGuardado(false);
  };

  const guardadoActual = sembrar();
  const hayCambios = (Object.keys(borrador) as (keyof Borrador)[]).some(
    (k) => borrador[k] !== guardadoActual[k],
  );

  const nombreValido = borrador.nombre.trim().length > 0;
  const puedeGuardar = hayCambios && nombreValido;

  const desfase = desfaseDeZona(borrador.zonaHoraria);
  const opcionesTipo = opcionesDeTipo(borrador.tipoEmpresa);

  const cambiarPais = (nuevoPais: string) => {
    const config = PAISES_CONFIG[nuevoPais];
    setBorrador((prev) => ({
      ...prev,
      pais: nuevoPais,
      moneda: config?.moneda ?? prev.moneda,
      zonaHoraria: config?.zonaHoraria ?? prev.zonaHoraria,
    }));
    setGuardado(false);
  };

  const guardar = () => {
    if (!puedeGuardar) return;
    organizacionStore.actualizarOrganizacion(borrador);
    setBorrador(sembrar());
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  const opcionesZona = ZONAS_HORARIAS.includes(borrador.zonaHoraria)
    ? ZONAS_HORARIAS
    : [...ZONAS_HORARIAS, borrador.zonaHoraria];

  return (
    <>
      {/* ── IDENTIFICACIÓN Y CONTACTO DE OPERACIÓN ────────────────────────── */}
      <BloqueConfig
        icono={IdentificationIcon}
        pregunta="Datos operativos del negocio"
        descripcion="El nombre con el que lo identificas en Necto, los datos de remitente para guías y tu teléfono de contacto."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoConfig
            etiqueta="Nombre del negocio (interno)"
            ayuda="Nombre con el que lo reconoces en tu selector de negocios."
            htmlFor="org-nombre"
            ancho="max-w-none"
          >
            <Input
              id="org-nombre"
              value={borrador.nombre}
              placeholder="Ej. Calzados Martínez"
              error={!nombreValido}
              hint={nombreValido ? undefined : "El nombre no puede quedar vacío."}
              onChange={(e) => set("nombre", e.target.value)}
            />
          </CampoConfig>

          <CampoConfig
            etiqueta="Identificador web derivado"
            ayuda="Se deriva automáticamente del nombre del negocio."
            ancho="max-w-none"
          >
            <span className="font-mono text-[14px] font-bold text-[#190088] dark:text-[#97D6DF]">
              necto.app/{slugDe(borrador.nombre)}
            </span>
          </CampoConfig>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <CampoConfig
            etiqueta="Nombre público (remitente)"
            ayuda="Aparecerá impreso como remitente en las guías de transporte."
            htmlFor="org-nombre-publico"
            ancho="max-w-none"
          >
            <div className="relative">
              <Input
                id="org-nombre-publico"
                value={borrador.nombrePublico}
                placeholder="Nombre para etiquetas de envío"
                onChange={(e) => set("nombrePublico", e.target.value)}
              />
            </div>
          </CampoConfig>

          <CampoConfig
            etiqueta="Teléfono del negocio"
            ayuda="Número de contacto para las guías de despacho y novedades."
            htmlFor="org-telefono"
            ancho="max-w-none"
          >
            <Input
              id="org-telefono"
              type="tel"
              value={borrador.telefono}
              placeholder="Ej. (+57) 300 123 4567"
              onChange={(e) => set("telefono", e.target.value)}
            />
          </CampoConfig>
        </div>
      </BloqueConfig>

      {/* ── REGIÓN Y MONEDA ────────────────────────────────────────────────── */}
      <BloqueConfig
        icono={GlobeAltIcon}
        pregunta="¿Dónde operas y con qué moneda?"
        descripcion="Estos valores configuran las transportadoras disponibles, la moneda de los pedidos y la fecha de las transacciones."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoConfig
            etiqueta="País de operación"
            ayuda="País donde opera este negocio."
            htmlFor="org-pais"
          >
            <Select
              key={`pais-${borrador.pais}`}
              options={PAISES.map((p) => ({ value: p, label: p }))}
              defaultValue={borrador.pais}
              onChange={cambiarPais}
              aria-label="País de la organización"
            />
          </CampoConfig>

          <CampoConfig
            etiqueta="Moneda principal"
            ayuda="Código de 3 letras (COP, USD, PEN, etc.)."
            htmlFor="org-moneda"
          >
            <Input
              id="org-moneda"
              value={borrador.moneda}
              maxLength={3}
              placeholder="COP"
              onChange={(e) => set("moneda", e.target.value)}
            />
          </CampoConfig>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <CampoConfig
            etiqueta="Zona horaria"
            ayuda="Huso con el que se fechan las operaciones de este negocio."
            htmlFor="org-zona"
          >
            <Select
              key={`zona-${borrador.zonaHoraria}`}
              options={opcionesZona.map((z) => ({ value: z, label: z }))}
              defaultValue={borrador.zonaHoraria}
              onChange={(v) => set("zonaHoraria", v)}
              aria-label="Zona horaria de la organización"
            />
          </CampoConfig>

          <CampoConfig
            etiqueta="Desfase horario calculado"
            ayuda="Se calcula dinámicamente con la zona horaria elegida."
            ancho="max-w-none"
          >
            {desfase ? (
              <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{desfase}</span>
            ) : (
              <span className="text-xs text-error-500">
                «{borrador.zonaHoraria}» no es una zona horaria reconocida.
              </span>
            )}
          </CampoConfig>
        </div>
      </BloqueConfig>

      {/* ── PERFIL DEL NEGOCIO ────────────────────────────────────────────── */}
      <BloqueConfig
        icono={BuildingStorefrontIcon}
        pregunta="¿Qué tipo de negocio es?"
        descripcion="Rubro y tamaño de equipo. Son datos informativos que ayudan a adaptar métricas y sugerencias del sistema."
      >
        <CampoConfig
          etiqueta="Tipo de empresa / Rubro"
          ayuda="Informativo. Categoriza tu sector en Necto."
          htmlFor="org-tipo"
          ancho="max-w-md"
        >
          <Select
            key={`tipo-${borrador.tipoEmpresa}`}
            options={opcionesTipo.map((t) => ({ value: t, label: t }))}
            defaultValue={borrador.tipoEmpresa}
            onChange={(v) => set("tipoEmpresa", v)}
            aria-label="Tipo de empresa"
          />
        </CampoConfig>

        <div className="mt-6">
          <CampoConfig
            etiqueta="Tamaño del equipo"
            ayuda="Cuántas personas operan hoy en este negocio."
            ancho="max-w-none"
          >
            <RejillaOpciones
              opciones={OPCIONES_TAMANO}
              valor={borrador.tamanoEquipo}
              onChange={(v) => set("tamanoEquipo", v)}
              ariaLabel="Tamaño del equipo"
              columnas="sm:grid-cols-4"
            />
          </CampoConfig>
        </div>
      </BloqueConfig>

      {!nombreValido && (
        <Alert
          variant="warning"
          title="Falta el nombre del negocio"
          message="El negocio debe tener un nombre para poder guardar sus cambios."
        />
      )}

      <ConfigAcciones
        mensaje={
          guardado ? (
            <span className="font-semibold text-accent-600 dark:text-accent-400">
              Cambios guardados
            </span>
          ) : !hayCambios ? (
            <span className="text-gray-400 dark:text-gray-500">
              No hay cambios pendientes.
            </span>
          ) : undefined
        }
      >
        <Button
          size="sm"
          variant="outline"
          disabled={!hayCambios}
          onClick={() => {
            setBorrador(sembrar());
            setGuardado(false);
          }}
        >
          Descartar
        </Button>
        <Button size="sm" disabled={!puedeGuardar} onClick={guardar}>
          Guardar cambios
        </Button>
      </ConfigAcciones>
    </>
  );
});

export const GeneralOrgTab = observer(() => {
  const org = organizacionStore.organizacion;
  if (!org || !organizacionStore.tieneOrganizacion) return <SinOrganizacion />;
  return <FormularioGeneral org={org} />;
});

export default GeneralOrgTab;
