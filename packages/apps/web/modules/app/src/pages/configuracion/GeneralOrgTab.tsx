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
  ConstructionIcon,
  FashionIcon,
  FoodIcon,
  GlobeAltIcon,
  GroupIcon,
  HealthIcon,
  IdentificationIcon,
  OtherRubroIcon,
  ServicesIcon,
  UserIcon,
} from "@/icons";
import {
  BloqueConfig,
  CampoConfig,
  ConfigAcciones,
  RejillaOpciones,
  type IconoConfig,
  type OpcionConIcono,
} from "@/pages/config-layout";

// ═══════════════════════════════════════════════════════════════════════════
// PESTAÑA "GENERAL" — datos de la organización
// ═══════════════════════════════════════════════════════════════════════════
//
// Es la pantalla que faltaba: el onboarding pide estos datos una vez y hasta
// ahora no había ningún sitio donde corregirlos. Se lee y se escribe en
// `organizacionStore.organizacion` (nivel 2), que es su dueño.
//
// ── Dos reglas que gobiernan esta pestaña ─────────────────────────────────
//
// 1. **Guardar es una acción con efecto, no un adorno.** El botón está
//    deshabilitado mientras no haya nada que guardar y lo dice. Un «Guardar
//    cambios» que se puede pulsar sin cambios, o que confirma sin escribir, es
//    la clase de control que este proyecto no acepta.
//
// 2. **Cada control tiene un lector.** No se pinta un campo que no cambie nada:
//    el identificador web se deriva del nombre y se ve cambiar, y el desfase
//    horario se calcula con `Intl` a partir de la zona guardada — así la zona
//    horaria deja de ser un valor que solo se escribe y que nadie lee.
//
// ═══════════════════════════════════════════════════════════════════════════

/** Lo que el formulario edita. Espeja los campos de `OrganizacionWorkspace`. */
interface Borrador {
  nombre: string;
  pais: string;
  moneda: string;
  zonaHoraria: string;
  tipoEmpresa: string;
  tamanoEquipo: string;
  logoUrl: string;
}

/** Zonas horarias que el producto conoce, derivadas de `PAISES_CONFIG`. */
const ZONAS_HORARIAS: string[] = [
  ...new Set(Object.values(PAISES_CONFIG).map((c) => c.zonaHoraria)),
].sort();

/** Países que el producto conoce, en el orden del catálogo. */
const PAISES: string[] = Object.keys(PAISES_CONFIG);

/**
 * Un icono por rubro, atado a `TIPOS_EMPRESA` por `value`.
 *
 * Antes «Tipo de empresa» era un `Select`: ocho rubros que el usuario no veía
 * hasta abrir el desplegable, uno a uno. Ahora se pintan los ocho a la vez con
 * una metáfora cada uno, porque ocho etiquetas de texto en fila no se
 * distinguen de un párrafo.
 *
 * Las etiquetas se ACORTAN para la ficha (donde el ancho es de una columna):
 * «Servicios Profesionales & Consultoría» es el `value` real, pero como rótulo
 * de ficha no cabe. Se acorta lo que se PINTA, nunca lo que se GUARDA.
 */
const ICONO_POR_RUBRO: Record<string, { icono: IconoConfig; corto: string }> = {
  "Gastronomía & Alimentos": { icono: FoodIcon, corto: "Gastronomía" },
  "Moda, Calzado & Accesorios": { icono: FashionIcon, corto: "Moda & Calzado" },
  // `BuildingStorefront` es también el icono del bloque «qué negocio eres»: se
  // reutiliza a propósito, no son dos conceptos distintos.
  "Retail & Comercio minorista": { icono: BuildingStorefrontIcon, corto: "Comercio minorista" },
  "Tecnología & Software": { icono: ServicesIcon, corto: "Tecnología" },
  "Servicios Profesionales & Consultoría": { icono: ServicesIcon, corto: "Servicios" },
  "Salud, Estética & Bienestar": { icono: HealthIcon, corto: "Salud & Bienestar" },
  "Construcción & Hogar": { icono: ConstructionIcon, corto: "Construcción & Hogar" },
  "Otro rubro comercial": { icono: OtherRubroIcon, corto: "Otro rubro" },
};

