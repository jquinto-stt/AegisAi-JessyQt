import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Avatar } from "@/elements/ui/avatar";
import { Badge } from "@/elements/ui/badge";
import { Dropdown, DropdownItem } from "@/elements/ui/dropdown";
import { MoreDotIcon } from "@/icons";
import { retardoEscalonado } from "@/utils";
import { conversacionesStore } from "@/stores/conversaciones.store";
import { pedidosStore } from "@/stores/pedidos.store";
import type { FiltroBandeja, FiltroIntencion } from "@/stores/conversaciones.types";
import {
  intencionDe,
  INTENCION_LABEL,
  INTENCION_BADGE,
} from "../conversaciones.clasificacion";
import {
  AVATAR_MAP,
  inicialesDe,
  statusDe,
  tiempoRelativo,
  ultimoTexto,
} from "../conversaciones.utils";

const FILTROS_ESTADO: ReadonlyArray<{ valor: FiltroBandeja; etiqueta: string }> = [
  { valor: "todas", etiqueta: "Ver todas" },
  { valor: "requieren_atencion", etiqueta: "Requieren atención" },
  { valor: "no_leidas", etiqueta: "Solo no leídas" },
  { valor: "cerradas", etiqueta: "Cerradas" },
];

const FILTROS_INTENCION: ReadonlyArray<{ valor: FiltroIntencion; etiqueta: string }> = [
  { valor: "todas", etiqueta: "Todas" },
  { valor: "consultar", etiqueta: INTENCION_LABEL.consultar },
  { valor: "comprar", etiqueta: INTENCION_LABEL.comprar },
  { valor: "seguir_pedido", etiqueta: INTENCION_LABEL.seguir_pedido },
  { valor: "reclamar", etiqueta: INTENCION_LABEL.reclamar },
];

interface BandejaListaProps {
  onToggle?: () => void;
  bandejaExpandida?: boolean;
}

