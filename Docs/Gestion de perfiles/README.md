# Arquitectura de Gestión de Perfiles y Operadores

Documentación técnica del sistema de gestión de perfiles, roles, operadores y control de acceso basado en la arquitectura de referencia de `Repo-prueba-master`.

---

## 1. Visión General

El sistema implementa un modelo de autorización por roles y permisos granulares (**RBAC - Role-Based Access Control**) diseñado para gestionar dos perfiles principales:

1. **Administrador (`administrador`)**:
   - Acceso global e irrestricto a todas las funcionalidades, configuraciones y vistas de los módulos activos.
   - Capacidad de aprobar solicitudes pendientes de operadores, dar de alta/baja perfiles y editar sus permisos.
2. **Operador (`operador`)**:
   - Acceso condicional y restringido según una lista explícita de secciones permitidas (`permisos: string[]`).
   - Acceso contextual a recursos específicos (por ejemplo: colas de atención asignadas en el módulo de Turnos o profesionales en el módulo de Agendamiento).

---

## 2. Mapa de Archivos Clave

| Componente / Archivo | Rol en la Arquitectura |
| :--- | :--- |
| [`SeleccionarPage.tsx`](file:///c:/Users/Jessy/Documents/GitHub/StockFlow/Repo-prueba-master/packages/apps/web/modules/app/src/pages/seleccionar/SeleccionarPage.tsx) | **Punto de inicio**: Selección de módulos habilitados y rol activo / simulación. |
| [`OperadorRegistroPage.tsx`](file:///c:/Users/Jessy/Documents/GitHub/StockFlow/Repo-prueba-master/packages/apps/web/modules/app/src/pages/operador/OperadorRegistroPage.tsx) | Formulario de autoservicio para solicitud de alta de operadores (estado `pendiente`). |
| [`session.store.ts`](file:///c:/Users/Jessy/Documents/GitHub/StockFlow/Repo-prueba-master/packages/apps/web/modules/app/src/stores/session.store.ts) | Store de Zustand para la sesión actual y evaluación de permisos en tiempo de ejecución. |
| [`operadores.store.ts`](file:///c:/Users/Jessy/Documents/GitHub/StockFlow/Repo-prueba-master/packages/apps/web/modules/app/src/stores/operadores.store.ts) | Store de Zustand que mantiene el catálogo de operadores, estados y asignaciones. |
| [`OperadoresPage.tsx`](file:///c:/Users/Jessy/Documents/GitHub/StockFlow/Repo-prueba-master/packages/apps/web/modules/app/src/pages/operadores/OperadoresPage.tsx) | Pantalla de administración para gestión de altas, bajas, estados y edición de permisos. |
| [`SeccionGuard.tsx`](file:///c:/Users/Jessy/Documents/GitHub/StockFlow/Repo-prueba-master/packages/apps/web/modules/app/src/app/SeccionGuard.tsx) | Componente guardián que intercepta las rutas y bloquea accesos no autorizados. |

---

## 3. Estructura de Documentación

Esta carpeta contiene la siguiente documentación detallada:

- **[01-flujo-inicio-y-ciclo-vida.md](./01-flujo-inicio-y-ciclo-vida.md)**: Cómo inicia el usuario, selección de rol, simulación de operadores y registro inicial.
- **[02-stores-y-modelo-de-datos.md](./02-stores-y-modelo-de-datos.md)**: Estructura de `session.store.ts` y `operadores.store.ts`, persistencia en `localStorage` y métodos de consulta.
- **[03-administracion-y-permisos.md](./03-administracion-y-permisos.md)**: Panel de administración, aprobación de solicitudes y matriz de asignación de permisos/colas.
- **[04-guardianes-y-seguridad-de-rutas.md](./04-guardianes-y-seguridad-de-rutas.md)**: Implementación de `SeccionGuard` y cómo se protegen las rutas en `App.tsx`.
