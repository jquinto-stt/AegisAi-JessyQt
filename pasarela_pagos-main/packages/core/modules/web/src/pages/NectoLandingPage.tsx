/**
 * NectoLandingPage — Public marketing landing / home for the Necto SaaS platform.
 *
 * Standalone page (no AppShell/sidebar) rendered at the "/" route in
 * `src/app/App.tsx`. It is a showcase/demo for the payments-gateway product,
 * not production commerce: all figures and the dashboard preview are static.
 *
 * Composed from Webi.AI Elements catalog components (resolved via the Advisory
 * Flow): Button, Badge, Card/CardTitle/CardDescription, MetricCard, List and
 * BarChart. Brand identity (orange `brand-*` + `indigo-*`) is driven by the
 * design tokens overridden in `src/css/theme.css`, so the Elements components
 * inherit Necto's colors automatically.
 *
 * Sections (top to bottom): navbar, hero, "¿Qué es Necto?", benefits grid,
 * modules grid, final CTA banner, footer.
 */
import type { ReactNode } from "react";
import type { ApexOptions } from "apexcharts";
import { useNavigate } from "react-router";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { Card, CardTitle, CardDescription } from "@/elements/ui/card";
import { List } from "@/elements/ui/list";
import { MetricCard } from "@/compositions/metric-card";
import { BarChart } from "@/elements/ui/bar-chart";
import {
  ArrowRightIcon,
  BoltIcon,
  BoxCubeIcon,
  CartIcon,
  DocsIcon,
  DollarLineIcon,
  GroupIcon,
  LockIcon,
  PieChartIcon,
  TruckDelivery,
  UserCircleIcon,
} from "@/icons";

// ─── Static demo content ──────────────────────────────────────────────────

/** Benefit cards for the "¿Por qué elegir Necto?" section. */
const BENEFITS: { icon: ReactNode; title: string; description: string }[] = [
  { icon: <BoltIcon />, title: "Operaciones más ágiles", description: "Automatiza tareas repetitivas y reduce el tiempo operativo hasta en 60%, liberando a tu equipo para lo que realmente importa." },
  { icon: <GroupIcon />, title: "Acceso desde cualquier lugar", description: "Gestiona tu negocio desde cualquier dispositivo con conexión a internet. Sin instalaciones ni configuraciones complejas." },
  { icon: <LockIcon />, title: "Seguridad de nivel empresarial", description: "Tus datos están protegidos con encriptación de extremo a extremo, copias de seguridad automáticas y control de acceso por roles." },
  { icon: <PieChartIcon />, title: "Decisiones basadas en datos", description: "Reportes y dashboards en tiempo real que te dan la visibilidad completa de tu negocio para tomar mejores decisiones." },
  { icon: <ChatBubble />, title: "Colaboración sin fricciones", description: "Conecta a todo tu equipo en una misma plataforma con permisos por rol, notificaciones en tiempo real y flujos de aprobación." },
  { icon: <BoxCubeIcon />, title: "Escalable a tu ritmo", description: "Empieza con lo que necesitas hoy y amplía módulos a medida que tu negocio crece, sin migraciones ni interrupciones." },
];

/** Module cards for the "Todo en un solo lugar" section. */
const MODULES: { icon: ReactNode; title: string; description: string }[] = [
  { icon: <GroupIcon />, title: "Clientes y CRM", description: "Centraliza contactos, historial de interacciones y oportunidades de venta en un pipeline visual." },
  { icon: <CartIcon />, title: "Punto de Venta", description: "Gestiona pedidos, cotizaciones y ventas en mostrador con soporte para múltiples formas de pago." },
  { icon: <BoltIcon />, title: "Operaciones más ágiles", description: "Control de stock en tiempo real con alertas automáticas, movimientos y reportes de rotación." },
  { icon: <DocsIcon />, title: "Facturación", description: "Genera facturas electrónicas, gestiona cobros y lleva el flujo de caja con cumplimiento fiscal." },
  { icon: <UserCircleIcon />, title: "Recursos Humanos", description: "Administra empleados, asistencia, nómina y vacaciones desde un panel centralizado." },
  { icon: <PieChartIcon />, title: "Analítica y Reportes", description: "Dashboards personalizables con KPIs, tendencias y exportación en múltiples formatos." },
  { icon: <TruckDelivery />, title: "Compras y Proveedores", description: "Gestiona órdenes de compra, proveedores y cuentas por pagar en un solo flujo integrado." },
];

