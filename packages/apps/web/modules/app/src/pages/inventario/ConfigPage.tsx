import { useMemo, useState } from "react";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Alert } from "@/elements/ui/alert";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Input } from "@/elements/form/input";
import { Select } from "@/elements/form/select";
import { Switch } from "@/elements/form/switch";
import { AlertIcon, BoxCubeIcon, BoxIconLine } from "@/icons";
import {
  inventarioStore,
  motivoSinPermiso,
  puede,
  SEVERIDAD_ALERTA_LABEL,
  UNIDAD_MEDIDA_LABEL,
  UNIDADES_MEDIDA,
  type InventarioConfig,
  type SeveridadAlerta,
  type UnidadMedida,
} from "@/stores";
import {
  CardHead,
  ConfigAcciones,
  ConfigHeader,
  ConfigSectionNav,
  ConfigShell,
  Label2,
  Segmentado,
  claseFila,
  type GrupoNav,
} from "@/pages/config-layout";
import {
  GRUPO_SECCION_LABEL,
  META_SECCION,
  seccionesPorGrupo,
  type IconoSeccion,
  type SeccionInventario,
} from "./configuracion.secciones";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE INVENTARIO
// ═══════════════════════════════════════════════════════════════════════════
//
// Tres secciones: `general` (unidad por defecto), `bodegas` (el catálogo) y
// `alertas` (cuándo avisa). Usa el mueble compartido de `@/pages/config-layout`
// —`ConfigHeader` + `ConfigSectionNav` + `ConfigShell`— sin redefinir ninguna
// primitiva: es la cuarta pantalla con la misma huella de rectángulos que
// `/configuracion`, `/pedidos/config` y `/conversaciones/config`.
//
// ── Dos permisos distintos, y por eso la compuerta es por sección ─────────
//
// `general` y `alertas` ESCRIBEN CONFIGURACIÓN: `settings.manage`.
// `bodegas` ADMINISTRA EL CATÁLOGO: `inventory.manage`. Son dos cosas distintas
// y el contrato ya las separa; un solo `soloLectura` para toda la página haría
// que quien configura alertas pudiera dar de baja una bodega, o al revés.
//
// La ruta se ENTRA con `settings.read`, como las otras tres configuraciones.
//
// ── La nav va FUERA del `<fieldset disabled>` ─────────────────────────────
//
// `<fieldset disabled>` desactiva NATIVAMENTE todo control de formulario de
// dentro, `<button>` incluidos. Con la nav dentro, en solo lectura el usuario no
// podría ni cambiar de sección para consultar. Es un defecto que ya se corrigió
// en `/conversaciones/config` y que aquí no se repite.
//
// ── `bodegas` no tiene borrador, y lo dice ────────────────────────────────
//
// Dar de alta o de baja una bodega se aplica al momento, porque el store valida
// cada operación por separado (última bodega, bodega con kárdex, promoción de la
// principal). Un borrador aquí prometería que «Descartar» deshace una baja, y no
// lo haría: el pie de esa sección ofrece la acción real en vez de un «Guardar»
// que no guarda nada.

/** Resolución del nombre de icono del catálogo. `Record` ⇒ exhaustivo. */
const ICONO_SECCION: Record<IconoSeccion, React.FC<React.SVGProps<SVGSVGElement>>> = {
  BoxCubeIcon,
  BoxIconLine,
  AlertIcon,
};

const OPCIONES_SEVERIDAD: { value: SeveridadAlerta; label: string }[] = (
  ["baja", "media", "alta"] as SeveridadAlerta[]
).map((s) => ({ value: s, label: SEVERIDAD_ALERTA_LABEL[s] }));

