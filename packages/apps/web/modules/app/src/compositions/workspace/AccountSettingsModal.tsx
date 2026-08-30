import React, { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import {
  X,
  User,
  Mail,
  Shield,
  CreditCard,
  Bell,
  Check,
  Building,
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in font-sans">
      <div className="bg-white dark:bg-[#18181B] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between flex-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center font-black">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-zinc-950 dark:text-zinc-50 tracking-tight">
                Ajustes de Cuenta
              </h3>
              <p className="text-xs text-zinc-400 font-medium">
                Perfil de Usuario & Organización
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
          <div className="space-y-3.5">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
              Datos Personales
            </h4>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-950 dark:text-zinc-50 focus:ring-2 focus:ring-[#FF3F1A]/30 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-950 dark:text-zinc-50 focus:ring-2 focus:ring-[#FF3F1A]/30 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
              Plan & Organización
            </h4>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-[#FF3F1A] flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Necto Pro Multi-Branch</p>
                    <span className="text-[9px] bg-[#FF3F1A] text-white px-1.5 py-0.2 rounded font-black font-mono">Activo</span>
                  </div>
                  <p className="text-[10px] text-zinc-400">Negocios y sucursales ilimitadas</p>
                </div>
              </div>
            </div>
          </div>

          {savedToast && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 animate-fade-in">
              <Check className="w-4 h-4" />
              <span>Ajustes de cuenta actualizados</span>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 px-6 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3 flex-none">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="py-2 px-5 rounded-xl bg-[#FF3F1A] hover:bg-[#e03413] text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar Perfil</span>
          </button>
        </div>
      </div>
    </div>
  );
};
