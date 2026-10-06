import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Radio } from "@/elements/form/radio";
import { Select } from "@/elements/form/select";
import { Textarea } from "@/elements/form/textarea";
import { Alert } from "@/elements/ui/alert";
import { cn } from "@/utils";
import {
  inventariosStore,
  NOMBRES_ACTORES,
  RESPONSABLE_POR_DEFECTO,
  puedeContarInventario,
  type TipoInventario,
} from "@/stores";
import { CabeceraPagina, ContenedorPagina, EnlaceVolver } from "./inventarios.ui";
import {
  TIPO_INVENTARIO_META,
  OPCIONES_ELECCION_CONTEO,
  PREGUNTA_ELECCION_CONTEO,
  TIPO_CIERRE_CICLO,
} from "./inventarios.constants";
import { caminoDe, formatearFechaCorta, validarInventario } from "./inventarios.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// NUEVO CONTEO
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Qué cambió, y por qué ───────────────────────────────────────────────────
//
// Antes esta pantalla era un formulario de TRES secciones numeradas con cinco
// controles, y cada tipo de conteo traía un párrafo de dos líneas explicando
// mecánica interna. El resultado: había que leer un manual para rellenar cuatro
// campos.
//
// Ahora hay UNA tarjeta y UNA pregunta que el usuario ya sabe responder —«¿ya has
// contado aquí antes?»—. Los rótulos viven en `inventarios.constants`, que es la
// única fuente: esta vista NO decide cuáles son las opciones ni qué dice cada
// una, solo las pinta.
//
// El tercer tipo (`final`) no se elige aquí: es un cierre de ciclo y se ofrece
// como acción contextual, y solo cuando la ubicación elegida ya tiene un conteo
// cerrado. El tipo sigue existiendo en el dominio —lo usan la tabla, el detalle
// y los reportes— pero deja de ser una opción que haya que entender de antemano.
//
// Las notas van PLEGADAS: son opcionales y no compiten con lo que sí hay que
// decidir.

