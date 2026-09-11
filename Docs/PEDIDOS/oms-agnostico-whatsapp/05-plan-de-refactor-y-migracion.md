# 05 — Plan de Refactor & Migración a Arquitectura 3 Capas

Este documento presenta la hoja de ruta técnica, el estado de avance y los pasos de migración implementados para transformar el sistema heredado en una **Arquitectura en 3 Capas Desacoplada**.

---

## 1. Diagnóstico del Estado Anterior

El sistema heredado presentaba tres problemas críticos de acoplamiento:
1. **Acoplamiento Gastronómico Residual:** Presencia de términos como "cocina", "KDS", "comandas", "recetas" y "chef" en componentes que debían ser universales para cualquier comercio.
2. **Onboarding Forzado con Arquetipos:** Se obligaba al usuario en el Paso 1 a clasificar su negocio en uno de 6 arquetipos rígidos, inyectando suposiciones tempranas en lugar de tratar a la tienda como un contenedor limpio.
3. **Mezcla de Canales y Lógica Comercial:** El canal de WhatsApp vinculaba el número de teléfono directamente con la toma de pedidos, impidiendo que la tienda tuviera WhatsApp sin el módulo de pedidos instalado.

---

## 2. Fases del Plan de Migración

### Fase 1: Erradicación de Términos de Cocina (Completada)
- **Alcance:** 11 componentes clave del módulo de Pedidos:
  - `PedidosModule.tsx`: Pestañas dinámicas basadas en estación de alistamiento (`Package`), supresión de recetas en negocios no gastronómicos.
  - `PedidosEnVivoView.tsx`: Columnas del Kanban, filtros y toasts con verbos de alistamiento universales.
  - `OrderDetailDrawer.tsx`: Modos de vista operativo/general, cronómetro de "Tiempo de Alistamiento", botón `+10m a Despacho`.
  - `RejectCancelModal.tsx`: Motivos comerciales universales (agotado, variantes no disponibles, saturación de despacho).
  - `ThermalTicketModal.tsx`: Encabezado neutro `COMPROBANTE DE DESPACHO`.
  - `CustomLayoutModal.tsx`: Modos de pantalla universales ("Enfoque Operativo", "Pantalla de Despacho").
  - `ProgramadosView.tsx`: Acciones universales ("Inyectar a Despacho / Bodega").
  - `RolesPermisosView.tsx` y `AutomatizacionesView.tsx`: Limpieza de permisos de KDS.

---

### Fase 2: Rediseño del Onboarding en 3 Pasos (Completada)
- **Alcance:** `OnboardingPage.tsx`:
  - **Paso 1 (Identidad Pura):** Nombre comercial, país, moneda, ciudad y teléfono de contacto. Cero preguntas de "¿Qué tipo de tienda eres?".
  - **Paso 2 (Capacidades Plug & Play):** Catálogo interactivo de módulos con botón para **"Comenzar Limpio (0 módulos)"**.
  - **Paso 3 (Lanzamiento):** Pasaporte resumen de la tienda y acceso directo al espacio de trabajo.
  - **Estándar Visual:** Eliminación de emojis; uso exclusivo de iconos Lucide.

---

### Fase 3: Soporte Nativo de Tienda con 0 Módulos (Completada)
- **Alcance:** `EmptyModulesHubView.tsx` y `StockFlowSidebar.tsx`:
  - Si `activeModules` está vacío (`[]`), la aplicación renderiza el Hub de Capacidades con el mensaje: *"Tu tienda está lista. Esta tienda es un contenedor limpio e independiente."*
  - La barra lateral se aísla por completo, mostrando únicamente el acceso al catálogo de módulos.
  - Al hacer clic en `[ + Activar Módulo ]`, la capacidad se monta inmediatamente sin recargar la página.

---

### Fase 4: Desacoplamiento de WhatsApp en Dos Niveles (En Progreso)
- **Nivel 1 (Tienda / Ajustes Generales):**
  - Sección de Integraciones en Configuración de Tienda.
  - Conexión de la línea telefónica mediante QR o Meta Cloud API.
  - Independiente de si hay módulos instalados.
- **Nivel 2 (Módulo Pedidos):**
  - Panel de configuración del Asistente Virtual: Nombre del bot, tono de respuesta (Cálido, Profesional, Técnico, Ágil), plantilla de saludo comercial y flujo de cotizaciones.

---

### Fase 5: Bus de Eventos de Dominio (Planificada)
- Implementación de publicadores y suscriptores de eventos tipados (`order.confirmed` -> `stock.reserved`) para garantizar que Pedidos e Inventarios se comuniquen sin dependencias directas de código.

---

## 3. Matriz de Verificación y Pruebas E2E

| Criterio de Aceptación | Estado | Método de Validación |
| :--- | :--- | :--- |
| Crear tienda con 0 módulos | Aprobado | Test E2E en navegador (`step4_workspace_0_modules.png`) |
| Activación en caliente de Pedidos | Aprobado | Test E2E en navegador (`step5_module_activated.png`) |
| Cero referencias a cocina en Pedidos | Aprobado | Auditoría de código en 11 archivos UI |
| Cero emojis en interfaces de usuario | Aprobado | Auditoría de código en Onboarding y Badges |
| Compilación TypeScript de producción | Aprobado | `npm run build` exitoso (código 0, 0 errores) |