/**
 * Las fichas de rubro, derivadas del catálogo.
 *
 * Se construyen desde `TIPOS_EMPRESA` —no se copian a mano— para que el
 * selector no pueda desincronizarse: un rubro nuevo aparece aquí solo, y si
 * falta su icono el `filter` lo deja fuera en vez de pintar una ficha vacía.
 * Un rubro sin entrada se pinta igual, con el icono de «otro» y su nombre
 * completo: es preferible una ficha sin metáfora a un rubro sin elegir.
 */
const OPCIONES_RUBRO: OpcionConIcono<string>[] = TIPOS_EMPRESA.map((t) => ({
  value: t,
  label: ICONO_POR_RUBRO[t]?.corto ?? t,
  icono: ICONO_POR_RUBRO[t]?.icono ?? OtherRubroIcon,
}));

/** Fichas del tamaño del equipo, en el orden del catálogo. */
const OPCIONES_TAMANO: OpcionConIcono<string>[] = TAMANOS_EQUIPO.map((t) => ({
  value: t,
  label: t,
  icono: /^Solo yo/.test(t) ? UserIcon : GroupIcon,
}));

/**
 * Desfase de una zona horaria, o `null` si `Intl` no la reconoce.
 *
 * Es el LECTOR de `organizacion.zonaHoraria`, que hasta ahora se guardaba y no
 * lo leía nadie. Se calcula en vez de escribirse a mano para que no pueda
 * contradecir al valor guardado, y sirve de validación gratis: una zona que no
 * existe devuelve `null` y la fila lo dice.
 */
