import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useBusiness,
  NectoModuleKey,
  BusinessType,
  OfferModel,
  BusinessChannelConfig,
  BUSINESS_ARCHETYPES,
  DEFAULT_OPENING_DAYS,
  DEFAULT_OPENING_HOURS,
  suggestBranchCode,
} from "../context/BusinessContext";
import { useAuth } from "../auth/AuthContext";
import { NectoLogo } from "../compositions/shared/NectoLogo";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements";
import { ArrowRight, ArrowLeft, Rocket } from "lucide-react";
import {
  MODULE_DEFINITIONS,
  OFFER_MODEL_LABEL,
  currencyForCountry,
  slugify,
  wizardSteps,
} from "./onboarding.constants";
import { OnboardingStepper } from "./onboarding/OnboardingStepper";
import { OnboardingBrandPanel, type OnboardingSummary } from "./onboarding/OnboardingBrandPanel";
import { StepStoreIdentity } from "./onboarding/StepStoreIdentity";
import { StepBranchIdentity } from "./onboarding/StepBranchIdentity";
import { StepBranchLocation } from "./onboarding/StepBranchLocation";
import { StepBranchOperation } from "./onboarding/StepBranchOperation";
import { StepBranchModules } from "./onboarding/StepBranchModules";
import { StepBranchWhatsApp } from "./onboarding/StepBranchWhatsApp";
import { eventBus } from "@/infrastructure/eventBus";

