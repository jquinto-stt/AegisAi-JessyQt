# Diagrama de Contexto del Módulo Inventario

Este documento presenta el diagrama de contexto del módulo **Inventario** dentro de **StockFlow**, delimitando sus límites con los actores humanos, módulos hermanos del sistema y servicios cloud.

---

## Diagrama de Contexto (Mermaid)

```mermaid
flowchart TD
    classDef core fill:#190088,stroke:#0f0052,stroke-width:2px,color:#fff;
    classDef actor fill:#e0f2fe,stroke:#0284c7,stroke-width:1.5px,color:#0369a1;
    classDef module fill:#f4f4f5,stroke:#71717a,stroke-width:1.5px,color:#18181b;
    classDef cloud fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#92400e;

    subgraph ACTORES["Actores Externos"]
        Bodeguero["Bodeguero / Almacenista\n(Entradas, Salidas, Traslados)"]:::actor
        Auditor["Auditor de Inventario\n(Conteos Físicos, Auditoría Kardex)"]:::actor
        Comprador["Encargado de Compras\n(Proveedores, Órdenes de Compra)"]:::actor
        JefeProd["Jefe de Producción\n(Ensamble y Fabricación BOM)"]:::actor
        Admin["Administrador\n(Catálogo, Sedes y Precios)"]:::actor
        ProveedorExt["Proveedor Externo\n(Facturas y Mercancía)"]:::actor
    end

    subgraph INVENTARIO_CORE["StockFlow — Dominio de Inventario"]
        ModuloInv["Módulo Inventario (ERP Kardex)\n- Catálogo Maestro con JSONB Dinámico\n- Control Multialmacén y Sedes\n- Kardex Transaccional Inmutable\n- Motor de Compras y Proveedores\n- Ensamble y Fabricación BOM\n- Importador Masivo Excel"]:::core
    end

    subgraph MODULOS_HERMANOS["Módulos Internos StockFlow"]
        ModPedidos["Módulo Pedidos (Ventas/POS)\n(Comandas en Vivo y Cocina)"]:::module
        ModAuth["Módulo de Autenticación\n(Cognito JWT)"]:::module
    end

    subgraph CLOUD["Servicios Cloud & Archivos"]
        AWS_APIGW["AWS API Gateway v2"]:::cloud
        AWS_Cognito["AWS Cognito User Pool"]:::cloud
        AWS_Dynamo["AWS DynamoDB\n(Inventarios@Table)"]:::cloud
        ExcelFiles["Archivos Excel / CSV\n(Importación de Catálogos)"]:::cloud
    end

    %% Relaciones de Actores
    Bodeguero <--> |Entradas, Salidas manuales, Traslados entre bodegas| ModuloInv
    Auditor <--> |Conteos físicos, conciliaciones, auditoría de Kardex| ModuloInv
    Comprador <--> |Creación y recepción de órdenes de compra| ModuloInv
    JefeProd <--> |Creación y ejecución de ensambles BOM| ModuloInv
    Admin <--> |Gestión de productos, categorías y bodegas| ModuloInv
    ProveedorExt --> |Entrega de mercancía y facturas| Comprador

    %% Relaciones Internas
    ModPedidos --> |consumeSaleOrder\nDescuento automático de existencias vendidas| ModuloInv
    ModAuth --> |Identidad del usuario y token JWT| ModuloInv

    %% Relaciones Cloud
    ModuloInv <--> |Lectura y parseo de hojas de cálculo| ExcelFiles
    ModuloInv --> |Peticiones REST autorizadas| AWS_APIGW
    AWS_APIGW --> |Validación de token| AWS_Cognito
    AWS_APIGW <--> |Persistencia de ítems y evidencias| AWS_Dynamo
```

---

## Flujo de Información de Contexto

1. **Venta Directa**: El módulo `Pedidos` consume automáticamente el inventario mediante el método `consumeSaleOrder`, garantizando que las ventas por WhatsApp o mostrador se descuenten inmediatamente del Kardex.
2. **Cadena de Suministro**: El **Encargado de Compras** genera órdenes para los **Proveedores**, y el **Bodeguero** da ingreso a la mercancía al momento de su recepción física.
3. **Producción**: El **Jefe de Producción** transforma materias primas en productos finales a través de listas de materiales (BOM).
4. **Gobernanza y Persistencia**: El **Auditor** y el **Administrador** concilian saldos físicos contra saldos contables, con soporte de almacenamiento local y replicación hacia **AWS DynamoDB**.
