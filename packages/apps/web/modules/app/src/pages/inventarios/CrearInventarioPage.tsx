import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { Textarea } from "@/elements/form/textarea";
import { Alert } from "@/elements/ui/alert";
import { CalenderIcon } from "@/icons";
import {
  inventariosStore,
  NOMBRES_ACTORES,
  RESPONSABLE_POR_DEFECTO,
  puedeContarInventario,
  type TipoInventario,
} from "@/stores";
import { CabeceraPagina, ContenedorPagina, EnlaceVolver } from "./inventarios.ui";
import { TIPO_INVENTARIO_META, OPCIONES_TIPO_INVENTARIO } from "./inventarios.constants";
import { caminoDe, formatearFechaHora, validarInventario } from "./inventarios.presentacion";
import { cn } from "@/utils";

// ═══════════════════════════════════════════════════════════════════════════
// CREAR CONTEO
// ═══════════════════════════════════════════════════════════════════════════
//
// El formulario tiene una decisión difícil y por eso el `hint` de cada tipo es
// largo: **de dónde sale la cantidad esperada**. La diferencia entre un conteo
// «inicial» y uno «periódico» no es una etiqueta, es si habrá o no comparación.
// Un usuario que elija «inicial» por parecer el más seguro acabará con un
// conteo que no calcula ninguna diferencia y no lo entenderá hasta el final.
//
// Todo eso se dice ANTES de crear, no después.

export const CrearInventarioPage = observer(function CrearInventarioPage() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoInventario>("periodico");
  const [ubicacionId, setUbicacionId] = useState("");
  const [responsableId, setResponsableId] = useState(RESPONSABLE_POR_DEFECTO);
  const [notas, setNotas] = useState("");
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

  const referencia = useMemo(() => {
    if (tipo === "inicial" || !ubicacionId) return null;
    return inventariosStore.ultimoFinalizadoDeUbicacionPublico(ubicacionId);
  }, [tipo, ubicacionId, inventariosStore.inventarios.length]);

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
          descripcion="Configura los datos del espacio que vas a verificar. El conteo se creará en borrador para que puedas alistar los productos antes de iniciar."
        />

        {errorServidor && (
          <Alert variant="error" title="No se pudo crear el conteo" message={errorServidor} />
        )}

        <Card className="divide-y divide-gray-100 p-6 dark:divide-gray-800 sm:p-7">
          {/* ── 1. Información principal ── */}
          <div className="space-y-4 pb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
              1. Datos principales
            </h2>

            <div>
              <Label htmlFor="inv-nombre">Nombre o título del conteo</Label>
              <Input
                id="inv-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Conteo mensual de bodega principal"
                error={enviado && !!validacion.errores.nombre}
              />
              {enviado && validacion.errores.nombre && (
                <p className="mt-1.5 text-xs text-error-700 dark:text-error-400">{validacion.errores.nombre}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="inv-ubicacion">Ubicación a contar</Label>
                <Select
                  options={opcionesUbicacion}
                  defaultValue={ubicacionId}
                  onChange={setUbicacionId}
                  placeholder="Selecciona la ubicación"
                  error={enviado && !!validacion.errores.ubicacionId}
                />
                {enviado && validacion.errores.ubicacionId && (
                  <p className="mt-1.5 text-xs text-error-700 dark:text-error-400">
                    {validacion.errores.ubicacionId}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="inv-responsable">Persona responsable</Label>
                <Select
                  options={opcionesResponsable}
                  defaultValue={responsableId}
                  onChange={setResponsableId}
                  error={enviado && !!validacion.errores.responsableId}
                />
              </div>
            </div>
          </div>

          {/* ── 2. Modalidad de conteo ── */}
          <div className="space-y-3 py-6">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                2. Modalidad de conteo
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Selecciona cómo deseas verificar las cantidades físicas:
              </p>
            </div>

            <div className="space-y-2">
              {OPCIONES_TIPO_INVENTARIO.map((o) => {
                const m = TIPO_INVENTARIO_META[o.value];
                const activa = tipo === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setTipo(o.value)}
                    className={cn(
                      "w-full rounded-xl border p-3.5 text-left transition-all",
                      activa
                        ? "border-brand-500 bg-brand-50/50 shadow-sm dark:border-brand-500/60 dark:bg-brand-500/10"
                        : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700",
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                          activa ? "border-brand-500 bg-brand-500" : "border-gray-300 dark:border-gray-600",
                        )}
                      >
                        {activa && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </span>
                      <span className="text-sm font-semibold text-ink-title dark:text-gray-100">{m.label}</span>
                    </div>
                    <p className="mt-1 pl-6 text-xs text-gray-500 dark:text-gray-400">
                      {m.hint}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Referencia previa contextual */}
            {tipo !== "inicial" && ubicacionId && referencia && (
              <div className="flex items-start gap-2.5 rounded-xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-white/[0.03] dark:text-gray-300">
                <CalenderIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                <div>
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    Se comparará contra el conteo {referencia.numero}
                  </span>
                  <p className="mt-0.5 text-gray-500 dark:text-gray-400">
                    Cerrado el {formatearFechaHora(referencia.finalizadoEn)}. Las existencias registradas allí servirán de base.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── 3. Observaciones y confirmación ── */}
          <div className="space-y-4 pt-6">
            <div>
              <Label htmlFor="inv-notas">Notas u observaciones (opcional)</Label>
              <Textarea
                id="inv-notas"
                value={notas}
                onChange={setNotas}
                rows={2}
                placeholder="Añade detalles útiles para el equipo (ej. sector revisado, condiciones de acceso)..."
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => navigate("/inventarios")}>
                Cancelar
              </Button>
              <Button onClick={crear} disabled={enviado && !validacion.ok}>
                Crear conteo
              </Button>
            </div>
          </div>
        </Card>
      </ContenedorPagina>
    </>
  );
});

export default CrearInventarioPage;
