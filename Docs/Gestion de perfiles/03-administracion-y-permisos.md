# Administración de Perfiles y Asignación de Permisos

Este documento describe la vista de gestión de operadores utilizada por los administradores para autorizar perfiles y asignar permisos granulares.

---

## 1. Vista de Administración: `OperadoresPage.tsx`

*Ubicación:* `packages/apps/web/modules/app/src/pages/operadores/OperadoresPage.tsx`
*Rutas asociadas:* `/turnos/operadores` y `/agendamiento/operadores`

Esta interfaz está restringida exclusivamente a usuarios con rol `administrador`.

### Características Principales:
1. **Filtros por Estado**:
   - Pestañas para alternar entre operadores `Todos`, `Activos`, `Pendientes` e `Inactivos`.
2. **Bandeja de Aprobación de Solicitudes**:
   - Los operadores que se registraron mediante autoservicio aparecen con un distintivo visual amarillo (`Pendiente`).
   - El administrador dispone de botones de acción rápida: **Aprobar** (pasa a `activo`) o **Rechazar**.
3. **Alta Manual Directa**:
   - Modal para dar de alta a un operador nuevo sin requerir el formulario de auto-registro.

---

## 2. Modal de Edición de Permisos y Recursos

Al seleccionar la acción **Editar** sobre un operador, se despliega un formulario modal que permite configurar tres dimensiones:

### A. Secciones / Vistas Habilitadas (`permisos`)
Se presentan las secciones correspondientes al módulo del operador mediante casillas de verificación (checkboxes):
- Por ejemplo, en **Turnos**:
  - `[x] Inicio / Resumen`
  - `[x] Atención de Turnos`
  - `[ ] Recepción`
  - `[ ] Gestión de Colas`
  - `[ ] Encuestas`

### B. Asignación de Colas (Módulo Turnos - `colaIds`)
- Define qué colas de atención específicas puede visualizar y atender este operador.
- Permite que operadores de distintas áreas (por ejemplo: Farmacia vs. Caja) solo vean la carga de trabajo que les compete.

### C. Asignación de Profesionales (Módulo Agendamiento - `profesionalIds`)
- Restringe la visibilidad de agendas para que un operador o asistente únicamente visualice los calendarios de los profesionales asignados.

---

## 3. Matriz de Roles y Capacidades

| Capacidad / Acción | Rol Administrador | Rol Operador |
| :--- | :---: | :---: |
| Acceso a `/seleccionar` | ✅ Sí | ✅ Sí |
| Acceso a `/operadores` (Panel Admin) | ✅ Sí | ❌ Bloqueado |
| Crear / Aprobar operadores | ✅ Sí | ❌ No |
| Asignar colas y permisos | ✅ Sí | ❌ No |
| Ver todas las colas y turnos | ✅ Sí | ⚠️ Solo las asignadas en `colaIds` |
| Navegar a secciones del módulo | ✅ Todas | ⚠️ Solo las autorizadas en `permisos` |