export const CrearInventarioPage = observer(function CrearInventarioPage() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoInventario>("periodico");
  const [ubicacionId, setUbicacionId] = useState("");
  const [responsableId, setResponsableId] = useState(RESPONSABLE_POR_DEFECTO);
  const [notas, setNotas] = useState("");
  const [notasAbiertas, setNotasAbiertas] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);

  const porId = inventariosStore.ubicacionesPorId;

  const opcionesUbicacion = useMemo(
    () =>
      inventariosStore.ubicacionesContables.map((u) => ({
        value: u.id,
        label: caminoDe(u.id, porId),
      })),
    [porId, inventariosStore.ubicaciones.length],
  );

  const opcionesResponsable = useMemo(
    () =>
      Object.entries(NOMBRES_ACTORES).map(([id, nombreActor]) => ({
        value: id,
        label: nombreActor,
      })),
    [],
  );

  const validacion = validarInventario({ nombre, tipo, ubicacionId, responsableId }, inventariosStore.ubicaciones);

  /** El conteo cerrado contra el que se compararía. `inicial` no compara. */
  const referencia = useMemo(() => {
    if (tipo === "inicial" || !ubicacionId) return null;
    return inventariosStore.ultimoFinalizadoDeUbicacionPublico(ubicacionId);
  }, [tipo, ubicacionId, inventariosStore.inventarios.length]);

  const sinComparacion = tipo === "inicial";

  function crear() {
    setEnviado(true);
    setErrorServidor(null);
    if (!validacion.ok) return;

    const r = inventariosStore.crearInventario(
      {
        nombre: nombre.trim(),
        tipo,
        ubicacionId,
        responsableId,
        notas: notas.trim() || undefined,
      },
      RESPONSABLE_POR_DEFECTO,
    );

    if (!r.ok) {
      setErrorServidor(r.motivo ?? "No se pudo crear el conteo");
      return;
    }
    const id = r.ids?.[0];
    navigate(id ? `/inventarios/${id}` : "/inventarios");
  }

  if (!puedeContarInventario()) {
    return (
      <ContenedorPagina>
        <CabeceraPagina titulo="Nuevo conteo" />
        <Alert
          variant="error"
          title="Sin permisos para contar"
          message="No cuentas con permisos para iniciar o registrar conteos de inventario."
        />
      </ContenedorPagina>
    );
  }

  return (
    <>
      <PageMeta title="Nuevo conteo · Inventarios" />

      <ContenedorPagina className="mx-auto w-full max-w-2xl">
        <CabeceraPagina
          volver={<EnlaceVolver onClick={() => navigate("/inventarios")}>Volver a conteos</EnlaceVolver>}
          titulo="Nuevo conteo"
        />

        {errorServidor && (
          <Alert variant="error" title="No se pudo crear el conteo" message={errorServidor} />
        )}

        <Card className="space-y-6 p-6 sm:p-7">
          <div>
            <Label htmlFor="inv-nombre">Nombre</Label>
            <Input
              id="inv-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Conteo mensual de bodega"
              error={enviado && !!validacion.errores.nombre}
            />
            {enviado && validacion.errores.nombre && (
              <p className="mt-1.5 text-xs text-error-700 dark:text-error-400">{validacion.errores.nombre}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="inv-ubicacion">Ubicación</Label>
              <Select
                options={opcionesUbicacion}
                defaultValue={ubicacionId}
                onChange={setUbicacionId}
                placeholder="Selecciona"
                error={enviado && !!validacion.errores.ubicacionId}
              />
              {enviado && validacion.errores.ubicacionId && (
                <p className="mt-1.5 text-xs text-error-700 dark:text-error-400">
                  {validacion.errores.ubicacionId}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="inv-responsable">Responsable</Label>
              <Select
                options={opcionesResponsable}
                defaultValue={responsableId}
                onChange={setResponsableId}
                error={enviado && !!validacion.errores.responsableId}
              />
            </div>
          </div>

          {/* ── La única pregunta que hay que responder ────────────────────── */}
          <fieldset className="border-t border-gray-100 pt-6 dark:border-gray-800">
            <legend className="text-sm font-semibold text-ink-title dark:text-white">
              {PREGUNTA_ELECCION_CONTEO}
            </legend>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {OPCIONES_ELECCION_CONTEO.map((valor) => {
                const meta = TIPO_INVENTARIO_META[valor];
                const activa = tipo === valor || (valor === "periodico" && tipo === TIPO_CIERRE_CICLO);
                return (
                  <Radio
                    key={valor}
                    id={`inv-eleccion-${valor}`}
                    name="inv-eleccion"
                    value={valor}
                    checked={activa}
                    label={meta.titulo}
                    description={meta.consecuencia}
                    onChange={() => setTipo(valor)}
                    className={cn(
                      "items-start rounded-xl border p-3.5 transition-colors",
                      activa
                        ? "border-brand-500 bg-brand-50/50 dark:border-brand-500/60 dark:bg-brand-500/10"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700",
                    )}
                  />
                );
              })}
            </div>

            {/* Sin comparación: es un hecho, no una advertencia. Etiqueta, no párrafo. */}
            {sinComparacion && (
              <p className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                Sin comparación
              </p>
            )}

            {/* Con referencia: UNA línea con el conteo y su fecha. */}
            {referencia && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Referencia:{" "}
                <span className="font-medium text-gray-700 dark:text-gray-200">{referencia.numero}</span>
                {" · "}
                {formatearFechaCorta(referencia.finalizadoEn)}
              </p>
            )}

            {/* Cierre de ciclo: contextual, solo si la ubicación ya tiene un conteo cerrado. */}
            {referencia && tipo !== TIPO_CIERRE_CICLO && (
              <button
                type="button"
                onClick={() => setTipo(TIPO_CIERRE_CICLO)}
                className="mt-2 text-xs font-medium text-secondary-600 hover:text-secondary-700 dark:text-accent-300"
              >
                {TIPO_INVENTARIO_META[TIPO_CIERRE_CICLO].titulo}
              </button>
            )}
          </fieldset>

          {/* ── Notas, plegadas: son opcionales y no compiten con lo que hay que decidir ── */}
          <div className="border-t border-gray-100 pt-5 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setNotasAbiertas((v) => !v)}
              aria-expanded={notasAbiertas}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {notasAbiertas ? "Ocultar notas" : "Añadir notas"}
            </button>
            {notasAbiertas && (
              <div className="mt-3">
                <Label htmlFor="inv-notas">Notas</Label>
                <Textarea
                  id="inv-notas"
                  value={notas}
                  onChange={setNotas}
                  rows={2}
                  placeholder="Sector revisado, condiciones de acceso…"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
            <Button variant="outline" onClick={() => navigate("/inventarios")}>
              Cancelar
            </Button>
            <Button onClick={crear} disabled={enviado && !validacion.ok}>
              Crear conteo
            </Button>
          </div>
        </Card>
      </ContenedorPagina>
    </>
  );
});

export default CrearInventarioPage;
