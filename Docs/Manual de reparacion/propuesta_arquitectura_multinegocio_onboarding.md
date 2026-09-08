# Propuesta de Arquitectura Multi-Negocio & Onboarding Guiado
**Plataforma Necto — Sistema Operativo de Negocios**

---

## 1. Visión y Diagnóstico

### El Problema Actual
Actualmente, la aplicación monta directamente los módulos de restaurante (*Pedidos, Cocina KDS, Catálogo gastronómico, Escandallos de insumos*) como si la plataforma entera fuera un único restaurante pre-configurado.

### La Solución Arquitectónica
**Necto es una plataforma SaaS multi-negocio (Multi-Tenant).**
El restaurante gastronómico / dark kitchen es solo **un tipo de vertical de negocio** (`businessType: 'restaurant_virtual'`).

La aplicación debe contar con una **Capa de Abstracción Superior (Workspace / Organization Layer)** que permita:
1. Tener una cuenta de usuario central con múltiples negocios.
2. Crear un nuevo negocio mediante un **Onboarding Guiado paso a paso**.
3. Seleccionar el tipo de negocio (*Restaurante Virtual*, *Retail / Tienda física*, *Servicios*, etc.).
4. Adaptar dinámicamente los módulos, vocabulario y flujos de trabajo según la vertical activa.

```
┌─────────────────────────────────────────────────────────────┐
│                    NECTO CORE (PLATAFORMA)                  │
│   Auth • Cuenta de Usuario • Facturación • Multi-Negocio    │
└──────────────────────────────┬──────────────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
   ┌───────────────────────┐       ┌───────────────────────┐
   │  RESTAURANTE VIRTUAL  │       │    RETAIL / TIENDA    │
   │    (Enfoque Actual)   │       │   (Futuras Vertices)  │
   │  • Pedidos en Vivo    │       │  • Ventas Mostrador   │
   │  • KDS Cocina Táctil  │       │  • Stock de Prendas   │
   │  • Escandallos / Recetas│     │  • Código de Barras   │
   │  • Despacho / Delivery│       │  • Envíos Courier     │
   └───────────────────────┘       └───────────────────────┘
```

---

## 2. Jerarquía de Abstracción de Datos

```typescript
// Nivel 0: Cuenta de Usuario
interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  organizations: OrganizationMembership[];
}

// Nivel 1: Organización / Tenant (Empresa matriz o dueño)
interface Organization {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  businesses: BusinessInstance[];
}

// Nivel 2: Instancia de Negocio (Sucursal o Marca)
export type BusinessType = 
  | 'restaurant_virtual'  // Gastro, Dark Kitchen, Pizzería, Hamburguesería
  | 'retail_store'        // Ropa, Accesorios, Ferretería
  | 'services'            // Citas, Barberías, Spas
  | 'ecommerce_direct';   // Venta exclusiva por internet

interface BusinessInstance {
  id: string;
  name: string;               // Ej: "Burger House - Sede Norte"
  slug: string;               // necto.app/burger-house-norte
  businessType: BusinessType; // 'restaurant_virtual'
  logoUrl?: string;
  currency: 'COP' | 'USD' | 'MXN' | 'ARS' | 'EUR';
  timezone: string;
  status: 'onboarding' | 'active' | 'paused';
  config: RestaurantConfig | RetailConfig | Record<string, any>;
}

// Configuración específica para Restaurante Virtual
interface RestaurantConfig {
  channels: {
    whatsappIA: { enabled: boolean; phoneNumber?: string; autoConfirm: boolean };
    webStore: { enabled: boolean; subdomain: string };
    posPresencial: { enabled: boolean; printAuto: boolean };
  };
  kitchen: {
    kdsEnabled: boolean;
    prepStations: Array<{ id: string; name: string }>; // Ej: Fogón, Armado, Empaque
    standardBufferMinutes: number;                      // Ej: 20 min
    rushBufferMinutes: number;                          // Ej: +10 min
  };
  serviceTypes: Array<'delivery' | 'pickup' | 'dine_in'>;
}
```

---

## 3. Selector de Negocios & Hub Multi-Local (Workspace Hub)

En la barra superior o cabecera del menú lateral, el usuario dispondrá de un centro de mando con tres capacidades clave:

```
┌──────────────────────────────────────────────┐
│ [🍔] Burger House - Sede Norte           ▾   │
├──────────────────────────────────────────────┤
│ 🏢 Vista Franquicia / Resumen Global         │
├──────────────────────────────────────────────┤
│ Negocios activos (RBAC):                     │
│   ✓ 🍔 Burger House - Sede Norte (Actual)    │
│     🍕 Pizza Necto - Delivery                │
│ ───────────────────────────────────────────  │
│   ⌨️  Buscar o cambiar local (Ctrl + K)       │
│   ➕ Crear nuevo negocio                      │
│   ⚙️ Ajustes de la organización               │
└──────────────────────────────────────────────┘
```

### Funcionalidades del Hub:
1. **Vista Global Consolidada (Cross-Business Dashboard)**:
   - Panel para dueños/socios con métricas en tiempo real de todas las marcas y sucursales (ventas totales agregadas del día, pedidos activos en curso en todas las cocinas y alertas de stock crítico).
