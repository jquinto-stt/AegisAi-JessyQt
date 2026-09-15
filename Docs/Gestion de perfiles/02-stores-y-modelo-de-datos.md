# Stores y Modelo de Datos de Perfiles

Este documento detalla los estados de Zustand utilizados para la persistencia, consulta y mutación de perfiles, permisos y sesión.

---

## 1. Store de Sesión (`session.store.ts`)

*Ubicación:* `packages/apps/web/modules/app/src/stores/session.store.ts`

Controla la identidad activa en el cliente y evalúa dinámicamente qué puede o no puede ver el usuario. Se almacena en `localStorage` bajo la clave `necto.session`.

### Definición de Estado (`SessionState`)
```typescript
interface SessionState {
  modulos: ('turnos' | 'agendamiento')[];
  rol: 'administrador' | 'operador' | null;
  operadorSimuladoId: string | null;

  // Acciones
  iniciarSesion: (modulos: ('turnos' | 'agendamiento')[], rol: 'administrador' | 'operador', operadorSimuladoId?: string | null) => void;
  cerrarSesion: () => void;
  cambiarModulos: (modulos: ('turnos' | 'agendamiento')[]) => void;

  // Selectores de conveniencia
  isAdmin: () => boolean;
  isSimulando: () => boolean;
  operadorActual: () => Operador | null;
  permisosActuales: () => string[] | null;
  puedeVer: (seccionId: string) => boolean;
  colasVisiblesIds: () => string[] | null;
  puedeVerCola: (colaId: string) => boolean;
}
```

### Reglas de Evaluación en `puedeVer(seccionId)`:
1. Si `rol === 'administrador'`: retorna siempre `true`.
2. Si `rol === 'operador'`:
   - Obtiene el operador mediante `operadoresStore.obtenerPorId(operadorSimuladoId)`.
   - Retorna `operador.permisos.includes(seccionId)`.

---

## 2. Store de Operadores (`operadores.store.ts`)

*Ubicación:* `packages/apps/web/modules/app/src/stores/operadores.store.ts`

Gestiona el catálogo de operadores, estados de aprobación y asignación de permisos/recursos.

### Modelo de Datos del Operador
```typescript
interface Operador {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  estado: 'activo' | 'pendiente' | 'inactivo';
  modulo: 'turnos' | 'agendamiento';
  permisos: string[];         // Identificadores de secciones habilitadas
  colaIds: string[];          // IDs de colas asignadas (módulo Turnos)
  profesionalIds: string[];   // IDs de profesionales asignados (módulo Agendamiento)
  fechaCreacion: string;
}
```

### Catálogo de Secciones (`SECCIONES`)
El store define las secciones disponibles por módulo contra las cuales se validan los permisos:

```typescript
export const SECCIONES = {
  turnos: [
    { id: 'inicio',     nombre: 'Inicio / Resumen' },
    { id: 'turnos',     nombre: 'Atención de Turnos' },
    { id: 'recepcion',  nombre: 'Recepción' },
    { id: 'colas',      nombre: 'Gestión de Colas' },
    { id: 'encuestas',  nombre: 'Encuestas' },
  ],
  agendamiento: [
    { id: 'profesionales', nombre: 'Profesionales' },
    { id: 'agenda',        nombre: 'Agenda' },
    { id: 'calendario',    nombre: 'Calendario' },
    { id: 'crear',         nombre: 'Nueva Cita' },
    { id: 'analitica',     nombre: 'Analítica' },
  ],
} as const;
```

### Métodos del Store
- `crear(datos)`: Registra un nuevo operador (por defecto en estado `'pendiente'`).
- `aprobar(id)`: Cambia el estado a `'activo'` otorgando acceso al sistema.
- `rechazar(id)` o `eliminar(id)`: Da de baja al operador.
- `actualizarPermisos(id, permisos, colaIds, profesionalIds)`: Asigna o revoca accesos específicos.
