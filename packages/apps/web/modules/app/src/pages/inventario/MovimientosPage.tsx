import { useMemo, useState } from "react";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Alert } from "@/elements/ui/alert";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Modal } from "@/elements/ui/modal";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/elements/ui/table";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import {
  inventarioStore,
  motivoSinPermiso,
  operadoresStore,
  puede,
  TIPO_MOVIMIENTO_LABEL,
  TIPOS_MOVIMIENTO,
  type Movimiento,
  type TipoMovimiento,
} from "@/stores";
import { cantidad, etiquetaFecha, etiquetaVariante } from "./inventario.utils";
import { CabeceraPagina, SinResultados } from "./inventario.widgets";

// ═══════════════════════════════════════════════════════════════════════════
// MOVIMIENTOS — el kárdex, y la única puerta por la que entra mercancía
// ═══════════════════════════════════════════════════════════════════════════
//
// El kárdex no es un historial decorativo: **es la única fuente de las
// existencias** (invariante I1). Esta pantalla lo enseña entero y ofrece el
// formulario que lo escribe.
//
// ── Por qué el formulario no elige «origen» y «destino» por su cuenta ─────
//
// El usuario elige un TIPO y el formulario deduce el par origen/destino, porque
// la dirección no es una decisión independiente: una entrada que no venga de
// fuera no es una entrada. Dejar los dos selectores sueltos permitiría declarar
// una «entrada» de una bodega a otra, que el dominio rechazaría — y ofrecer un
// formulario que produce un rechazo garantizado es una trampa.
//
// ── Dos permisos, no uno ──────────────────────────────────────────────────
//
// `inventory.move` registra entradas, salidas y transferencias. `inventory.adjust`
// corrige existencias por conteo: es la única acción que reescribe lo que el
// sistema cree que hay sin un hecho externo que lo respalde, así que puede
// destruir información. Cuando falta, `ajuste` **no aparece en la lista** y se
// explica por qué — no se ofrece un camino que va a fallar.
//
// ── La validación no vive aquí ────────────────────────────────────────────
//
// El botón no decide si hay stock. El store valida contra la existencia de la
// bodega de ORIGEN y devuelve el motivo legible; la pantalla lo pinta. Duplicar
// la comprobación aquí crearía un segundo cálculo que puede discrepar del real.

const SIN_FILTRO = "__todos__";

/** Sentido de un ajuste: aparece mercancía (al alza) o desaparece (a la baja). */
type SentidoAjuste = "alta" | "baja";

interface BorradorMovimiento {
  tipo: TipoMovimiento;
  articuloId: string;
  /** Cadena vacía = artículo sin variante. */
  variante: string;
  cantidad: string;
  bodegaId: string;
  /** Solo para transferencia. */
  bodegaDestinoId: string;
  sentido: SentidoAjuste;
  motivo: string;
}

/**
 * Traduce el formulario al par origen/destino del dominio.
 *
 * Es una función pura y exportada a propósito: es la única lógica del formulario
 * que puede estar mal sin que se note —una transferencia con el origen y el
 * destino invertidos resta donde debería sumar y el dominio no lo detecta— y por
 * eso se prueba sola en vez de dentro del JSX.
 *
 * `null` significa «el exterior»: no es una bodega vacía, es la ausencia de
 * bodega, y es lo que distingue una compra de una transferencia.
 */
export function extremosDe(
  tipo: TipoMovimiento,
  bodegaId: string,
  bodegaDestinoId: string,
  sentido: SentidoAjuste,
): { origenId: string | null; destinoId: string | null } {
  switch (tipo) {
    case "entrada":
      return { origenId: null, destinoId: bodegaId };
    case "salida":
      return { origenId: bodegaId, destinoId: null };
    case "transferencia":
      return { origenId: bodegaId, destinoId: bodegaDestinoId };
    case "ajuste":
      // Al alza: aparece mercancía que el sistema no tenía.
      // A la baja: desaparece mercancía que el sistema sí tenía.
      return sentido === "alta"
        ? { origenId: null, destinoId: bodegaId }
        : { origenId: bodegaId, destinoId: null };
  }
}

