import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Link } from "react-router";

import { Alert } from "@/elements/ui/alert";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
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
  CardHead,
  ConfigAcciones,
  Label2,
  claseFila,
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
  <Card>
    <CardHead>Todavía no hay ninguna organización</CardHead>
    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
      Estos datos se crean una vez, en el alta. Cuando exista tu organización podrás
      corregir aquí su nombre, su región y su logo.
    </p>

    <div className="mt-4">
      <Link to="/onboarding/organizacion">
        <Button size="sm">Crear mi organización</Button>
      </Link>
    </div>
  </Card>
);

// ═══════════════════════════════════════════════════════════════════════════
// FORMULARIO
// ═══════════════════════════════════════════════════════════════════════════

const filaBase = claseFila;

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
      <Card>
        <CardHead>Identidad</CardHead>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Con qué nombre y con qué logo aparece tu organización dentro de Necto.
        </p>

        <div className="mt-4">
          <div className={filaBase}>
            <Label2
              titulo="Nombre de la organización"
              descripcion="Es el nombre que ven tu equipo y tus comprobantes."
              htmlFor="org-nombre"
            />
            <div className="w-full sm:w-80">
              <Input
                id="org-nombre"
                value={borrador.nombre}
                placeholder="Ej. Boutique Roma"
                error={!nombreValido}
                hint={nombreValido ? undefined : "El nombre no puede quedar vacío."}
                onChange={(e) => set("nombre", e.target.value)}
              />
            </div>
          </div>

          <div className={filaBase}>
            <Label2
              titulo="Identificador web"
              descripcion="Se deriva del nombre: no se edita por separado, cambia con él."
            />
            <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
              necto.app/{slugDe(borrador.nombre)}
            </span>
          </div>

          <div className={filaBase}>
            <Label2
              titulo="Logo"
              descripcion="Dirección de una imagen. Se muestra a la izquierda tal como se verá."
              htmlFor="org-logo"
            />
            <div className="flex w-full items-center gap-3 sm:w-80">
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
          </div>
        </div>
      </Card>

      {/* ── REGIÓN ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHead>Región</CardHead>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Dónde opera el negocio y en qué unidad se expresan sus importes. Cambiar el país
          propone su moneda y su zona horaria; puedes ajustarlas después.
        </p>

        <div className="mt-4">
          <div className={filaBase}>
            <Label2
              titulo="País"
              descripcion="País desde el que opera la organización."
              htmlFor="org-pais"
            />
            <div className="w-full sm:w-72">
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
            </div>
          </div>

          <div className={filaBase}>
            <Label2
              titulo="Moneda"
              descripcion="Código de tres letras con el que se expresan los importes."
              htmlFor="org-moneda"
            />
            <div className="w-full sm:w-72">
              <Input
                id="org-moneda"
                value={borrador.moneda}
                maxLength={3}
                placeholder="COP"
                onChange={(e) => set("moneda", e.target.value)}
              />
            </div>
          </div>

          <div className={filaBase}>
            <Label2
              titulo="Zona horaria"
              descripcion="Huso con el que se fechan las operaciones de la organización."
              htmlFor="org-zona"
            />
            <div className="w-full sm:w-72">
              <Select
                key={`zona-${borrador.zonaHoraria}`}
                options={opcionesZona.map((z) => ({ value: z, label: z }))}
                defaultValue={borrador.zonaHoraria}
                onChange={(v) => set("zonaHoraria", v)}
                aria-label="Zona horaria de la organización"
              />
            </div>
          </div>

          <div className={filaBase}>
            <Label2
              titulo="Desfase horario"
              descripcion="Se calcula con la zona que hayas elegido, no se guarda aparte."
            />
            {desfase ? (
              <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{desfase}</span>
            ) : (
              <span className="text-xs text-error-500">
                «{borrador.zonaHoraria}» no es una zona horaria reconocida.
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* ── PERFIL DEL NEGOCIO ──────────────────────────────────────────── */}
      <Card>
        <CardHead>Perfil del negocio</CardHead>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Rubro y tamaño del equipo. Son los mismos valores que preguntó el alta.
        </p>

        <div className="mt-4">
          <div className={filaBase}>
            <Label2
              titulo="Tipo de empresa"
              descripcion="Rubro principal del negocio."
              htmlFor="org-tipo"
            />
            <div className="w-full sm:w-72">
              <Select
                key={`tipo-${borrador.tipoEmpresa}`}
                options={TIPOS_EMPRESA.map((t) => ({ value: t, label: t }))}
                defaultValue={borrador.tipoEmpresa}
                onChange={(v) => set("tipoEmpresa", v)}
                aria-label="Tipo de empresa"
              />
            </div>
          </div>

          <div className={filaBase}>
            <Label2
              titulo="Tamaño del equipo"
              descripcion="Cuántas personas operan hoy en la organización."
              htmlFor="org-tamano"
            />
            <div className="w-full sm:w-72">
              <Select
                key={`tamano-${borrador.tamanoEquipo}`}
                options={TAMANOS_EQUIPO.map((t) => ({ value: t, label: t }))}
                defaultValue={borrador.tamanoEquipo}
                onChange={(v) => set("tamanoEquipo", v)}
                aria-label="Tamaño del equipo"
              />
            </div>
          </div>
        </div>
      </Card>

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
            <span className="font-semibold text-success-600 dark:text-success-400">
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
