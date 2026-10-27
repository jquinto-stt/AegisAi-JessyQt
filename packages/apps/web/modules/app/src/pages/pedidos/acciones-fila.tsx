// ═══════════════════════════════════════════════════════════════════════════
// ACCIONES DE FILA — la regla, separada de la pintura
// ═══════════════════════════════════════════════════════════════════════════
//
// Vive fuera del componente por una razón concreta: la regla se puede probar.
// Mientras el orden y el corte estuvieron dentro de `ResumenPedidosVista`, la
// única forma de saber si una fila enseñaba seis iconos era mirarla en pantalla
// con una sesión abierta. Aquí se comprueba con datos.
//
// Las dos reglas que este módulo garantiza:
//
//   1. La celda no pinta más de `MAX_ACCIONES_VISIBLES` iconos sueltos — hoy
//      cero: todo vive en la tarjeta del «⋯».
//   2. El destructivo va al final y separado. Nunca es lo primero que aparece
//      al abrir, ni cae al lado del botón que avanza el pedido.
import type { ReactNode } from "react";
import {
  ArrowPathIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  UserMinusIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";

/** Una acción concreta sobre un pedido. */
export type AccionFila = {
  clave: string;
  /** Nombre exacto de la acción. Es a la vez el tooltip y el `aria-label`. */
  titulo: string;
  tono: "neutral" | "marca" | "exito" | "error";
  icono: ReactNode;
  onClick: () => void;
  /** Cierra el pedido. Va al final del desbordamiento, nunca primero. */
  destructivo?: boolean;
};

/**
 * Cuántos iconos van sueltos en la celda, antes de la tarjeta.
 *
 * **Cero desde el 27/10, por decisión del cliente**: todas las acciones viven
 * detrás del «⋯». La fila vuelve a leerse como dato, la columna mide 32 px en
 * cualquier estado y el destructivo deja de estar a un dedo del de avanzar.
 *
 * El costo está asumido y no se disimula: confirmar un pedido pasa de uno a dos
 * clics, y confirmar es la operación más repetida de la tabla. Si el cliente
 * prefiere el atajo, esto se cambia a `1` —o a `3`— y la celda vuelve a pintar
 * iconos sin tocar el componente: es el único número que decide el corte.
 */
export const MAX_ACCIONES_VISIBLES = 0;

/** Lo que `accionesDePedido()` responde para una fila. */
export type PermisosFila = {
  puedeAvanzar: boolean;
  etiquetaAvanzar: string;
  esActivarAhora: boolean;
  puedeReprogramar: boolean;
  puedeReintentar: boolean;
  puedeCancelar: boolean;
  puedeQuitarRepartidor: boolean;
};

/** Lo que hace cada acción. Se inyecta para que el módulo no conozca el store. */
export type ManosFila = {
  avanzar: () => void;
  detalle: () => void;
  reprogramar: () => void;
  reintentar: () => void;
  quitarRepartidor: () => void;
  cancelar: () => void;
};

/**
 * Arma las acciones de UNA fila en orden de lectura: primero lo que avanza,
 * luego mirar, y al final lo que cierra.
 *
 * `detalle` no depende de ningún permiso: siempre está, y por eso una fila
 * cerrada —entregado o cancelado— sale con una sola acción en vez de con cinco
 * apagadas.
 */
export function construirAcciones(
  permisos: PermisosFila,
  manos: ManosFila,
): AccionFila[] {
  const lista: AccionFila[] = [];

  if (permisos.puedeAvanzar) {
    lista.push({
      clave: "avanzar",
      // Dice a dónde va: «Avanzar a Entregado», no «Avanzar».
      titulo: permisos.etiquetaAvanzar,
      tono: "marca",
      icono: permisos.esActivarAhora ? (
        <BoltIcon className="size-4" />
      ) : (
        <CheckCircleIcon className="size-4" />
      ),
      onClick: manos.avanzar,
    });
  }

  lista.push({
    clave: "detalle",
    titulo: "Ver detalle del pedido",
    tono: "neutral",
    icono: <EyeIcon className="size-4" />,
    onClick: manos.detalle,
  });

  if (permisos.puedeReprogramar) {
    lista.push({
      clave: "reprogramar",
      titulo: "Reprogramar",
      tono: "marca",
      icono: <ClockIcon className="size-4" />,
      onClick: manos.reprogramar,
    });
  }

  if (permisos.puedeReintentar) {
    lista.push({
      clave: "reintentar",
      titulo: "Reintentar entrega",
      tono: "exito",
      icono: <ArrowPathIcon className="size-4" />,
      onClick: manos.reintentar,
    });
  }

  if (permisos.puedeQuitarRepartidor) {
    lista.push({
      clave: "quitar-repartidor",
      titulo: "Quitar repartidor",
      tono: "neutral",
      icono: <UserMinusIcon className="size-4" />,
      onClick: manos.quitarRepartidor,
    });
  }

  if (permisos.puedeCancelar) {
    lista.push({
      clave: "cancelar",
      titulo: "Cancelar pedido",
      tono: "error",
      icono: <XCircleIcon className="size-4" />,
      onClick: manos.cancelar,
      destructivo: true,
    });
  }

  return lista;
}

/**
 * Parte la lista entre lo que se ve y lo que va a «Más». El orden se conserva:
 * el corte no reordena nada, solo decide dónde cae la línea.
 */
export function repartirAcciones(acciones: AccionFila[]): {
  visibles: AccionFila[];
  resto: AccionFila[];
} {
  return {
    visibles: acciones.slice(0, MAX_ACCIONES_VISIBLES),
    resto: acciones.slice(MAX_ACCIONES_VISIBLES),
  };
}
