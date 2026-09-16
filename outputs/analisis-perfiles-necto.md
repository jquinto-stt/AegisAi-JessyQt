# Análisis de la lógica de perfiles — NECTO (módulo Pedidos)

**Proyecto analizado:** `Repo-prueba-master/Repo-prueba-master/`
**Capa analizada:** `packages/apps/web/modules/app/src/` (frontend React 18 + Vite + TypeScript + MobX)
**Fecha:** 2026-09-16

---

## 1. Resumen ejecutivo

La "lógica de perfiles" de este proyecto **no es autenticación**: es un modelo de
**rol + módulo + permisos por sección** que vive **100 % en el frontend** y se persiste
en `localStorage`. No existe ninguna validación en el backend.

Tres piezas lo componen:

| Pieza | Archivo | Responsabilidad |
|---|---|---|
| Sesión | `stores/session.store.ts` | Qué módulos y qué rol tiene el usuario activo |
| Perfil de operador | `stores/operadores.store.ts` | El "perfil": datos + estado + permisos por sección |
| Guard de sección | `app/SeccionGuard.tsx` | Debería bloquear rutas sin permiso (hoy no se usa) |

La idea de diseño es correcta y bastante limpia (un `puedeVer(seccionId)` central, un
catálogo único de secciones, un modo "simulación" para previsualizar permisos). El
problema no es el modelo, sino que **la aplicación del modelo está a medias**: el guard
de rutas existe pero está desconectado y la sesión nunca se valida.

---

## 2. El modelo de datos

### 2.1 Sesión (`session.store.ts`)

```ts
export type Modulo = "pedidos";                    // un único módulo posible
export type Rol = "administrador" | "operador";

// Persistido en localStorage con la clave: necto_session_v1
interface PersistedSession {
  modulos: Modulo[];
  rol: Rol | null;
  operadorSimuladoId: string | null;
}
```

Estado observable: `modulos`, `rol`, `operadorSimuladoId`.
Se carga de `localStorage` en el constructor y se reescribe en cada mutación (`persist()`).

### 2.2 Perfil del operador (`operadores.store.ts`)

```ts
export type OperadorEstado = "activo" | "pendiente" | "inactivo";

export interface Operador {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  estado: OperadorEstado;
  modulo: Modulo;
  permisos: string[];      // ← los ids de SECCIONES
}
```

El catálogo de secciones es la fuente de verdad de los permisos:

```ts
export const SECCIONES: Record<Modulo, Seccion[]> = {
  pedidos: [
    { id: "inicio",        label: "Inicio",         path: "/pedidos/inicio" },
    { id: "tablero",       label: "Tablero",        path: "/pedidos" },
    { id: "crear",         label: "Crear pedido",   path: "/pedidos/crear" },
    { id: "historial",     label: "Historial",      path: "/pedidos/historial" },
    { id: "configuracion", label: "Configuración",  path: "/pedidos/config" },
  ],
};
```

**Importante:** este store es **memoria pura, sin persistencia**. Solo se siembra con
3 operadores mock (`SEED`: Camila Ortiz, Mateo Vargas, Daniela Suárez). Todo lo que se
cree, apruebe o cambie de permisos **se pierde al recargar la página**.

### 2.3 Los dos roles

| Rol | Cómo se representa | Cómo se resuelven sus permisos |
|---|---|---|
| `administrador` | `rol === "administrador"` y `operadorSimuladoId === null` | Sin lista: `permisosActuales` devuelve `null` → **acceso total** |
| `operador` | `rol === "operador"` + `operadorSimuladoId` apuntando a un operador | Los `permisos: string[]` de ese operador |

El rol "administrador" **no tiene una lista de permisos**; se representa por *ausencia*
de lista. Es el punto más elegante y, a la vez, el más frágil del diseño (ver §5).

---

## 3. Cómo se resuelve un permiso

Toda la decisión pasa por tres miembros de `SessionStore`:

```ts
get isSimulando() {
  return this.operadorSimuladoId !== null;
}

get permisosActuales(): string[] | null {
  if (this.isSimulando) return this.operadorSimulado?.permisos ?? [];
  return null;                       // ← null = administrador = todo permitido
}

puedeVer(seccionId: string) {
  const permisos = this.permisosActuales;
  if (permisos === null) return true;         // admin: pasa siempre
  return permisos.includes(seccionId);        // operador: lista blanca
}
```

