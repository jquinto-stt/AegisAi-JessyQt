# Guardianes y Seguridad de Rutas

Este documento explica cómo el sistema intercepta las rutas y hace cumplir las políticas de acceso del perfil activo.

---

## 1. El Guardián: `SeccionGuard.tsx`

*Ubicación:* `packages/apps/web/modules/app/src/app/SeccionGuard.tsx`

`SeccionGuard` es un componente contenedor (Higher-Order Component / Wrapper) que evalúa si la sesión actual tiene autorización para ver una sección específica antes de renderizarla.

### Implementación:
```tsx
import React from 'react';
import { useSessionStore } from '../stores/session.store';

interface SeccionGuardProps {
  seccion: string;
  children: React.ReactNode;
}

export const SeccionGuard: React.FC<SeccionGuardProps> = ({ seccion, children }) => {
  const puedeVer = useSessionStore(state => state.puedeVer);

  if (!puedeVer(seccion)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          Acceso no autorizado
        </h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          Tu perfil de operador no cuenta con los permisos requeridos para acceder a esta sección.
          Contacta al administrador del sistema si necesitas habilitar esta función.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
```

---

## 2. Protección de Rutas en `App.tsx`

*Ubicación:* `packages/apps/web/modules/app/src/app/App.tsx`

Todas las vistas internas del sistema quedan aseguradas envolviendo el componente de página con el identificador de sección correspondiente:

```tsx
// Rutas del módulo Turnos protegidas por SeccionGuard
<Route path="/turnos" element={
  <SeccionGuard seccion="inicio">
    <TurnosInicioPage />
  </SeccionGuard>
} />

<Route path="/turnos/atencion" element={
  <SeccionGuard seccion="turnos">
    <TurnosPage />
  </SeccionGuard>
} />

<Route path="/turnos/recepcion" element={
  <SeccionGuard seccion="recepcion">
    <RecepcionPage />
  </SeccionGuard>
} />

<Route path="/turnos/colas" element={
  <SeccionGuard seccion="colas">
    <ColasPage />
  </SeccionGuard>
} />
```

---

## 3. Ocultamiento en la Barra Lateral (Sidebar)

Además de proteger la ruta con `SeccionGuard`, los componentes de navegación (Sidebar y Menús) consumen directamente `sessionStore.puedeVer(seccionId)`. 

Si el operador no tiene el permiso, el enlace ni siquiera se muestra en la interfaz, evitando frustración y clics innecesarios en secciones bloqueadas.
