import React from "react";
import {
  Truck,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import { Field, Toggle } from "@/elements";
import { STORE_COUNTRIES } from "../../../../context/BusinessContext";
import type { BusinessType } from "../../../../context/BusinessContext";
import { ARCHETYPE_GROUPS } from "../../../../context/business/business-archetypes.constants";
import {
  SettingsCard,
  SettingsSection,
  SettingsRow,
  SettingsRowGroup,
  SettingsFieldGrid,
  SettingsLabel,
  SettingsHint,
  settingsControlClass,
} from "../SettingsSection";
import type { BusinessSettingsTabForm } from "../hooks/useBusinessSettingsForm";

/* ── SECCIÓN 1: GENERAL Y UBICACIÓN ──────────────────────────────────
 * Commercial identity, physical address, opening hours and service modes.
 * El encabezado de la sección lo pinta el modal desde el catálogo.
 *
 * ⚠️ Este tab monta **su propia** `SettingsCard` y devuelve un fragmento, no un
 * `<div className="space-y-6">`: los grupos tienen que ser hijos directos de esa
 * tarjeta para que su `divide-y` ponga la línea entre ellos. Un envoltorio aquí
 * rompe la separación en silencio (la línea no aparece y nada avisa).
 * ────────────────────────────────────────────────────────────────── */
export const GeneralTab: React.FC<{ form: BusinessSettingsTabForm }> = ({ form }) => {
  const { name, setName, slug, setSlug, businessType, setBusinessType, currency, setCurrency, code, setCode, address, setAddress, city, setCity, country, setCountry, openingDays, setOpeningDays, openingHours, setOpeningHours, serviceDelivery, setServiceDelivery, serviceTakeaway, setServiceTakeaway, serviceDineIn, setServiceDineIn } = form;

  return (
    <SettingsCard>
      {/* Identidad comercial */}
      <SettingsSection
        title="Identidad comercial"
        description="Nombre público y modelo operativo principal de la sede."
      >
        <div className="space-y-4">
          <Field
            label="Nombre comercial de la sede"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Necto Gourmet — Sede Central"
          />

          <SettingsFieldGrid>
            <div>
              <SettingsLabel htmlFor="settings-slug">Enlace web de la tienda</SettingsLabel>
              {/* El prefijo y el campo comparten caja: el anillo de foco es del
                  contenedor (`focus-within`), porque el `div` no recibe foco. */}
              <div className={`${settingsControlClass} flex items-center gap-1 focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/20`}>
                <span className="select-none text-gray-400">necto.app/</span>
                <input
                  id="settings-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))}
                  placeholder="mi-tienda"
                  className="min-w-0 flex-1 bg-transparent lowercase focus:outline-none"
                />
              </div>
            </div>

            <Field
              label="Código interno"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ej: SUC-01"
            />
          </SettingsFieldGrid>

          <div>
            <SettingsLabel htmlFor="settings-business-type">Modelo de operación principal</SettingsLabel>
            {/*
              Se listan los 15 arquetipos del catálogo, agrupados por categoría.
              Antes había tres opciones fijas: una sede de, por ejemplo, farmacia
              mostraba "Gastronomía" porque ninguna opción casaba con su tipo.
              Este dato es de ámbito **tienda**: cambiarlo aquí lo cambia en todas
              las sedes (ver `updateStoreIdentity`).
            */}
            <select
              id="settings-business-type"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value as BusinessType)}
              className={settingsControlClass}
            >
              {ARCHETYPE_GROUPS.map(group => (
                <optgroup key={group.category} label={group.label}>
                  {group.archetypes.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <SettingsHint className="mt-2">
              Define el vocabulario y los módulos recomendados de{" "}
              <strong className="font-semibold">toda la tienda</strong>: el cambio
              alcanza a todas las sedes.
            </SettingsHint>
          </div>
        </div>
      </SettingsSection>

      {/* Ubicación y horarios */}
      <SettingsSection
        title="Ubicación y horarios"
        description="Dirección física, zona geográfica y horarios regulares de atención."
      >
        <div className="space-y-4">
          <Field
            label="Dirección física exacta"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej: Carrera 43A # 1-50, Local 201"
          />

          <SettingsFieldGrid cols={3}>
            <Field
              label="Ciudad"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Medellín, Bogotá…"
            />
            <div>
              <SettingsLabel htmlFor="settings-country">País</SettingsLabel>
              {/*
                Lista cerrada: `country` es de ámbito tienda (viaja con
                `updateStoreIdentity`), así que un texto libre haría divergir toda
                la red ("colombia" vs "Colombia"). Si la sede trae un país fuera
                del catálogo se añade como primera opción para no perderlo.
              */}
              <select
                id="settings-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={settingsControlClass}
              >
                {(country && !STORE_COUNTRIES.includes(country)
                  ? [country, ...STORE_COUNTRIES]
                  : STORE_COUNTRIES
                ).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <SettingsLabel htmlFor="settings-currency">Moneda operativa</SettingsLabel>
              <select
                id="settings-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className={settingsControlClass}
              >
                <option value="COP">COP ($ pesos colombianos)</option>
                <option value="USD">USD ($ Dólares)</option>
                <option value="MXN">MXN ($ pesos mexicanos)</option>
                <option value="ARS">ARS ($ pesos argentinos)</option>
              </select>
            </div>
          </SettingsFieldGrid>

          <SettingsFieldGrid className="border-t border-gray-100 pt-4 dark:border-gray-800">
            <Field
              label="Días de operación"
              type="text"
              value={openingDays}
              onChange={(e) => setOpeningDays(e.target.value)}
              placeholder="Ej: Lunes a sábado"
            />
            <Field
              label="Horario habitual"
              type="text"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              placeholder="Ej: 11:00 - 22:00"
            />
          </SettingsFieldGrid>
        </div>
      </SettingsSection>

      {/* Modalidades de servicio */}
      <SettingsSection
        title="Modalidades de servicio"
        description="Define cómo pueden recibir o consumir los pedidos tus clientes."
      >
        <SettingsRowGroup>
          <SettingsRow
            icon={Truck}
            title="Envíos a domicilio"
            description="Entrega directa con mensajería o delivery propio hasta la dirección del cliente."
            action={
              <Toggle intent="service.delivery" checked={serviceDelivery} onChange={setServiceDelivery} />
            }
          />
          <SettingsRow
            icon={ShoppingBag}
            title="Retiro en tienda / para llevar"
            description="El cliente recoge su orden preparada directamente en el local físico."
            action={
              <Toggle intent="service.takeaway" checked={serviceTakeaway} onChange={setServiceTakeaway} />
            }
          />
          <SettingsRow
            icon={UtensilsCrossed}
            title="Consumo en mesa / salón"
            description="Atención presencial en mesas, mostrador o barra del establecimiento."
            action={
              <Toggle intent="service.dinein" checked={serviceDineIn} onChange={setServiceDineIn} />
            }
          />
        </SettingsRowGroup>
      </SettingsSection>
    </SettingsCard>
  );
};
