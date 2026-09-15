import React from "react";
import { Coins, CreditCard } from "lucide-react";
import { Field, Toggle } from "@/elements";
import {
  SettingsRow,
  SettingsRowGroup,
  SettingsCard,
  SettingsSection,
  SettingsFieldGrid,
} from "../SettingsSection";
import type { BusinessSettingsTabForm } from "../hooks/useBusinessSettingsForm";

/* ── SECCIÓN 4: CUENTAS Y PAGOS ──────────────────────────────────────
 * Receiving accounts and enabled in-person payment methods.
 * El encabezado de la sección lo pinta el modal desde el catálogo.
 *
 * ⚠️ Este tab monta **su propia** `SettingsCard`: los grupos van como hijos
 * directos de ella, para que su `divide-y` ponga la línea entre grupos.
 * ────────────────────────────────────────────────────────────────── */
export const PaymentsTab: React.FC<{ form: BusinessSettingsTabForm }> = ({ form }) => {
  const { nequiNumber, setNequiNumber, daviplataNumber, setDaviplataNumber, bancolombiaAccount, setBancolombiaAccount, accountHolder, setAccountHolder, accountNit, setAccountNit, allowCashOnDelivery, setAllowCashOnDelivery, allowCardTerminal, setAllowCardTerminal } = form;

  return (
    <SettingsCard>
      {/* Transferencias */}
      <SettingsSection
        title="Transferencias bancarias y billeteras digitales"
        description="Información que se le compartirá al comprador en el canal de venta para transferir."
      >
        <div className="space-y-4">
          <SettingsFieldGrid>
            <Field
              label="Número Nequi"
              type="text"
              value={nequiNumber}
              onChange={(e) => setNequiNumber(e.target.value)}
              placeholder="Ej: 310 987 6543"
            />
            <Field
              label="Número Daviplata"
              type="text"
              value={daviplataNumber}
              onChange={(e) => setDaviplataNumber(e.target.value)}
              placeholder="Ej: 310 987 6543"
            />
          </SettingsFieldGrid>

          <SettingsFieldGrid cols={3}>
            <Field
              label="Cuenta Bancolombia / Banco"
              type="text"
              value={bancolombiaAccount}
              onChange={(e) => setBancolombiaAccount(e.target.value)}
              placeholder="104-892134-55"
            />
            <Field
              label="Titular de la cuenta"
              type="text"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Nombre o razón social"
            />
            <Field
              label="NIT o cédula"
              type="text"
              value={accountNit}
              onChange={(e) => setAccountNit(e.target.value)}
              placeholder="901.458.789-1"
            />
          </SettingsFieldGrid>
        </div>
      </SettingsSection>

      {/* Cobro en sede */}
      <SettingsSection
        title="Cobro presencial en sede"
        description="Métodos admitidos al entregar pedidos en mesa, mostrador o contra entrega."
      >
        <SettingsRowGroup>
          <SettingsRow
            icon={Coins}
            title="Pago en efectivo contra entrega"
            description="Permite a los compradores abonar en efectivo al momento de recibir su pedido."
            action={
              <Toggle
                intent="payment.cash.toggle"
                checked={allowCashOnDelivery}
                onChange={setAllowCashOnDelivery}
              />
            }
          />
          <SettingsRow
            icon={CreditCard}
            title="Datáfono / terminal de tarjeta"
            description="Acepta cobro presencial con tarjeta de débito o crédito mediante terminal física."
            action={
              <Toggle
                intent="payment.card.toggle"
                checked={allowCardTerminal}
                onChange={setAllowCardTerminal}
              />
            }
          />
        </SettingsRowGroup>
      </SettingsSection>
    </SettingsCard>
  );
};
