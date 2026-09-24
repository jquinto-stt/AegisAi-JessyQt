import { Routes, Route, Navigate, useParams } from "react-router";
import { observer } from "mobx-react-lite";
import { sessionStore, organizacionStore } from "@/stores";
import { AppShell } from "@/app/AppShell";
import {
  TableroPage,
  CrearPedidoPage,
  InicioPage as PedidosInicioPage,
  HistorialPage as PedidosHistorialPage,
  AnaliticaPage as PedidosAnaliticaPage,
  ConfigPage as PedidosConfigPage,
} from "@/pages/pedidos";
import { PerfilOperadorPage, EquipoPage } from "@/pages/equipo";
import {
  InventarioInicioPage,
  ExistenciasPage,
  MovimientosPage,
  AuditoriaPage,
  InventarioConfigPage,
} from "@/pages/inventario";
import { ConfiguracionPage } from "@/pages/configuracion";
import { SeleccionarPage } from "@/pages/seleccionar";
import { AsistentePage, AsistenteConfigPage } from "@/pages/asistente";
import { ConversacionesPage, HistorialAtencionPage, AnaliticaConversacionesPage, ConversacionesConfigPage } from "@/pages/conversaciones";
import { SimuladorWhatsApp } from "@/pages/simulador";
import { OperadorRegistroPage } from "@/pages/operador";
import { RequireSession } from "@/app/RequireSession";
import { CapabilityGuard } from "@/app/CapabilityGuard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import SupportPage from "@/pages/SupportPage";
import HelpPage from "@/pages/HelpPage";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import CookiesPage from "@/pages/CookiesPage";
import ModulosPage from "@/pages/ModulosPage";
import {
  PerfilOnboardingPage,
  OrganizacionOnboardingPage,
  OnboardingModulosPage,
  PedidosOnboardingPage,
  EncuestaOnboardingPage,
} from "@/pages/onboarding";
import ProfilePage from "@/pages/ProfilePage";
import { bootstrapAssistant } from "@/assistant/bootstrap";
import { bootstrapConversaciones } from "@/lib/db.bootstrap";
import { activarModoDemo, modoDemoActivo } from "@/lib/modo-demo";

// Cablea el asistente ("Necto Intelligence") una sola vez al cargar el módulo de
// rutas, antes de la primera pregunta. `bootstrapAssistant` es idempotente.
bootstrapAssistant();

// Conecta Conversaciones con `necto`: asegura sesión, comprueba la cadena de
// permisos y hace la primera lectura real. Idempotente (guarda interna, segura
// bajo el doble montaje de StrictMode).
//
// Va aquí y no en el constructor del store a propósito: los stores son
// singleton de import, así que hacer I/O en el constructor convertiría un
// `import` en un efecto de red —y un test que importe el store dispararía dos
// peticiones. Mismo patrón y mismo motivo que `bootstrapAssistant()`.
//
// No se espera el resultado: `conversacionesStore.origenDatos` empieza en
// `seed`, pasa por `cargando` y termina en `real` o vuelve a `seed` con el
// motivo escrito. La UI decide qué decir con eso; bloquear el primer render
// dejaría la app en blanco durante la ida y vuelta a la red.
void bootstrapConversaciones();

// ── Por qué Conversaciones necesita el modo demo y Pedidos no ───────────────
//
// `ModuloGuard modulo="conversaciones"` lee `organizacionStore.estaActivo()`,
// que para este módulo delega en `tieneConectorActivo("whatsapp")`. Y ese
// conector NO se puede encender suelto: `IdModuloNegocio` es
// `"pedidos" | "inventario"`, y `tieneConectorActivo` recorre esas claves
// buscando una con el conector encendido. Con el estado de fábrica (ningún
// módulo instalado) no hay ninguna clave donde ponerlo.
//
// Consecuencia real: con el canal enlazado en `necto.integracion_canal`
// (`proveedor='whatsapp'`, `conectado=true`) y mensajes del bot ya escritos en
// `necto.mensaje`, la app redirigía a `/configuracion?tab=modulos` — y el
// operador concluía «el módulo no está» cuando nadie había escrito la fila
// local. Ver `@/lib/modo-demo` para el razonamiento completo.
//
// Se siembra la pertenencia SOLO si no hay ninguna: en una organización con
// módulos ya configurados no se toca nada.
if (modoDemoActivo()) {
  activarModoDemo();
}

const RedireccionViendoComo = () => (
  <Navigate
    to={sessionStore.hasPermission("team.manage") ? "/equipo" : "/seleccionar"}
    replace
  />
);

const LegacyEquipoIdRedirect = () => {
  const { id } = useParams();
  return <Navigate to={id ? `/equipo/${id}` : "/equipo"} replace />;
};

