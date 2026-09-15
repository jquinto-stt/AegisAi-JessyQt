import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  DEFAULT_ACCENT,
  profileInitials,
  type AccentId,
  type ReferralSource,
  type UsageReason,
} from "../auth/profile";
import { accentCssVars } from "../compositions/shared/personalization";
import { NectoLogo } from "../compositions/shared/NectoLogo";
import { ThemeToggle } from "../compositions/shared/ThemeToggle";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements";
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react";
import { OnboardingStepper } from "./onboarding/OnboardingStepper";
import { NewUserBrandPanel } from "./onboarding/new-user/NewUserBrandPanel";
import { StepPersonalization } from "./onboarding/new-user/StepPersonalization";
import { StepCountry } from "./onboarding/new-user/StepCountry";
import { StepUsageReason } from "./onboarding/new-user/StepUsageReason";
import { StepReferral } from "./onboarding/new-user/StepReferral";
import { StepSupport } from "./onboarding/new-user/StepSupport";
import { NEW_USER_MESSAGES, NEW_USER_STEPS } from "./onboarding/new-user/new-user.constants";

/**
 * `onboarding_new_user` — la puesta a punto de la **persona** que acaba de crear
 * su cuenta.
 *
 * Es el destino de las dos vías de registro (formulario y Google) y **no** es el
 * alta de una tienda ni un segundo formulario de registro:
 *
 *   - No vuelve a pedir nombre, apellido ni correo: el registro ya los capturó.
 *   - No pregunta nada del negocio (nombre de tienda, tipo, dirección, sucursal,
 *     catálogo, inventario, pedidos, canales, WhatsApp). Todo eso es el flujo
 *     siguiente, que arranca desde el hub cuando el usuario lo decide.
 *
 * El `userId` tampoco se genera aquí: existe desde que se creó la cuenta. Este
 * asistente sólo completa a un usuario que ya existe y sella su finalización, que
 * es lo que impide que el flujo reaparezca en cada inicio de sesión.
 *
 * Si el usuario abandona a medias, al volver a entrar se retoma con lo que ya
 * había respondido (los campos se siembran desde el perfil persistido).
 */
