# Necto — Concepto y Arquitectura Funcional

## 1. Visión General

**Necto** es una plataforma modular y adaptable diseñada para conectar distintos tipos de negocios con sus clientes principalmente mediante **WhatsApp**, utilizando **Inteligencia Artificial contextual**, complementada con canales web y aplicaciones móviles.

La propuesta de Necto es permitir que cualquier negocio (restaurantes, retail, clínicas, centros deportivos, servicios técnicos, coworkings, negocios de barrio) active exclusivamente las capacidades operativas que necesita y las gestione de manera unificada.

---

## 2. El Núcleo de la Experiencia: IA Contextual

El centro de la interacción con el cliente es la IA de Necto. Esta IA es capaz de procesar **texto, audio e imágenes**, adaptándose al contexto particular de cada negocio a través de:

- Catálogos y directorios de productos/servicios
- Reglas operativas y políticas del negocio
- Horarios de atención y disponibilidad
- Plantillas de comunicación e historial de interacciones

### Desacople de Intenciones y Enrutamiento
La IA puede identificar múltiples intenciones dentro de una misma conversación o mensaje del cliente y enrutar automáticamente cada intención al módulo operativo correspondiente sin perder el hilo de la conversación.

---

## 3. Módulos Operativos Independientes

Los módulos son **capacidades independientes** con propiedad exclusiva sobre su propia lógica de negocio. Un módulo puede integrarse con otro cuando existe una relación funcional (por ejemplo, *Pedidos* integrándose con *Turnos*), pero ningún módulo debe duplicar la responsabilidad de otro.

### 🛍️ Pedidos (OMS Universal)
Gestión de pedidos omnicanal provenientes de WhatsApp y otros medios.
- Catálogo inteligente e interpretación de pedidos por IA.
- Pedidos recurrentes y programados.
- Confirmación automática, tiempos estimados y panel de preparación.
- Métricas operativas.

### 📅 Agendamiento
Gestión de citas y agendas profesionales por WhatsApp.
- Manejo de profesionales, servicios, sucursales y recursos.
- Confirmación, reprogramación, cancelación y recordatorios automáticos.

### 🏨 Reservas
Gestión de reserva de espacios, recursos y servicios.
- Control de disponibilidad, capacidad y reglas de horarios.
- Reservas recurrentes e integración con cobros.

### 📦 Inventarios
Gestión y actualización de inventario mediante texto, audio, fotos o video.
- Directorios, plantillas, estados y condiciones.
- Evidencia, historial, alertas de stock bajo y exportación.

### 🎟️ Turnos
Digitalización del sistema de turnos para atención presencial.
- Integración directa con *Pedidos* y *Reservas*.
- Notificaciones y seguimiento en tiempo real.

### 👥 Referidos
Gestión de campañas de fidelización y crecimiento.
- Referentes, códigos, enlaces de seguimiento y cadenas de referidos.
- Sistema de puntos, premios y métricas de conversión.

---

## 4. Funcionalidades Transversales

Existen capacidades transversales que proveen soporte a todos los módulos y no constituyen módulos operativos independientes:

- **Inteligencia Artificial (IA):** Motor de interpretación, clasificación y enrutamiento.
- **Dashboard:** Métricas globales, analítica consolidada y paneles de control.
- **Roles y Permisos:** Control de acceso granular a nivel de usuario, rol y sede.
- **Pagos:** Pasarelas de cobro, transacciones y conciliación.

---

## 5. El Contexto de la Tienda

La **Tienda** representa el contexto concreto del negocio dentro de la plataforma Necto. 

- Proporciona la **identidad y el arquetipo** del negocio (ej. restaurante, ferretería, clínica).
- Configura el catálogo, reglas operativas, horarios y canales oficiales (WhatsApp).
- **Adaptabilidad del OMS:** El módulo de *Pedidos* opera como un OMS (Order Management System) universal, pero su comportamiento, semántica de preparación y flujo de interacción se adaptan según el contexto inyectado por la *Tienda*.

---

## 6. Reglas Fundamentales de Arquitectura para Desarrollo

Al modificar o ampliar la plataforma, cualquier desarrollador o agente de IA debe cumplir estrictamente las siguientes reglas:

1. **Plataforma Adaptable:** Necto **nunca** debe convertirse en una aplicación especializada para un solo rubro.
2. **Propiedad Única de Lógica:** Cada módulo mantiene la responsabilidad exclusiva de su dominio. No se permite duplicación de lógica ni acoplamiento rígido entre módulos.
3. **Desacople Tienda vs. Módulos:** La *Tienda* provee el contexto y la configuración; los *Módulos* proveen la capacidad operativa.
4. **Verificación Antes de Refactorizar:** Antes de alterar el código, se debe determinar:
   - Qué responsabilidad pertenece a cada módulo.
   - Qué información es compartida vs. qué información es exclusiva.
   - Qué responsabilidades pertenecen al contexto de la Tienda.