Regla mental: **`null` = administrador = permitido; `[]` = operador sin permisos = denegado.**

El operador tiene además una ruta de aterrizaje propia (`homePathActual`), que es la
primera sección de su lista de permisos, en orden de prioridad fijo:

```
inicio → /pedidos/inicio
tablero → /pedidos
crear → /pedidos/crear
historial → /pedidos/historial
configuracion → /pedidos/config
```

---

## 4. El flujo completo

```
/login  ──►  /seleccionar (paso 1: módulo)  ──►  /seleccionar (paso 2: rol)
                                                          │
                              ┌───────────────────────────┴───────────────────────────┐
                              ▼                                                       ▼
                     rol = administrador                                       rol = operador
                              │                                                       │
                  sessionStore.configurar()                            sessionStore.configurar()
                              │                                                       │
                              ▼                                        ┌──────────────┴──────────────┐
                     /pedidos/inicio                                   ▼                             ▼
                                                              /operador/registro            /operador/login
                                                              (solicitud mock,              ("Simular": elige
                                                               no persiste nada)             un operador activo)
                                                                      │                             │
                                                            sessionStore.reset()          sessionStore.simular(id)
                                                                      │                             │
                                                                      ▼                             ▼
                                                                   /login                 homePathActual
                                                                                          (con permisos limitados)
```

### Detalle por pantalla

1. **`/login` — `SignInForm.tsx`**
   El formulario **no autentica nada**. `handleSubmit` hace literalmente:
   ```ts
   // TODO: integrate with Cognito auth
   navigate("/seleccionar");
   ```
   No lee email ni contraseña. Los campos no están conectados a estado.

2. **`/seleccionar` — `SeleccionarPage.tsx`** (asistente de 2 pasos)
   - **Paso 1 – módulo:** una sola tarjeta seleccionable ("Pedidos"). `toggleModulo`
     permite desmarcarla, y "Continuar" se deshabilita si `modulos.length === 0`.
   - **Paso 2 – rol:** dos tarjetas, `administrador` u `operador`.
   - Al confirmar llama `sessionStore.configurar(modulos, rol)`:
     - Si `rol === "operador"` → `navigate("/operador/registro")`
     - Si `rol === "administrador"` → `navigate(sessionStore.moduloEntryPath)` → `/pedidos/inicio`
   - Si el rol elegido es `operador`, aparece un botón extra **"Simular"** que va a `/operador/login`.

3. **`/operador/registro` — `OperadorRegistroPage.tsx`**
   Formulario de solicitud (nombre, email, teléfono, email del administrador a notificar,
   nota opcional). Al enviar **solo cambia a un estado de éxito visual**:
   ```ts
   const enviar = () => {
     if (!requeridosCompletos) return;
     // Mock: no hay backend. Solo cambiamos al estado de éxito.
     setEnviado(true);
   };
   ```
   No crea un operador, no notifica a nadie. "Volver al inicio" ejecuta
   `sessionStore.reset()` y va a `/login`.

4. **`/operador/login` — `OperadorLoginPage.tsx`**
   No es un login: es un selector. Lista solo operadores con `estado === "activo"` y al
   entrar ejecuta:
   ```ts
   sessionStore.simular(elegido.id);
   navigate(sessionStore.homePathActual);
   ```
   `simular()` hace tres cosas: fija `operadorSimuladoId`, **fuerza `rol = "operador"`**
   y **fuerza `modulos = ["pedidos"]`**.

5. **`/pedidos/*` — `AppShell` + `AppSidebar`**
   El sidebar filtra cada `MenuItem` con `sessionStore.puedeVer(seccionId)` y muestra
   "Operadores" solo si `sessionStore.isAdmin`. Es el **único punto donde los permisos
   se aplican de verdad**.

6. **`InicioPage`** usa la simulación solo para cosmética: si hay un operador simulado
   del módulo pedidos, el encabezado dice `Hola, {nombre}` en vez de "Resumen".

7. **Panel de administración — `OperadoresPage.tsx`** (`/pedidos/operadores`)
   - Tabla de operadores del módulo con badge de estado y contador `X de N secciones`.
   - Botón **"Perfil / Permisos"** → modal con un `Switch` por sección que llama
     `operadoresStore.setPermisos(id, nuevos)`.
   - Acciones: **Aprobar** (solo si `pendiente`), **Desactivar/Activar**, **Eliminar**.
   - **Esta pantalla no está protegida por ningún guard**: se llega escribiendo la URL.
     Solo el enlace del sidebar está oculto.