/**
 * Alta de **sucursal** (`/onboarding`).
 *
 * El modelo es `Titular → Tienda → Sucursales`, y este flujo configura el último
 * nivel: una **unidad operativa**. Nunca registra al propietario (eso es la
 * cuenta y su perfil, en `/onboarding/perfil`) ni vuelve a tipificar el negocio.
 *
 * Por eso los pasos dependen de si la tienda ya existe:
 * - **Sin sucursales**: la primera es la que da de alta la tienda, así que el
 *   wizard abre con un paso de ámbito **tienda** (tipo de negocio, modelo de
 *   oferta, mercado) y después pide los datos de la sucursal.
 * - **Con sucursales**: la identidad de la tienda se hereda (`storeIdentity`) y
 *   el wizard sólo pregunta nombre, código, ubicación, contacto y operación.
 *
 * ⚠️ Este wizard exige **sesión, no un perfil completo**. Un guard que redirija a
 * `/onboarding/perfil` cuando falte algún dato del perfil secuestra la acción que
 * el usuario acaba de pedir: pulsar "Nueva sucursal" con un perfil sin teléfono
 * (cuentas anteriores al paso del titular) mandaba al formulario de perfil en
 * lugar de crear la sede. El orden de los flujos ya garantiza la regla "la
 * persona antes que la sede", así que aquí no hace falta bloquear a nadie.
 */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const { createBusiness, businesses } = useBusiness();
  const { profile, isLoading } = useAuth();

  const steps = wizardSteps();
  const [step, setStep] = useState(1);
  const current = steps[step - 1];

  /* ── Ámbito tienda (sólo cuando hay que darla de alta) ─────────────── */
  const [selectedArchetype, setSelectedArchetype] = useState<BusinessType>("retail_store");
  const [selectedOfferModel, setSelectedOfferModel] = useState<OfferModel>("physical_products");
  const [country, setCountry] = useState("Colombia");

  /* ── Ámbito sucursal ───────────────────────────────────────────────── */
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [openingDays, setOpeningDays] = useState(DEFAULT_OPENING_DAYS);
  const [openingHours, setOpeningHours] = useState(DEFAULT_OPENING_HOURS);
  const [selectedModules, setSelectedModules] = useState<NectoModuleKey[]>(["pedidos", "inventarios"]);
  const [channels, setChannels] = useState<BusinessChannelConfig>({ whatsapp: false, web: true, pos: true });
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  /**
   * Código sugerido (`SUC-01`, `SUC-02`…) mientras el usuario no escriba el suyo.
   * Se deriva en cada render en lugar de guardarse: así el número sigue al
   * catálogo real de sucursales y no a un valor capturado al montar.
   */
  const suggestedCode = suggestBranchCode(businesses.length + 1);
  const effectiveCode = codeTouched ? branchCode : suggestedCode;

  /**
   * El teléfono de la sede se precarga con el contacto que **la tienda** ya
   * conoce: la línea de otra sede de la misma red. Es el mismo dato —un número de
   * atención de una sucursal— y ahorra volver a escribirlo.
   *
   * ⚠️ **No se usa el teléfono del perfil.** El de la persona es suyo (su móvil de
   * contacto, editable en Ajustes → Perfil) y el de la sede es la línea que
   * atiende al público: son dos datos distintos de dos ámbitos distintos, y
   * mezclarlos publicaba el móvil del titular como teléfono de atención de la
   * tienda. Si no hay ninguna línea de sede que heredar, el campo llega vacío y lo
   * escribe quien crea la sucursal — una sede puede tener su propia línea.
   */
  const suggestedPhone = businesses[0]?.contactPhone || "";
  useEffect(() => {
    if (phoneTouched || contactPhone) return;
    if (suggestedPhone) setContactPhone(suggestedPhone);
  }, [phoneTouched, contactPhone, suggestedPhone]);

  /**
   * Sin sesión no hay a quién asignar la sede: al login. Con sesión se entra
   * siempre, aunque al perfil le falten datos (ver el aviso de arriba). Se espera
   * a `isLoading` para no expulsar a quien sí tiene sesión persistida.
   */
  useEffect(() => {
    if (isLoading) return;
    if (!profile) navigate("/login", { replace: true });
  }, [isLoading, profile, navigate]);

  const currentArchetype =
    BUSINESS_ARCHETYPES.find(a => a.id === selectedArchetype) || BUSINESS_ARCHETYPES[1];

  /** ¿Se puede salir del paso actual? Gobierna el avance y el stepper. */
  const canProceed =
    current?.key === "branch"
      ? branchName.trim().length >= 2
      : current?.key === "location"
      ? city.trim().length >= 2
      : true;

  const handleSelectArchetype = (type: BusinessType) => {
    setSelectedArchetype(type);
    const arch = BUSINESS_ARCHETYPES.find(a => a.id === type);
    if (arch) {
      setSelectedOfferModel(arch.defaultOfferModel);
      setSelectedModules(arch.recommendedModules);
    }
  };

  const handleToggleModule = (key: NectoModuleKey) => {
    setSelectedModules(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  };

  const handleToggleChannel = (key: keyof BusinessChannelConfig, next: boolean) => {
    setChannels(prev => ({ ...prev, [key]: next }));
  };

  /**
   * Conectar WhatsApp en el alta.
   *
   * Ya **no** escribe la clave global `necto_whatsapp_connected`: el estado de la
   * conexión es de la sede y se persiste con ella en `channelConnections` (ver
   * `handleFinish`). La clave de `localStorage` era compartida por todas las
   * tiendas del navegador, así que conectar una conectaba las demás.
   */
  const handleWhatsAppConnected = () => {
    setWhatsappConnected(true);
    eventBus.publish("necto_notification_created", {
      title: "WhatsApp vinculado",
      desc: `La sesión de ${contactPhone || "tu teléfono"} quedó activa. Ya recibes mensajes y órdenes por este canal.`,
      type: "system",
      sourceKey: "whatsapp_connection",
    });
  };

  /**
   * Persiste la sucursal. Los datos de ámbito tienda se toman de `storeIdentity`
   * cuando la tienda ya existe; sólo en la primera sucursal se usan los elegidos
   * en el paso de tienda.
   */
  const handleFinish = () => {
    setIsDeploying(true);
    setTimeout(() => {
      try {
        const resolvedArchetype =
          BUSINESS_ARCHETYPES.find(a => a.id === selectedArchetype) || currentArchetype;

        createBusiness({
          // ── Sucursal ──
          name: branchName.trim(),
          slug: slugify(branchName || "sucursal"),
          code: effectiveCode.trim(),
          address: address.trim(),
          city: city.trim(),
          contactPhone: contactPhone.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined,
          openingDays: openingDays.trim(),
          openingHours: openingHours.trim(),
          // Conectar WhatsApp implica que el canal queda vivo: una sesión activa
          // con el canal apagado no significa nada.
          channels: whatsappConnected ? { ...channels, whatsapp: true } : channels,
          // ── Canal ──
          channelConnections: whatsappConnected
            ? [
                {
                  type: "whatsapp" as const,
                  status: "connected" as const,
                  displayPhoneNumber: contactPhone.trim() || undefined,
                  connectedAt: new Date().toISOString(),
                  metadata: { demo: true },
                },
              ]
            : [],
          kitchenBufferMin: selectedArchetype === "restaurant_virtual" ? 20 : 10,
          activeModules: selectedModules,
          // ── Ámbito sede independiente ──
          businessType: selectedArchetype,
          offerModel: selectedOfferModel,
          iconKey: resolvedArchetype.iconKey,
          currency: currencyForCountry(country),
          country,
          specialty: resolvedArchetype.label,
        });
        navigate("/");
      } catch (err) {
        console.error("Error creating branch:", err);
        setIsDeploying(false);
      }
    }, 600);
  };

  /** Resumen en vivo del panel de marca, con el ámbito siempre explícito. */
  const summary: OnboardingSummary =
    current?.key === "store"
      ? {
          eyebrow: "Tipo de negocio",
          title: currentArchetype.label,
          lines: [
            OFFER_MODEL_LABEL[selectedOfferModel],
            `${country} · ${currencyForCountry(country)}`,
          ],
        }
      : current?.key === "modules"
      ? {
          eyebrow: "Tu sucursal",
          title: branchName.trim() || "Sin nombre todavía",
          lines: [
            `${selectedModules.length} de ${MODULE_DEFINITIONS.length} módulos activos`,
            `${openingDays} · ${openingHours}`,
          ],
        }
      : current?.key === "whatsapp"
      ? {
          eyebrow: "Tu sucursal",
          title: branchName.trim() || "Sin nombre todavía",
          lines: [
            whatsappConnected
              ? "WhatsApp Business conectado"
              : "WhatsApp sin conectar (opcional)",
            `${selectedModules.length} módulos · ${effectiveCode}`,
          ],
        }
      : {
          eyebrow: "Tu sucursal",
          title: branchName.trim() || "Sin nombre todavía",
          lines: [
            effectiveCode,
            city.trim() || country,
            `${openingDays} · ${openingHours}`,
          ],
        };

  return (
    <div className="w-full min-h-screen bg-white text-gray-900 antialiased selection:bg-brand-500 selection:text-white dark:bg-gray-950 dark:text-gray-100">
      <PageMeta
        title="Nueva sucursal — NECTO"
        description="Configura una unidad operativa de tu tienda"
      />

      <div className="grid w-full min-h-screen grid-cols-1 lg:grid-cols-12">
        {/* ── Izquierda: cabecera + asistente ─────────────────────────── */}
        <div className="flex flex-col justify-between px-6 py-8 sm:px-10 sm:py-10 lg:col-span-7 lg:px-16 lg:py-12">
          {/* Header integrado en la columna izquierda */}
          <div className="flex items-center justify-between pb-8">
            <div className="flex items-center gap-3">
              <NectoLogo size="xs" inline />
              <span className="hidden h-5 w-px bg-gray-200 sm:block dark:bg-gray-800" />
              <span className="hidden text-theme-xs font-semibold uppercase tracking-wider text-gray-400 sm:inline dark:text-gray-500">
                Nueva sucursal
              </span>
            </div>
          </div>

          {/*
            ⚠️ `max-w-xl` (576 px) dejaba las rejillas de 4 tarjetas del paso 1 a
            ~137 px cada una: el rótulo se apretaba y la columna mostraba un hueco
            muerto a la derecha mientras las tarjetas se apiñaban. El paso de
            "Tipo de negocio" es una rejilla, no un formulario: necesita ancho.
            Se ensancha sólo la columna de contenido (el `lg:px-16` ya deja aire
            contra el borde), no el aside de marca.
          */}
          <div className="mx-auto my-auto w-full max-w-2xl">
            <OnboardingStepper
              steps={steps}
              step={step}
              canProceed={canProceed}
              onSelect={setStep}
            />

            {current?.key === "store" && (
              <StepStoreIdentity
                eyebrow={`Paso ${step} — Tipo de negocio`}
                selectedArchetype={selectedArchetype}
                selectedOfferModel={selectedOfferModel}
                country={country}
                onSelectArchetype={handleSelectArchetype}
                onSelectOfferModel={setSelectedOfferModel}
                onCountryChange={setCountry}
              />
            )}

            {current?.key === "branch" && (
              <StepBranchIdentity
                eyebrow={`Paso ${step} — La sucursal`}
                branchName={branchName}
                branchCode={effectiveCode}
                contactPhone={contactPhone}
                onBranchNameChange={setBranchName}
                onBranchCodeChange={value => {
                  setBranchCode(value);
                  setCodeTouched(true);
                }}
                onContactPhoneChange={value => {
                  setContactPhone(value);
                  setPhoneTouched(true);
                }}
              />
            )}

            {current?.key === "location" && (
              <StepBranchLocation
                eyebrow={`Paso ${step} — Ubicación`}
                country={country}
                address={address}
                city={city}
                contactEmail={contactEmail}
                onAddressChange={setAddress}
                onCityChange={setCity}
                onContactEmailChange={setContactEmail}
              />
            )}

            {current?.key === "operation" && (
              <StepBranchOperation
                eyebrow={`Paso ${step} — Operación`}
                openingDays={openingDays}
                openingHours={openingHours}
                channels={channels}
                onOpeningDaysChange={setOpeningDays}
                onOpeningHoursChange={setOpeningHours}
                onToggleChannel={handleToggleChannel}
              />
            )}

            {current?.key === "modules" && (
              <StepBranchModules
                eyebrow={`Paso ${step} — Módulos de tienda`}
                selectedModules={selectedModules}
                onToggleModule={handleToggleModule}
              />
            )}

            {current?.key === "whatsapp" && (
              <StepBranchWhatsApp
                eyebrow={`Paso ${step} — WhatsApp Business`}
                phone={contactPhone}
                isConnected={whatsappConnected}
                onConnected={handleWhatsAppConnected}
                onSkip={handleFinish}
              />
            )}
          </div>

          {/* Footer nav — mismo ancho que el contenido, o el CTA se descuadra. */}
          <div className="sticky bottom-0 z-20 mx-auto mt-12 flex w-full max-w-2xl items-center justify-between bg-white/95 pt-6 pb-3 backdrop-blur-md dark:bg-gray-950/95">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex cursor-pointer items-center gap-1.5 text-theme-sm font-semibold text-gray-400 transition-colors hover:text-secondary-600 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/workspaces")}
                className="flex cursor-pointer items-center gap-1.5 text-theme-sm font-semibold text-gray-400 transition-colors hover:text-secondary-600 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Cancelar
              </button>
            )}

            {step < steps.length ? (
              <Button
                variant="primary"
                intent="onboarding.step.next"
                disabled={!canProceed}
                onClick={() => setStep(step + 1)}
                className="rounded-full px-6 font-bold"
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                intent="onboarding.step.finish"
                disabled={isDeploying}
                onClick={handleFinish}
                className="rounded-full px-7 font-bold"
              >
                {isDeploying ? "Creando sucursal…" : "Crear sucursal"}
                {!isDeploying && <Rocket className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        <OnboardingBrandPanel
          stepKey={current?.key ?? "branch"}
          isFirstStep={step === 1}
          summary={summary}
        />
      </div>
    </div>
  );
}
