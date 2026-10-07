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
  DisplayPedidosScreen,
  CatalogoPage,
} from "@/pages/pedidos";
import { PerfilOperadorPage, EquipoPage } from "@/pages/equipo";

import { ConfiguracionPage } from "@/pages/configuracion";
import { SeleccionarPage } from "@/pages/seleccionar";
import { AsistentePage, AsistenteConfigPage } from "@/pages/asistente";
import { ConversacionesPage, HistorialAtencionPage, AnaliticaConversacionesPage, ConversacionesConfigPage } from "@/pages/conversaciones";
import {
  DashboardPage,
  InventariosPage,
  CrearInventarioPage,
  DetalleInventarioPage,
  ElementosPage,
  DetalleElementoPage,
  UbicacionesPage,
  HistorialPage as InventariosHistorialPage,
  AlertasPage as InventariosAlertasPage,
  ReportesPage as InventariosReportesPage,
  InventariosConfigPage,
  ProductosPage,
  DetalleProductoPage,
  SedesPage,
  OrdenesPage,
  ProveedoresPage,
} from "@/pages/inventarios";
import { SimuladorWhatsApp } from "@/pages/simulador";
import { OperadorRegistroPage, OperadorLoginPage } from "@/pages/operador";
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
import { CheckoutGlobalPayPage } from "@/pages/checkout/CheckoutGlobalPayPage";
import { MenuCatalogoPage } from "@/pages/menu/MenuCatalogoPage";
import { bootstrapAssistant } from "@/assistant/bootstrap";
import { bootstrapConversaciones } from "@/lib/db.bootstrap";
import { autoHidratarSesionSupabase } from "@/lib/auth.service";
import { activarModoDemo, modoDemoActivo } from "@/lib/modo-demo";

// Cablea el asistente ("Necto Intelligence") una sola vez al cargar el módulo de
// rutas, antes de la primera pregunta. `bootstrapAssistant` es idempotente.
bootstrapAssistant();

