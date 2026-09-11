# Necto OMS — Arquitectura de Módulos Universales & Tenant Context

> **Principio Fundamental:**  
> *"La tienda es el contenedor. Los módulos son capacidades que se agregan al contenedor. La tienda debe funcionar y tener sentido incluso con cero módulos instalados. El módulo de Pedidos conserva un núcleo OMS universal, consume la identidad y los canales de la tienda, y aporta su propia configuración operativa y comercial."*

---

## 1. El Modelo Conceptual en 3 Capas

```
┌────────────────────────────────────────────────────────────────────────┐
│               CAPA 1: TIENDA / TENANT (CONTENEDOR PURO)                │
│                                                                        │
│ • Identidad: Nombre, Moneda, País, Ciudad, Teléfono, Logo, Idioma      │
│ • Configuración Base: Horarios, Días laborales, Formatos, Notificaciones│
│ • Equipo & Permisos: Dueño, Administrador, Operador, Auditor          │
│ • Canales & Conexiones: WhatsApp Oficial (Línea / QR), Webhooks, API   │
│                                                                        │
│ (0 Módulos instalados = Tienda 100% válida y operativa en su base)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  │ Habilita Capacidades Plug & Play  │
                  ▼                                   ▼
┌───────────────────────────────────┐   ┌────────────────────────────────┐
│      CAPA 2: MÓDULO PEDIDOS       │   │    CAPA 2: OTROS MÓDULOS       │
│           (OMS UNIVERSAL)         │   │ (Inventarios, Turnos, Citas)   │
├───────────────────────────────────┤   ├────────────────────────────────┤
│ • Pipeline de Pedidos (Kanban)    │   │ • Inventarios (Stock & Kardex) │
│ • Estados universales de orden    │   │ • Turnos & Control de Caja     │
│ • Estación de Alistamiento        │   │ • Reservas & Citas             │
│ • Historial & Métricas de Venta   │   │                                │
└─────────────────┬─────────────────┘   └────────────────┬───────────────┘
                  │                                      │
                  ▼                                      ▼
┌───────────────────────────────────┐   ┌────────────────────────────────┐
│  CAPA 3: CONFIGURACIÓN INTERNA    │   │  CAPA 3: CONFIGURACIÓN INTERNA │
│        DEL MÓDULO PEDIDOS         │   │       DE CADA CAPACIDAD        │
├───────────────────────────────────┤   ├────────────────────────────────┤
│ • Asistente Virtual WhatsApp:     │   │ • Reglas de reposición stock   │
│   - Nombre y Tono (Cálido/Técnico)│   │ • Políticas de conteo físico   │
│   - Saludo & Flujo de Compra      │   │ • Tolerancias de arqueo        │
│ • Reglas de Alistamiento & Buffer │   │                                │
│ • Motivos comerciales de rechazo  │   │                                │
└───────────────────────────────────┘   └────────────────┘
```

---

## 2. Definición Estricta de las 3 Capas

### Capa 1: Tienda / Tenant (Contenedor Universal Puro)
Es el límite de aislamiento multi-inquilino. Es agnóstica a cualquier industria comercial.

- **Identidad:** Nombre comercial, logo, descripción, dirección física, teléfono de contacto, correo, redes sociales, sitio web, país, ciudad, zona horaria, moneda e idioma.
- **Configuración general:** Estado de la tienda (activa / pausada), horarios de atención, días laborales, configuración regional, formatos numéricos y notificaciones centrales.
- **Usuarios y roles transversales:**
  - *Propietario / Dueño:* Acceso total a facturación, suscripción y administración de tienda.
  - *Administrador:* Control de configuración, asignación de permisos y gestión de módulos.
  - *Operador:* Ejecución operativa en los módulos autorizados.
  - *Auditor / Consulta:* Visualización y reportes sin permisos de edición ni despacho.
- **Integraciones genéricas:**
  - Conexión del canal oficial de WhatsApp (vinculación a nivel de número/chip, sesión QR o Meta Cloud API).
  - Webhooks globales salientes y API Keys de la tienda.

