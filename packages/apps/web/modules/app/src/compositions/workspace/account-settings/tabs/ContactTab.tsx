import React from "react";
import { Info } from "lucide-react";
import { Field } from "@/elements";
import { AVAILABILITY_SHIFTS } from "../../../../auth/profile";
import {
  AccountCard,
  AccountGroup,
  FieldGrid,
  InlineNotice,
  OptionCard,
  OptionCardGrid,
} from "../AccountPanels";
import type { AccountSettingsForm } from "../hooks/useAccountSettingsForm";

interface ContactTabProps {
  form: AccountSettingsForm;
}

/**
 * Contacto.
 *
 * Correos, líneas telefónicas y disponibilidad. La disponibilidad deja de ser un
 * `<select>` y pasa a ser la misma rejilla de opciones que el tema: es una
 * elección entre pocas alternativas, y un desplegable esconde las opciones y
 * obliga a abrirlo para saber cuáles hay.
 */
export const ContactTab: React.FC<ContactTabProps> = ({ form }) => {
  const {
    profile,
    email, setEmail,
    billingEmail, setBillingEmail,
    contactPhone, setContactPhone,
    whatsappNumber, setWhatsappNumber,
    availabilityShift, setAvailabilityShift,
    isLocalMode,
  } = form;

  const emailChanged = email.trim().toLowerCase() !== (profile?.email ?? "");

  return (
    <AccountCard>
      <AccountGroup
        first
        title="Correos electrónicos"
        description="Con uno entras; al otro te llegan los recibos."
      >
        <FieldGrid>
          <Field
            label="Correo de acceso"
            intent="account.email"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            hint="Con este correo inicias sesión"
          />
          <Field
            label="Correo de notificaciones y facturas"
            intent="account.billingEmail"
            type="email"
            value={billingEmail}
            onChange={e => setBillingEmail(e.target.value)}
            hint="Copia de resúmenes diarios y recibos de pago"
          />
        </FieldGrid>

        {!isLocalMode && emailChanged && (
          <InlineNotice icon={Info}>
            Al guardar enviaremos un código de verificación al correo nuevo. El cambio se aplica
            cuando lo confirmes.
          </InlineNotice>
        )}
      </AccountGroup>

      <AccountGroup
        title="Líneas telefónicas y WhatsApp"
        description="Tus números de contacto como titular de la cuenta."
      >
        <FieldGrid>
          <Field
            label="Teléfono / WhatsApp de contacto"
            intent="account.contactPhone"
            type="tel"
            value={contactPhone}
            onChange={e => setContactPhone(e.target.value)}
            placeholder="+57 310 987 6543"
            hint="Tu línea personal"
          />
          <Field
            label="WhatsApp de alertas operativas"
            intent="account.whatsappNumber"
            type="tel"
            value={whatsappNumber}
            onChange={e => setWhatsappNumber(e.target.value)}
            placeholder="+57 310 987 6543"
            hint="Donde recibes avisos de pedidos o incidencias"
          />
        </FieldGrid>
      </AccountGroup>

      <AccountGroup
        title="Disponibilidad para alertas"
        description="En qué franja quieres que te avisemos."
      >
        <OptionCardGrid>
          {AVAILABILITY_SHIFTS.map(shift => (
            <OptionCard
              key={shift.id}
              label={shift.label}
              selected={availabilityShift === shift.id}
              onSelect={() => setAvailabilityShift(shift.id)}
            />
          ))}
        </OptionCardGrid>
      </AccountGroup>
    </AccountCard>
  );
};
