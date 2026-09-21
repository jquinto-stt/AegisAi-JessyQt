import { observer } from "mobx-react-lite";
import { Link } from "react-router";

import { PageMeta } from "@/shell/meta";
import { Alert } from "@/elements/ui/alert";
import { Card } from "@/elements/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import {
  inventarioStore,
  TIPO_MOVIMIENTO_LABEL,
  type Articulo,
} from "@/stores";
import {
  cantidad,
  conExistencia,
  etiquetaFecha,
  money,
  ordenarPorUrgencia,
} from "./inventario.utils";
import { CabeceraPagina, EstadoBadge, KpiCard, SinResultados } from "./inventario.widgets";

// ═══════════════════════════════════════════════════════════════════════════
// INICIO DE INVENTARIO — la pantalla de llegada
// ═══════════════════════════════════════════════════════════════════════════
//
// Responde a UNA pregunta: **¿qué me está pidiendo atención ahora mismo?** No es
// el listado completo (eso es Existencias) ni el kárdex (eso es Movimientos).
//
// ── Todo lo que se pinta aquí está derivado, y ninguna cifra se guarda ─────
//
// Existencias, estados y valor salen del kárdex a través del store
// (`existenciaTotal`, `estadoDe`, `valorTotal`), que a su vez llama al dominio.
// Esta página no suma ni compara nada por su cuenta: si lo hiciera, habría un
// segundo cálculo del mismo número y el día que discrepen no habría forma de
// saber cuál miente. La única aritmética propia es `existencia × costoUnitario`,
// que es una valoración de presentación, no una existencia.
//
// ── Esta pantalla no escribe nada ─────────────────────────────────────────
//
// Ninguna capacidad de escritura se consulta aquí. Registrar un movimiento vive
// en `/inventario/movimientos`, que es donde el formulario tiene sentido; poner
// un botón de alta en el panel de llegada sería un atajo hacia un formulario que
// necesita contexto (qué artículo, en qué bodega).