/** Feature checklist for the "¿Qué es Necto?" section (List variant="icon"). */
const WHATIS_FEATURES = [
  "Gestión de clientes y contactos en tiempo real",
  "Automatización de procesos y alertas inteligentes",
  "Reportes y análisis para decisiones estratégicas",
  "Multiusuario con roles y permisos granulares",
];

/** ApexCharts config for the "Ventas del mes" preview bar chart. */
const SALES_SERIES = [{ name: "Ventas", data: [38, 52, 45, 61, 48, 72, 55, 68, 60, 80, 66, 90] }];
const SALES_OPTIONS: ApexOptions = {
  chart: { type: "bar", toolbar: { show: false }, background: "transparent", fontFamily: "Outfit, sans-serif" },
  plotOptions: { bar: { columnWidth: "45%", borderRadius: 4, borderRadiusApplication: "end" } },
  colors: ["#ff3d00"],
  dataLabels: { enabled: false },
  legend: { show: false },
  grid: { show: false },
  xaxis: {
    categories: ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
    labels: { style: { colors: "#98a2b3", fontSize: "10px" } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: { show: false },
  tooltip: { theme: "dark", y: { formatter: (v: number) => `$${v}K` } },
};

/** Simple inline chat/collaboration glyph (no matching icon in the set). */
function ChatBubble() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Decorative concentric ring used in the hero, footer and CTA banner. */
function DecoRing({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full border-[12px] border-white/10 ${className ?? ""}`}
    />
  );
}

/** Section eyebrow — soft peach pill label rendered above section headings. */
function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Badge color="primary" size="sm" className="bg-brand-50 text-brand-600">
      {children}
    </Badge>
  );
}

// ─── Sub-sections ───────────────────────────────────────────────────────────

/** Sticky top navigation bar rendered over the hero. */
function Navbar({ onCta }: { onCta: () => void }) {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        {/* 1. Brand lockup — light tone so the wordmark reads on the orange hero */}
        <NectoLogo tone="light" />

        {/* 2. Center nav links */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#whatis" className="text-sm font-medium text-white/90 hover:text-white">¿Qué es Necto?</a>
          <a href="#benefits" className="text-sm font-medium text-white/90 hover:text-white">Beneficios</a>
          <a href="#modules" className="text-sm font-medium text-white/90 hover:text-white">Módulos</a>
          <button
            type="button"
            onClick={onCta}
            className="text-sm font-medium text-white/90 hover:text-white"
          >
            Enlaces de pago
          </button>
        </div>

        {/* 3. Auth actions + user pill */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="hidden text-white hover:bg-white/10 sm:inline-flex" onClick={onCta}>Iniciar sesión</Button>
          <Button variant="primary" size="sm" className="bg-white text-brand-600 hover:bg-white/90" onClick={onCta}>Crear cuenta</Button>
          <span className="ml-1 flex items-center gap-1 rounded-full bg-indigo-900 px-2 py-1.5 text-white">
            <UserCircleIcon className="size-5" />
            <ChevronDown />
          </span>
        </div>
      </nav>
    </header>
  );
}

/** Full-width orange hero with headline, CTAs and key stats. */
function Hero({ onCta }: { onCta: () => void }) {
  return (
    <section className="relative overflow-hidden bg-brand-500 pb-32 pt-28 text-white">
      {/* Decorative rings */}
      <DecoRing className="-right-16 top-10 h-72 w-72" />
      <DecoRing className="right-24 top-40 h-40 w-40" />
      <DecoRing className="-left-24 bottom-4 h-56 w-56" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          {/* 1. Headline */}
          <h1 className="text-title-md font-bold leading-tight sm:text-title-lg">
            Todo lo que necesitas para conectar y crecer.
          </h1>

          {/* 2. Supporting paragraph */}
          <p className="mt-5 max-w-xl text-base text-white/80">
            Gestiona tus relaciones, automatiza tus procesos y fortalece cada conexión
            desde una plataforma diseñada para impulsar el crecimiento de tu negocio.
          </p>

          {/* 3. CTAs */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Button size="lg" endIcon={<ArrowRightIcon className="size-5" />} className="bg-indigo-600 hover:bg-indigo-700" onClick={onCta}>
              Empezar gratis
            </Button>
            <Button size="lg" variant="outline" className="border-0 bg-white/10 text-white ring-1 ring-white/40 hover:bg-white/20" onClick={onCta}>
              Iniciar sesión
            </Button>
          </div>

          {/* 4. Stats row */}
          <div className="mt-12 flex flex-wrap gap-10">
            <HeroStat value="+500" caption="Negocios activos" />
            <HeroStat value="99.9%" caption="Disponibilidad" />
            <HeroStat value="+40%" caption="Más productividad" />
          </div>
        </div>
      </div>

      {/* Curved wave bottom edge */}
      <svg className="absolute inset-x-0 bottom-0 h-16 w-full text-gray-50" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">
        <path fill="currentColor" d="M0 80h1440V32C1200 64 960 0 720 0S240 64 0 32z" />
      </svg>
    </section>
  );
}

function HeroStat({ value, caption }: { value: string; caption: string }) {
  return (
    <div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-white/70">{caption}</div>
    </div>
  );
}

/** "¿Qué es Necto?" — text + feature checklist next to a dark dashboard preview. */
function WhatIsSection() {
  return (
    <section id="whatis" className="bg-gray-50 py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
        {/* Left column — copy + checklist */}
        <div>
          <SectionLabel>¿Qué es Necto?</SectionLabel>
          <h2 className="mt-4 text-title-sm font-bold text-indigo-600">
            Una plataforma diseñada para negocios que quieren crecer sin límites.
          </h2>
          <p className="mt-5 text-gray-500">
            Necto es un sistema integral de gestión empresarial que unifica en un solo lugar
            todo lo que necesitas: clientes, inventario, ventas, facturación y mucho más.
          </p>
          <p className="mt-4 text-gray-500">
            Diseñado para pymes y emprendedores que buscan una solución moderna, intuitiva y
            escalable, Necto crece contigo desde el primer día.
          </p>
          <List variant="icon" items={WHATIS_FEATURES} className="mt-6 w-full border-0 bg-transparent" />
        </div>

        {/* Right column — dark browser-window dashboard mockup (static showcase) */}
        <DashboardPreview />
      </div>
    </section>
  );
}

/** Static dark "browser window" framing a demo dashboard. Non-interactive. */
function DashboardPreview() {
  return (
    <div className="relative rounded-2xl bg-indigo-900 p-4 shadow-theme-xl">
      {/* Faux browser chrome */}
      <div className="mb-4 flex items-center gap-2">
        <span className="size-3 rounded-full bg-error-400" />
        <span className="size-3 rounded-full bg-warning-400" />
        <span className="size-3 rounded-full bg-success-400" />
        <span className="ml-3 flex-1 truncate rounded-md bg-white/10 px-3 py-1 text-xs text-white/50">app.necto.co — Panel de control</span>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard layout="compact" title="Clientes" value="1,284" change="12%" trend="up" className="bg-white/5 border-white/10" />
        <MetricCard layout="compact" title="Ventas" value="$38.4K" change="8.2%" trend="up" className="bg-white/5 border-white/10" />
        <MetricCard layout="compact" title="Pedidos" value="247" change="6%" trend="up" className="bg-white/5 border-white/10" />
      </div>

      {/* Sales bar chart */}
      <div className="mt-4 rounded-xl bg-white/5 p-4">
        <div className="mb-2 text-sm text-white/70">Ventas del mes</div>
        <BarChart options={SALES_OPTIONS} series={SALES_SERIES} height={160} />
      </div>

      {/* List rows with amounts */}
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-white/80"><span className="grid size-6 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white">A</span>Empresa Alpha</span>
          <span className="font-semibold text-white">$4,200</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-2.5 text-sm">
          <span className="text-white/80">Empresa Beta</span>
          <span className="font-semibold text-white">$2,800</span>
        </div>
      </div>

      {/* Floating performance badge */}
      <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-theme-lg">
        <span className="grid size-8 place-items-center rounded-lg bg-success-50 text-success-600"><BoltIcon /></span>
        <div>
          <div className="text-xs text-gray-500">Rendimiento hoy</div>
          <div className="text-sm font-semibold text-success-600">+38% vs. ayer</div>
        </div>
      </div>
    </div>
  );
}

/** Benefits grid — six IconCard-style benefit cards. */
function BenefitsSection() {
  return (
    <section id="benefits" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Beneficios</SectionLabel>
          <h2 className="mt-4 text-title-sm font-bold text-indigo-600">¿Por qué elegir Necto?</h2>
          <p className="mt-3 text-gray-500">
            Más que software, Necto es el socio tecnológico que tu negocio necesita para operar mejor cada día.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <FeatureCard key={b.title} icon={b.icon} title={b.title} description={b.description} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Modules grid — seven module cards. */
function ModulesSection() {
  return (
    <section id="modules" className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <SectionLabel>Módulos</SectionLabel>
          <h2 className="mt-4 text-title-sm font-bold text-indigo-600">Todo en un solo lugar</h2>
          <p className="mt-3 text-gray-500">
            Cada módulo está diseñado para integrarse perfectamente con los demás, formando un ecosistema completo para tu empresa.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((m) => (
            <FeatureCard key={m.title} icon={m.icon} title={m.title} description={m.description} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** IconCard pattern: brand icon square + title + description (Elements Card). */
function FeatureCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <Card>
      <div className="mb-5 flex size-12 items-center justify-center rounded-[10px] bg-brand-50 text-brand-500">
        {icon}
      </div>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </Card>
  );
}

/** Final CTA — deep indigo rounded banner with rings and two actions. */
function FinalCta({ onCta }: { onCta: () => void }) {
  return (
    <section className="bg-gray-50 pb-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-indigo-600 px-8 py-14 text-center text-white">
          <DecoRing className="-right-10 top-1/2 h-64 w-64 -translate-y-1/2 border-brand-500/40" />
          <DecoRing className="right-32 top-6 h-28 w-28" />
          <div className="relative mx-auto max-w-2xl">
            <Badge color="primary" size="sm" className="bg-white/15 text-white">Sin tarjeta de crédito requerida</Badge>
            <h2 className="mt-5 text-title-sm font-bold">Empieza a transformar tu negocio hoy mismo.</h2>
            <p className="mt-4 text-white/80">
              Únete a más de 5,000 empresas que ya confían en Necto para gestionar su crecimiento.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button size="lg" endIcon={<ArrowRightIcon className="size-5" />} onClick={onCta}>Crear cuenta gratis</Button>
              <Button size="lg" variant="outline" className="border-0 bg-white/10 text-white ring-1 ring-white/40 hover:bg-white/20" onClick={onCta}>Ya tengo cuenta</Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Orange footer — brand + socials, three link columns, copyright bar. */
function Footer() {
  return (
    <footer className="relative overflow-hidden bg-brand-500 text-white">
      <DecoRing className="-right-10 top-0 h-48 w-48" />
      <div className="relative mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand + social */}
          <div>
            <NectoLogo tone="light" />
            <div className="mt-5 flex gap-3">
              {["IG", "in", "X"].map((s) => (
                <span key={s} className="grid size-9 place-items-center rounded-full bg-white/15 text-xs font-semibold">{s}</span>
              ))}
            </div>
          </div>
          <FooterLinks title="Nosotros" />
          <FooterLinks title="Servicios" />
          <FooterLinks title="Contacto" />
        </div>
      </div>
      <div className="relative border-t border-white/20 py-5 text-center text-sm text-white/80">
        © 2025 Necto. Todos los derechos reservados.
      </div>
    </footer>
  );
}

function FooterLinks({ title }: { title: string }) {
  return (
    <div>
      <h4 className="font-semibold">{title}</h4>
      <ul className="mt-4 space-y-2 text-sm text-white/80">
        <li><a href="#" className="hover:text-white">Info</a></li>
        <li><a href="#" className="hover:text-white">Info</a></li>
        <li><a href="#" className="hover:text-white">Info</a></li>
      </ul>
    </div>
  );
}

/** Necto wordmark + "grow together" tagline. */
function NectoLogo({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const wordmark = tone === "light" ? "text-white" : "text-brand-500";
  const tag = tone === "light" ? "text-white/70" : "text-indigo-600";
  return (
    <div className="flex items-end gap-1.5">
      <span className={`text-2xl font-extrabold tracking-tight ${wordmark}`}>NECTO</span>
      <span className={`mb-0.5 text-[10px] font-semibold leading-none ${tag}`}>
        grow<br />together
      </span>
    </div>
  );
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * NectoLandingPage — assembles the full marketing home from the sections above.
 */
export const NectoLandingPage = () => {
  const navigate = useNavigate();
  // Primary CTAs lead into the app (the payment-link creator).
  const goToApp = () => navigate("/app/enlaces");
  return (
    <div className="min-h-screen bg-white font-outfit">
      <PageMeta title="Necto — Grow together" description="Plataforma SaaS de gestión empresarial. Todo lo que necesitas para conectar y crecer." />
      <Navbar onCta={goToApp} />
      <Hero onCta={goToApp} />
      <WhatIsSection />
      <BenefitsSection />
      <ModulesSection />
      <FinalCta onCta={goToApp} />
      <Footer />
    </div>
  );
};

export default NectoLandingPage;