> **Regla de Aislamiento:** La tienda base **NUNCA** contiene catálogo de productos, órdenes, stock, mesas, comandas ni carritos. Esas funcionalidades pertenecen exclusivamente a los módulos.

---

### Capa 2: Módulos Plug & Play (Capacidades)
Son micro-aplicaciones desacopladas que se acoplan y desacoplan dinámicamente.

- **Independencia absoluta:** Una tienda puede operar con 0 módulos (muestra el catálogo de módulos disponibles), con solo Inventario (control de stock puro sin ventas), con solo Pedidos (recepción de compras sin kardex complejo), o con múltiples capacidades combinadas.
- **Comunicación inter-módulos:** No existen llamadas directas fuertemente acopladas. La interoperabilidad se realiza mediante **Eventos de Dominio** (Event-Driven Architecture) a través de un bus central.

---

### Capa 3: Configuración Interna de Módulos
Parámetros que solo existen y son accesibles cuando el módulo correspondiente está instalado.

- **En el Módulo de Pedidos (OMS):**
  - **Identidad del Asistente Comercial de WhatsApp:** Nombre del bot, tono de respuesta (Cálido, Profesional, Técnico, Ágil), plantilla de saludo comercial y flujo de captura de datos del cliente.
  - **Reglas operativas de alistamiento:** Tiempos de buffer, visualización de estación (empaque / despacho / alistamiento), alertas por pedidos demorados.
  - **Catálogo de rechazo y cancelación:** Motivos comerciales reales (sin existencias, fuera de zona de entrega, cambio solicitado por cliente).

---

## 3. Matriz de Comportamiento Dinámico

| Tienda | Capa 1: Tienda | Capa 2: Módulos Activos | Capa 3: Configuración de Pedidos |
| :--- | :--- | :--- | :--- |
| **Ferretería El Albañil** | Nombre, Bogotá, COP, WhatsApp conectado. | `pedidos` + `inventarios` | Bot técnico ("Asesor Ferretero"), alistamiento en bodega, catálogo de herramientas. |
| **Zapatería Elegance** | Nombre, Medellín, COP, WhatsApp conectado. | `pedidos` | Bot cercano ("Asesora Camila"), alistamiento por tallas/colores, catálogo de calzado. |
| **Farmacia San Lucas** | Nombre, Cali, COP, WhatsApp desconectado. | `inventarios` | No aplica configuración de pedidos. Solo opera kardex y compras a droguerías. |
| **Distribuidora Nova** | Nombre, Barranquilla, USD, WhatsApp conectado. | *0 módulos (Limpia)* | Tienda activa con roles y canal conectado, lista para habilitar módulos en caliente. |

---

## 4. Índice de la Documentación

1. **[01. Modelo Conceptual Tenant + Módulos Plug & Play](./01-modelo-conceptual-tenant-modulos.md):**  
   Ciclo de vida de una tienda, espacio base con 0 módulos, aislamiento de datos y benchmark canónico de prueba.
2. **[02. Canal WhatsApp & Asistente Comercial](./02-canal-whatsapp-y-adaptador-contextual.md):**  
   Desacoplamiento del canal en 2 niveles (Conexión de línea en Tienda vs. Identidad y Tono en Módulo Pedidos).
3. **[03. Comunicación Inter-Módulos mediante Contratos y Eventos](./03-comunicacion-inter-modulos-eventos-y-catalogo.md):**  
   Propiedad del catálogo, contratos de eventos de dominio (`order.created`, `order.confirmed`, `stock.reserved`) y arquitectura hexagonal.
4. **[04. Contratos de Datos, Tipos y Ciclo de Vida OMS](./04-contratos-interfaces-y-ciclo-de-vida-oms.md):**  
   Definición técnica de interfaces TypeScript, estados universales de la orden y transiciones permitidas.
5. **[05. Plan de Refactor y Migración](./05-plan-de-refactor-y-migracion.md):**  
   Hoja de ruta del desacoplamiento, erradicación de términos de cocina y verificación automatizada.