export const InicioPage = observer(() => {
  const articulos = inventarioStore.articulos;
  const bodegas = inventarioStore.bodegas;

  // ── Cifras de cabecera ──
  const bajoMinimo = inventarioStore.bajoMinimo;
  const agotados = inventarioStore.agotados;
  const enRiesgo = inventarioStore.enRiesgo;
  const valorTotal = inventarioStore.valorTotal;

  // La lista de trabajo: agotados primero, después los que están bajo mínimo.
  // `enRiesgo` ya es la unión de ambos según la config; el orden lo pone la
  // utilidad, que desempata por nombre para que la lista no se reordene sola.
  const requiereAtencion = ordenarPorUrgencia(enRiesgo, (id) => inventarioStore.estadoDe(id));

  const recientes = inventarioStore.movimientosRecientes(6);
  const alertaApagada = !inventarioStore.config.alertaBajoMinimo;

  const nombreArticulo = (a: Articulo) => a.nombre;
  const unidadDe = (articuloId: string) =>
    inventarioStore.articuloPorId(articuloId)?.unidad ?? "unidad";

  return (
    <>
      <PageMeta title="Inventario · Inicio" description="Estado del almacén y reposición" />

      <CabeceraPagina
        titulo="Inventario"
        descripcion="Qué hay en el almacén, dónde está y qué hay que reponer."
        acciones={
          // Un `<Link>`, no un `<Button>`: el catálogo de botones no admite
          // navegación, y un `<Button onClick={() => navigate(...)}>` sería un
          // `<button>` haciendo de enlace — se pierde el «abrir en pestaña nueva».
          // Las clases replican el tono `outline` del catálogo sin inventar tinte.
          <Link
            to="/inventario"
            className="inline-flex h-10 items-center rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
          >
            Ver existencias
          </Link>
        }
      />

      {/* ── El aviso de reposición está APAGADO en la configuración ──────────
          Cuando el interruptor de alertas está apagado, esta pantalla seguiría
          pintando «Requiere reposición» y el usuario creería que las alertas
          funcionan. Se dice en voz alta en vez de dejar que dos superficies
          discrepen: una lista que se pinta sola no es una alerta. */}
      {alertaApagada && (
        <div className="mb-6">
          <Alert
            variant="warning"
            title="Los avisos de reposición están apagados"
            message="La lista de abajo se sigue calculando, pero el módulo no avisa por ningún otro medio mientras el interruptor esté apagado. Puedes encenderlo en la configuración de Inventario."
          />
        </div>
      )}

      {/* ── Cifras ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Artículos"
          value={String(inventarioStore.totalArticulos)}
          hint={`${inventarioStore.categorias.length} categorías`}
        />
        <KpiCard
          label="Valor a costo"
          value={money(valorTotal)}
          hint="Existencia × costo unitario"
        />
        <KpiCard
          // «Por debajo del mínimo» y NO «Bajo mínimo»: `bajoMinimo` es el
          // conjunto de todo lo que está por debajo de su punto de reorden, y
          // **eso incluye los agotados** (0 también es menos que el mínimo).
          // Rotularlo «Bajo mínimo» lo hacía chocar con el badge de estado, que
          // sí distingue los dos casos: la pantalla decía 3 y la tabla de
          // `/inventario` mostraba 2 con esa etiqueta exacta. Los dos números
          // eran correctos; la palabra era la que mentía.
          label="Por debajo del mínimo"
          value={String(bajoMinimo.length)}
          hint={
            agotados.length > 0
              ? `Incluye los ${agotados.length} agotado${agotados.length === 1 ? "" : "s"}`
              : "Por debajo de su punto de reorden"
          }
          alerta={bajoMinimo.length > 0}
          tono="aviso"
        />
        <KpiCard
          label="Agotados"
          value={String(agotados.length)}
          hint="Sin ninguna existencia"
          alerta={agotados.length > 0}
          tono="grave"
        />
      </div>

      {/* ── Bodegas ───────────────────────────────────────────────────────── */}
      <div className="mt-6">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-title dark:text-white/90">Bodegas</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Cada bodega con cuántos artículos tiene algo dentro. Una bodega sin existencias sigue
            apareciendo: existe, lo que no tiene es mercancía.
          </p>

          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell header>Bodega</TableCell>
                  <TableCell header>Rol</TableCell>
                  <TableCell header className="text-right">Artículos con existencia</TableCell>
                  <TableCell header className="text-right">Valor</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bodegas.map((b) => {
                  const con = conExistencia(articulos, (id) =>
                    inventarioStore.existenciaDe(id, b.id),
                  );
                  const valor = con.reduce(
                    (acc, a) => acc + inventarioStore.existenciaDe(a.id, b.id) * a.costoUnitario,
                    0,
                  );
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-gray-800 dark:text-white/90">
                        {b.nombre}
                      </TableCell>
                      <TableCell>
                        {b.principal ? (
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Principal
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-500 dark:text-gray-400">
                        {con.length}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-500 dark:text-gray-400">
                        {money(valor)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* ── Requiere reposición ───────────────────────────────────────────── */}
      <div className="mt-6">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-title dark:text-white/90">
            Requiere reposición
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Agotados y bajo mínimo, con lo que hay hoy y el punto de reorden de cada uno.
          </p>

          <div className="mt-4">
            {requiereAtencion.length === 0 ? (
              <SinResultados
                titulo="Nada que reponer"
                mensaje="Todos los artículos están por encima de su punto de reorden. Esta lista se recalcula sola con cada movimiento del kárdex."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell header>Artículo</TableCell>
                      <TableCell header>SKU</TableCell>
                      <TableCell header className="text-right">Existencia total</TableCell>
                      <TableCell header className="text-right">Mínimo</TableCell>
                      <TableCell header>Estado</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requiereAtencion.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-gray-800 dark:text-white/90">
                          {nombreArticulo(a)}
                        </TableCell>
                        <TableCell className="tabular-nums text-gray-500 dark:text-gray-400">
                          {a.sku}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-gray-800 dark:text-white/90">
                          {cantidad(inventarioStore.existenciaTotal(a.id), a.unidad)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-gray-500 dark:text-gray-400">
                          {cantidad(a.minimo, a.unidad)}
                        </TableCell>
                        <TableCell>
                          <EstadoBadge estado={inventarioStore.estadoDe(a.id)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Últimos movimientos ───────────────────────────────────────────── */}
      <div className="mt-6">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink-title dark:text-white/90">
            Últimos movimientos
          </h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            El kárdex más reciente. Es el único sitio de donde salen las existencias de arriba.
          </p>

          <div className="mt-4">
            {recientes.length === 0 ? (
              <SinResultados
                titulo="Sin movimientos"
                mensaje="Todavía no se ha registrado ninguna entrada, salida o transferencia. Sin kárdex no hay existencias que mostrar."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableCell header>Fecha</TableCell>
                      <TableCell header>Artículo</TableCell>
                      <TableCell header>Tipo</TableCell>
                      <TableCell header>Trayecto</TableCell>
                      <TableCell header className="text-right">Cantidad</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recientes.map((m) => {
                      const art = inventarioStore.articuloPorId(m.articuloId);
                      return (
                        <TableRow key={m.id}>
                          <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {etiquetaFecha(m.fecha)}
                          </TableCell>
                          <TableCell className="font-medium text-gray-800 dark:text-white/90">
                            {art?.nombre ?? "Artículo eliminado"}
                          </TableCell>
                          <TableCell className="text-gray-500 dark:text-gray-400">
                            {TIPO_MOVIMIENTO_LABEL[m.tipo]}
                          </TableCell>
                          <TableCell className="text-gray-500 dark:text-gray-400">
                            {inventarioStore.trayecto(m)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-gray-800 dark:text-white/90">
                            {cantidad(m.cantidad, unidadDe(m.articuloId))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
});

export default InicioPage;