---

## 5. Hallazgos y riesgos

### 🔴 Alto

**H1 — `SeccionGuard` está desconectado (código muerto).**
El componente está bien escrito y documentado, pero **no se importa en ninguna parte**
(verificado con búsqueda en todo `src/`; tampoco se re-exporta desde `app/index.tsx`).
`App.tsx` registra las rutas de pedidos desnudas, sin envolverlas:

```tsx
<Route path="/pedidos/config" element={<ConfigPage />} />   // sin guard
```

Consecuencia: **cualquiera entra a `/pedidos/config` o `/pedidos/operadores`
escribiendo la URL**, incluso simulando un operador sin esos permisos. Los permisos son
solo un filtro visual del menú lateral.

**H2 — No existe guard de sesión.**
Ninguna ruta comprueba `sessionStore.isReady` (`modulos.length > 0 && rol !== null`).
Con el almacenamiento vacío, `permisosActuales` es `null` → `puedeVer` devuelve `true`
→ **la app se comporta como administrador sin haber pasado por `/seleccionar`**.
`isReady` está definido pero **nunca se usa**.

**H3 — Desincronización sesión ↔ operadores (bug real y reproducible).**
La sesión se persiste en `localStorage`, pero `operadoresStore` es memoria pura. Al
recargar la página:

1. `sessionStore` restaura `operadorSimuladoId = "d2"`.
2. `operadoresStore` se reinicia al `SEED`… y si el id era de un operador **creado en
   esa sesión** (p. ej. `d1758...`), ya no existe.
3. `operadorSimulado` → `null`; `isSimulando` sigue siendo `true`.
4. `permisosActuales` → `this.operadorSimulado?.permisos ?? []` → **`[]`**.
5. `puedeVer(...)` → `false` para todas las secciones.

Resultado: **el sidebar queda completamente vacío** y el usuario aterriza en
`/pedidos/inicio` (porque `homePathActual` cae al `moduloEntryPath` cuando `op` es
`null`). Lo mismo ocurre si un administrador pulsa **"Eliminar operador"** sobre el
operador que está simulando: `eliminar()` no limpia `operadorSimuladoId`.

### 🟡 Medio

**H4 — No hay forma de salir de la simulación.**
`salirSimulacion()` existe y está bien pensada (limpia `operadorSimuladoId` y restaura
`rol = "administrador"`), pero **no se llama desde ningún componente**. Un operador
simulado no tiene botón para volver a la vista de administrador; solo puede recargar y
seguir atrapado, o ir a `/seleccionar` a mano.

**H5 — "Cerrar sesión" no cierra la sesión.**
En `AppSidebar`:
```ts
const handleLogout = () => {
  navigate("/login");
};
```
No llama a `reset()`. La sesión sigue viva en `localStorage`; volver atrás restaura todo.
`reset()` solo se invoca desde `OperadorRegistroPage`.

**H6 — `simular()` y `salirSimulacion()` pisan el estado previo.**
`simular()` fuerza `rol = "operador"` y `modulos = ["pedidos"]` sin guardar un snapshot.
`salirSimulacion()` asume que antes eras administrador y fuerza `rol = "administrador"`.
El round-trip no es reversible si el estado de partida era distinto.

**H7 — El rol "operador" elegido en `/seleccionar` no da acceso a nada.**
Elegir "Operador" en el paso 2 lleva a una solicitud mock que no persiste nada. El
operador real solo entra por el botón "Simular". Es un callejón sin salida funcional
(aunque intencional como demo).

### 🟢 Bajo / limpieza

**H8 — API muerta en `session.store.ts`:** `hasModulo()`, `moduloPrincipal`, `isReady` y
`setRol()` están definidos y **nunca se usan**. (`setRol` en `SeleccionarPage` es el
setter de un `useState` local, no el del store.)

**H9 — `modulos` es un array con un solo valor posible.** `Modulo = "pedidos"` es un
tipo de un solo miembro; `configurar(modulos, rol)` acepta cualquier array sin validarlo
contra `SECCIONES`. El array es preparación para multi-módulo que aún no existe.

**H10 — `UserDropdown.tsx` es plantilla sin conectar.** Muestra "Musharof Chowdhury /
randomuser@pimjo.com" hardcodeados, enlaces a `/profile` y `/signin` (rutas que no
existen) y **no se renderiza** en el shell actual (`AppShell` usa sus propios botones).
Es un residuo del starter.