export default function NewUserOnboardingPage() {
  const navigate = useNavigate();
  const { profile, completeNewUserOnboarding, isLoading } = useAuth();

  const [step, setStep] = useState(1);
  const current = NEW_USER_STEPS[step - 1];

  /* ── Paso 1 — Personalización ──────────────────────────────────────── */
  const [avatarUrl, setAvatarUrl] = useState("");
  const [accent, setAccent] = useState<AccentId>(DEFAULT_ACCENT);

  /* ── Paso 2 — País ─────────────────────────────────────────────────── */
  const [country, setCountry] = useState("");

  /* ── Paso 3 — Motivo de uso ────────────────────────────────────────── */
  const [usageReason, setUsageReason] = useState<UsageReason | "">("");

  /* ── Paso 4 — Descubrimiento ───────────────────────────────────────── */
  const [referralSource, setReferralSource] = useState<ReferralSource | "">("");
  const [referralDetail, setReferralDetail] = useState("");

  /* ── Paso 5 — Soporte ──────────────────────────────────────────────── */
  const [supportNote, setSupportNote] = useState("");

  const [isFinishing, setIsFinishing] = useState(false);

  /**
   * El perfil se rehidrata en un efecto del `AuthProvider`, así que llega un
   * render después del primero. Se siembra el asistente **una sola vez**, en
   * cuanto el perfil está disponible, para no pisar lo que el usuario responda.
   */
  const didSeedRef = useRef(false);
  useEffect(() => {
    if (!profile || didSeedRef.current) return;
    didSeedRef.current = true;
    setAvatarUrl(profile.avatarUrl);
    setAccent(profile.accent);
    setCountry(profile.country);
    setUsageReason(profile.onboarding.usageReason);
    setReferralSource(profile.onboarding.referralSource);
    setReferralDetail(profile.onboarding.referralDetail);
    setSupportNote(profile.onboarding.supportNote);
  }, [profile]);

  /**
   * Este flujo exige **sesión**: `updateProfile` no crea perfiles (devuelve
   * `null` sin perfil activo), así que sin sesión no hay a quién completar. Se
   * espera a `isLoading` para no expulsar a quien sí tiene sesión persistida.
   *
   * Deliberadamente **no** se exige que el perfil tenga todos sus datos: el
   * onboarding es justamente donde se capturan.
   */
  useEffect(() => {
    if (!isLoading && !profile) navigate("/login", { replace: true });
  }, [isLoading, profile, navigate]);

  /**
   * ¿Se puede salir del paso actual? Gobierna el avance y el stepper.
   *
   * El paso de soporte no aparece aquí a propósito: su nota es opcional, así que
   * cae en el `true` final y se puede cerrar el asistente sin escribir nada.
   */
  const canProceed =
    current?.key === "country"
      ? country.trim().length >= 2
      : current?.key === "usage"
      ? usageReason !== ""
      : current?.key === "referral"
      ? referralSource !== ""
      : true;

  /** El acento elegido tiñe el asistente: es la vista previa en vivo. */
  const accentTheme = accentCssVars(accent);

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ");

  const summaryLine =
    current?.key === "country"
      ? country.trim() || "Sin país todavía"
      : current?.key === "usage"
      ? usageReason
        ? "Motivo declarado"
        : "Sin responder"
      : current?.key === "referral"
      ? referralSource
        ? "Descubrimiento declarado"
        : "Sin responder"
      : current?.key === "support"
      ? supportNote.trim()
        ? "Nota añadida"
        : "Sin notas"
      : accent === DEFAULT_ACCENT
      ? "Personalización pendiente"
      : "Personalización lista";

  /**
   * Cierra el onboarding.
   *
   * Todo va en **un solo** parche: las respuestas y la fecha de finalización.
   * Así no existe un estado intermedio en el que el onboarding figure como
   * completado sin sus datos, ni al revés.
   */
  const handleFinish = () => {
    if (isFinishing) return;
    setIsFinishing(true);

    completeNewUserOnboarding({
      country: country.trim(),
      accent,
      avatarUrl,
      onboarding: {
        usageReason,
        referralSource,
        referralDetail: referralDetail.trim(),
        supportNote: supportNote.trim(),
      },
    });

    navigate("/workspaces");
  };

  return (
    <div
      className="w-full min-h-screen bg-white text-gray-900 antialiased selection:bg-brand-500 selection:text-white dark:bg-gray-950 dark:text-gray-100"
      style={accentTheme}
    >
      <PageMeta
        title="Tu cuenta — NECTO"
        description="Termina de configurar tu cuenta de Necto"
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
                Tu cuenta
              </span>
            </div>
            <ThemeToggle />
          </div>

          <div className="mx-auto w-full max-w-xl my-auto">
            <OnboardingStepper
              steps={NEW_USER_STEPS}
              step={step}
              canProceed={canProceed}
              onSelect={setStep}
            />

            {current?.key === "personalization" && (
              <StepPersonalization
                eyebrow={`Paso ${step} — Personalización`}
                avatarUrl={avatarUrl}
                accent={accent}
                initials={profileInitials(profile)}
                onAvatarChange={setAvatarUrl}
                onAccentChange={setAccent}
              />
            )}

            {current?.key === "country" && (
              <StepCountry
                eyebrow={`Paso ${step} — País`}
                country={country}
                onCountryChange={setCountry}
              />
            )}

            {current?.key === "usage" && (
              <StepUsageReason
                eyebrow={`Paso ${step} — Motivo de uso`}
                usageReason={usageReason}
                onUsageReasonChange={setUsageReason}
              />
            )}

            {current?.key === "referral" && (
              <StepReferral
                eyebrow={`Paso ${step} — Descubrimiento`}
                referralSource={referralSource}
                referralDetail={referralDetail}
                onReferralSourceChange={setReferralSource}
                onReferralDetailChange={setReferralDetail}
              />
            )}

            {current?.key === "support" && (
              <StepSupport
                eyebrow={`Paso ${step} — Soporte`}
                supportNote={supportNote}
                onSupportNoteChange={setSupportNote}
              />
            )}
          </div>

          {/* Footer nav */}
          <div className="sticky bottom-0 z-20 mx-auto mt-12 flex w-full max-w-xl items-center justify-between bg-white/95 pt-6 pb-3 backdrop-blur-md dark:bg-gray-950/95">
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
              <span className="text-theme-xs text-gray-400">
                Tus datos de registro ya están guardados.
              </span>
            )}

            {step < NEW_USER_STEPS.length ? (
              <Button
                variant="primary"
                intent="new-user-onboarding.step.next"
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
                intent="new-user-onboarding.step.finish"
                disabled={!canProceed || isFinishing}
                onClick={handleFinish}
                className="rounded-full px-7 font-bold"
              >
                {isFinishing ? "Preparando tu hub…" : "Entrar a mi hub"}
                {!isFinishing && <Rocket className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        <NewUserBrandPanel
          messages={NEW_USER_MESSAGES[current?.key ?? "personalization"]}
          fullName={fullName}
          email={profile?.email ?? ""}
          accent={accent}
          summaryLine={summaryLine}
        />
      </div>
    </div>
  );
}