export const MovimientosPage = observer(() => {
  // ── Filtros ──
  const [fArticulo, setFArticulo] = useState(SIN_FILTRO);
  const [fBodega, setFBodega] = useState(SIN_FILTRO);
  const [fTipo, setFTipo] = useState<TipoMovimiento | typeof SIN_FILTRO>(SIN_FILTRO);

  // ── Formulario ──
  const [registrando, setRegistrando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<BorradorMovimiento>(() => ({
    tipo: "entrada",
    articuloId: inventarioStore.articulos[0]?.id ?? "",
    variante: "",
    cantidad: "",
    bodegaId: inventarioStore.bodegaPrincipal?.id ?? inventarioStore.bodegas[0]?.id ?? "",
    bodegaDestinoId: inventarioStore.bodegas.find((b) => !b.principal)?.id ?? "",
    sentido: "alta",
    motivo: "",
  }));

  // ── Autorización ──
  const puedeMover = puede("inventory.move");
  const puedeAjustar = puede("inventory.adjust");
  const motivoMover = motivoSinPermiso("inventory.move");
  const motivoAjustar = motivoSinPermiso("inventory.adjust");

  /**
   * Tipos ofrecidos: los cuatro, menos `ajuste` si falta su permiso.
   *
   * Se filtra la LISTA en vez de dejar elegir y fallar al enviar. El motivo de la
   * ausencia se dice debajo, porque una opción que desaparece sin explicación se
   * lee como un módulo incompleto.
   */
  const tiposOfrecidos = useMemo(
    () => TIPOS_MOVIMIENTO.filter((t) => t !== "ajuste" || puedeAjustar),
    [puedeAjustar],
  );

  const bodegas = inventarioStore.bodegas;

  const movimientos = useMemo(
    () =>
      inventarioStore.movimientosFiltrados({
        articuloId: fArticulo === SIN_FILTRO ? undefined : fArticulo,
        bodegaId: fBodega === SIN_FILTRO ? undefined : fBodega,
        tipo: fTipo === SIN_FILTRO ? undefined : fTipo,
      }),
    [fArticulo, fBodega, fTipo, inventarioStore.movimientos],
  );

  const articuloBorrador = inventarioStore.articuloPorId(borrador.articuloId);
  const variantesBorrador = articuloBorrador?.variantes ?? [];
  const esTransferencia = borrador.tipo === "transferencia";
  const esAjuste = borrador.tipo === "ajuste";

  const abrirFormulario = () => {
    setError(null);
    setBorrador((p) => ({
      ...p,
      cantidad: "",
      motivo: "",
      // Si el tipo por defecto ya no está permitido, se cae al primero ofrecido.
      tipo: tiposOfrecidos.includes(p.tipo) ? p.tipo : (tiposOfrecidos[0] ?? "entrada"),
    }));
    setRegistrando(true);
  };

  const confirmar = () => {
    const cantidadNum = Number(borrador.cantidad);
    if (!borrador.articuloId) {
      setError("Elige un artículo.");
      return;
    }
    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
      setError("La cantidad debe ser un número mayor que cero.");
      return;
    }
    if (!borrador.bodegaId) {
      setError("Elige una bodega.");
      return;
    }
    if (esTransferencia && !borrador.bodegaDestinoId) {
      setError("Una transferencia necesita una bodega de destino.");
      return;
    }
    if (esTransferencia && borrador.bodegaDestinoId === borrador.bodegaId) {
      setError("El origen y el destino de una transferencia no pueden ser la misma bodega.");
      return;
    }

    const { origenId, destinoId } = extremosDe(
      borrador.tipo,
      borrador.bodegaId,
      borrador.bodegaDestinoId,
      borrador.sentido,
    );

    const res = inventarioStore.registrarMovimiento({
      articuloId: borrador.articuloId,
      variante: borrador.variante === "" ? undefined : borrador.variante,
      tipo: borrador.tipo,
      cantidad: cantidadNum,
      origenId,
      destinoId,
      motivo: esAjuste ? borrador.motivo : undefined,
    });

    if (!res.ok) {
      setError(res.motivo);
      return;
    }
    setRegistrando(false);
  };

  const opcionesArticulo = inventarioStore.articulos.map((a) => ({
    value: a.id,
    label: `${a.nombre} · ${a.sku}`,
  }));

  const opcionesBodega = bodegas.map((b) => ({ value: b.id, label: b.nombre }));

  /** Rótulo de la bodega principal según el tipo. La dirección la fija el tipo. */
  const rotuloBodega =
    borrador.tipo === "entrada"
      ? "Bodega de destino"
      : borrador.tipo === "salida"
        ? "Bodega de origen"
        : borrador.tipo === "transferencia"
          ? "Bodega de origen"
          : "Bodega";

  const nombreActor = (m: Movimiento) => {
    const op = operadoresStore.porId(m.actor);
    return op?.nombre ?? m.actor;
  };

  return (
    <>
      <PageMeta title="Inventario · Movimientos" description="Kárdex de entradas, salidas y transferencias" />

      <CabeceraPagina
        titulo="Movimientos"
        descripcion="El kárdex completo. Cada existencia del módulo sale de aquí."
        acciones={
          <Button onClick={abrirFormulario} disabled={!puedeMover}>
            Registrar movimiento
          </Button>
        }
      />

      {!puedeMover && (
        <div className="mb-6">
          <Alert
            variant="info"
            title="Kárdex en solo lectura"
            message={`Puedes consultar los movimientos, pero no registrar entradas, salidas ni transferencias. ${motivoMover}`}
          />
        </div>
      )}

      {/* ── Filtros ───────────────────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label>Artículo</Label>
            <div className="mt-1.5">
              <Select
                key={`fa-${fArticulo}-${inventarioStore.articulos.length}`}
                options={[{ value: SIN_FILTRO, label: "Todos los artículos" }, ...opcionesArticulo]}
                defaultValue={fArticulo}
                onChange={setFArticulo}
                aria-label="Filtrar movimientos por artículo"
              />
            </div>
          </div>
          <div>
            <Label>Bodega</Label>
            <div className="mt-1.5">
              <Select
                key={`fb-${fBodega}-${bodegas.map((b) => b.id).join("|")}`}
                options={[{ value: SIN_FILTRO, label: "Todas las bodegas" }, ...opcionesBodega]}
                defaultValue={fBodega}
                onChange={setFBodega}
                aria-label="Filtrar movimientos por bodega"
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
              Una bodega aparece tanto si es el origen como si es el destino.
            </p>
          </div>
          <div>
            <Label>Tipo</Label>
            <div className="mt-1.5">
              <Select
                key={`ft-${fTipo}`}
                options={[
                  { value: SIN_FILTRO, label: "Todos los tipos" },
                  ...TIPOS_MOVIMIENTO.map((t) => ({ value: t, label: TIPO_MOVIMIENTO_LABEL[t] })),
                ]}
                defaultValue={fTipo}
                onChange={(v) => setFTipo(v as TipoMovimiento | typeof SIN_FILTRO)}
                aria-label="Filtrar movimientos por tipo"
              />
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          {movimientos.length} de {inventarioStore.movimientos.length} movimientos
        </p>
      </Card>

      {/* ── Kárdex ────────────────────────────────────────────────────────── */}
      <div className="mt-6">
        <Card className="p-5">
          {movimientos.length === 0 ? (
            <SinResultados
              titulo="Ningún movimiento coincide"
              mensaje="Prueba con otro artículo, otra bodega u otro tipo. El kárdex solo crece: nada de lo registrado se borra."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell header>Fecha</TableCell>
                    <TableCell header>Artículo</TableCell>
                    <TableCell header>Variante</TableCell>
                    <TableCell header>Tipo</TableCell>
                    <TableCell header>Trayecto</TableCell>
                    <TableCell header className="text-right">Cantidad</TableCell>
                    <TableCell header>Motivo</TableCell>
                    <TableCell header>Registró</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos.map((m) => {
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
                          {etiquetaVariante(m.variante)}
                        </TableCell>
                        <TableCell>
                          <Badge color="light" size="sm">
                            {TIPO_MOVIMIENTO_LABEL[m.tipo]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400">
                          {inventarioStore.trayecto(m)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-gray-800 dark:text-white/90">
                          {cantidad(m.cantidad, art?.unidad ?? "unidad")}
                        </TableCell>
                        {/* El motivo solo existe en los ajustes (I5). Una raya,
                            no una celda vacía: «no aplica» no es «falta». */}
                        <TableCell className="text-gray-500 dark:text-gray-400">
                          {m.motivo ?? "—"}
                        </TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400">
                          {nombreActor(m)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* ── Formulario ────────────────────────────────────────────────────── */}
      <Modal
        isOpen={registrando}
        onClose={() => setRegistrando(false)}
        className="max-w-lg rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
      >
        <h2 className="text-lg font-semibold text-ink-title dark:text-white/90">
          Registrar movimiento
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          El movimiento es la única forma de cambiar una existencia. No hay un campo de stock que
          editar.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <div>
            <Label>Tipo de movimiento</Label>
            <div className="mt-1.5">
              <Select
                key={`ftipo-${borrador.tipo}-${tiposOfrecidos.join("|")}`}
                options={tiposOfrecidos.map((t) => ({
                  value: t,
                  label: TIPO_MOVIMIENTO_LABEL[t],
                }))}
                defaultValue={borrador.tipo}
                onChange={(v) => setBorrador((p) => ({ ...p, tipo: v as TipoMovimiento }))}
                aria-label="Tipo de movimiento a registrar"
              />
            </div>
            {!puedeAjustar && (
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                «Ajuste» no aparece en la lista. {motivoAjustar}
              </p>
            )}
          </div>

          <div>
            <Label>Artículo</Label>
            <div className="mt-1.5">
              <Select
                key={`fart-${borrador.articuloId}-${inventarioStore.articulos.length}`}
                options={opcionesArticulo}
                defaultValue={borrador.articuloId}
                onChange={(v) => setBorrador((p) => ({ ...p, articuloId: v, variante: "" }))}
                aria-label="Artículo del movimiento"
              />
            </div>
          </div>

          {/* La variante solo se ofrece si el artículo las declara. El store
              rechazaría una variante inexistente; ofrecer el selector siempre
              sería ofrecer un campo que a veces no aplica. */}
          {variantesBorrador.length > 0 && (
            <div>
              <Label>Variante</Label>
              <div className="mt-1.5">
                <Select
                  key={`fvar-${borrador.articuloId}-${borrador.variante}`}
                  options={variantesBorrador.map((v) => ({ value: v, label: v }))}
                  defaultValue={borrador.variante || variantesBorrador[0]}
                  onChange={(v) => setBorrador((p) => ({ ...p, variante: v }))}
                  aria-label="Variante del artículo"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{rotuloBodega}</Label>
              <div className="mt-1.5">
                <Select
                  key={`fbod-${borrador.bodegaId}-${bodegas.map((b) => b.id).join("|")}`}
                  options={opcionesBodega}
                  defaultValue={borrador.bodegaId}
                  onChange={(v) => setBorrador((p) => ({ ...p, bodegaId: v }))}
                  aria-label={rotuloBodega}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="mv-cantidad">Cantidad</Label>
              <div className="mt-1.5">
                <Input
                  id="mv-cantidad"
                  type="number"
                  value={borrador.cantidad}
                  onChange={(e) => setBorrador((p) => ({ ...p, cantidad: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {esTransferencia && (
            <div>
              <Label>Bodega de destino</Label>
              <div className="mt-1.5">
                <Select
                  key={`fdest-${borrador.bodegaDestinoId}-${bodegas.map((b) => b.id).join("|")}`}
                  options={opcionesBodega.filter((o) => o.value !== borrador.bodegaId)}
                  defaultValue={borrador.bodegaDestinoId}
                  onChange={(v) => setBorrador((p) => ({ ...p, bodegaDestinoId: v }))}
                  aria-label="Bodega de destino de la transferencia"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                Una transferencia es un solo movimiento: no puede quedar a medias entre las dos
                bodegas.
              </p>
            </div>
          )}

          {esAjuste && (
            <>
              <div>
                <Label>Sentido del ajuste</Label>
                <div className="mt-1.5">
                  <Select
                    key={`fsent-${borrador.sentido}`}
                    options={[
                      { value: "alta", label: "Aparece mercancía (conteo al alza)" },
                      { value: "baja", label: "Desaparece mercancía (conteo a la baja)" },
                    ]}
                    defaultValue={borrador.sentido}
                    onChange={(v) => setBorrador((p) => ({ ...p, sentido: v as SentidoAjuste }))}
                    aria-label="Sentido del ajuste de existencias"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="mv-motivo">Motivo</Label>
                <div className="mt-1.5">
                  <Input
                    id="mv-motivo"
                    value={borrador.motivo}
                    onChange={(e) => setBorrador((p) => ({ ...p, motivo: e.target.value }))}
                    placeholder="Conteo físico, merma por vencimiento…"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  Obligatorio. Un ajuste reescribe lo que el sistema cree que hay sin un hecho
                  externo que lo respalde: sin motivo sería una escritura sin explicación.
                </p>
              </div>
            </>
          )}

          {error && <Alert variant="error" title="No se pudo registrar" message={error} />}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setRegistrando(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar}>Registrar</Button>
        </div>
      </Modal>
    </>
  );
});

export default MovimientosPage;
