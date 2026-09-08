# Diagrama de Contexto del Módulo Pedidos

Este documento presenta el diagrama de contexto del módulo **Pedidos** dentro de **StockFlow**, delimitando sus fronteras con los actores externos, módulos hermanos del sistema y servicios de infraestructura cloud.

---

## Diagrama de Contexto del Sistema (Mermaid)

```mermaid
flowchart TD
    %% Estilos
    classDef core fill:#190088,stroke:#0f0052,stroke-width:2px,color:#fff;
    classDef actor fill:#e0f2fe,stroke:#0284c7,stroke-width:1.5px,color:#0369a1;
    classDef module fill:#f4f4f5,stroke:#71717a,stroke-width:1.5px,color:#18181b;
    classDef cloud fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#92400e;

    %% Actores Externos
    subgraph ACTORES["Actores Externos"]
        Cliente["Cliente Final\n(WhatsApp / Web / Mostrador)"]:::actor
        Cajero["Operador de Caja / Mostrador\n(Gestión y Confirmación)"]:::actor
        Cocinero["Cocinero Jefe / KDS\n(Cocina y Tiempos)"]:::actor
        Repartidor["Repartidor / Despacho\n(Entrega Física)"]:::actor
        Admin["Administrador / Dueño\n(Gobernanza y Menú)"]:::actor
    end

    %% Módulo Central
    subgraph PEDIDOS_CORE["StockFlow — Dominio de Pedidos"]
        PedidosModule["Módulo Pedidos (Necto)\n- Kanban en Vivo\n- Pantalla KDS Cocina\n- Conversaciones WhatsApp\n- Catálogo Inteligente\n- Insumos & Escandallos\n- Motor HITL (Human-in-the-Loop)"]:::core
    end

    %% Módulos Hermanos StockFlow
    subgraph MODULOS_HERMANOS["Módulos Internos de StockFlow"]
        ModInventario["Módulo Inventario ERP\n(Kardex Maestro, Stock de Sucursales,\nAuditorías, Proveedores)"]:::module
        ModAuth["Módulo de Autenticación\n(Gestión de Sesión y Permisos)"]:::module
        ModConfig["Módulo Negocio y Ajustes\n(Multi-sede, Horarios, Marca)"]:::module
    end

    %% Servicios Cloud & Infraestructura
    subgraph CLOUD["Servicios Cloud & Hardware"]
        MetaWA["Meta WhatsApp Cloud API\n(Servicio de Mensajería)"]:::cloud
        AWS_APIGW["AWS API Gateway v2\n(HTTP REST)"]:::cloud
        AWS_Cognito["AWS Cognito User Pool\n(Tokens JWT)"]:::cloud
        AWS_Dynamo["AWS DynamoDB\n(Pedidos@Table)"]:::cloud
        HardwareAudio["Web Audio API\n(Hardware de Sonido del Navegador)"]:::cloud
        HardwarePrinter["Impresora Térmica\n(Tickets 58mm / 80mm)"]:::cloud
    end

    %% Relaciones de Actores
    Cliente <--> |Mensajes de texto, comprobantes de pago, consultas de carta y estado| PedidosModule
    Cajero <--> |Validación de pagos, comandas manuales, toma de control HITL| PedidosModule
    Cocinero <--> |Control de horno/cocina, cambio a EN_PREPARACION y LISTO| PedidosModule
    Repartidor <--> |Confirmación de entrega y despacho a FINALIZADO| PedidosModule
    Admin <--> |Precios, escandallos, roles, turnos y métricas operativas| PedidosModule

    %% Relaciones con Módulos Hermanos
    PedidosModule --> |inventoryService.consumeSaleOrder\nDescuento automático de existencias físicas| ModInventario
    ModInventario -.-> |Alertas de quiebre de stock| PedidosModule
    ModAuth --> |Token JWT y usuario autenticado| PedidosModule
    ModConfig --> |Datos de franquicia y moneda| PedidosModule

    %% Relaciones con Cloud y Hardware
    PedidosModule <--> |Envío/recepción de plantillas y notificaciones| MetaWA
    PedidosModule --> |Peticiones REST autorizadas| AWS_APIGW
    AWS_APIGW --> |Validación de firmas| AWS_Cognito
    AWS_APIGW <--> |Persistencia de órdenes y eventos| AWS_Dynamo
    PedidosModule --> |Beeps y campanas audibles| HardwareAudio
    PedidosModule --> |Emisión de ticket comanda| HardwarePrinter
```

---

## Descripción del Flujo de Información de Contexto

1. **Entrada de Demanda**:
   * El **Cliente** solicita productos mediante WhatsApp o directamente ante el **Cajero** en el mostrador físico.
   * La información de pedidos no estructurada es parseada por la IA y presentada en el tablero del módulo.
2. **Sincronización con el Núcleo ERP**:
   * Cuando una orden pasa a fase de cocina, el módulo Pedidos invoca a `ModInventario` (`inventoryService.consumeSaleOrder`), garantizando que la contabilidad del Kardex coincida al gramo con las ventas.
3. **Control Operativo**:
   * El **Cocinero** visualiza las comandas ordenadas por número de turno y cronómetro de urgencia.
   * El **Repartidor** toma el paquete listo y cierra el ciclo reportando la entrega.
4. **Persistencia e Infraestructura**:
   * El módulo se comunica con **AWS DynamoDB** para almacenar el estado del pedido y su auditoría inmutable, protegido por **AWS Cognito**.
   * La interfaz interactúa con el hardware del navegador (Web Audio API para alertas sonoras y motor de impresión para comandas físicas).
