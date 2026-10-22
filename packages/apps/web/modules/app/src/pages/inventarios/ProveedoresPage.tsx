/**
 * Proveedores.
 *
 * Pregunta de la pantalla: «¿a quién le compro y cómo me va con cada uno?». Una
 * tabla y no tarjetas: lo que se compara entre proveedores (plazo, condiciones,
 * cuánto se le ha comprado) se lee mejor en columnas alineadas.
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { observer } from "mobx-react-lite";
import { Plus } from "lucide-react";
import {
  inventarioStore,
  estadoStock,
  fechaRelativa,
  formatearEntero,
  formatearMoneda,
  ordenAbierta,
  totalOrden,
  type DatosProveedor,
  type Proveedor,
} from "@/stores";
import {
  Aviso,
  BarraHerramientas,
  Boton,
  Buscador,
  Campo,
  CeldaDoble,
  Confirmar,
  ContactoProveedor,
  CONTROL,
  cx,
  DistintivoOrden,
  DistintivoStock,
  Falta,
  FilaMovil,
  ListaDatos,
  MensajeError,
  PaginaInventario,
  PanelLateral,
  Pestanas,
  Subtitulo,
  TABLA,
  useAviso,
  useUltimo,
  Vacio,
} from "./inventario.ui";

type Pestana = "activos" | "inactivos" | "todos";

const CONDICIONES_SUGERIDAS = ["Contado", "15 días", "30 días", "45 días", "60 días"];

/** Lo que se compara entre proveedores, calculado de sus artículos y órdenes. */
function cifrasDe(p: Proveedor) {
  const s = inventarioStore;
  const ordenes = s.ordenes.filter((o) => o.proveedorId === p.id);
  return {
    articulos: s.articulos.filter((a) => a.activo && a.proveedorId === p.id).length,
    enCurso: ordenes.filter(ordenAbierta).length,
    porReponer: s.colaReorden.filter((i) => i.articulo.proveedorId === p.id && i.sugerido > 0).length,
    comprado: ordenes.filter((o) => o.estado !== "cancelada").reduce((t, o) => t + totalOrden(o), 0),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMULARIO
// ═══════════════════════════════════════════════════════════════════════════

interface Borrador {
  nombre: string;
  nit: string;
  ciudad: string;
  contacto: string;
  email: string;
  telefono: string;
  plazoEntregaDias: string;
  condicionesPago: string;
}

const borradorDe = (p: Proveedor | null): Borrador => ({
  nombre: p?.nombre ?? "",
  nit: p?.nit ?? "",
  ciudad: p?.ciudad ?? "",
  contacto: p?.contacto ?? "",
  email: p?.email ?? "",
  telefono: p?.telefono ?? "",
  plazoEntregaDias: p ? String(p.plazoEntregaDias) : "3",
  condicionesPago: p?.condicionesPago ?? "30 días",
});

const PanelFormulario = observer(function PanelFormulario({
  proveedor,
  abierto,
  onCerrar,
  onGuardado,
}: {
  proveedor: Proveedor | null;
  abierto: boolean;
  onCerrar: () => void;
  onGuardado: (p: Proveedor, nuevo: boolean) => void;
}) {
  const s = inventarioStore;
  const [b, setB] = useState<Borrador>(() => borradorDe(proveedor));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (abierto) {
      setB(borradorDe(proveedor));
      setError(null);
    }
  }, [abierto, proveedor]);

  const cambiar = <K extends keyof Borrador>(k: K, v: string) => setB((x) => ({ ...x, [k]: v }));

  const guardar = (e?: React.FormEvent) => {
    e?.preventDefault();
    const plazo = Number(b.plazoEntregaDias);
    if (b.plazoEntregaDias.trim() === "" || !Number.isInteger(plazo)) return setError("El plazo de entrega debe ser un número entero de días.");
    const datos: DatosProveedor = {
      nombre: b.nombre,
      nit: b.nit.trim(),
      ciudad: b.ciudad.trim(),
      contacto: b.contacto.trim(),
      email: b.email.trim(),
      telefono: b.telefono.trim(),
      plazoEntregaDias: plazo,
      condicionesPago: b.condicionesPago.trim(),
    };
    const r = proveedor ? s.actualizarProveedor(proveedor.id, datos) : s.crearProveedor(datos);
    if (!r.ok) return setError(r.error);
    onGuardado(r.valor, !proveedor);
  };

  return (
    <PanelLateral
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={proveedor ? "Editar proveedor" : "Nuevo proveedor"}
      subtitulo={proveedor?.nombre}
      pie={
        <>
          <Boton variante="texto" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton variante="principal" onClick={() => guardar()}>
            {proveedor ? "Guardar cambios" : "Crear proveedor"}
          </Boton>
        </>
      }
    >
      <form onSubmit={guardar} className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="mb-1 text-theme-md font-bold text-ink-title dark:text-white">Empresa</legend>
          <Campo etiqueta="Nombre o razón social">
            <input className={CONTROL} value={b.nombre} onChange={(e) => cambiar("nombre", e.target.value)} placeholder="Papelería Andina S.A.S." autoFocus />
          </Campo>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta="NIT">
              <input className={CONTROL} value={b.nit} onChange={(e) => cambiar("nit", e.target.value)} placeholder="900.123.456-7" />
            </Campo>
            <Campo etiqueta="Ciudad">
              <input className={CONTROL} value={b.ciudad} onChange={(e) => cambiar("ciudad", e.target.value)} placeholder="Bogotá" />
            </Campo>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 text-theme-md font-bold text-ink-title dark:text-white">Contacto</legend>
          <Campo etiqueta="Persona de contacto">
            <input className={CONTROL} value={b.contacto} onChange={(e) => cambiar("contacto", e.target.value)} placeholder="Nombre y apellido" />
          </Campo>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta="Correo">
              <input className={CONTROL} type="email" value={b.email} onChange={(e) => cambiar("email", e.target.value)} placeholder="ventas@proveedor.co" />
            </Campo>
            <Campo etiqueta="Teléfono">
              <input className={CONTROL} type="tel" value={b.telefono} onChange={(e) => cambiar("telefono", e.target.value)} placeholder="+57 300 123 4567" />
            </Campo>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 text-theme-md font-bold text-ink-title dark:text-white">Condiciones</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta="Plazo de entrega (días)" ayuda="Se usa para calcular la llegada de cada orden.">
              <input className={CONTROL} type="number" inputMode="numeric" min={0} step={1} value={b.plazoEntregaDias} onChange={(e) => cambiar("plazoEntregaDias", e.target.value)} />
            </Campo>
            <Campo etiqueta="Condiciones de pago">
              <input className={CONTROL} list="condiciones-pago" value={b.condicionesPago} onChange={(e) => cambiar("condicionesPago", e.target.value)} />
              <datalist id="condiciones-pago">
                {CONDICIONES_SUGERIDAS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Campo>
          </div>
          <div className="flex flex-wrap gap-2">
            {CONDICIONES_SUGERIDAS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => cambiar("condicionesPago", c)}
                className={cx(
                  "rounded-full border px-3 py-1 text-theme-xs transition-colors",
                  b.condicionesPago === c
                    ? "border-ink-title bg-ink-title/[0.04] font-bold text-ink-title dark:border-white dark:text-white"
                    : "border-gray-200 text-gray-700 hover:border-gray-300 dark:border-white/10 dark:text-gray-300",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </fieldset>

        <MensajeError>{error}</MensajeError>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </PanelLateral>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// DETALLE
// ═══════════════════════════════════════════════════════════════════════════

const PanelDetalle = observer(function PanelDetalle({
  proveedor,
  onCerrar,
  onEditar,
  onAlternar,
}: {
  proveedor: Proveedor | null;
  onCerrar: () => void;
  onEditar: () => void;
  onAlternar: () => void;
}) {
  const s = inventarioStore;
  const navigate = useNavigate();
  const { valor: p, abierto } = useUltimo(proveedor);
  if (!p) return null;
  const c = cifrasDe(p);
  const articulos = s.articulos.filter((a) => a.activo && a.proveedorId === p.id).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const porReponer = s.colaReorden.filter((i) => i.articulo.proveedorId === p.id && i.sugerido > 0);
  const costoReponer = porReponer.reduce((t, i) => t + i.sugerido * i.articulo.costoUnitario, 0);
  const ordenes = s.ordenes
    .filter((o) => o.proveedorId === p.id)
    .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
    .slice(0, 5);

  return (
    <PanelLateral
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={p.nombre}
      subtitulo={[p.ciudad, p.nit && `NIT ${p.nit}`, !p.activo && "Desactivado"].filter(Boolean).join(" · ")}
      pie={
        <>
          <Boton variante="texto" onClick={onAlternar}>
            {p.activo ? "Desactivar" : "Activar"}
          </Boton>
          <Boton variante="secundario" onClick={onEditar}>
            Editar
          </Boton>
          {p.activo && (
            <Boton variante="principal" onClick={() => navigate(`/inventarios/ordenes-compra?nueva=1&proveedor=${p.id}`)}>
              Nueva orden
            </Boton>
          )}
        </>
      }
    >
      <ContactoProveedor proveedor={p} />

      <ListaDatos
        items={[
          { etiqueta: "Entrega", valor: `${p.plazoEntregaDias} ${p.plazoEntregaDias === 1 ? "día" : "días"}` },
          { etiqueta: "Pago", valor: p.condicionesPago || <Falta /> },
          { etiqueta: "Comprado", valor: <span className="tabular-nums">{formatearMoneda(c.comprado)}</span> },
        ]}
      />

      {porReponer.length > 0 && p.activo && (
        <section className="rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-bold text-ink-body dark:text-white">
                {porReponer.length} {porReponer.length === 1 ? "artículo por reponer" : "artículos por reponer"} · {formatearMoneda(costoReponer)}
              </p>
              <p className="mt-0.5 text-theme-xs text-gray-700 dark:text-gray-300">
                {porReponer.slice(0, 3).map((i) => i.articulo.nombre).join(", ")}
                {porReponer.length > 3 && ` y ${porReponer.length - 3} más`}
              </p>
            </div>
            <Boton variante="secundario" className="shrink-0" onClick={() => navigate("/inventarios/reorden")}>
              Ver en la cola
            </Boton>
          </div>
        </section>
      )}

      <section>
        <Subtitulo>Artículos que suministra</Subtitulo>
        {articulos.length === 0 ? (
          <Vacio>Ningún artículo tiene asignado a este proveedor.</Vacio>
        ) : (
          <ul>
            {articulos.map((a) => {
              const estado = estadoStock(a);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/inventarios/articulos?articulo=${a.id}`)}
                    className="flex w-full items-center justify-between gap-3 border-t border-gray-100 py-2.5 text-left hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.03]"
                  >
                    <CeldaDoble principal={a.nombre} secundaria={a.sku} />
                    {estado !== "normal" && <DistintivoStock estado={estado} />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <Subtitulo>Últimas órdenes</Subtitulo>
        {ordenes.length === 0 ? (
          <Vacio>Todavía no se le ha hecho ninguna orden.</Vacio>
        ) : (
          <ul>
            {ordenes.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/inventarios/ordenes-compra?oc=${o.id}`)}
                  className="flex w-full items-center justify-between gap-3 border-t border-gray-100 py-2.5 text-left hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.03]"
                >
                  <CeldaDoble principal={o.numero} secundaria={`Creada ${fechaRelativa(o.fechaCreacion)}`} />
                  <span className="flex shrink-0 items-center gap-3">
                    <DistintivoOrden estado={o.estado} />
                    <span className="w-28 text-right tabular-nums">{formatearMoneda(totalOrden(o))}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PanelLateral>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA
// ═══════════════════════════════════════════════════════════════════════════

export const ProveedoresPage = observer(function ProveedoresPage() {
  const s = inventarioStore;
  const [params, setParams] = useSearchParams();
  const { aviso, mostrar } = useAviso();
  const [pestana, setPestana] = useState<Pestana>("activos");
  const [busqueda, setBusqueda] = useState("");
  const [formulario, setFormulario] = useState<{ abierto: boolean; proveedor: Proveedor | null }>({ abierto: false, proveedor: null });
  const [porDesactivar, setPorDesactivar] = useState<Proveedor | null>(null);

  const detalleId = params.get("proveedor");
  const detalle = detalleId ? s.proveedor(detalleId) ?? null : null;
  const abrirDetalle = (id: string | null) => {
    const p = new URLSearchParams(params);
    if (id) p.set("proveedor", id);
    else p.delete("proveedor");
    setParams(p, { replace: true });
  };

  const q = busqueda.trim().toLowerCase();
  const filtrados = s.proveedores.filter(
    (p) => !q || [p.nombre, p.nit, p.ciudad, p.contacto].some((v) => v.toLowerCase().includes(q)),
  );
  const enPestana: Record<Pestana, Proveedor[]> = {
    activos: filtrados.filter((p) => p.activo),
    inactivos: filtrados.filter((p) => !p.activo),
    todos: filtrados,
  };
  const visibles = enPestana[pestana].slice().sort((a, b) => a.nombre.localeCompare(b.nombre));

  const alternar = (p: Proveedor) => {
    const r = s.alternarProveedorActivo(p.id);
    if (!r.ok) return mostrar(r.error);
    mostrar(p.activo ? `${p.nombre} activado` : `${p.nombre} desactivado`);
  };

  const activos = s.proveedoresActivos;
  const conCurso = activos.filter((p) => cifrasDe(p).enCurso > 0).length;

  // Los enlaces de contacto no deben abrir el detalle de la fila.
  const detener = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <PaginaInventario
      titulo="Proveedores"
      resumen={`${formatearEntero(activos.length)} proveedores activos${conCurso > 0 ? ` · ${conCurso} con órdenes en curso` : ""}.`}
      acciones={
        <Boton variante="principal" icono={<Plus className="h-4 w-4" />} onClick={() => setFormulario({ abierto: true, proveedor: null })}>
          Nuevo proveedor
        </Boton>
      }
      pestanas={
        <Pestanas<Pestana>
          valor={pestana}
          onCambio={setPestana}
          opciones={[
            { valor: "activos", etiqueta: "Activos", cuenta: enPestana.activos.length },
            { valor: "inactivos", etiqueta: "Desactivados", cuenta: enPestana.inactivos.length },
            { valor: "todos", etiqueta: "Todos", cuenta: enPestana.todos.length },
          ]}
        />
      }
    >
      <BarraHerramientas extremo={<span className="tabular-nums">{formatearEntero(visibles.length)} {visibles.length === 1 ? "proveedor" : "proveedores"}</span>}>
        <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Proveedor, NIT, ciudad o contacto" className="sm:w-80" />
      </BarraHerramientas>

      {visibles.length === 0 ? (
        <Vacio
          accion={
            !q && pestana === "activos" ? (
              <Boton variante="texto" onClick={() => setFormulario({ abierto: true, proveedor: null })}>
                Crear proveedor
              </Boton>
            ) : undefined
          }
        >
          {q ? "Ningún proveedor coincide con la búsqueda." : pestana === "inactivos" ? "No hay proveedores desactivados." : "No hay proveedores todavía."}
        </Vacio>
      ) : (
        <>
          <table className={cx(TABLA.tabla, "hidden sm:table")}>
            <thead>
              <tr>
                <th className={TABLA.th}>Proveedor</th>
                <th className={cx(TABLA.th, "hidden lg:table-cell")}>Contacto</th>
                <th className={TABLA.thNum}>Entrega</th>
                <th className={cx(TABLA.th, "hidden md:table-cell")}>Pago</th>
                <th className={cx(TABLA.thNum, "hidden md:table-cell")}>Artículos</th>
                <th className={TABLA.thNum}>Por reponer</th>
                <th className={TABLA.thNum}>En curso</th>
                <th className={TABLA.thNum}>Comprado</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((p) => {
                const c = cifrasDe(p);
                return (
                  <tr
                    key={p.id}
                    className={TABLA.filaClic}
                    tabIndex={0}
                    onClick={() => abrirDetalle(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        abrirDetalle(p.id);
                      }
                    }}
                  >
                    <td className={cx(TABLA.td, "max-w-[260px]")}>
                      <CeldaDoble
                        principal={p.nombre}
                        secundaria={[p.ciudad, p.nit && `NIT ${p.nit}`, !p.activo && "Desactivado"].filter(Boolean).join(" · ")}
                      />
                    </td>
                    <td className={cx(TABLA.td, "hidden max-w-[240px] lg:table-cell")}>
                      <div className="min-w-0">
                        <p className="truncate">{p.contacto || <Falta />}</p>
                        <p className="mt-0.5 truncate text-theme-xs text-gray-600 dark:text-gray-400">
                          {p.email ? (
                            <a href={`mailto:${p.email}`} onClick={detener} className="hover:underline">
                              {p.email}
                            </a>
                          ) : p.telefono ? (
                            <a href={`tel:${p.telefono.replace(/\s/g, "")}`} onClick={detener} className="hover:underline">
                              {p.telefono}
                            </a>
                          ) : null}
                        </p>
                      </div>
                    </td>
                    <td className={cx(TABLA.tdNum, "whitespace-nowrap")}>
                      {p.plazoEntregaDias} <span className="text-gray-600 dark:text-gray-400">{p.plazoEntregaDias === 1 ? "día" : "días"}</span>
                    </td>
                    <td className={cx(TABLA.td, "hidden whitespace-nowrap text-gray-700 md:table-cell dark:text-gray-300")}>{p.condicionesPago || <Falta />}</td>
                    <td className={cx(TABLA.tdNum, "hidden md:table-cell")}>{formatearEntero(c.articulos)}</td>
                    <td className={TABLA.tdNum}>
                      {c.porReponer > 0 ? <span className="font-bold text-brand-700 dark:text-brand-400">{formatearEntero(c.porReponer)}</span> : <Falta />}
                    </td>
                    <td className={TABLA.tdNum}>{c.enCurso > 0 ? formatearEntero(c.enCurso) : <Falta />}</td>
                    <td className={TABLA.tdNum}>{formatearMoneda(c.comprado)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="sm:hidden">
            {visibles.map((p) => {
              const c = cifrasDe(p);
              return (
                <FilaMovil
                  key={p.id}
                  onClick={() => abrirDetalle(p.id)}
                  titulo={p.nombre}
                  detalle={`${p.ciudad || "—"} · entrega en ${p.plazoEntregaDias} días · ${p.condicionesPago}`}
                  cifra={<span className="font-bold text-ink-body dark:text-white">{formatearMoneda(c.comprado)}</span>}
                />
              );
            })}
          </div>
        </>
      )}

      <PanelDetalle
        proveedor={detalle && !formulario.abierto ? detalle : null}
        onCerrar={() => abrirDetalle(null)}
        onEditar={() => detalle && setFormulario({ abierto: true, proveedor: detalle })}
        onAlternar={() => detalle && (detalle.activo ? setPorDesactivar(detalle) : alternar(detalle))}
      />

      <PanelFormulario
        abierto={formulario.abierto}
        proveedor={formulario.proveedor}
        onCerrar={() => setFormulario({ abierto: false, proveedor: null })}
        onGuardado={(p, nuevo) => {
          setFormulario({ abierto: false, proveedor: null });
          mostrar(nuevo ? `${p.nombre} creado` : `Cambios guardados en ${p.nombre}`);
          if (nuevo) abrirDetalle(p.id);
        }}
      />

      <Confirmar
        abierto={Boolean(porDesactivar)}
        titulo={`¿Desactivar ${porDesactivar?.nombre ?? ""}?`}
        textoConfirmar="Desactivar"
        peligro
        onConfirmar={() => {
          const p = porDesactivar;
          setPorDesactivar(null);
          if (p) alternar(p);
        }}
        onCancelar={() => setPorDesactivar(null)}
      >
        No se le podrán crear órdenes nuevas y sus artículos quedarán fuera de las órdenes que sugiere la cola de reorden. Las órdenes en curso no cambian.
      </Confirmar>

      <Aviso texto={aviso} />
    </PaginaInventario>
  );
});

export default ProveedoresPage;