**H11 — El backend no conoce los perfiles.** La infraestructura sí tiene Cognito y JWT
(`cloud/core/infra/factories/cognito.ts`, `services/api/.../api-gateway.ts`,
`jwtAuth` aplicado a `/encuestas`), pero ninguna ruta de pedidos valida rol ni
permisos. El único uso de claims es `event.requestContext.authorizer.jwt.claims.sub`
en `infra/functions/encuesta.ts`.

**H12 — El README no describe este proyecto.** `README.md` documenta "NECTO — Sistema de
Turnos" con rutas `/turnos`, `/colas`, `/agendamiento`, `/display`, `/s/:token` que **no
existen** en `src/`. El código real es el módulo de **Pedidos** por WhatsApp. Además
referencia `docs/correr-local.md` y `docs/frontend-handoff-backend.md`, y **la carpeta
`docs/` no existe**.

---

## 6. Recomendaciones (por orden de impacto)

1. **Conectar `SeccionGuard`** en `App.tsx`, envolviendo cada `Route` de sección:
   ```tsx
   <Route path="/pedidos/config" element={
     <SeccionGuard seccion="configuracion"><ConfigPage /></SeccionGuard>
   } />
   ```
   Y añadir un guard equivalente para `/pedidos/operadores` basado en `isAdmin`.

2. **Añadir un guard de sesión** (componente `<RequireSession>` o layout) que redirija a
   `/seleccionar` cuando `!sessionStore.isReady`. Eso elimina el "admin por defecto" de H2.

3. **Hacer coherente la vida de `operadorSimuladoId`:**
   - En `eliminar(id)` y `toggleActivo(id)`: si el id afectado es el simulado, llamar a
     `salirSimulacion()`.
   - En `permisosActuales`: si `isSimulando && !operadorSimulado`, degradar a
     `null` (admin) o forzar `salirSimulacion()`, en vez de devolver `[]`.
   - A medio plazo: persistir los operadores o traerlos del backend.

4. **Exponer la salida de la simulación**: un banner persistente en el shell del tipo
   "Estás viendo la app como {nombre} — Salir", que llame a `salirSimulacion()`.

5. **Que "Cerrar sesión" llame a `sessionStore.reset()`** antes de navegar.

6. **Guardar un snapshot del estado previo** en `simular()` para que `salirSimulacion()`
   restaure el rol y los módulos reales, no un `"administrador"` asumido.

7. **Limpiar:** eliminar la API muerta (H8), `UserDropdown.tsx` si no se va a usar (H10),
   y **reescribir el README** para que describa Pedidos y no Turnos (H12).

8. **Cuando haya backend real:** mover la decisión de permisos al servidor. El modelo
   actual (`rol + permisos[]` por sección) se mapea limpiamente a grupos de Cognito o a un
   atributo `custom:permisos` en el JWT, y las rutas de API pueden validarlo con el
   `jwtAuth` que ya existe en la infraestructura.

---

## 7. Archivos clave

| Ruta (relativa a `packages/apps/web/modules/app/src/`) | Rol en la lógica de perfiles |
|---|---|
| `stores/session.store.ts` | Núcleo: rol, módulos, simulación, `puedeVer` |
| `stores/operadores.store.ts` | Perfil del operador, `SECCIONES`, CRUD mock |
| `stores/index.ts` | Re-exporta `sessionStore`, `operadoresStore`, `SECCIONES` |
| `app/SeccionGuard.tsx` | Guard por sección — **definido, sin usar** |
| `app/App.tsx` | Rutas — **sin ningún guard** |
| `app/AppSidebar.tsx` | Único punto de aplicación real de `puedeVer` |
| `pages/seleccionar/SeleccionarPage.tsx` | Asistente módulo → rol |
| `pages/operador/OperadorLoginPage.tsx` | Selector de operador → `simular()` |
| `pages/operador/OperadorRegistroPage.tsx` | Solicitud mock → `reset()` |
| `pages/operadores/OperadoresPage.tsx` | Admin: crear/aprobar/permisos/eliminar |
| `pages/auth/sign-in/SignInForm.tsx` | Login falso → `/seleccionar` |
| `pages/pedidos/InicioPage.tsx` | Saludo personalizado en simulación |
