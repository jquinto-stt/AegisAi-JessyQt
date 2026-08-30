import React, { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
  X,
  User,
  CreditCard,
  Check,
  Shield,
  Save,
} from "lucide-react";

export const AccountSettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "Administrador Master");
  const [email, setEmail] = useState(user?.email || "admin@necto.app");
  const [savedToast, setSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in font-sans antialiased">
      <div className="bg-white dark:bg-[#0E0E10] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between flex-none">
          <div className="space-y-0.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              Necto Account
            </span>
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight">
              Ajustes de Perfil & Organización
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          <div className="space-y-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              01. Usuario Master
            </span>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-950 dark:text-zinc-50 focus:outline-none focus:border-zinc-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-950 dark:text-zinc-50 focus:outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          <div className="space-y-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              02. Nivel de Organización
            </span>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-50">
                  Necto Enterprise Multi-Tenant
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Sucursales y módulos operativos ilimitados
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-950 text-white dark:bg-white dark:text-zinc-950">
                ACTIVO
              </span>
            </div>
          </div>

          {savedToast && (
            <div className="p-3 bg-zinc-900 text-white rounded-xl flex items-center gap-2 text-xs font-medium animate-fade-in">
              <Check className="w-3.5 h-3.5 text-[#FF3F1A]" />
              <span>Ajustes actualizados correctamente</span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3 flex-none">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="py-2 px-5 rounded-xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-xs font-semibold hover:bg-[#FF3F1A] dark:hover:bg-[#FF3F1A] dark:hover:text-white transition-all cursor-pointer shadow-xs active:scale-98"
          >
            <span>Guardar Perfil</span>
          </button>
        </div>
      </div>
    </div>
  );
};