/**
 * Guarda de pertenencia (nivel 2): si la ORGANIZACIÓN no tiene el módulo o plugin
 * activo, redirige a la configuración de módulos.
 *
 * Lee de `organizacionStore`, que es la fuente de verdad de la pertenencia. Antes
 * leía de `plataformaStore`, y eso hacía que esta guarda y la pantalla de workspace
 * dieran respuestas distintas a la misma pregunta — con dos stores, en el mismo
 * render. Ver `outputs/analisis-jerarquia-modulos.md` §4.
 *
 * Va a `?tab=modulos` y no a `/configuracion` a secas: la pestaña por defecto es
 * «General», y esta guarda significa «ve a encender un módulo». Apuntar a la
 * pestaña equivocada convierte una redirección útil en un clic extra.
 */
const ModuloGuard = observer(({ modulo, children }: { modulo: string; children: React.ReactNode }) => {
  if (!organizacionStore.estaActivo(modulo)) {
    return <Navigate to="/configuracion?tab=modulos" replace />;
  }
  return <>{children}</>;
});

export default function App() {
  return (
    <Routes>
      {/* Rutas con Shell */}
      <Route element={<RequireSession><AppShell /></RequireSession>}>
        {/* Módulo Pedidos (condicionado a que esté activo en plataforma) */}
        <Route path="/pedidos/inicio" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="orders.read"><PedidosInicioPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="orders.read"><TableroPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos/crear" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="orders.create"><CrearPedidoPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos/historial" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="orders.read"><PedidosHistorialPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos/analitica" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="orders.read"><PedidosAnaliticaPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos/config" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="settings.read"><PedidosConfigPage /></CapabilityGuard></ModuloGuard>} />

        {/* Módulo Inventario — espejo exacto de Pedidos, con las MISMAS dos
            guardas apiladas y sin `React.lazy`: el repo no hace code splitting y
            las páginas de Pedidos se importan estáticamente. Introducirlo aquí
            sería cambiar la arquitectura de carga para un módulo.

            `/inventario/inicio` es la ruta de ENTRADA (la del catálogo y la del
            redirect del login) y `/inventario` es «Existencias», igual que en
            Pedidos `/pedidos/inicio` es la llegada y `/pedidos` el tablero. La
            distinción está escrita en `plataforma.store.ts` y manda la de
            entrada.

            `config` se entra con `settings.read` y se guarda con
            `settings.manage`, como las otras tres configuraciones. */}
        <Route path="/inventario/inicio" element={<ModuloGuard modulo="inventario"><CapabilityGuard capacidad="inventory.read"><InventarioInicioPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventario" element={<ModuloGuard modulo="inventario"><CapabilityGuard capacidad="inventory.read"><ExistenciasPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventario/movimientos" element={<ModuloGuard modulo="inventario"><CapabilityGuard capacidad="inventory.read"><MovimientosPage /></CapabilityGuard></ModuloGuard>} />
        {/* El conteo físico se MIRA con `inventory.read` y se ESCRIBE con
            `inventory.adjust`, que es la misma capacidad que ya protege el
            ajuste manual del kárdex. La compuerta de la ruta es la de lectura a
            propósito: negar la pantalla a quien no puede conciliar escondería
            las discrepancias que esa persona necesita ver. Lo que se apaga es el
            botón, con su motivo escrito. */}
        <Route path="/inventario/auditoria" element={<ModuloGuard modulo="inventario"><CapabilityGuard capacidad="inventory.read"><AuditoriaPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventario/config" element={<ModuloGuard modulo="inventario"><CapabilityGuard capacidad="settings.read"><InventarioConfigPage /></CapabilityGuard></ModuloGuard>} />

        {/* Organización — DOS pantallas hermanas: configuración de la
            organización y equipo. Las dos exigen `team.manage`.

            ── Por qué están separadas ──────────────────────────────────────
            `/configuracion` agrupa lo que se ajusta UNA VEZ: identidad, región
            y qué módulos están encendidos. `/equipo` agrupa lo que se hace
            CADA SEMANA: invitar a alguien, aprobar una solicitud, cambiar un
            rol. Estuvieron unidas como pestañas de una sola pantalla y el
            usuario las buscaba por separado: enterrar una tarea recurrente
            dentro de «Configuración» obliga a dos clics y a saber de antemano
            que está ahí. El sidebar las muestra seguidas.

            `/configuracion` es la ruta canónica, frente a las configs por módulo
            (`/pedidos/config`, `/conversaciones/config`, `/asistente/config`).

            ── Compatibilidad ──────────────────────────────────────────────
            `/configuracion?tab=equipo` era la pestaña de equipo y ahora
            redirige a `/equipo` (la guarda vive en `ConfiguracionPage`, porque
            resolverla aquí exigiría leer el query string en la tabla de rutas).
            `/configuracion?tab=general` y `?tab=modulos` siguen funcionando.
            `/equipo/:id` es el perfil de una persona, que se abre desde la
            tabla de equipo. */}
        <Route path="/configuracion" element={<CapabilityGuard capacidad="team.manage"><ConfiguracionPage /></CapabilityGuard>} />
        <Route path="/equipo" element={<CapabilityGuard capacidad="team.manage"><EquipoPage /></CapabilityGuard>} />
        <Route path="/equipo/:id" element={<CapabilityGuard capacidad="team.manage"><PerfilOperadorPage /></CapabilityGuard>} />
        <Route path="/organizacion/configuracion" element={<Navigate to="/configuracion?tab=modulos" replace />} />
        <Route path="/organizacion/modulos" element={<Navigate to="/configuracion?tab=modulos" replace />} />

        {/* Redirecciones legacy para compatibilidad. Apuntan a `/equipo`, que es
            el ÚNICO sitio donde se declara a dónde va el equipo: repetir el
            destino final en cada alias es cómo tres rutas empiezan a discrepar. */}
        <Route path="/pedidos/equipo" element={<Navigate to="/equipo" replace />} />
        <Route path="/pedidos/equipo/:id" element={<LegacyEquipoIdRedirect />} />
        <Route path="/pedidos/operadores" element={<Navigate to="/equipo" replace />} />

        {/* Plugin Necto IA */}
        <Route path="/asistente" element={<ModuloGuard modulo="asistente"><CapabilityGuard capacidad="assistant.use"><AsistentePage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/asistente/config" element={<ModuloGuard modulo="asistente"><CapabilityGuard capacidad="assistant.use"><AsistenteConfigPage /></CapabilityGuard></ModuloGuard>} />

        {/* Plugin Canales WhatsApp */}
        <Route path="/conversaciones" element={<ModuloGuard modulo="conversaciones"><CapabilityGuard capacidad="channels.read"><ConversacionesPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/conversaciones/historial" element={<ModuloGuard modulo="conversaciones"><CapabilityGuard capacidad="channels.read"><HistorialAtencionPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/conversaciones/analitica" element={<ModuloGuard modulo="conversaciones"><CapabilityGuard capacidad="channels.read"><AnaliticaConversacionesPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/conversaciones/config" element={<ModuloGuard modulo="conversaciones"><CapabilityGuard capacidad="channels.manage"><ConversacionesConfigPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/dashboard" element={<Navigate to="/pedidos/inicio" replace />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/perfil" element={<ProfilePage />} />
      </Route>

      {/* Onboarding: Perfil -> Organización -> Módulos -> Encuesta final */}
      <Route path="/onboarding/perfil" element={<PerfilOnboardingPage />} />
      <Route path="/onboarding/organizacion" element={<OrganizacionOnboardingPage />} />
      <Route path="/onboarding/modulos" element={<OnboardingModulosPage />} />
      <Route path="/onboarding/pedidos" element={<PedidosOnboardingPage />} />
      <Route path="/onboarding/encuesta" element={<EncuestaOnboardingPage />} />

      {/* Módulos de la organización. `/modulos` es la canónica; las otras dos eran
          la misma pantalla con tres nombres distintos (`/workspaces`,
          `/workspace/modulos`), que es la ambigüedad «Workspace vs Organización»
          resuelta a favor de Organización. Redirigen, no duplican.

          COMPUERTA: esta ruta gestiona módulos (instalar, desinstalar) igual que
          `/configuracion`, así que exige lo mismo. Antes vivía fuera de toda
          guarda: sin sesión se renderizaba entera —con el nombre y la moneda de la
          organización— y su botón «Entrar al módulo» concedía una sesión de
          administrador. Sigue FUERA del `AppShell` a propósito (pinta su propio
          marco a pantalla completa, sin sidebar), pero `RequireSession` y
          `CapabilityGuard` no necesitan el shell: se apilan aquí. Medido en
          `outputs/flujos-config-verify/`. */}
      <Route
        path="/modulos"
        element={
          <RequireSession>
            <CapabilityGuard capacidad="team.manage">
              <ModulosPage />
            </CapabilityGuard>
          </RequireSession>
        }
      />
      <Route path="/workspaces" element={<Navigate to="/modulos" replace />} />
      <Route path="/workspace/modulos" element={<Navigate to="/modulos" replace />} />

      {/* Autenticación & Acceso */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Soporte, Ayuda y Páginas Legales (Acceso Libre) */}
      <Route path="/ayuda" element={<HelpPage />} />
      <Route path="/soporte" element={<SupportPage />} />
      <Route path="/terminos" element={<TermsPage />} />
      <Route path="/privacidad" element={<PrivacyPage />} />
      <Route path="/cookies" element={<CookiesPage />} />

      <Route path="/seleccionar" element={<SeleccionarPage />} />
      <Route path="/operador/registro" element={<OperadorRegistroPage />} />
      <Route path="/operador/login" element={<RedireccionViendoComo />} />
      <Route path="/wa" element={<SimuladorWhatsApp />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