2. **Control de Acceso Granular (RBAC por Negocio)**:
   - El dueño/administrador accede y conmuta entre todas las sucursales.
   - El personal de salón, cocina o caja solo tiene visibilidad sobre su local asignado, previniendo errores operativos.
3. **Command Palette (`Cmd/Ctrl + K`)**:
   - Navegación rápida por teclado para alternar entre marcas/sucursales o saltar a comandas específicas en menos de 1 segundo.

---

## 4. Onboarding Ultra-Liviano + Checklist Progresivo

Para garantizar un **Time-to-Value < 60 segundos**, el onboarding se divide en dos fases: un wizard inicial mínimo y un checklist asíncrono no bloqueante.

```
 [1. Datos Esenciales] ──> [2. Selección Vertical] ──> ¡Workspace Listo!
                                                             │
                                                             ▼
                                             [📋 Checklist Progresivo 60%]
                                             • Conectar WhatsApp
                                             • Configurar KDS / Impresora
                                             • Cargar primeros platos
```

### Fase 1: Creación Rápida (Wizard de 2 Pasos)
* **Paso 1: Identidad Básica**: Nombre comercial (Ej: *La Birra Bar Chapinero*), País & Moneda (*COP $*).
* **Paso 2: Vertical de Negocio**: Selección de plantilla base (*Restaurante Virtual / Dark Kitchen*, *Retail*, *Servicios*).
* Al completar estos dos datos, el usuario entra **inmediatamente** a operar en el tablero.

### Fase 2: Checklist Progresivo Asíncrono (Post-Onboarding)
Un widget discreto y colapsable en la barra lateral o cabecera del workspace:
* **Indicador de salud del setup**: *"Tu restaurante está al 60% configurado"*.
* **Tareas pendientes con acción directa**:
  1. 📱 *Conectar WhatsApp con Asistente IA (Habilitar recepción automática)*.
  2. 🍲 *Cargar primeros 3 productos o categorías en la carta*.
  3. 🍳 *Configurar pantalla de cocina (KDS) o formato de comanda térmica*.
  4. 👥 *Invitar al equipo (Asignar cajeros y cocineros)*.
* El usuario puede descartar o completar cada paso a su propio ritmo sin interrumpir la toma de pedidos.

---

## 5. Arquitectura de Implementación en React

### A. Contexto Global de Workspace (`BusinessContext.tsx`)
```tsx
export interface BusinessInstance {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  currency: string;
  timezone: string;
  status: 'active' | 'setup_pending' | 'paused';
  setupProgress: {
    whatsappConnected: boolean;
    menuConfigured: boolean;
    kitchenConfigured: boolean;
    teamInvited: boolean;
  };
  config: RestaurantConfig | Record<string, any>;
}

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businesses, setBusinesses] = useState<BusinessInstance[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | 'GLOBAL_OVERVIEW' | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  const activeBusiness = activeBusinessId === 'GLOBAL_OVERVIEW' 
    ? null 
    : businesses.find(b => b.id === activeBusinessId) || businesses[0];

  return (
    <BusinessContext.Provider value={{ 
      activeBusiness, 
      activeBusinessId,
      businesses, 
      setActiveBusinessId, 
      isCommandPaletteOpen,
      setIsCommandPaletteOpen 
    }}>
      {children}
    </BusinessContext.Provider>
  );
};
```

### B. Inyección Dinámica del Módulo Especializado
`NectoApp.tsx` evalúa si se visualiza el resumen global o un negocio individual:
```tsx
function MainWorkspace() {
  const { activeBusiness, activeBusinessId } = useBusiness();

  if (activeBusinessId === 'GLOBAL_OVERVIEW') {
    return <GlobalFranchiseOverview />; // Dashboard consolidado multi-negocio
  }

  switch (activeBusiness?.businessType) {
    case 'restaurant_virtual':
      return <PedidosModule />; // Tablero, KDS, Carta, Insumos + Checklist progresivo
    case 'retail_store':
      return <RetailModule />;
    default:
      return <PedidosModule />;
  }
}
```

---

## 6. Plan de Ejecución

1. **Fase 1: Capa de Contexto Multi-Negocio & Command Palette**
   - `BusinessContext` con estado para negocios, negocio activo y modo `GLOBAL_OVERVIEW`.
   - Componente `BusinessSwitcher` y escucha global de atajo `Ctrl/Cmd + K`.

2. **Fase 2: Wizard Ultra-Liviano de Creación**
   - Modal de 2 pasos (Nombre, Moneda, Vertical) para crear un nuevo local en < 60 segundos.

3. **Fase 3: Widget de Checklist Progresivo Asíncrono**
   - Componente `SetupProgressWidget` en el layout principal con cálculo dinámico de % completado y accesos directos a ajustes.

4. **Fase 4: Vista Consolidada Multi-Local (Global Overview)**
   - Dashboard agregado con métricas combinadas de ventas y órdenes activas entre todas las sucursales.

---

> **Beneficio clave:** El usuario empieza a operar sin fricciones ni formularios extensos, completa la configuración a su propio ritmo mediante el checklist progresivo, y puede gobernar múltiples sucursales con una vista consolidada y atajos por teclado.
