# Contrato de arquitectura — Acceso, roles y capacidades

**Proyecto:** Necto
**Ámbito:** `packages/apps/web/modules/app/src/`
**Naturaleza:** mock 100 % frontend. Sin backend, sin Cognito, sin persistencia de operadores.
**Aplica a:** módulo `pedidos`. `turnos` y `agendamiento` quedan **congelados** en el modelo legado.
**Fecha:** 2026-09-16
**Estado:** normativo — cierra el diseño antes de implementar.

> **Regla de autoridad.** Este documento es normativo. Si el código contradice el contrato,
> el contrato gana y el código es el bug. Durante la implementación no se puede "resolver"
> una ambigüedad improvisando en el código: se resuelve aquí primero.

---

## 1. Glosario normativo

Seis conceptos. El objetivo del contrato es que **nunca vuelvan a mezclarse**.

### 1.1 Sesión

| | |
|---|---|
| **Qué es** | El hecho de haber elegido módulos y un tipo de sesión. Persistida en `localStorage` bajo `necto.session`. |
| **Dónde vive** | `SessionStore` (`stores/session.store.ts`) |
| **Qué NO es** | No es autorización. No contiene permisos ni capacidades. No sabe qué puede hacer nadie. |
| **Contenido** | `modulos`, `tipoSesion`, `operadorId`, `preSimulacion` |
| **Quién la lee** | Solo `SessionStore` (para derivar el `AccessContext`) y `RequireSession` (para el flag `autenticado`) |

La sesión responde: *¿hay alguien operando, y en qué módulos?* Nada más.

### 1.2 Tipo de sesión

| | |
|---|---|
| **Qué es** | `type TipoSesion = "administrador" \| "operador"`. La **vía de entrada** que se eligió en `/seleccionar`. |
| **Qué NO es** | **No es autorización.** No decide acceso a nada. |
| **Para qué sirve** | Solo para enrutamiento de flujo: decidir a qué onboarding ir tras `/seleccionar` (`/operador/registro` vs `moduloEntryPath`) y para copia de UI. |
| **Quién lo lee** | `SeleccionarPage`, `SignInForm`. **Ningún guard, ningún componente de negocio.** |

> Reemplaza al `Rol` de sesión anterior. El renombrado es obligatorio precisamente para que
> nadie lo confunda con el `Rol` de dominio (1.3). Ver invariante **C1**.

### 1.3 Rol

| | |
|---|---|
| **Qué es** | Un paquete **nombrado y reutilizable** de capacidades. |
| **Dónde vive** | `RolesStore` (`stores/roles.store.ts`), catálogo en memoria. |
| **Qué NO es** | No es una persona. No es un tipo de sesión. No otorga acceso por sí mismo: hay que asignarlo. |
| **Se asigna vía** | `Operador.rolId` |

```ts
export interface Rol {
  id: string;
  nombre: string;              // "Supervisor de pedidos"
  descripcion: string;
  capacidades: Capacidad[];
  sistema?: boolean;           // true ⇒ no se puede eliminar desde la UI
}
```

Catálogo inicial (`ROLES_SEED`): `Administrador de tienda`, `Supervisor de pedidos`,
`Vendedor`, `Preparación`, `Personalizado`.

### 1.4 Capacidad

| | |
|---|---|
| **Qué es** | La unidad atómica de autorización. Nombra una **acción**. |
| **Formato** | `<dominio>.<accion>` — `orders.confirm`, `preparation.manage`, `team.manage` |
| **Responde** | *¿Puede hacer esto?* |
| **Qué NO es** | **No nombra una pantalla ni una ruta.** Una capacidad no es un destino. |

Las 16 capacidades del dominio de pedidos:

```
orders.read        orders.create      orders.confirm     orders.cancel
orders.edit        orders.delete
preparation.read   preparation.manage
scheduled.read     scheduled.manage
channels.read      channels.manage
settings.read      settings.manage
team.read          team.manage
```