export const ConfigPage = observer(() => {
  const [seccion, setSeccion] = useState<SeccionInventario>("general");
  const [guardado, setGuardado] = useState(false);

  /**
   * Borrador de la configuración. Se copia al montar y se confirma al guardar.
   *
   * Copia profunda aunque hoy todos los campos sean primitivos: si mañana uno
   * deja de serlo, `{...store.config}` compartiría la referencia y editar el
   * borrador escribiría en el estado confirmado sin pulsar Guardar.
   */
  const copiaDe = (): InventarioConfig => ({ ...inventarioStore.config });
  const [draft, setDraft] = useState<InventarioConfig>(copiaDe);

  // ── Autorización ──
  const puedeGuardarConfig = puede("settings.manage");
  const puedeAdministrarCatalogo = puede("inventory.manage");
  const motivoSettings = motivoSinPermiso("settings.manage");
  const motivoCatalogo = motivoSinPermiso("inventory.manage");

  // La compuerta se resuelve POR SECCIÓN: ver el encabezado del archivo.
  const soloLectura =
    seccion === "bodegas" ? !puedeAdministrarCatalogo : !puedeGuardarConfig;
  const motivoSeccion = seccion === "bodegas" ? motivoCatalogo : motivoSettings;

  // ── Bodegas (sin borrador: se aplican al momento) ──
  const [nuevaBodega, setNuevaBodega] = useState("");
  const [errorBodega, setErrorBodega] = useState<string | null>(null);

  const crearBodega = () => {
    const res = inventarioStore.crearBodega({ nombre: nuevaBodega });
    if (!res.ok) {
      setErrorBodega(res.motivo);
      return;
    }
    setNuevaBodega("");
    setErrorBodega(null);
  };

  const marcarPrincipal = (id: string) => {
    const res = inventarioStore.marcarPrincipal(id);
    setErrorBodega(res.ok ? null : res.motivo);
  };

  const eliminarBodega = (id: string) => {
    const res = inventarioStore.eliminarBodega(id);
    setErrorBodega(res.ok ? null : res.motivo);
  };

  // ── Navegación: la forma que consume `<ConfigSectionNav>` ──
  const grupos: GrupoNav[] = useMemo(
    () =>
      seccionesPorGrupo().map(({ grupo, secciones }) => ({
        grupo,
        label: GRUPO_SECCION_LABEL[grupo],
        secciones: secciones.map((s) => ({
          key: s,
          label: META_SECCION[s].label,
          hint: META_SECCION[s].hint,
          icono: ICONO_SECCION[META_SECCION[s].icono],
        })),
      })),
    [],
  );

  // ── Setters del borrador: cualquiera invalida el aviso de «Guardado» ──
  const set = <K extends keyof InventarioConfig>(k: K, v: InventarioConfig[K]) => {
    setDraft((prev) => ({ ...prev, [k]: v }));
    setGuardado(false);
  };

  const guardar = () => {
    // Defensa en profundidad: la ruta ya exige `settings.read` y el control ya
    // está deshabilitado, pero no se persiste nada si falta la capacidad.
    if (!puedeGuardarConfig) return;
    inventarioStore.updateConfig(draft);
    setGuardado(true);
  };

  const descartar = () => {
    setDraft(copiaDe());
    setGuardado(false);
  };

  const bodegas = inventarioStore.bodegas;
  const meta = META_SECCION[seccion];

  return (
    <>
      <PageMeta
        title="Configuración · Inventario"
        description="Ajustes del módulo de inventario"
      />

      <div className="mb-5">
        <ConfigHeader
          titulo="Configuración de inventario"
          descripcion="Unidad de medida, bodegas y avisos de reposición."
        />
      </div>

      {soloLectura && (
        <div className="mb-6">
          <Alert
            variant="warning"
            title="Configuración en solo lectura"
            message={`Puedes consultar estos ajustes, pero no modificarlos. ${motivoSeccion}`}
          />
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* La nav va FUERA del fieldset: navegar entre secciones no es editar. */}
        <ConfigSectionNav
          grupos={grupos}
          activa={seccion}
          onSeleccionar={(k) => setSeccion(k as SeccionInventario)}
          ariaLabel="Secciones de configuración de inventario"
        />

        <fieldset disabled={soloLectura} className="m-0 min-w-0 flex-1 border-0 p-0">
          <ConfigShell
            seccionKey={seccion}
            titulo={meta.label}
            hint={meta.hint}
            footer={
              seccion === "bodegas" ? (
                // Sin borrador que guardar: la acción real de la sección.
                <ConfigAcciones
                  fija
                  mensaje={
                    errorBodega ? (
                      <span className="text-error-600 dark:text-error-400">{errorBodega}</span>
                    ) : undefined
                  }
                >
                  <Button onClick={crearBodega} disabled={!puedeAdministrarCatalogo}>
                    Añadir bodega
                  </Button>
                </ConfigAcciones>
              ) : (
                <ConfigAcciones
                  fija
                  mensaje={
                    guardado ? (
                      <span className="text-success-600 dark:text-success-500">Guardado ✓</span>
                    ) : undefined
                  }
                >
                  <Button variant="outline" onClick={descartar} disabled={soloLectura}>
                    Descartar cambios
                  </Button>
                  <Button onClick={guardar} disabled={soloLectura}>
                    Guardar cambios
                  </Button>
                </ConfigAcciones>
              )
            }
          >
            {/* ───────────── GENERAL ───────────── */}
            {seccion === "general" && (
              <>
                <Card>
                  <CardHead>Unidad de medida</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    La unidad que se propone al dar de alta un artículo. Es un valor por defecto,
                    no una imposición: cada artículo guarda la suya.
                  </p>

                  <div className="mt-4">
                    <div className={claseFila}>
                      <Label2
                        titulo="Unidad por defecto"
                        descripcion="Se preselecciona en el formulario de alta de artículo."
                      />
                      <div className="w-full sm:w-72">
                        <Select
                          key={`unidad-${draft.unidadPorDefecto}`}
                          options={UNIDADES_MEDIDA.map((u) => ({
                            value: u,
                            label: UNIDAD_MEDIDA_LABEL[u],
                          }))}
                          defaultValue={draft.unidadPorDefecto}
                          onChange={(v) => set("unidadPorDefecto", v as UnidadMedida)}
                          aria-label="Unidad de medida por defecto"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardHead>Alcance del módulo</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Lo que este módulo administra y lo que no. Se dice aquí para que nadie lo
                    busque donde no está.
                  </p>
                  <ul className="mt-3 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <li>
                      · El catálogo de artículos es <span className="font-medium">propio</span>: no
                      es el catálogo de venta de Pedidos.
                    </li>
                    <li>
                      · La existencia no se guarda en ningún sitio: se deriva del kárdex, y por eso
                      no hay un campo que «corregir» a mano.
                    </li>
                    <li>
                      · El precio de venta no se administra aquí.
                    </li>
                  </ul>
                </Card>
              </>
            )}

            {/* ───────────── BODEGAS ───────────── */}
            {seccion === "bodegas" && (
              <>
                <Card>
                  <CardHead>Bodegas</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Los sitios físicos donde puede haber mercancía. Exactamente una es la
                    principal: es la que se propone por defecto al registrar un movimiento.
                  </p>

                  <div className="mt-4">
                    {bodegas.map((b) => (
                      <div key={b.id} className={claseFila}>
                        <Label2
                          titulo={b.nombre}
                          descripcion={
                            b.principal
                              ? "Bodega principal: se propone por defecto en los movimientos."
                              : "Bodega secundaria."
                          }
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          {b.principal ? (
                            <Badge color="light" size="sm">
                              Principal
                            </Badge>
                          ) : (
                            // El motivo va en el `title` del `<span>` que envuelve
                            // el botón, no en el botón: `Button` no acepta `title`
                            // y un `<button disabled>` no recibe eventos de ratón,
                            // así que un tooltip puesto ahí no aparecería nunca.
                            <span
                              title={puedeAdministrarCatalogo ? undefined : motivoCatalogo}
                            >
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => marcarPrincipal(b.id)}
                                disabled={!puedeAdministrarCatalogo}
                              >
                                Marcar principal
                              </Button>
                            </span>
                          )}
                          <span
                            title={
                              !puedeAdministrarCatalogo
                                ? motivoCatalogo
                                : bodegas.length === 1
                                  ? "Es la única bodega: el módulo necesita al menos una."
                                  : undefined
                            }
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => eliminarBodega(b.id)}
                              disabled={!puedeAdministrarCatalogo || bodegas.length === 1}
                            >
                              Eliminar
                            </Button>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card>
                  <CardHead>Nueva bodega</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Se crea al momento, sin pasar por «Guardar cambios»: el alta de una bodega se
                    valida sola y no depende del resto de la configuración.
                  </p>

                  <div className="mt-4">
                    <div className={claseFila}>
                      <Label2
                        titulo="Nombre"
                        descripcion="Como se verá en el kárdex y en los selectores de movimiento."
                        htmlFor="inv-nueva-bodega"
                      />
                      <div className="w-full sm:w-72">
                        <Input
                          id="inv-nueva-bodega"
                          value={nuevaBodega}
                          onChange={(e) => setNuevaBodega(e.target.value)}
                          placeholder="Bodega norte"
                        />
                      </div>
                    </div>
                  </div>

                  {errorBodega && (
                    <div className="mt-4">
                      <Alert variant="error" title="No se pudo aplicar" message={errorBodega} />
                    </div>
                  )}
                </Card>
              </>
            )}

            {/* ───────────── ALERTAS ───────────── */}
            {seccion === "alertas" && (
              <>
                <Card>
                  <CardHead>Aviso de reposición</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Cuándo el módulo señala que un artículo necesita reposición. El aviso no cambia
                    los datos: solo decide qué se destaca.
                  </p>

                  <div className="mt-4">
                    <div className={claseFila}>
                      <Label2
                        titulo="Avisar por debajo del mínimo"
                        descripcion="Señala los artículos cuya existencia no alcanza su punto de reorden."
                      />
                      <Switch
                        checked={draft.alertaBajoMinimo}
                        onChange={() => set("alertaBajoMinimo", !draft.alertaBajoMinimo)}
                        aria-label="Activar el aviso de reposición"
                      />
                    </div>

                    <div className={claseFila}>
                      <Label2
                        titulo="Margen de aviso"
                        descripcion="Porcentaje sobre el mínimo a partir del cual se considera «cerca del mínimo». 0 = solo avisa por debajo."
                      />
                      <div className="w-full sm:w-40">
                        <Input
                          id="inv-margen"
                          type="number"
                          min="0"
                          value={String(draft.margenAviso)}
                          onChange={(e) => set("margenAviso", Number(e.target.value) || 0)}
                          aria-label="Margen de aviso sobre el mínimo, en porcentaje"
                        />
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <CardHead>Severidad del aviso</CardHead>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Con qué gravedad se pinta el aviso en el panel de inicio. No cambia qué
                    artículos aparecen, solo cómo de visible es.
                  </p>

                  <div className="mt-4">
                    <div className={claseFila}>
                      <Label2 titulo="Severidad" descripcion="Aplica a todos los avisos del módulo." />
                      <Segmentado
                        opciones={OPCIONES_SEVERIDAD}
                        valor={draft.severidadAlerta}
                        onChange={(v) => set("severidadAlerta", v)}
                        ariaLabel="Severidad del aviso de reposición"
                      />
                    </div>
                  </div>
                </Card>

                {!draft.alertaBajoMinimo && (
                  <Alert
                    variant="warning"
                    title="Los avisos están apagados"
                    message="El panel de inicio seguirá mostrando qué falta, pero el módulo no avisará por ningún otro medio. Enciende el interruptor para que los avisos cuenten."
                  />
                )}
              </>
            )}
          </ConfigShell>
        </fieldset>
      </div>
    </>
  );
});

export default ConfigPage;
