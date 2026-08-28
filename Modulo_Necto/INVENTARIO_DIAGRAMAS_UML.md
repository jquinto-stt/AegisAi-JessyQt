# Diagramas de Arquitectura UML — Módulo de Inventarios Necto

Especificación y modelos UML para el **Módulo de Inventarios** de la Plataforma Necto (*Gastronomía*, *Equipamiento*, *SST*, *Retail*).

---

## 1. Diagrama de Clases UML (Class Diagram)

Modelo de dominio orientado a objetos con jerarquía de tipos, atributos, métodos y asociaciones.

```mermaid
classDiagram
    %% Enumeraciones
    class ItemStatus {
        <<enumeration>>
        Activo
        En Mantenimiento
        Inactivo
        Baja
    }

    class ItemCondition {
        <<enumeration>>
        Buena
        Requiere Revisión
        Crítica
    }

    class EvidenceType {
        <<enumeration>>
        foto
        audio
        video
        texto
    }

    class IndustryCategory {
        <<enumeration>>
        Gastronomía
        Equipamiento
        SST & Emergencias
        Retail
    }

    %% Clases del Dominio
    class InventoryItem {
        +String id
        +String code
        +String name
        +IndustryCategory category
        +String clientName
        +ItemStatus status
        +ItemCondition condition
        +String location
        +String lastUpdated
        +Number evidenceCount
        +EvidenceType evidenceType
        +String evidenceUrl
        +String notes
        +Boolean isSyncedWithPedidos
        +updateCondition(ItemCondition newCondition) void
        +assignLocation(String newLocation) void
        +attachEvidence(EvidenceType type, String url) void
        +calculateRiskLevel() String
    }

    class InventoryTemplate {
        +String id
        +String name
        +IndustryCategory category
        +List~String~ fields
        +String description
        +validateItem(InventoryItem item) Boolean
        +getRequiredFields() List~String~
    }

    class InventoryEvidence {
        +String id
        +String itemId
        +EvidenceType type
        +String mediaUrl
        +String transcriptText
        +String ocrParsedText
        +DateTime createdAt
        +processOCR() String
        +processASR() String
    }

    class StockAlert {
        +String id
        +String itemId
        +String alertType
        +String severity
        +String message
        +DateTime triggerDate
        +Boolean isResolved
        +resolveAlert(String userId) void
    }

    class ClientLocation {
        +String id
        +String name
        +String sector
        +String address
        +List~String~ assignedTemplates
        +Boolean isSyncActive
        +linkInventoryItem(InventoryItem item) void
    }

    %% Asociaciones y Dependencias
    InventoryTemplate "1" --> "0..*" InventoryItem : estructura
    ClientLocation "1" --> "0..*" InventoryItem : almacena
    InventoryItem "1" *-- "1..*" InventoryEvidence : contiene
    InventoryItem "1" --> "0..*" StockAlert : genera
    InventoryItem ..> ItemStatus : usa
    InventoryItem ..> ItemCondition : usa
    InventoryEvidence ..> EvidenceType : usa
    InventoryTemplate ..> IndustryCategory : clasifica
```

---

## 2. Diagrama de Secuencia (Sequence Diagram)

Ciclo de vida de una **Captura Multimodal Asistida por IA** y su posterior sincronización con el Catálogo de Pedidos:

```mermaid
sequenceDiagram
    autonumber
    actor Operador as 👤 Operador (Piso / Cocina)
    participant UI as 📱 Interfaz Inventarios
    participant ASR_OCR as 🤖 Motor IA Necto (Voice & Vision)
    participant CoreInv as 💾 API / Store Inventarios
    participant Pedidos as 📦 Catálogo de Pedidos

    Operador->>UI: 1. Selecciona Sucursal y Plantilla de Insumos
    Operador->>UI: 2. Graba audio ("Ingresaron 50kg carne picada...") o toma foto
    UI->>ASR_OCR: 3. Envía buffer de audio / imagen
    
    activate ASR_OCR
    ASR_OCR->>ASR_OCR: 4. Ejecuta Whisper/Vision y extracción de entidades
    ASR_OCR-->>UI: 5. Retorna payload JSON (Producto, Lote, Vencimiento, Cantidad)
    deactivate ASR_OCR

    UI-->>Operador: 6. Pre-popula campos y sugiere tags contextuales
    Operador->>UI: 7. Valida condición ("Buena") y Ubicación ("Cámara #1")
    Operador->>UI: 8. Confirma guardado

    UI->>CoreInv: 9. Persiste nuevo registro (InventoryItem)
    activate CoreInv
    CoreInv-->>UI: 10. OK (ID generado, timestamp)
    deactivate CoreInv

    opt Si la plantilla tiene 'Sync Pedidos' activo
        CoreInv->>Pedidos: 11. Notifica actualización de materias primas
        Pedidos-->>CoreInv: 12. Stock de productos en carta habilitado
    end

    UI-->>Operador: 13. Pantalla de confirmación y resumen de lote
```

---

## 3. Diagrama de Estados (State Diagram)

Máquina de estados finitos que modela las transiciones de condición y mantenimiento de cualquier elemento en el inventario:

```mermaid
stateDiagram-v2
    [*] --> Registrado: Alta por Captura Multimodal
    
    state Registrado {
        [*] --> Buena
        Buena --> RequiereRevision: Desgaste / Cercano a Reorden / Vencimiento < 48h
        RequiereRevision --> Critica: Falla técnica / Quiebre de stock / Vencido
        Critica --> EnMantenimiento: Emisión de orden técnica / Reposición
        EnMantenimiento --> Buena: Inspección aprobada
    }

    Registrado --> Inactivo: Pausa operativa / Cierre de temporada
    Inactivo --> Registrado: Reactivación en línea
    Critica --> BajaDefinitiva: Descarte / Desecho / Pérdida total
    BajaDefinitiva --> [*]
```

---

## 4. Diagrama de Componentes del Sistema

```mermaid
flowchart LR
    subgraph Frontend ["Capa Cliente (React 18 + Tailwind)"]
        UI_Op["OperadorViews (Captura Multimodal)"]
        UI_An["AnalistaViews (Dashboard & Reportes)"]
        UI_Shared["Componentes Compartidos & Recharts"]
    end

    subgraph CoreServices ["Capa de Servicios"]
        Srv_Inv["Inventarios Engine & State"]
        Srv_IA["Servicio IA (Whisper ASR + OCR Vision)"]
        Srv_Sync["Sincronizador Pedidos <-> Insumos"]
    end

    subgraph Storage ["Capa de Persistencia"]
        DB_Items[("DB Items & Stock")]
        DB_Media[("Storage Evidencias")]
        DB_Templates[("Catálogo Plantillas")]
    end

    UI_Op --> Srv_Inv
    UI_Op --> Srv_IA
    UI_An --> Srv_Inv
    Srv_Inv --> Srv_Sync
    Srv_Inv --> DB_Items
    Srv_Inv --> DB_Templates
    Srv_IA --> DB_Media
```