`orders.edit` y `orders.delete` están **reservadas**: no tienen UI hoy y no se construye.

> **Prueba de olor.** Si una capacidad se puede satisfacer simplemente "estando en una
> pantalla", está mal nombrada. `orders.page` ❌ → `orders.read` ✅. Ver invariante **C4**.

### 1.5 Sección

| | |
|---|---|
| **Qué es** | Un **destino de navegación** del sidebar. Un ítem de menú con ruta. |
| **Dónde vive** | `SECCIONES: Record<Modulo, Seccion[]>` (`stores/operadores.store.ts`) |
| **Qué NO es** | **Ya no es una unidad de autorización.** |
| **Relación con capacidad** | Una sección de `pedidos` puede declarar `capacidad?: Capacidad` = la capacidad **mínima para entrar**. Nada más. |

Mapeo de `pedidos` (`Seccion.capacidad`):

| Sección | Ruta | `capacidad` (para entrar) |
|---|---|---|
| `inicio` | `/pedidos/inicio` | `orders.read` |
| `tablero` | `/pedidos` | `orders.read` |
| `crear` | `/pedidos/crear` | `orders.create` |
| `historial` | `/pedidos/historial` | `orders.read` |
| `configuracion` | `/pedidos/config` | `settings.read` |

La distinción sección/acción en un solo ejemplo: `/pedidos/config` se **entra** con
`settings.read` (sección) pero se **guarda** con `settings.manage` (acción). Entrar a una
pantalla nunca implica poder operarla. Ver invariante **C5**.

Las secciones de `turnos` y `agendamiento` **no** llevan `capacidad`: siguen con ids de
sección como hoy (ver §5).

### 1.6 Scope de datos

| | |
|---|---|
| **Qué es** | Qué **registros** puede ver un usuario: qué colas, qué profesionales. |
| **Responde** | *¿Qué datos puede ver?* |
| **Dónde vive** | Capa propia en `SessionStore`, **fuera** del `AccessContext`. |
| **Qué NO es** | No es autorización. No se mezcla con capacidades. |

```ts
export type DataScope =
  | { tipo: "sin_restriccion" }                  // admin: ve todo
  | { tipo: "restringido"; ids: string[] };      // operador: solo estos
```

> Se elimina deliberadamente el `null = todas` que hoy está duplicado en
> `colasVisiblesIds` y `profesionalesVisiblesIds` (`session.store.ts:202-229`). El caso
> "ve todo" pasa a ser un **valor explícito** del union, no un nulo ambiguo.

Solo aplica a `turnos` (colas) y `agendamiento` (profesionales). **Pedidos no tiene scope de
datos** hoy. Ver invariante **C6**.

### 1.7 Simulación ("Viendo como")

| | |
|---|---|
| **Qué es** | Herramienta **administrativa** para previsualizar la app como otra persona. |
| **Qué NO es** | **No es autenticación.** No es un login. No cambia quién eres. |
| **Dónde vive** | Se activa desde `Equipo`, no desde `/seleccionar`. |
| **Restricciones** | Solo sobre operadores `activo`. Nunca puede **ampliar** capacidades. |

`simular()` guarda un snapshot (`preSimulacion`) y `salirSimulacion()` **restaura**, no
resetea. Ver invariantes **C7** y **C8**.

> **Contraste conceptual que el código debe reflejar:**
> - Autenticación → *¿Quién eres?* (hoy: mock, se auto-declara en `/seleccionar`)
> - Simulación → *¿Cómo se ve Necto para esta persona?* (herramienta de admin)

### 1.8 AccessContext

| | |
|---|---|
| **Qué es** | El snapshot **derivado y de solo lectura** que responde *¿qué puede hacer esta sesión?* |
| **Es** | **Exclusivamente autorización.** |
| **No es** | No es un cajón de datos. No lleva nombre, ni scope, ni estado de UI. |

