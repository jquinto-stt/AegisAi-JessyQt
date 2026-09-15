import React from "react";
import { Sun, Moon } from "lucide-react";
import { NOTIFICATION_CHANNELS, THEME_PREFERENCES } from "../../../../auth/profile";
import { AccountCard, AccountGroup, OptionCard, OptionCardGrid } from "../AccountPanels";
import type { AccountSettingsForm } from "../hooks/useAccountSettingsForm";

interface PreferencesTabProps {
  form: AccountSettingsForm;
}

/**
 * Preferencias: tema de la interfaz y canal de avisos.
 *
 * Las dos secciones son la misma decisión —"elige una de estas tarjetas"— así que
 * ahora usan el mismo componente. Antes eran dos bloques gemelos escritos por
 * separado, con la lógica de selección duplicada.
 *
 * El tema se aplica **al guardar**, no al pulsar: el modal es un borrador y
 * "Cancelar" debe descartar también este cambio.
 */
export const PreferencesTab: React.FC<PreferencesTabProps> = ({ form }) => {
  const { theme, setTheme, notificationChannel, setNotificationChannel } = form;

  return (
    <AccountCard>
      <AccountGroup
        first
        title="Tema de la interfaz"
        description="Se aplica a toda la plataforma al guardar los cambios."
      >
        <OptionCardGrid>
          {THEME_PREFERENCES.map(option => (
            <OptionCard
              key={option.id}
              label={option.label}
              description={option.desc}
              icon={option.id === "dark" ? Moon : Sun}
              selected={theme === option.id}
              onSelect={() => setTheme(option.id)}
            />
          ))}
        </OptionCardGrid>
      </AccountGroup>

      <AccountGroup
        title="Canal de avisos"
        description="Por dónde quieres enterarte de lo importante."
      >
        <OptionCardGrid>
          {NOTIFICATION_CHANNELS.map(channel => (
            <OptionCard
              key={channel.id}
              label={channel.label}
              description={channel.desc}
              selected={notificationChannel === channel.id}
              onSelect={() => setNotificationChannel(channel.id)}
            />
          ))}
        </OptionCardGrid>
      </AccountGroup>
    </AccountCard>
  );
};