// Hidrata sesión desde Supabase Auth si ya existe token persistido
void autoHidratarSesionSupabase();

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
// `"pedidos" | "inventarios"`, y `tieneConectorActivo` recorre esas claves
// buscando una con el conector encendido. Con el estado de fábrica (ningún
// módulo instalado) no hay ninguna clave donde ponerlo.
//
// Nota sobre Inventarios: el módulo nuevo **no tiene conectores** y su
// `DETALLE_CONECTORES` los declara con beneficios vacíos, así que la sección
// «Canales» de la configuración no ofrece encender uno ahí. Este comentario
// hablaba antes de un `inventario` en singular que era el módulo eliminado.
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
        <Route path="/pedidos/catalogo" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="orders.read"><CatalogoPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos/crear" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="orders.create"><CrearPedidoPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos/historial" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="orders.read"><PedidosHistorialPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos/chats" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="channels.read"><ConversacionesPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos/analitica" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="orders.read"><PedidosAnaliticaPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos/config" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="settings.read"><PedidosConfigPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/pedidos/operadores" element={<ModuloGuard modulo="pedidos"><CapabilityGuard capacidad="team.read"><EquipoPage modulo="pedidos" /></CapabilityGuard></ModuloGuard>} />

        {/* Módulo Inventarios */}
        <Route path="/inventarios" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="inventory.read"><DashboardPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventarios/dashboard" element={<Navigate to="/inventarios" replace />} />
        <Route path="/inventarios/productos" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="inventory.read"><ProductosPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventarios/productos/:id" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="inventory.read"><DetalleProductoPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventarios/sedes" element={<Navigate to="/inventarios/productos" replace />} />
        <Route path="/inventarios/ordenes" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="inventory.read"><OrdenesPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventarios/proveedores" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="inventory.read"><ProveedoresPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventarios/reportes" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="inventory.read"><InventariosReportesPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventarios/config" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="inventory.read"><InventariosConfigPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventarios/operadores" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="team.read"><EquipoPage modulo="inventarios" /></CapabilityGuard></ModuloGuard>} />

        {/* Compatibilidad de rutas legacy */}
        <Route path="/inventarios/elementos" element={<Navigate to="/inventarios/productos" replace />} />
        <Route path="/inventarios/elementos/:id" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="inventory.read"><DetalleElementoPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventarios/ubicaciones" element={<Navigate to="/inventarios/sedes" replace />} />
        <Route path="/inventarios/historial" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="inventory.read"><InventariosHistorialPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventarios/alertas" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="inventory.read"><InventariosAlertasPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventarios/nuevo" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="inventory.count"><CrearInventarioPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventarios/conteos" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="inventory.read"><InventariosPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventarios/conteos/:id" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="inventory.read"><DetalleInventarioPage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/inventarios/:id" element={<ModuloGuard modulo="inventarios"><CapabilityGuard capacidad="inventory.read"><DetalleProductoPage /></CapabilityGuard></ModuloGuard>} />


        {/* Organización */}
        <Route path="/configuracion" element={<CapabilityGuard capacidad="team.manage"><ConfiguracionPage /></CapabilityGuard>} />
        <Route path="/equipo" element={<Navigate to="/pedidos/operadores" replace />} />
        <Route path="/equipo/:id" element={<CapabilityGuard capacidad="team.manage"><PerfilOperadorPage /></CapabilityGuard>} />
        <Route path="/organizacion/configuracion" element={<Navigate to="/configuracion?tab=modulos" replace />} />
        <Route path="/organizacion/modulos" element={<Navigate to="/configuracion?tab=modulos" replace />} />

        {/* Redirecciones legacy para compatibilidad */}
        <Route path="/pedidos/equipo" element={<Navigate to="/pedidos/operadores" replace />} />
        <Route path="/pedidos/equipo/:id" element={<LegacyEquipoIdRedirect />} />

        {/* Plugin Necto IA */}
        <Route path="/asistente" element={<ModuloGuard modulo="asistente"><CapabilityGuard capacidad="assistant.use"><AsistentePage /></CapabilityGuard></ModuloGuard>} />
        <Route path="/asistente/config" element={<ModuloGuard modulo="asistente"><CapabilityGuard capacidad="assistant.use"><AsistenteConfigPage /></CapabilityGuard></ModuloGuard>} />

        {/* Plugin Canales WhatsApp / Chats en Pedidos */}
        <Route path="/conversaciones" element={<Navigate to="/pedidos/chats" replace />} />
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
      {/* Pasarela de Pago GlobalPay de Redeban (Acceso Libre) */}
      <Route path="/checkout/:ref" element={<CheckoutGlobalPayPage />} />
      <Route path="/checkout" element={<CheckoutGlobalPayPage />} />
      <Route path="/pagos/:ref" element={<CheckoutGlobalPayPage />} />

      {/* Carta / Catálogo digital Externo (Acceso Libre) */}
      <Route path="/menu" element={<MenuCatalogoPage />} />
      <Route path="/carta" element={<MenuCatalogoPage />} />
      <Route path="/catalogo" element={<MenuCatalogoPage />} />
      <Route path="/pedidos/menu" element={<MenuCatalogoPage />} />

      {/* Pantalla Display de Sala / Mostrador (Fullscreen TV) */}
      <Route path="/pedidos/display" element={<DisplayPedidosScreen />} />
      <Route path="/display" element={<DisplayPedidosScreen />} />

      <Route path="/seleccionar" element={<SeleccionarPage />} />
      <Route path="/operador/registro" element={<OperadorRegistroPage />} />
      <Route path="/operador/login" element={<OperadorLoginPage />} />
      <Route path="/wa" element={<SimuladorWhatsApp />} />
      <Route path="/" element={<Navigate to="/pedidos/inicio" replace />} />
      <Route path="*" element={<Navigate to="/pedidos/inicio" replace />} />
    </Routes>
  );
}