function desfaseDeZona(zona: string): string | null {
  try {
    const partes = new Intl.DateTimeFormat("es-CO", {
      timeZone: zona,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());
    return partes.find((p) => p.type === "timeZoneName")?.value ?? null;
  } catch {
    // `RangeError` si la zona no es un identificador IANA válido.
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ESTADO VACÍO — no hay organización que editar
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sin organización no hay nada que editar, y **se dice**.
 *
 * `actualizarOrganizacion()` se niega a crear una organización a propósito
 * —crear una empresa es un paso del onboarding, con su país, su moneda y su paso
 * siguiente—, así que pintar el formulario vacío y un botón que no guardaría
 * nada sería exactamente el control que miente. Se explica dónde se crea.
 */
const SinOrganizacion = () => (
  <BloqueConfig
    icono={IdentificationIcon}
    pregunta="Todavía no hay ninguna organización"
    descripcion="Estos datos se crean una vez, en el alta. Cuando exista tu organización podrás corregir aquí su nombre, su región y su logo."
  >
    <Link to="/onboarding/organizacion">
      <Button size="sm">Crear mi organización</Button>
    </Link>
  </BloqueConfig>
);

// ═══════════════════════════════════════════════════════════════════════════
// FORMULARIO
// ═══════════════════════════════════════════════════════════════════════════

const FormularioGeneral = observer(({ org }: { org: OrganizacionWorkspace }) => {
  /**
   * Sembrar desde la organización REAL del store — no desde el prop `org`.
   *
   * `org` llega por prop y vale lo que valía en el render en curso. Dentro de
   * `guardar()` ese prop YA ESTÁ OBSOLETO: `actualizarOrganizacion()` acaba de
   * escribir, pero la clausura del handler sigue apuntando al objeto viejo.
   * Re-sembrar desde el prop devolvía el borrador a los valores ANTERIORES, así
   * que `hayCambios` seguía siendo `true` y «Guardar cambios» no se volvía a
   * apagar nunca. Lo cazó el arnés: `74 OK · 1 FAIL  disabled=false`.
   *
   * Leyendo del store, sembrar y comparar miran siempre la misma verdad. El prop
   * queda solo como respaldo para el tipo (el padre ya garantiza que no es nulo).
   */
  const sembrar = (): Borrador => {
    const o = organizacionStore.organizacion ?? org;
    return {
      nombre: o.nombre,
      pais: o.pais,
      moneda: o.moneda,
      zonaHoraria: o.zonaHoraria,
      tipoEmpresa: o.tipoEmpresa ?? TIPO_EMPRESA_POR_DEFECTO,
      tamanoEquipo: o.tamanoEquipo ?? TAMANO_EQUIPO_POR_DEFECTO,
      logoUrl: o.logoUrl ?? "",
    };
  };

  const [borrador, setBorrador] = useState<Borrador>(sembrar);
  const [guardado, setGuardado] = useState(false);

  const set = <K extends keyof Borrador>(campo: K, valor: Borrador[K]) => {
    setBorrador((prev) => ({ ...prev, [campo]: valor }));
    setGuardado(false);
  };

  /**
   * ¿Hay algo que guardar?
   *
   * Se compara el borrador contra lo que hay en el store, campo a campo, en vez
   * de llevar un flag «tocado»: un campo que se edita y se vuelve a dejar como
   * estaba NO es un cambio, y un botón que se enciende por haber tocado algo
   * ofrece guardar algo que no existe.
   */
  const guardadoActual = sembrar();
  const hayCambios = (Object.keys(borrador) as (keyof Borrador)[]).some(
    (k) => borrador[k] !== guardadoActual[k],
  );

  const nombreValido = borrador.nombre.trim().length > 0;
  const puedeGuardar = hayCambios && nombreValido;

  const desfase = desfaseDeZona(borrador.zonaHoraria);

  /**
   * Cambiar de país PROPONE su moneda y su zona horaria.
   *
   * Es una propuesta, no un candado: un negocio puede facturar en dólares
   * operando desde Colombia. Por eso los tres campos siguen siendo editables
   * después, y la fila lo dice en vez de dejar que el usuario lo descubra.
   */
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
    // Re-sembrar desde el store para que el borrador vuelva a ser «lo guardado»:
    // es lo que deja el botón deshabilitado otra vez y hace que el aviso no
    // pueda sobrevivir a un cambio posterior.
    setBorrador(sembrar());
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  const opcionesZona = ZONAS_HORARIAS.includes(borrador.zonaHoraria)
    ? ZONAS_HORARIAS
    : [...ZONAS_HORARIAS, borrador.zonaHoraria];

  return (
    <>
      {/* ── IDENTIDAD ──────────────────────────────────────────────────── */}
      <BloqueConfig
        icono={IdentificationIcon}
        pregunta="¿Cómo se llama tu negocio?"
        descripcion="El nombre y el logo con los que aparece tu organización dentro de Necto."
      >
        {/* La etiqueta ya no repite la pregunta del bloque. Antes el bloque se
            titulaba «¿Cómo se llama tu negocio?» y la fila decía «Nombre de la
            organización»: dos renglones para el mismo dato, y el usuario tenía
            que emparejarlos por su cuenta. Queda un solo rótulo. */}
        <CampoConfig
          etiqueta="Nombre"
          ayuda="Es el nombre que ven tu equipo y tus comprobantes."
          htmlFor="org-nombre"
          ancho="max-w-md"
        >
          <Input
            id="org-nombre"
            value={borrador.nombre}
            placeholder="Ej. Boutique Roma"
            error={!nombreValido}
            hint={nombreValido ? undefined : "El nombre no puede quedar vacío."}
            onChange={(e) => set("nombre", e.target.value)}
          />
        </CampoConfig>

        <div className="mt-5">
          <CampoConfig
            etiqueta="Identificador web"
            ayuda="Se deriva del nombre: no se edita por separado, cambia con él."
            ancho="max-w-md"
          >
            <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
              necto.app/{slugDe(borrador.nombre)}
            </span>
          </CampoConfig>
        </div>

        <div className="mt-5">
          <CampoConfig
            etiqueta="Logo"
            ayuda="Dirección de una imagen. Se muestra a la izquierda tal como se verá."
            htmlFor="org-logo"
            ancho="max-w-md"
          >
            <div className="flex w-full items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-white/[0.03]">
                {borrador.logoUrl.trim() ? (
                  // El `alt` describe la imagen, no repite el nombre del campo: un
                  // lector de pantalla ya lo anuncia la etiqueta.
                  <img
                    src={borrador.logoUrl}
                    alt="Logo de la organización"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] font-semibold uppercase text-gray-400 dark:text-gray-500">
                    Sin
                  </span>
                )}
              </span>
              <Input
                id="org-logo"
                type="url"
                value={borrador.logoUrl}
                placeholder="https://…/logo.svg"
                onChange={(e) => set("logoUrl", e.target.value)}
              />
            </div>
          </CampoConfig>
        </div>
      </BloqueConfig>

      {/* ── REGIÓN ──────────────────────────────────────────────────────── */}
      <BloqueConfig
        icono={GlobeAltIcon}
        pregunta="¿Dónde operas y con qué moneda?"
        descripcion="Estos tres valores viajan juntos: cambiar el país propone su moneda y su zona horaria."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoConfig
            etiqueta="País"
            ayuda="País desde el que opera la organización."
            htmlFor="org-pais"
          >
            {/* `Select` del catálogo es NO controlado: solo lee `defaultValue` al
                montar. El `key` lo remonta cuando el valor cambia desde fuera,
                que es lo que pasa al cambiar de país o al recargar del store. */}
            <Select
              key={`pais-${borrador.pais}`}
              options={PAISES.map((p) => ({ value: p, label: p }))}
              defaultValue={borrador.pais}
              onChange={cambiarPais}
              aria-label="País de la organización"
            />
          </CampoConfig>

          <CampoConfig
            etiqueta="Moneda"
            ayuda="Código de tres letras. Cambiar el país lo propone."
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
            ayuda="Huso con el que se fechan las operaciones de la organización."
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

          {/* El lector de la zona: se calcula, no se guarda. Va como campo y no
              como fila de adorno porque es la prueba de que la zona se aplica. */}
          <CampoConfig
            etiqueta="Desfase horario"
            ayuda="Se calcula con la zona que hayas elegido, no se guarda aparte."
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

      {/* ── PERFIL DEL NEGOCIO ──────────────────────────────────────────── */}
      {/*
        Los dos controles de esta tarjeta ya NO son `<Select>`. Eran ocho rubros
        y cuatro tamaños escondidos tras un desplegable: el usuario no sabía qué
        había dentro hasta abrirlo, y comparar dos opciones exigía recordar la
        anterior. Ahora se ven todas a la vez y se eligen con un clic.

        El estado sigue siendo el MISMO borrador: elegir marca y guarda el botón
        «Guardar cambios» del pie. No se guarda al clic, para no romper la regla
        de que guardar es una acción con efecto y su «Descartar».
      */}
      <BloqueConfig
        icono={BuildingStorefrontIcon}
        pregunta="¿Qué tipo de negocio es?"
        descripcion="Rubro y tamaño del equipo. Son los mismos valores que preguntó el alta."
      >
        <CampoConfig
          etiqueta="Tipo de empresa"
          ayuda="Rubro principal del negocio. Se guarda el nombre completo del rubro, no la etiqueta corta que se ve aquí."
          ancho="max-w-none"
        >
          <RejillaOpciones
            opciones={OPCIONES_RUBRO}
            valor={borrador.tipoEmpresa}
            onChange={(v) => set("tipoEmpresa", v)}
            ariaLabel="Tipo de empresa"
          />
        </CampoConfig>

        <div className="mt-6">
          <CampoConfig
            etiqueta="Tamaño del equipo"
            ayuda="Cuántas personas operan hoy en la organización."
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

      {/* El aviso de por qué el botón está apagado. Sin esto, un «Guardar
          cambios» deshabilitado obliga a adivinar qué falta. */}
      {!nombreValido && (
        <Alert
          variant="warning"
          title="Falta el nombre de la organización"
          message="Sin nombre no se puede guardar: la organización se considera no creada y el resto de la aplicación manda al alta."
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

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * La pestaña. Elige entre el estado vacío y el formulario, y le pasa la
 * organización ya resuelta: así el formulario no tiene que defenderse de un
 * `null` que su padre ya descartó —que es como un formulario acaba pintándose
 * vacío «por si acaso» y confundiendo eso con un estado real.
 */
export const GeneralOrgTab = observer(() => {
  const org = organizacionStore.organizacion;
  if (!org || !organizacionStore.tieneOrganizacion) return <SinOrganizacion />;
  return <FormularioGeneral org={org} />;
});

export default GeneralOrgTab;
