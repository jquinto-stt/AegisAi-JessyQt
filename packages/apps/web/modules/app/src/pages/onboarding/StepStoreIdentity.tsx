import React from "react";
import {
  BUSINESS_ARCHETYPES,
  STORE_COUNTRIES,
  type BusinessType,
  type OfferModel,
} from "../../context/BusinessContext";
import { ARCHETYPE_CATEGORY_LABELS } from "../../context/business/business-archetypes.constants";
import { cn } from "@/utils";
import { MACRO_GROUPS, OFFER_MODELS } from "../onboarding.constants";
import { OptionCard, StepHeading } from "./onboarding-chrome";

interface StepStoreIdentityProps {
  eyebrow: string;
  selectedArchetype: BusinessType;
  selectedOfferModel: OfferModel;
  country: string;
  onSelectArchetype: (type: BusinessType) => void;
  onSelectOfferModel: (model: OfferModel) => void;
  onCountryChange: (country: string) => void;
}

/* ── Chrome local del formulario ─────────────────────────────────────
 * Los tres grupos del paso comparten cabecera: rótulo + pista. Antes cada
 * bloque repetía un `Label` suelto con el mismo peso que el cuerpo, así que
 * nada separaba "pregunta" de "contenido" y el paso se leía como una lista
 * plana. Aquí la pregunta lleva **número** (ordena la lectura), y la pista
 * explica para qué sirve el dato en vez de decorar.
 * ────────────────────────────────────────────────────────────────── */