export const BandejaLista = observer(({ onToggle, bandejaExpandida = true }: BandejaListaProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [filtroIntencion, setFiltroIntencion] = useState<FiltroIntencion>("todas");
  const bandeja = conversacionesStore.bandeja;
  const filtroEstado = conversacionesStore.filtro;
  const seleccionadaId = conversacionesStore.seleccionadaId;

  const listaFiltrada =
    filtroIntencion === "todas"
      ? bandeja
      : bandeja.filter((conv) => intencionDe(conv.id) === filtroIntencion);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Cabecera: Título "Chats" + Botón colapsar + Menú de 3 puntos */}
      <div className="p-4 sm:p-5 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white/90">
              Chats
            </h3>
            {conversacionesStore.totalNoLeidos > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[10px] font-bold text-white shadow-2xs">
                {conversacionesStore.totalNoLeidos}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onToggle && (
              <button
                type="button"
                onClick={onToggle}
                title="Colapsar lista de chats"
                aria-label="Colapsar lista de chats"
                className="group flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-gray-300"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform group-hover:-translate-x-0.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                  <path d="M14 9l-3 3 3 3" />
                </svg>
              </button>
            )}

            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  filtroEstado !== "todas"
                    ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-gray-300"
                }`}
                aria-label="Filtrar por estado"
                title="Filtrar por estado"
              >
                <MoreDotIcon className="h-5 w-5" />
                {filtroEstado !== "todas" && (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-brand-500" />
                )}
              </button>
            <Dropdown
              isOpen={menuOpen}
              onClose={() => setMenuOpen(false)}
              className="w-48 p-1.5"
            >
              {FILTROS_ESTADO.map((f) => (
                <DropdownItem
                  key={f.valor}
                  onItemClick={() => {
                    conversacionesStore.setFiltro(f.valor);
                    setMenuOpen(false);
                  }}
                  className={`text-xs ${
                    filtroEstado === f.valor
                      ? "font-semibold text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-500/10"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  {f.etiqueta}
                </DropdownItem>
              ))}
            </Dropdown>
          </div>
        </div>
      </div>

        {/* Buscador */}
        <div className="relative mt-3.5">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              className="h-4 w-4 fill-gray-400 dark:fill-gray-500"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.04199 9.37381C3.04199 5.87712 5.87735 3.04218 9.37533 3.04218C12.8733 3.04218 15.7087 5.87712 15.7087 9.37381C15.7087 12.8705 12.8733 15.7055 9.37533 15.7055C5.87735 15.7055 3.04199 12.8705 3.04199 9.37381ZM9.37533 1.54218C5.04926 1.54218 1.54199 5.04835 1.54199 9.37381C1.54199 13.6993 5.04926 17.2055 9.37533 17.2055C11.2676 17.2055 13.0032 16.5346 14.3572 15.4178L17.1773 18.2381C17.4702 18.531 17.945 18.5311 18.2379 18.2382C18.5308 17.9453 18.5309 17.4704 18.238 17.1775L15.4182 14.3575C16.5367 13.0035 17.2087 11.2671 17.2087 9.37381C17.2087 5.04835 13.7014 1.54218 9.37533 1.54218Z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar..."
            value={conversacionesStore.busqueda}
            onChange={(e) => conversacionesStore.setBusqueda(e.target.value)}
            className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/70 py-2 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-brand-500/15 dark:border-gray-800 dark:bg-gray-900/60 dark:text-white/90 dark:placeholder:text-gray-500"
          />
        </div>

        {/* Píldoras de Filtro por Intención */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {FILTROS_INTENCION.map((f) => {
            const activo = filtroIntencion === f.valor;
            return (
              <button
                key={f.valor}
                type="button"
                onClick={() => setFiltroIntencion(f.valor)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  activo
                    ? "bg-brand-500 text-white shadow-2xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200/80 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
                }`}
              >
                {f.etiqueta}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Chats */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-2 custom-scrollbar">
        {listaFiltrada.length === 0 ? (
          <div className="flex h-36 items-center justify-center p-4 text-center text-xs text-gray-400 dark:text-gray-500">
            No se encontraron conversaciones.
          </div>
        ) : (
          <div className="space-y-1">
            {listaFiltrada.map((conv, i) => {
              const seleccionada = seleccionadaId === conv.id;
              const avatarSrc = AVATAR_MAP[conv.id] || "";
              const preview = ultimoTexto(conv.id) || conv.contacto.telefono;
              const intencion = intencionDe(conv.id);

              // Pedido ACTIVO del contacto. Se resuelve con el selector canónico
              // del store de Pedidos (`pedidoActivoDe`), que cruza por teléfono
              // normalizado y descarta los terminales. Esta vista NO deriva el
              // filtro por su cuenta: si lo hiciera, "activo" significaría aquí
              // algo distinto que en el panel de contexto del chat.
              // El cruce cruza la frontera Pedidos→Conversaciones en la capa de
              // UI, nunca dentro de un store (invariante D2).
              const pedidoActivo = pedidosStore.pedidoActivoDe(conv.contacto.telefono);

              return (
                <div
                  key={conv.id}
                  onClick={() => conversacionesStore.seleccionar(conv.id)}
                  // La entrada describe «esta fila acaba de hacerse visible», no
                  // «acaba de crearse». Como las filas llevan `key` estable, al
                  // filtrar o buscar las que ya estaban NO se re-animan: solo
                  // entran las que vuelven a coincidir, que es justo lo que el
                  // usuario necesita ver aparecer.
                  style={{ animationDelay: retardoEscalonado(i) }}
                  className={`animate-entrada-lista group flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-colors ${
                    seleccionada
                      ? "bg-gray-100/90 dark:bg-white/[0.08]"
                      : "hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      src={avatarSrc}
                      alt={conv.contacto.nombre}
                      initials={inicialesDe(conv.contacto.nombre)}
                      size="large"
                      status={statusDe(conv.estado)}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex min-w-0 items-center gap-1.5 flex-wrap">
                        <h5 className="truncate text-sm font-semibold text-gray-800 dark:text-white/90">
                          {conv.contacto.nombre}
                        </h5>
                        <Badge
                          size="xs"
                          color={INTENCION_BADGE[intencion]}
                        >
                          {INTENCION_LABEL[intencion]}
                        </Badge>
                        {conversacionesStore.requiereAtencionHumana(conv) && (
                          <Badge
                            size="xs"
                            color="warning"
                            title="Requiere atención humana"
                          >
                            Asesor
                          </Badge>
                        )}
                        {/* Badge del pedido activo: #PED-XXX + su estado actual.
                            Etiqueta y color SIEMPRE del store de Pedidos — este
                            módulo no tiene vocabulario propio de estados de pedido. */}
                        {pedidoActivo && (
                          <span
                            className="flex shrink-0 items-center gap-1"
                            title={`Pedido ${pedidoActivo.numero} · ${pedidosStore.estadoLabel(pedidoActivo.estado)}`}
                          >
                            <Badge size="xs" color="light" className="tabular-nums">
                              {pedidoActivo.numero}
                            </Badge>
                            <Badge
                              size="xs"
                              color={pedidosStore.estadoBadgeColor(pedidoActivo.estado)}
                            >
                              {pedidosStore.estadoLabel(pedidoActivo.estado)}
                            </Badge>
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] text-gray-400 dark:text-gray-500">
                        {tiempoRelativo(conv.ultimaActividad)}
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {preview}
                      </p>
                      {conv.noLeidos > 0 && (
                        <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white shadow-2xs">
                          {conv.noLeidos}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default BandejaLista;