```ts
export interface AccessContext {
  /** ¿Hay una sesión utilizable? Sin esto no se entra al shell. */
  autenticado: boolean;

  /** Cómo se llegó a la sesión. SOLO enrutamiento de flujo. NUNCA autorización. */
  tipoSesion: TipoSesion | null;

  /** Id del operador cuando se está simulando; null en sesión directa. */
  operadorId: string | null;

  /** Rol efectivo del que se derivan las capacidades. */
  rolId: string | null;

  /** Lista efectiva de capacidades. NUNCA null. Sin configurar = []. */
  capacidades: Capacidad[];

  /** Módulos habilitados para esta sesión. */
  modulos: Modulo[];
}
```

**Deliberadamente ausentes**, y por qué:

| Campo que se descartó | Dónde vive ahora |
|---|---|
| `nombre` | Es presentación. El chip y el banner leen `operadoresStore` con `accessContext.operadorId`. |
| `esAdmin` | Eliminado. El admin es un rol normal (§6). Cualquier rama `if (esAdmin)` es un bug. |
| `secciones` | Derivado. Se calcula desde capacidades + `SECCIONES`. No se almacena. |
| `colaIds` / `profesionalIds` | Capa de **scope de datos** (§1.6), no de autorización. |

---

## 2. La tubería de autorización

```
   Sesión                        ← persistida, sin permisos
     ↓
   AccessContext                 ← derivado, SOLO autorización
     ↓
   Rol → capacidades efectivas    ← denegación gana
     ↓
   hasPermission(capacidad)       ← rutas y acciones
     ↓
   DataScope (capa aparte)        ← qué registros ve
```

Dos decisiones, dos preguntas, dos capas:

| Pregunta | Capa | API |
|---|---|---|
| ¿Puede hacer esto? | Autorización | `hasPermission(cap)` |
| ¿Qué datos puede ver? | Scope | `dataScope` / `puedeVerCola` / `puedeVerProfesional` |

**Derivación de capacidades efectivas:**

```
capacidadesEfectivas(op) =
      capacidades(Rol[op.rolId])
    ∪ op.capacidadesExtra
    \ op.capacidadesRemovidas
```

**La denegación gana siempre**: un `capacidadesRemovidas` gana sobre el rol y sobre un
`capacidadesExtra` del mismo valor. Si `rolId` falta o no existe ⇒ `[]` (fail-closed).

**Resolución del `AccessContext`:**

| Estado | `autenticado` | `rolId` | `capacidades` |
|---|---|---|---|
| Sin configurar (`modulos` vacío o `rolId` nulo) | `false` | `null` | `[]` |
| Sesión directa de administrador | `true` | `admin_tienda` | las 16 |
| Simulando operador `X` | `true` | `X.rolId` | efectivas de `X` |
| Sesión directa de `operador` | `false` | `null` | `[]` |

> La última fila es la corrección del bug H2: hoy una sesión sin configurar **se comporta
> como admin**. Ahora `autenticado: false` y `RequireSession` la manda a `/login`.
> Ver invariante **C3**.

---

## 3. Invariantes

Cada uno es verificable. Si un invariante no se puede verificar, el diseño está incompleto.

