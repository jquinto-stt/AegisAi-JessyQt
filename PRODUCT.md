# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pequeños negocios de cualquier sector (Necto es horizontal: no hay un sector principal) que venden por mostrador y por canales de mensajería, con WhatsApp como canal prioritario en Latinoamérica. Dentro de cada negocio trabajan varios perfiles, cada uno con un rol que agrupa capacidades:

- **Administrador de tienda:** opera el negocio completo, configura los módulos y gestiona el equipo.
- **Supervisor de pedidos:** opera todo el ciclo de los pedidos; puede ver la configuración y el equipo, pero no modificarlos.
- **Operador (vendedor):** atiende al cliente en el mostrador y por el canal, registra pedidos y los deja listos para preparación.
- **Personal de preparación:** cocina, taller o bodega; avanza las órdenes por las etapas de producción y despacho sin ver información comercial.
- **Roles personalizados:** perfiles armados capacidad por capacidad.

El cliente final no entra al panel: participa por WhatsApp o en el mostrador.

## Product Purpose

Necto es una plataforma modular de operación para pequeños negocios. Reúne en un solo panel web lo que hoy está repartido entre celulares, chats y cuadernos: recibir y despachar pedidos, controlar existencias, atender conversaciones de clientes y consultar la operación en lenguaje natural.

Está bien hecho cuando el equipo ve de un vistazo qué necesita atención ahora, registra un pedido en segundos, ningún pedido o mensaje se pierde entre canales y el negocio sabe cuánto vendió, cobró, canceló y tiene en stock.

## Positioning

Una sola plataforma donde los módulos operativos están conectados de forma nativa: una conversación por WhatsApp puede convertirse en un pedido real del tablero, el pedido se enlaza con el inventario y el asistente IA consulta todos los módulos sin modificarlos. Los módulos no son herramientas sueltas integradas por fuera. El nombre viene del latín *nectere*, "unir, enlazar".

## Operating Context

- **Superficies de trabajo:** PC en el mostrador o la oficina, tablet compartida en la cocina o la bodega, y el celular del operador (web móvil) para atender WhatsApp o hacer conteos en movimiento. Las tres son de uso real y diario.
- **Módulos:**
  - **Pedidos**, el núcleo: Inicio, tablero kanban/lista, alta manual por pasos, historial, analítica, programados, configuración.
  - **Inventario:** catálogo, existencias por bodega, kárdex, lotes/FEFO, auditoría física, reorden.
  - **Conversaciones:** consola multicanal con WhatsApp primero; Telegram, Instagram y Messenger especificados.
  - **Asistente IA (NECTO AI):** consulta de solo lectura.
  - **Equipo y acceso:** roles y capacidades.
- **Flujo diario:** pedidos que entran por mostrador o canal → confirmación → preparación → listo / en camino → entregado, con pedidos programados para horas futuras y logística de domicilio.
- Producto e interfaz en español.

## Capabilities and Constraints

- **Acceso por capacidades `<dominio>.<acción>`:** las capacidades nombran acciones, no pantallas. Entrar a una sección no es lo mismo que poder operarla (`settings.read` frente a `settings.manage`). El admin es un rol normal y el sistema es fail-closed: sin rol, no hay acceso.
- **Asistente IA:** solo consulta. Nunca crea, modifica ni cancela, y separa los hechos de las interpretaciones.
- **Stack existente:** React 18 + TypeScript + Vite, MobX, Tailwind CSS, React Router v7, monorepo WebIAI/Lerna. La app vive en `packages/apps/web/modules/app`.
- **Fuentes funcionales:** `docs/Documentacion Funcional/` (alcance de Pedidos, Inventario y Conversaciones) y `docs/Roles y permisos/`.
- **Sin decidir / no construido:** entidad Tienda y multi-tenant, facturación y planes, activación o compra de módulos, autenticación real.

## Brand Commitments

- Nombre **NECTO**, logotipo y lema "grow together" (`Esencia_necto/`).
- **Regla obligatoria de tipografía y colorimetría** (también en `CLAUDE.md`). Todo diseño la usa en exclusiva; ninguna skill ni dirección visual la sustituye.
  - Tipografía: **DM Sans** únicamente, pesos 300 Light, 400 Regular y 700 Bold. Ningún otro peso ni familia.
  - Tamaños permitidos (ningún otro): 36px Bold · 24px Bold/Regular/Light · 16px Bold/Regular/Light · 14px Bold/Regular/Light · 12px Bold/Regular/Light.
  - Colores:
    - `#FF3F1A` Naranja NECTO (acento principal, acciones)
    - `#97D6DF` Cyan NECTO (acento secundario)
    - `#ECECEC` Gris claro (fondos, superficies, separadores)
    - `#190088` Azul profundo NECTO (títulos y encabezados)
    - `#212121` Dark (texto general)
    - `#EFE6D3` Cream (complementario)
- La presentación de marca nació como "Proyecto Referrals". Los referidos **no** forman parte del producto actual: Necto es una plataforma de operación.

## Evidence on Hand

- Presentación de naming y marca: `Esencia_necto/PRESENTACIÓN NAMING + MARCA.pdf` y sus páginas en JPG.
- Capturas de referencia de Inventario (claro y oscuro, escritorio y móvil): `docs/diseno-inventario/`.
- Matriz de roles y capacidades: `docs/Roles y permisos/`.
- No hay testimonios, clientes, métricas de negocio, precios ni casos de éxito. No deben inventarse.

## Product Principles

1. **Lo urgente primero.** Cada superficie operativa responde "¿qué necesita atención ahora?" antes que cualquier otra cosa.
2. **Una sola verdad conectada.** Un pedido, un cliente o un producto existen una vez y se ven igual desde cualquier módulo; nada se transcribe dos veces.
3. **Cada rol ve su trabajo.** La interfaz se ajusta a lo que la persona puede hacer, sin mostrarle de más ni bloquearla en silencio.
4. **Lo planeado no se presenta como existente.** Las capacidades parciales o futuras se declaran como tales.
5. **Funciona donde ocurre el trabajo.** Mostrador, cocina/bodega y celular son igual de importantes.
