# NECTO — Pedidos e Inventario

Repositorio enfocado en el desarrollo e integración de los módulos asignados de **Pedidos** e **Inventario** para la plataforma **NECTO**.

---

## 📌 Alcance del Proyecto

Este repositorio contiene la implementación y arquitectura para la gestión operativa de pedidos en tiempo real y el control de inventario/stock asociado:

1. **Módulo de Pedidos (Activo):**
   - Tablero Kanban en tiempo real para el seguimiento de estados (Pendiente, En Preparación, Listo, Entregado, Cancelado).
   - Creación de pedidos multi-canal (mostrador, canales digitales / WhatsApp).
   - Historial y trazabilidad de pedidos con filtros por fecha, estado y canal.
   - Panel de inicio con métricas de ventas, tiempos promedio y accesos rápidos.
   - Gestión de operadores y asignación de permisos por sección.

2. **Módulo de Inventario (En Desarrollo / Roadmap):**
   - Catálogo de productos, ítems e insumos disponibles.
   - Control de existencias y deducción automática de stock por pedido confirmado.
   - Alertas de stock mínimo y reabastecimiento.
   - Historial de movimientos y ajustes manuales de inventario.

---

## 🧭 Rutas y Vistas (Módulo Pedidos)

| Ruta | Vista | Descripción |
|------|-------|-------------|
| `/pedidos/inicio` | Inicio Pedidos | Métricas clave del día, pedidos recientes y resumen operativo |
| `/pedidos` | Tablero Kanban | Gestión visual de pedidos por columna según su estado operativo |
| `/pedidos/crear` | Crear Pedido | Formulario para registrar nuevos pedidos, ítems, cliente y notas |
| `/pedidos/historial` | Historial | Búsqueda, filtrado y detalle histórico de pedidos despachados |
| `/pedidos/config` | Configuración | Ajustes de estados, tiempos de preparación y canales |
| `/pedidos/operadores` | Operadores | Control de acceso y asignación de permisos granulares por sección |

---

## 👥 Manejo de Perfiles y Permisos

La lógica de control de acceso vive en el cliente (`packages/apps/web/modules/app/src/stores/`):

- **`session.store.ts`**: Gestiona la sesión actual, el rol (`administrador` u `operador`) y la persistencia en `localStorage`.
- **`operadores.store.ts`**: Administra los operadores registrados, su estado (`activo`, `pendiente`, `inactivo`) y los IDs de secciones permitidas.
- **`SeccionGuard.tsx`**: Componente guardián que restringe el acceso a las rutas según los permisos asignados al operador activo.

---

## 💻 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 18, TypeScript, Vite |
| **Estado Global** | MobX + `mobx-react-lite` |
| **Estilos y UI** | Tailwind CSS, Lucide / SVGs personalizados |
| **Enrutamiento** | React Router v7 |
| **Monorepo** | WebIAI CLI + Lerna + npm workspaces |

---

## 🚀 Inicio Rápido (Frontend)

Para levantar el entorno de desarrollo local del frontend:

```bash
# 1. Instalar dependencias
npm install --prefix packages/apps/web/modules/app

# 2. Iniciar servidor de desarrollo (puerto 6020)
npm run dev --prefix packages/apps/web/modules/app
```

La aplicación quedará disponible en:
👉 **[http://localhost:6020/](http://localhost:6020/)**

Rutas directas de prueba:
- `/pedidos` — Tablero de pedidos.
- `/pedidos/inicio` — Dashboard del módulo de pedidos.
- `/pedidos/crear` — Formulario de nuevo pedido.