| # | Invariante | Cómo se verifica |
|---|---|---|
| **C1** | Ninguna decisión de autorización puede leer `tipoSesion`. | Grep: `tipoSesion` solo aparece en `session.store.ts`, `SeleccionarPage.tsx`, `SignInForm.tsx`. Cero apariciones en guards y componentes de negocio. |
| **C2** | Ninguna decisión de autorización puede leer `Operador.permisos`. | Grep: `permisos` solo en `operadores.store.ts` (definición), el adaptador legado de `session.store.ts` y `OperadoresPage.tsx`. Cualquier archivo nuevo que lo lea es un bug. |
| **C3** | `AccessContext.capacidades` nunca es `null`. | Test: store recién creado ⇒ `capacidades` es `[]`, `autenticado` es `false`. |
| **C4** | Ninguna capacidad puede nombrar una pantalla. | Revisión del catálogo: todo id termina en una acción. |
| **C5** | Entrar a una sección nunca implica poder operarla. | Test: `settings.read` permite `puedeVerSeccion("pedidos","configuracion")` pero `hasPermission("settings.manage") === false`. |
| **C6** | El scope de datos no vive en `AccessContext`. | Revisión de la interfaz: sin `colaIds` ni `profesionalIds`. |
| **C7** | Simular nunca amplía capacidades. | Test: para todo operador `X`, `capacidadesEfectivas(X) ⊆ capacidades(Rol[X.rolId]) ∪ X.capacidadesExtra`. |
| **C8** | `simular()` solo acepta operadores `activo`, y es reversible. | Test: `simular("inactivo")` es no-op; `simular` + `salirSimulacion` restaura el snapshot exacto. |
| **C9** | El administrador no tiene rama especial de código. | Grep: cero `if (esAdmin)` / `if (isAdmin)` en decisiones de acceso. Se resuelve por `hasPermission`. |
| **C10** | `turnos` y `agendamiento` no leen capacidades. | Grep: ningún archivo de esos módulos importa `Capacidad` ni `hasPermission`. Solo `puedeVerSeccion` / `puedeVerCola` / `puedeVerProfesional`. |

---

## 4. Fuente única de verdad y aislamiento del legado

**Fuente nueva (autoritativa para pedidos):**

```
Operador.rolId
Operador.capacidadesExtra
Operador.capacidadesRemovidas
RolesStore.roles[].capacidades
```

**Legado congelado:** `Operador.permisos: string[]`

`permisos` **no puede participar en ninguna decisión de autorización nueva**. Reglas:

1. **No se lee** desde ninguna ruta, acción, guard o componente nuevo.
2. **No se escribe** desde ninguna UI nueva. El editor nuevo escribe rol + excepciones.
3. Solo lo lee el **adaptador legado** de `puedeVerSeccion`, y **solo** para `turnos` y
   `agendamiento`.
4. Se marca `@deprecated` con su condición de retirada en el propio código.

**El adaptador** (puente explícito, no una segunda fuente de verdad):

```ts
/** Compatibilidad temporal con turnos/agendamiento. @deprecated — ver contrato §4. */
puedeVerSeccion(modulo: Modulo, seccionId: string): boolean {
  if (modulo !== "pedidos") {
    // Legado: lista blanca de ids de sección. Solo estos dos módulos.
    return this.accessContext.capacidades.length > 0
      ? (this.operadorActual?.permisos ?? []).includes(seccionId)
      : /* admin */ true;
  }
  // Nuevo: capacidad declarada por la sección.
  const cap = SECCIONES.pedidos.find((s) => s.id === seccionId)?.capacidad;
  return cap ? this.hasPermission(cap) : false;
}
```

`puedeVer(seccionId)` se conserva como adaptador de firma hacia `puedeVerSeccion`, para que
`SeccionGuard` y `AppSidebar` sigan compilando.

**Condición de retirada de `permisos`:** se elimina cuando `turnos` y `agendamiento` migren
a capacidades. Esa migración está **fuera del alcance** de este contrato.

---

## 5. Frontera con el legado

| Módulo | Modelo de autorización | Entidades |
|---|---|---|
| `pedidos` | **Capacidades** (nuevo) | `rolId` + excepciones → `hasPermission` |
| `turnos` | **Secciones** (legado, congelado) | `permisos: string[]` → `puedeVerSeccion` |
| `agendamiento` | **Secciones** (legado, congelado) | `permisos: string[]` → `puedeVerSeccion` |

`turnos` y `agendamiento` **no se tocan** en esta fase. Sus 6 consumidores de
`puedeVerCola`/`puedeVerProfesional` (`TurnosPage`, `ColasPage`, `RecepcionPage`,
`QueuesOverview`, `AgendaPage`, `CalendarioPage`, `CrearCitaPage`, `CitaDetallePage`) deben
comportarse **exactamente igual que antes**. Eso es criterio de aceptación, no una aspiración.

