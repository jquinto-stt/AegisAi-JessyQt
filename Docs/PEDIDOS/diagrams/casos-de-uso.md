# Diagrama UML de Casos de Uso del Módulo Pedidos

Este documento presenta el diagrama UML de casos de uso de **StockFlow (Módulo Pedidos)**, modelando las interacciones entre los actores y las funcionalidades del sistema.

---

## Diagrama UML de Casos de Uso (Mermaid)

```mermaid
flowchart LR
    %% Actores
    Cliente(("👤 Cliente Final"))
    IA(("🤖 Asistente IA"))
    Cajero(("👤 Operador de Caja"))
    Cocinero(("👨‍🍳 Cocinero / KDS"))
    Repartidor(("🛵 Repartidor"))
    Admin(("👑 Administrador"))
    Kardex(("⚙️ Motor Kardex ERP"))

    subgraph CasosDeUso["Casos de Uso — Módulo Pedidos"]
        CU01["CU-01: Crear Pedido Manual POS"]
        CU02["CU-02: Procesar Pedido Conversacional IA"]
        CU03["CU-03: Aprobar Interpretación IA"]
        CU04["CU-04: Confirmar Pedido y Asignar Turno"]
        CU05["CU-05: Enviar Comanda a Cocina (KDS)"]
        CU06["CU-06: Marcar Pedido Listo / Empacado"]
        CU07["CU-07: Entregar Pedido al Cliente"]
        CU08["CU-08: Rechazar Pedido Entrante"]
        CU09["CU-09: Cancelar Pedido con Incidencia"]
        CU10["CU-10: Tomar Control Manual Chat (HITL)"]
        CU11["CU-11: Devolver Control a la IA"]
        CU12["CU-12: Descontar Stock e Insumos"]
        CU13["CU-13: Gestionar Catálogo y Pausa Automática"]
        CU14["CU-14: Inyectar Pedido Programado"]
        CU15["CU-15: Regular Ritmo y Capacidad de Turno"]
        CU16["CU-16: Imprimir Ticket Térmico"]
    end

    %% Conexiones de Actores a Casos de Uso
    Cliente --> CU02
    IA --> CU02
    
    Cajero --> CU01
    Cajero --> CU03
    Cajero --> CU04
    Cajero --> CU08
    Cajero --> CU10
    Cajero --> CU11
    Cajero --> CU16

    Cocinero --> CU05
    Cocinero --> CU06

    Repartidor --> CU07

    Admin --> CU09
    Admin --> CU13
    Admin --> CU14
    Admin --> CU15

    CU05 -.-> |<<include>>| CU12
    CU12 --> Kardex
    CU09 -.-> |<<include>>| CU15
    CU03 -.-> |<<include>>| CU04
```

---

## Matriz de Trazabilidad: Actores vs. Casos de Uso

| Caso de Uso | Cliente | Asistente IA | Operador Caja | Cocinero KDS | Repartidor | Administrador | Kardex ERP |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **CU-01: Crear Pedido Manual** | | | **X** | | | | |
| **CU-02: Pedido Conversacional** | **X** | **X** | | | | | |
| **CU-03: Aprobar Interpretación** | | | **X** | | | **X** | |
| **CU-04: Confirmar y Turno** | | **X** | **X** | | | **X** | |
| **CU-05: Enviar a Cocina** | | | | **X** | | **X** | |
| **CU-06: Marcar Listo** | | | | **X** | | | |
| **CU-07: Entregar Pedido** | | | **X** | | **X** | | |
| **CU-08: Rechazar Pedido** | | | **X** | | | **X** | |
| **CU-09: Cancelar con Incidencia** | | | | | | **X** | |
| **CU-10: Tomar Control HITL** | | | **X** | | | **X** | |
| **CU-11: Devolver a IA** | | | **X** | | | **X** | |
| **CU-12: Descontar Stock** | | | | | | | **X** |
| **CU-13: Gestionar Catálogo** | | | | | | **X** | |
| **CU-14: Inyectar Programado** | | | **X** | | | **X** | |
| **CU-15: Ritmo y Capacidad** | | | | | | **X** | |
| **CU-16: Imprimir Ticket** | | | **X** | **X** | | | |
