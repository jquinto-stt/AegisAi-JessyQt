# Replanteo del dataset de conversaciones de WhatsApp

## Qué se hizo

Se **reemplazó por completo** el dataset de conversaciones de prueba, como
decisión de producto: 8 hilos que representan **8 intenciones distintas** de
cliente, en lugar de 4 hilos que repetían el mismo guion "cliente pide → bot crea
pedido".

**Solo 1 de los 8 hilos termina en pedido.** El arco que la bandeja demuestra es
`consulta → información → intención → acción → seguimiento → handoff humano`.

| # | Intención | Desenlace |
|---|---|---|
| conv-1 | Consulta de producto | bot informa, no crea nada |
| conv-2 | Consulta de disponibilidad | bot responde lo que puede comprobar |
| conv-3 | Crear pedido | **resume → pide confirmación → registra** |
| conv-4 | Consultar pedido existente | lee el pedido del store, no lo recrea |
| conv-5 | Problema con pedido | no puede resolverlo → **escala** |
| conv-6 | Pago pendiente | explica el estado **del pedido** |
| conv-7 | Pide una persona | handoff → operador toma → responde |
| conv-8 | Consulta general | se resuelve y **cierra** |

## Decisiones clave

- **"836 days" eliminado de raíz.** Las fechas fijas (`2024-06-03`) se cambiaron
  por offsets relativos sobre una única base compartida, así que los tiempos son
  realistas sin importar cuándo se abra la demo — y coherentes **entre** hilos.
- **El pago vive en el PEDIDO, nunca en la conversación.** `conv-6` habla de un
  pago pendiente mientras sigue `abierta`+`bot`. No se inventó un dominio de pago
  que el modelo real no tiene.
- **Cero bucles artificiales.** 8 hilos, solo 2 eventos de sistema (ambos hechos
  reales) y **ningún** evento `devuelta`.
- **Ningún preview de bandeja es un evento técnico.** Los 8 previews son
  contenido conversacional real.
- **Los dos seeds ahora concuerdan** por teléfono, identidades y tiempos.

## Defecto encontrado durante la verificación

`conv-8` tenía el header 7 minutos *por delante* de su último mensaje. Como
`ultimaActividad` ordena la bandeja, habría adelantado el hilo por delante de
mensajes posteriores. Corregido y ahora protegido por test.

## Verificación

- `vitest run` → **399 tests en 22 archivos, todo verde** (+24 guardas nuevas)
- `tsc --noEmit` → **12 errores preexistentes, delta 0**, ninguno en archivos tocados
- `vite build` → OK
- Invariante D2 (encapsulación de stores) → **intacto**

## Cuestiones abiertas

1. **Inventario no está conectado** — `conv-2` modela la consulta por ausencia
   honesta del bot. No hay demo de stock real porque esa capacidad no existe.
2. **Las métricas de analítica son relativas al arranque** por diseño del seed.
3. **`en_espera` solo se alcanza vía `conv-5`.**
4. **El pago es binario** (`Pedido.pagado?: boolean`); los estados
   pendiente/pagado/fallido/reembolsado no están modelados.

Informe completo: `outputs/informe-dataset-conversaciones.md`
