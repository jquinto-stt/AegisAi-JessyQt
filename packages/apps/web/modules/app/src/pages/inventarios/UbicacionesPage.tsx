import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Alert } from "@/elements/ui/alert";
import { Modal } from "@/elements/ui/modal";
import { PlusIcon } from "@/icons";
import { inventariosStore, puedeGestionarCatalogo, type Ubicacion } from "@/stores";
import { NIVEL_UBICACION_META } from "./inventarios.constants";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { ModalUbicacion, NodoUbicacion } from "./ModalUbicacion";
import { SinResultados } from "./inventarios.widgets";

// ═══════════════════════════════════════════════════════════════════════════
// UBICACIONES — el árbol donde se cuenta
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Por qué un árbol y no una tabla ────────────────────────────────────────
//
// La relación padre-hijo **es** la información aquí: un cliente agrupa sedes y
// una sede agrupa espacios. En una tabla, «Sede Norte» sería una fila con un
// campo «depende de» que hay que leer y reconstruir mentalmente. El árbol lo
// dice de un golpe de vista.
//
// ── Las tres operaciones destructivas y cómo se protegen ───────────────────
//
//   1. **Desactivar con hijos activos** → bloqueado (R13). Se dice cuántos hay.
//   2. **Desactivar con conteos abiertos** → bloqueado (R13). Se dice cuántos.
//   3. **Reactivar bajo un padre inactivo** → bloqueado. El store lo comprueba:
//      una ubicación activa dentro de una sede inactiva no aparecería en el
//      selector de conteo, que es la peor forma de fallar — invisible.

export const UbicacionesPage = observer(function UbicacionesPage() {
  const navigate = useNavigate();

  const [modal, setModal] = useState<{
    abierto: boolean;
    ubicacion: Ubicacion | null;
    nivelInicial?: Ubicacion["nivel"];
    padreInicial?: string | null;
  }>({ abierto: false, ubicacion: null });

  const [confirmarBaja, setConfirmarBaja] = useState<Ubicacion | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const puedeGestionar = puedeGestionarCatalogo();
  const arbol = inventariosStore.arbolUbicaciones;

  function darDeBaja(u: Ubicacion) {
    const r =
      u.estado === "inactivo" ? inventariosStore.activarUbicacion(u.id) : inventariosStore.desactivarUbicacion(u.id);
    if (!r.ok) {
      setAviso(r.motivo ?? "No se pudo cambiar el estado de la ubicación");
      setConfirmarBaja(null);
      return;
    }
    setAviso(null);
    setConfirmarBaja(null);
  }

  const conteos = inventariosStore.inventarios.length;

  return (
    <>
      <PageMeta
        title="Ubicaciones · Inventarios"
        description="Estructura de lugares y espacios físicos para el inventario."
      />

      <ContenedorPagina>
        <CabeceraPagina
          titulo="Ubicaciones"
          descripcion="Organiza las empresas, sedes y espacios físicos donde se realizan los conteos de inventario."
          acciones={
            puedeGestionar ? (
              <Button
                size="sm"
                startIcon={<PlusIcon className="h-4 w-4" />}
                onClick={() => setModal({ abierto: true, ubicacion: null, nivelInicial: "cliente" })}
              >
                Nueva ubicación
              </Button>
            ) : undefined
          }
        />

        {aviso && <Alert variant="warning" title="Atención" message={aviso} />}

        {/* ── Contadores de nivel ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Contador
            valor={inventariosStore.ubicaciones.filter((u) => u.nivel === "cliente").length}
            etiqueta="Empresas / Clientes"
          />
          <Contador
            valor={inventariosStore.ubicaciones.filter((u) => u.nivel === "sede").length}
            etiqueta="Sedes y sucursales"
          />
          <Contador
            valor={inventariosStore.ubicacionesContables.length}
            etiqueta="Espacios de conteo"
            tono="info"
          />
        </div>

        {/* ── Árbol de Jerarquía ────────────────────────────────────────── */}
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
            <div>
              <h2 className="text-base font-semibold text-ink-title dark:text-white">Lugares y espacios registrados</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Selecciona una ubicación para ver sus detalles o iniciar una verificación.
              </p>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {inventariosStore.ubicaciones.length} ubicaciones en total
            </span>
          </div>

          {arbol.raices.length === 0 ? (
            <SinResultados
              titulo="Aún no hay ubicaciones registradas"
              detalle="Comienza creando la primera empresa o cliente, y luego agrega sus sedes y espacios de conteo."
              accion={
                puedeGestionar ? (
                  <Button
                    size="sm"
                    startIcon={<PlusIcon className="h-4 w-4" />}
                    onClick={() => setModal({ abierto: true, ubicacion: null, nivelInicial: "cliente" })}
                  >
                    Crear primera ubicación
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-1">
              {arbol.raices.map((nodo) => (
                <NodoUbicacion
                  key={nodo.ubicacion.id}
                  ubicacion={nodo.ubicacion}
                  profundidad={0}
                  onNuevoConteo={(ubicacionId) => navigate(`/inventarios/nuevo?ubicacion=${ubicacionId}`)}
                  onEditar={(u) => setModal({ abierto: true, ubicacion: u })}
                  onBaja={(u) => setConfirmarBaja(u)}
                  onAgregarHijo={(padreId, nivel) =>
                    setModal({ abierto: true, ubicacion: null, nivelInicial: nivel, padreInicial: padreId })
                  }
                />
              ))}
            </ul>
          )}
        </Card>
      </ContenedorPagina>

      {/* ═══ Modales ═════════════════════════════════════════════════════ */}
      <ModalUbicacion
        abierto={modal.abierto}
        ubicacion={modal.ubicacion}
        nivelInicial={modal.nivelInicial}
        padreInicial={modal.padreInicial}
        onCerrar={() => setModal({ abierto: false, ubicacion: null })}
      />

      <Modal
        isOpen={confirmarBaja !== null}
        onClose={() => setConfirmarBaja(null)}
        className="max-w-md p-6"
      >
        <h2 className="text-lg font-bold text-ink-title dark:text-white">
          {confirmarBaja?.estado === "inactivo" ? "¿Reactivar ubicación?" : "¿Dar de baja esta ubicación?"}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {confirmarBaja?.nombre} ({confirmarBaja ? NIVEL_UBICACION_META[confirmarBaja.nivel].label : ""})
        </p>

        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          {confirmarBaja?.estado === "inactivo"
            ? "La ubicación volverá a estar disponible para nuevos conteos de inventario."
            : "La ubicación dejará de estar disponible para nuevos conteos, pero sus registros previos se conservarán."}
        </p>

        <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
          <Button variant="outline" onClick={() => setConfirmarBaja(null)}>
            Cancelar
          </Button>
          <Button
            variant={confirmarBaja?.estado === "inactivo" ? "primary" : "destructive"}
            onClick={() => confirmarBaja && darDeBaja(confirmarBaja)}
          >
            {confirmarBaja?.estado === "inactivo" ? "Reactivar" : "Dar de baja"}
          </Button>
        </div>
      </Modal>
    </>
  );
});

// ── Piezas locales ────────────────────────────────────────────────────────

function Contador({
  valor,
  etiqueta,
  tono = "neutro",
}: {
  valor: number;
  etiqueta: string;
  tono?: "neutro" | "info";
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p
        className={
          tono === "info"
            ? "text-xl font-bold tabular-nums text-accent-600 dark:text-accent-400"
            : "text-xl font-bold tabular-nums text-ink-title dark:text-white"
        }
      >
        {valor}
      </p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{etiqueta}</p>
    </div>
  );
}

export default UbicacionesPage;
