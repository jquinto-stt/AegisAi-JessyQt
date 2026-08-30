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

## 3. Selector de Negocios (Workspace Switcher)

En la barra superior o cabecera del menú lateral, el usuario tendrá un selector interactivo tipo Slack/Linear:

```
┌──────────────────────────────────────────────┐
│ [🍔] Burger House - Sede Norte           ▾   │
├──────────────────────────────────────────────┤
│ Negocios activos:                            │
│   ✓ 🍔 Burger House - Sede Norte (Actual)    │
│     🍕 Pizza Necto - Delivery                │
│ ───────────────────────────────────────────  │
│   ➕ Crear nuevo negocio                      │
│   ⚙️ Ajustes de la organización               │
└──────────────────────────────────────────────┘
```

---

## 4. Flujo de Onboarding Guiado (Restaurante Virtual)

Cuando el usuario hace clic en **"Crear nuevo negocio"** o ingresa por primera vez a Necto, se dispara el **Wizard de Onboarding de 4 Pasos**:

```
 [1. Perfil & Tipo] ──> [2. Canales & IA] ──> [3. Carta & Platos] ──> [4. Cocina & KDS] ──> ¡Listo!
```

### Paso 1: Identidad del Negocio
* **Tipo de Negocio**: Selección de plantilla inicial:
  * 🍔 *Restaurante / Comidas Rápidas / Dark Kitchen* **(Seleccionado)**
  * ☕ *Cafetería / Panadería*
  * 🍣 *Restaurante Gourmet / A la Carta*
* **Nombre Comercial**: (Ej: *La Birra Bar Chapinero*).
* **País & Moneda**: (Ej: *Colombia - COP $*).
* **Dirección / Ciudad**: Para cálculo de radios de entrega y turnos.

### Paso 2: Activación de Canales de Venta
* 📱 **WhatsApp con Asistente IA**:
  * Casilla para habilitar recepción automática de pedidos por WhatsApp.
  * Tono de la IA (Amigable, Rápido, Ejecutivo).
* 🌐 **Menú Web Directo**:
  * Nombre del subdominio para los clientes: `necto.app/labirrabar`.
* 🏪 **Mostrador / POS Físico**:
  * Habilitar toma de pedidos presencial o telefónica.

### Paso 3: Carga Rápida de la Carta
* **Método de carga**:
  1. 📄 *Subir imagen / PDF del menú actual (Lectura con OCR e IA para armar los platos automáticamente)*.
  2. ⚡ *Cargar plantilla sugerida según el tipo de local (Hamburguesas, Combos, Bebidas)*.
  3. ✍️ *Crear manualmente los primeros 3 productos clave*.

### Paso 4: Tiempos y Operación de Cocina
* **Tiempo promedio de preparación base**: (Ej: *15 a 20 minutos*).
* **Pantallas de Cocina (KDS)**:
  * ¿Tenés pantalla/tablet en cocina? `[Sí / No, solo comandas impresas]`.
* **Impresión térmica**:
  * Habilitar formato de ticket de 80mm o 58mm.

---

## 5. Arquitectura de Implementación en React

### A. Contexto Global de Workspace (`BusinessContext.tsx`)
```tsx
export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businesses, setBusinesses] = useState<BusinessInstance[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  const activeBusiness = businesses.find(b => b.id === activeBusinessId) || businesses[0];

  const createBusiness = (data: Partial<BusinessInstance>) => {
    // Guarda el nuevo negocio y lo establece como activo
  };

  return (
    <BusinessContext.Provider value={{ activeBusiness, businesses, setActiveBusinessId, createBusiness, isOnboardingOpen, setIsOnboardingOpen }}>
      {children}
    </BusinessContext.Provider>
  );
};
```

### B. Inyección Dinámica del Módulo Especializado
`NectoApp.tsx` evalúa el `businessType` del negocio activo:
```tsx
function MainWorkspace() {
  const { activeBusiness } = useBusiness();

  switch (activeBusiness.businessType) {
    case 'restaurant_virtual':
      return <PedidosModule />; // Carga Tablero, KDS, Carta gastronómica, Insumos
    case 'retail_store':
      return <RetailModule />;  // Futuro: Código de barras, Tallas, Colores
    default:
      return <PedidosModule />;
  }
}
```

---

## 6. Plan de Ejecución Sugerido

1. **Fase 1: Capa de Contexto Multi-Negocio**
   - Crear `BusinessContext` con soporte de múltiples negocios y persistencia en `localStorage` / backend.
   - Crear el componente `BusinessSwitcher` para la barra superior/lateral.

2. **Fase 2: Componente Onboarding Wizard**
   - Crear `RestaurantOnboardingModal.tsx` con el flujo guiado de 4 pasos para crear y configurar un restaurante virtual desde cero.

3. **Fase 3: Parametrización del Módulo de Pedidos**
   - Conectar el nombre del restaurante, moneda, canales habilitados y estaciones KDS de `activeBusiness` directamente con `PedidosContext`.

---

> **Beneficio clave:** Con esta arquitectura, Necto deja de ser una app rígida para un único restaurante y pasa a ser un **SaaS escalable** donde cualquier emprendedor o franquicia puede crear y gestionar múltiples locales o marcas desde una sola cuenta.