function FieldBlock({
  step,
  question,
  hint,
  children,
}: {
  /** Ordinal visible. El paso pregunta tres cosas y el orden es información. */
  step: number;
  question: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3.5">
      <div className="flex items-baseline gap-3">
        <span
          aria-hidden
          className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-50 text-theme-xs font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
        >
          {step}
        </span>
        <div className="min-w-0">
          <h2 className="text-theme-sm font-semibold leading-tight text-gray-900 dark:text-gray-100">
            {question}
          </h2>
          {hint && (
            <p className="mt-0.5 text-theme-xs leading-snug text-gray-500 dark:text-gray-400">
              {hint}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Ámbito **tienda**: qué negocio es y cómo vende.
 *
 * Sólo se muestra cuando la cuenta todavía no tiene ninguna sucursal, porque es
 * la primera la que da de alta la tienda. A partir de ahí estos datos se heredan
 * y este paso desaparece: no se vuelve a tipificar el negocio al abrir sedes.
 *
 * ⚠️ Los cuatro grupos de arquetipo y los cuatro modelos de oferta **no** son
 * tarjetas decoradas: cada uno es un `<button aria-pressed>` que llama a
 * `onSelectArchetype`, que además re-deriva el modelo de oferta y los módulos
 * recomendados. Por eso usan `OptionCard` y no un `Card` con `onClick`: toda la
 * superficie tiene que ser un único tab stop y `aria-pressed` tiene que existir.
 *
 * ⚠️ **La especialidad es un sub-nivel del tipo, no una lista aparte.** Antes se
 * pintaba como píldoras sueltas debajo de la rejilla, con el mismo peso visual
 * que los rótulos del formulario, y se leía como restos de otra cosa. Ahora va
 * indentada bajo la tarjeta que la gobierna y rotulada como lo que es
 * ("Especialidad"), para que se entienda que afina la elección anterior.
 *
 * ⚠️ El `<select>` del mercado es **nativo a propósito**. El `Select` del DS es
 * no-controlado (sólo `defaultValue`), así que no podría reflejar `country`
 * cuando el valor cambia desde fuera; y `verify-profile.mjs` lo localiza por
 * `select#store-country` y le escribe `.value` directamente. Se le da el mismo
 * lenguaje visual —altura, radio y borde del DS— sin cambiar el elemento.
 */
export const StepStoreIdentity: React.FC<StepStoreIdentityProps> = ({
  eyebrow,
  selectedArchetype,
  selectedOfferModel,
  country,
  onSelectArchetype,
  onSelectOfferModel,
  onCountryChange,
}) => {
  const currentArchetype =
    BUSINESS_ARCHETYPES.find(a => a.id === selectedArchetype) || BUSINESS_ARCHETYPES[1];

  const specialties = BUSINESS_ARCHETYPES.filter(a => a.category === currentArchetype.category);

  return (
    <div className="animate-in space-y-9 fade-in slide-in-from-bottom-1 duration-300">
      <StepHeading
        eyebrow={eyebrow}
        description={
          <>
            El tipo de negocio y el modelo de oferta describen a tu{" "}
            <strong className="font-semibold text-gray-900 dark:text-gray-200">tienda</strong>, no a
            una sucursal concreta: se piden una sola vez y los heredan todas tus sedes.
          </>
        }
      >
        Define tu tienda
      </StepHeading>

      {/* ── Tipo de negocio ─────────────────────────────────────────── */}
      <FieldBlock
        step={1}
        question="¿Qué tipo de negocio es?"
        hint="Elige el rubro. Debajo podrás afinarlo si tu caso es más específico."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MACRO_GROUPS.map(group => (
            <OptionCard
              key={group.id}
              active={currentArchetype.category === group.id}
              onClick={() => onSelectArchetype(group.defaultType)}
              icon={<group.icon className="h-5 w-5" />}
              title={group.short}
              layout="stack"
            />
          ))}
        </div>

        {/* Sub-nivel: especialidad del rubro elegido. */}
        {specialties.length > 1 && (
          <div className="rounded-xl border border-gray-200/80 bg-gray-50/60 p-3.5 dark:border-gray-800 dark:bg-white/[0.02]">
            <p className="mb-2.5 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
              Especialidad de {ARCHETYPE_CATEGORY_LABELS[currentArchetype.category]}
            </p>
            {/*
              ⚠️ Rejilla, no `flex-wrap`: con `flex-wrap` las píldoras caían 4+1 y
              la última quedaba huérfana en su propia línea, que es exactamente lo
              que hacía que el bloque se leyera como restos. La rejilla reparte el
              ancho.

              ⚠️ El número de columnas lo decide el **número de especialidades**,
              no el ancho: la regla es "la última fila nunca queda con una sola".
              Con 3 columnas, 4 especialidades dan 3+1 (viuda) y 5 dan 3+2 (bien);
              con 2 columnas, 4 dan 2+2 (bien) y 5 dan 2+2+1 (viuda). Se elige el
              reparto que no deje viuda y, si ninguno la evita, se prefiere 3.
            */}
            <div
              className={cn(
                "grid gap-2",
                specialties.length % 3 === 1 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
              )}
            >
              {specialties.map(sub => {
                const isActive = selectedArchetype === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    aria-pressed={isActive}
                    title={sub.description}
                    onClick={() => onSelectArchetype(sub.id)}
                    className={cn(
                      "cursor-pointer rounded-lg border px-3 py-2 text-left text-theme-xs font-semibold transition-all",
                      "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand-500/20",
                      isActive
                        ? "border-brand-500/40 bg-brand-50 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-400"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white"
                    )}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
            {/* La descripción del arquetipo elegido: convierte la elección en una
                decisión informada en lugar de un rótulo suelto. */}
            <p className="mt-2.5 text-theme-xs leading-snug text-gray-500 dark:text-gray-400">
              {currentArchetype.description}
            </p>
          </div>
        )}
      </FieldBlock>

      {/* ── Modelo de oferta ────────────────────────────────────────── */}
      <FieldBlock
        step={2}
        question="¿Qué comercializas?"
        hint="Lo que vendes define el catálogo, las existencias y las citas."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OFFER_MODELS.map(om => (
            <OptionCard
              key={om.id}
              active={selectedOfferModel === om.id}
              onClick={() => onSelectOfferModel(om.id)}
              icon={<om.icon className="h-5 w-5" />}
              title={om.short}
              layout="stack"
            />
          ))}
        </div>
      </FieldBlock>

      {/* ── Mercado ─────────────────────────────────────────────────── */}
      <FieldBlock
        step={3}
        question="Mercado principal"
        hint="Define la moneda con la que opera toda la tienda."
      >
        <div className="relative max-w-sm">
          <select
            id="store-country"
            value={country}
            onChange={e => onCountryChange(e.target.value)}
            className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm font-semibold text-gray-800 shadow-theme-xs outline-none focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
          >
            {STORE_COUNTRIES.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 dark:text-gray-400"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.79175 8.02075L10.0001 13.2291L15.2084 8.02075"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </FieldBlock>
    </div>
  );
};
