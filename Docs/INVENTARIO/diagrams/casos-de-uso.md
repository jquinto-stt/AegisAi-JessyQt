# Diagrama UML de Casos de Uso del Módulo Inventario

Este documento presenta el diagrama UML de casos de uso de **StockFlow (Módulo Inventario)**, modelando las interacciones entre los actores y las funcionalidades operativas del ERP.

---

## Diagrama UML de Casos de Uso (Mermaid)

```mermaid
flowchart LR
    Bodeguero(("👤 Bodeguero"))
    Auditor(("👤 Auditor"))
    Comprador(("👤 Comprador"))
    JefeProd(("👨‍🔧 Jefe Producción"))
    Admin(("👑 Administrador"))
    PedidosMod(("🤖 Módulo Pedidos"))

    subgraph CasosDeUso_Inventario["Casos de Uso — Módulo Inventario"]
        CU01["CU-INV-01: Crear / Editar Producto"]
        CU02["CU-INV-02: Registrar Entrada / Salida Manual"]
        CU03["CU-INV-03: Conteo Físico y Conciliación"]
        CU04["CU-INV-04: Traslado entre Bodegas"]
        CU05["CU-INV-05: Descontar por Comanda de Venta"]
        CU06["CU-INV-06: Crear Bodegas y Sedes"]
        CU07["CU-INV-07: Crear Proveedores"]
        CU08["CU-INV-08: Emitir Orden de Compra"]
        CU09["CU-INV-09: Recepcionar Orden de Compra"]
        CU10["CU-INV-10: Ejecutar Ensamble BOM"]
        CU11["CU-INV-11: Importar Catálogo Excel"]
        CU12["CU-INV-12: Auditar Historial Kardex"]
        CU13["CU-INV-13: Monitorear Valorización y KPIs"]
        CU14["CU-INV-14: Eliminar Producto"]
    end

    %% Conexiones Bodeguero
    Bodeguero --> CU02
    Bodeguero --> CU04
    Bodeguero --> CU09

    %% Conexiones Auditor
    Auditor --> CU03
    Auditor --> CU11
    Auditor --> CU12

    %% Conexiones Comprador
    Comprador --> CU07
    Comprador --> CU08
    Comprador --> CU09

    %% Conexiones Jefe Producción
    JefeProd --> CU10

    %% Conexiones Admin
    Admin --> CU01
    Admin --> CU06
    Admin --> CU13
    Admin --> CU14

    %% Conexiones Pedidos
    PedidosMod --> CU05

    %% Relaciones Internas
    CU01 -.-> |<<include si stock > 0>>| CU02
    CU09 -.-> |<<include>>| CU02
    CU10 -.-> |<<include>>| CU02
```

---

## Matriz de Cobertura: Actores vs. Casos de Uso

| Caso de Uso | Bodeguero | Auditor | Comprador | Jefe Prod | Admin | Módulo Pedidos |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **CU-01: Crear/Editar Producto** | | | | | **X** | |
| **CU-02: Entrada/Salida Manual** | **X** | | | | **X** | |
| **CU-03: Conteo Físico** | | **X** | | | | |
| **CU-04: Traslado entre Bodegas** | **X** | | | | **X** | |
| **CU-05: Descuento por Ventas** | | | | | | **X** |
| **CU-06: Crear Bodegas** | | | | | **X** | |
| **CU-07: Crear Proveedores** | | | **X** | | **X** | |
| **CU-08: Orden de Compra (PO)** | | | **X** | | **X** | |
| **CU-09: Recepcionar Compra** | **X** | | **X** | | | |
| **CU-10: Ejecutar Ensamble BOM**| | | | **X** | | |
| **CU-11: Importar Excel** | | **X** | | | **X** | |
| **CU-12: Auditar Kardex** | | **X** | | | **X** | |
| **CU-13: Valorización y KPIs** | | **X** | | | **X** | |
| **CU-14: Eliminar Producto** | | | | | **X** | |