> Los ids de sección **no son únicos entre módulos** (`inicio` y `crear` se repiten). Hoy es
> seguro solo porque un operador simulado tiene un único módulo. Por eso la firma canónica es
> `puedeVerSeccion(modulo, seccionId)` y no `puedeVer(seccionId)`.

---

## 6. El administrador es un rol normal

**Regla:** no existe una rama especial para el administrador. Todos siguen el mismo camino:

```
Usuario → Rol → Capacidades → hasPermission
```

`Administrador de tienda` es una entrada más de `ROLES_SEED`, con las 16 capacidades y
`sistema: true`. La sesión directa de administrador se resuelve asignando
`rolId = "admin_tienda"` al configurar la sesión.

Consecuencias que el código debe respetar:

- **No existe `esAdmin`** en `AccessContext`.
- **No existe** `if (esAdmin) return true` en ningún guard ni componente.
- El ítem "Equipo" del sidebar se muestra con `hasPermission("team.manage")`, no con `isAdmin`.
- El ítem "Operadores" de `turnos`/`agendamiento` (legado) conserva su gate actual hasta que
  esos módulos migren.

Que en el mock el administrador tenga acceso total es una **consecuencia de su rol**, no una
excepción del dominio. Así, cuando Necto crezca y existan varios roles administrativos
(Administrador de tienda, Gerente de zona, Auditor), el modelo no cambia.

---

## 7. Tabla de decisión: ¿dónde va esta regla nueva?

| Si la regla dice… | Va en… | Ejemplo |
|---|---|---|
| "puede hacer X acción" | **Capacidad** | `orders.confirm` |
| "puede ver los registros de Y" | **Scope de datos** | `puedeVerCola("2")` |
| "puede llegar a la pantalla Z" | **`Seccion.capacidad`** | `configuracion → settings.read` |
| "este grupo de personas comparte estos permisos" | **Rol** | `Supervisor de pedidos` |
| "esta persona concreta, además / excepto" | **`capacidadesExtra` / `capacidadesRemovidas`** | +`channels.manage` |
| "hay que elegir módulo/rol antes de entrar" | **Sesión** | `modulos`, `tipoSesion` |
| "quiero ver cómo queda para otra persona" | **Simulación** | "Viendo como" |

---

## 8. Convenciones de nombres

| Concepto | Nombre canónico | Prohibido |
|---|---|---|
| Capacidad | `orders.confirm` | `pedidos.confirmar`, `ordersPage` |
| Tipo de sesión | `TipoSesion` | `Rol` (colisiona con el rol de dominio) |
| Rol de dominio | `Rol`, `rolesStore` | `RolSesion`, `perfil` |
| Comprobación de acción | `hasPermission(cap)` | `puede()`, `tienePermiso()` |
| Comprobación de pantalla | `puedeVerSeccion(modulo, id)` | `puedeVer(id)` en código nuevo |
| Scope de datos | `dataScope`, `DataScope` | `permisosDatos`, `accesoDatos` |
| Pantalla de equipo | `Equipo`, `/pedidos/equipo` | `Operadores`, "Administración de perfiles" |
| Simulación | "Viendo como" | "Simular operador", "Login de operador" |

---

## 9. Fronteras del contrato (fuera de alcance)

Explícitamente **no** cubierto, y por tanto no se implementa:

- Backend, API, Cognito o cualquier validación de servidor.
- Persistencia de operadores/roles en `localStorage` (siguen en memoria).
- La entidad `Tienda` y el multi-tenant.
- Invitaciones por email, tokens o notificaciones.
- Migración de `turnos` y `agendamiento` a capacidades.
- `orders.edit` y `orders.delete`: reservadas, sin UI.

> **Limitación que debe quedar escrita en el código:** al ser un mock sin autenticación, el
> administrador se auto-declara en `/seleccionar`. Los guards dan **coherencia y UX**, no
> seguridad real. Eso solo llega con auth de verdad, que está fuera de este contrato.
