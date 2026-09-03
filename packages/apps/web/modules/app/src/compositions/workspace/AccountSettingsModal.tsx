import React, { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useBusiness } from "../../context/BusinessContext";
import {
  X,
  Check,
  Upload,
  User,
  Lock,
  Phone,
  Mail,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  Monitor,
  Smartphone,
  MapPin,
  Briefcase,
  Calendar,
  Clock,
  KeyRound,
  FileText,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button, Field, Toggle, Select, Textarea, Badge } from "@/elements";

type AccountTab = "profile" | "contact" | "security" | "permissions";

const TABS: Array<{
  id: AccountTab;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "profile",
    label: "Perfil & Identidad",
    desc: "Datos personales y rol",
    icon: User,
  },
  {
    id: "contact",
    label: "Canales de Contacto",
    desc: "Teléfono, WhatsApp y correo",
    icon: Phone,
  },
  {
    id: "security",
    label: "Seguridad & Acceso",
    desc: "Contraseña, PIN y sesiones",
    icon: Lock,
  },
  {
    id: "permissions",
    label: "Permisos & Alcance",
    desc: "Capacidades de tu cuenta",
    icon: ShieldCheck,
  },
];

export const AccountSettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { userAvatarUrl, setUserAvatarUrl, businesses, activeBusiness } = useBusiness();
  const username = user?.getUsername?.();

  const [activeTab, setActiveTab] = useState<AccountTab>("profile");

  // Perfil & Identidad
  const [name, setName] = useState("Administrador Master");
  const [documentId, setDocumentId] = useState("1020304050");
  const [cargo, setCargo] = useState("Gerente General / Propietario");
  const [assignedBranch, setAssignedBranch] = useState(activeBusiness?.id || "");
  const [city, setCity] = useState("Bogotá, D.C.");
  const [country, setCountry] = useState("Colombia");
  const [bio, setBio] = useState("Administrador principal de la franquicia y operaciones comerciales.");
  const [avatarPreview, setAvatarPreview] = useState(userAvatarUrl);

  // Canales de Contacto
  const [email, setEmail] = useState(username || "admin@necto.app");
  const [billingEmail, setBillingEmail] = useState("facturacion@necto.app");
  const [phoneNumber, setPhoneNumber] = useState("+57 310 987 6543");
  const [whatsappNumber, setWhatsappNumber] = useState("+57 310 987 6543");
  const [availabilityShift, setAvailabilityShift] = useState("all_shifts");

  // Seguridad & Credenciales
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [quickPin, setQuickPin] = useState("1234");
  const [showPin, setShowPin] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Toast
  const [savedToast, setSavedToast] = useState(false);

  if (!isOpen) return null;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPreview(reader.result);
        setUserAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (avatarPreview) {
      setUserAvatarUrl(avatarPreview);
    }
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#212121]/70 backdrop-blur-sm animate-fade-in font-sans antialiased">
      <div className="bg-white dark:bg-[#18181B] w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-scale-up">
        {/* Top Header */}
        <div className="px-6 py-4.5 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-[#ECECEC]/40 dark:bg-zinc-900/50 flex-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#190088] text-white flex items-center justify-center shadow-md flex-none">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-[#212121] dark:text-[#ECECEC]">
                  Ajustes de Perfil & Cuenta
                </h2>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#190088]/10 dark:bg-[#190088]/25 text-[#190088] dark:text-[#97D6DF] border border-[#190088]/20 dark:border-[#190088]/40">
                  Master Admin
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#97D6DF]/20 text-[#190088] dark:text-[#97D6DF] border border-[#97D6DF]/40">
                  Activo
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Gestiona tu identidad, datos de contacto comercial y credenciales de acceso seguro.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            intent="account.close"
            onClick={onClose}
            className="p-0 w-9 h-9 rounded-2xl text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Body Container: Sidebar + Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-200/80 dark:border-zinc-800/80 p-3 sm:p-4 bg-zinc-50/40 dark:bg-zinc-900/40 flex-none overflow-y-auto space-y-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full p-2.5 rounded-2xl text-left transition-all cursor-pointer flex items-start gap-2.5 group ${
                    isActive
                      ? "bg-[#190088]/10 dark:bg-[#190088]/25 text-[#190088] dark:text-[#97D6DF] shadow-xs border border-[#190088]/30 dark:border-[#190088]/50 font-bold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40 hover:text-[#190088] dark:hover:text-[#97D6DF] border border-transparent"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center flex-none mt-0.5 transition-colors ${
                      isActive
                        ? "bg-[#190088] text-white shadow-2xs"
                        : "bg-zinc-200/70 dark:bg-zinc-800 text-zinc-500 group-hover:text-[#190088] dark:group-hover:text-[#97D6DF]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold leading-tight truncate ${isActive ? "text-[#190088] dark:text-[#97D6DF]" : ""}`}>
                      {tab.label}
                    </p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5 font-normal">
                      {tab.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Main Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 scrollbar-thin">
            {/* TAB 1: PERFIL & IDENTIDAD */}
            {activeTab === "profile" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-[#212121] dark:text-[#ECECEC] flex items-center gap-2">
                    <User className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
                    <span>Identidad de Usuario & Cargo</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Información personal visible en turnos, comandas despachadas y registro de auditoría.
                  </p>
                </div>

                {/* Avatar Banner Card */}
                <div className="p-5 rounded-3xl bg-[#ECECEC]/30 dark:bg-zinc-900/60 border border-zinc-200/90 dark:border-zinc-800 space-y-4 shadow-xs">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white dark:border-zinc-700 shadow-md flex-none bg-[#ECECEC] dark:bg-zinc-800">
                      <img
                        src={avatarPreview}
                        alt="Avatar de Usuario"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#212121] dark:text-[#ECECEC] truncate">
                            {name}
                          </h4>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-[#97D6DF]/20 text-[#190088] dark:text-[#97D6DF]">
                            Verificado
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {email}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#190088] hover:bg-[#14006e] text-white text-xs font-bold transition-all cursor-pointer shadow-xs">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Subir Nueva Foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                          />
                        </label>
                        <span className="text-[11px] text-zinc-400">
                          JPG, PNG o WEBP (máx. 3 MB)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Datos Personales */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/90 dark:border-zinc-800 space-y-4 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    Información Personal & Profesional
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Nombre Completo"
                      labelStyle="bold"
                      intent="account.name"
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ej: Administrador Master"
                    />

                    <Field
                      label="Documento de Identidad (C.C. / NIT)"
                      labelStyle="bold"
                      intent="account.documentId"
                      type="text"
                      value={documentId}
                      onChange={e => setDocumentId(e.target.value)}
                      placeholder="Ej: 1020304050"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Cargo / Posición en la Empresa"
                      labelStyle="bold"
                      intent="account.cargo"
                      type="text"
                      value={cargo}
                      onChange={e => setCargo(e.target.value)}
                      placeholder="Ej: Gerente General / Dueño"
                    />

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[#212121] dark:text-zinc-200">
                        Sede Habitual de Operación
                      </label>
                      <Select
                        intent="account.branch"
                        value={assignedBranch}
                        onChange={e => setAssignedBranch(e.target.value)}
                        options={businesses.map(b => ({
                          value: b.id,
                          label: `${b.name} (${b.city || "Principal"})`,
                        }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Ciudad"
                      labelStyle="bold"
                      intent="account.city"
                      type="text"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                    />

                    <Field
                      label="País"
                      labelStyle="bold"
                      intent="account.country"
                      type="text"
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#212121] dark:text-zinc-200">
                      Biografía / Notas Internas de la Cuenta
                    </label>
                    <Textarea
                      intent="account.bio"
                      rows={2}
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Descripción breve de tus responsabilidades o notas operativas..."
                    />
                  </div>
                </div>

                {/* Info de Membresía */}
                <div className="p-4 rounded-2xl bg-[#ECECEC]/30 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <Calendar className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
                    <span>Miembro activo desde: <strong className="text-[#212121] dark:text-[#ECECEC]">Enero 2025</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Último acceso: hace unos momentos</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CANALES DE CONTACTO */}
            {activeTab === "contact" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-[#212121] dark:text-[#ECECEC] flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
                    <span>Canales de Contacto Directo</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Configura tus vías de comunicación para alertas operativas, pedidos urgentes y facturación.
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/90 dark:border-zinc-800 space-y-4 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    Correos Electrónicos
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Correo Electrónico de Acceso"
                      labelStyle="bold"
                      intent="account.email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      hint="Utilizado para iniciar sesión en la plataforma"
                    />

                    <Field
                      label="Correo de Notificaciones & Facturas"
                      labelStyle="bold"
                      intent="account.billingEmail"
                      type="email"
                      value={billingEmail}
                      onChange={e => setBillingEmail(e.target.value)}
                      hint="Copia de resúmenes diarios y recibos de pago"
                    />
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/90 dark:border-zinc-800 space-y-4 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    Líneas Telefónicas & WhatsApp
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Teléfono Móvil Principal"
                      labelStyle="bold"
                      intent="account.phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      placeholder="+57 310 987 6543"
                    />

                    <Field
                      label="WhatsApp de Alertas Operativas"
                      labelStyle="bold"
                      intent="account.whatsapp"
                      type="tel"
                      value={whatsappNumber}
                      onChange={e => setWhatsappNumber(e.target.value)}
                      placeholder="+57 310 987 6543"
                      hint="Número donde recibirás alertas de pedidos o incidencias"
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-[#212121] dark:text-zinc-200">
                      Disponibilidad de Horario para Alertas
                    </label>
                    <Select
                      intent="account.shift"
                      value={availabilityShift}
                      onChange={e => setAvailabilityShift(e.target.value)}
                      options={[
                        { value: "all_shifts", label: "24/7 — Todos los turnos y aperturas" },
                        { value: "day_shift", label: "Turno Diurno (08:00 AM a 05:00 PM)" },
                        { value: "night_shift", label: "Turno Nocturno / Cierre (05:00 PM a 02:00 AM)" },
                        { value: "emergencies_only", label: "Solo Emergencias e Incidencias Críticas" },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SEGURIDAD & ACCESO */}
            {activeTab === "security" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-[#212121] dark:text-[#ECECEC] flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
                    <span>Seguridad & Control de Acceso</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Protege tu cuenta con contraseñas seguras, PIN táctil de comandera y autenticación 2FA.
                  </p>
                </div>

                {/* Cambio de Contraseña */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/90 dark:border-zinc-800 space-y-4 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    Actualizar Contraseña
                  </h4>

                  <div className="space-y-3.5">
                    <div className="relative">
                      <Field
                        label="Contraseña Actual"
                        labelStyle="bold"
                        intent="account.currentPw"
                        type={showCurrentPw ? "text" : "password"}
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute right-3 top-8 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                      >
                        {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <Field
                          label="Nueva Contraseña"
                          labelStyle="bold"
                          intent="account.newPw"
                          type={showNewPw ? "text" : "password"}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Mínimo 8 caracteres"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute right-3 top-8 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                        >
                          {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <Field
                        label="Confirmar Nueva Contraseña"
                        labelStyle="bold"
                        intent="account.confirmPw"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repite la contraseña"
                      />
                    </div>

                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-[#FF3F1A] font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        <span>Las contraseñas no coinciden</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* PIN Rápido de Comandera / TPV */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/90 dark:border-zinc-800 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#212121] dark:text-[#ECECEC] flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
                        <span>PIN Rápido de Caja & Comandera</span>
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Permite desbloqueo rápido táctil en pantallas de comandas y POS sin reescribir correo.
                      </p>
                    </div>

                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#97D6DF]/20 text-[#190088] dark:text-[#97D6DF]">
                      4 Dígitos
                    </span>
                  </div>

                  <div className="max-w-xs relative">
                    <Field
                      label="Código PIN Numérico"
                      labelStyle="bold"
                      intent="account.pin"
                      type={showPin ? "text" : "password"}
                      value={quickPin}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setQuickPin(val);
                      }}
                      placeholder="1234"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-8 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 2FA */}
                <div className="p-5 rounded-3xl bg-[#ECECEC]/30 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#190088] text-white flex items-center justify-center flex-none">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-[#212121] dark:text-[#ECECEC]">
                          Autenticación en Dos Pasos (2FA)
                        </h4>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                            twoFactorEnabled
                              ? "bg-[#97D6DF]/30 text-[#190088] dark:text-[#97D6DF] border border-[#97D6DF]/50"
                              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {twoFactorEnabled ? "Activado / Protegido" : "Desactivado"}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Requiere un código temporal adicional para inicios de sesión desde nuevas ubicaciones.
                      </p>
                    </div>
                  </div>

                  <Toggle
                    intent="account.2fa"
                    checked={twoFactorEnabled}
                    onCheckedChange={setTwoFactorEnabled}
                  />
                </div>

                {/* Sesiones Activas */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/90 dark:border-zinc-800 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                      Dispositivos Conectados (2)
                    </h4>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 rounded-2xl bg-[#ECECEC]/30 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#190088]/10 text-[#190088] dark:text-[#97D6DF] flex items-center justify-center">
                          <Monitor className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#212121] dark:text-[#ECECEC]">
                            Navegador Web (Windows — Chrome)
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            Bogotá, Colombia · Dirección IP: 186.84.x.x · Sesión Actual
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#97D6DF]/20 text-[#190088] dark:text-[#97D6DF] border border-[#97D6DF]/40">
                        Esta Sesión
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-[#ECECEC]/30 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#212121] dark:text-[#ECECEC]">
                            App Móvil POS (iOS — iPhone 15 Pro)
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            Bogotá, Colombia · Última actividad: hace 3 horas
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="text-[11px] font-bold text-[#FF3F1A] hover:underline cursor-pointer"
                      >
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PERMISOS & ALCANCE */}
            {activeTab === "permissions" && (
              <div className="space-y-6 animate-fade-in max-w-2xl">
                <div>
                  <h3 className="text-base font-bold text-[#212121] dark:text-[#ECECEC] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
                    <span>Nivel de Acceso & Matriz de Permisos</span>
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Alcance de funciones administrativas y operativas asignadas a este usuario.
                  </p>
                </div>

                {/* Card de Rol */}
                <div className="p-5 rounded-3xl bg-[#190088]/5 dark:bg-[#190088]/20 border border-[#190088]/30 dark:border-[#190088]/50 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#190088] dark:text-[#97D6DF]">
                        Rol Asignado
                      </span>
                      <h4 className="text-sm font-extrabold text-[#212121] dark:text-[#ECECEC] mt-0.5">
                        Dueño / Propietario (Super Admin)
                      </h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        Acceso total irrestricto a todas las funciones financieras, operativas, inventario, comanderas y configuración multisede.
                      </p>
                    </div>

                    <span className="text-[10px] font-mono font-black px-2.5 py-1 rounded-lg bg-[#FF3F1A] text-white shadow-2xs">
                      ADMIN TOTAL
                    </span>
                  </div>
                </div>

                {/* Lista de Capacidades Habilitadas */}
                <div className="p-5 rounded-3xl bg-white dark:bg-[#18181B] border border-zinc-200/90 dark:border-zinc-800 space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                    Capacidades Habilitadas en el Sistema
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { label: "Bandeja de Pedidos & Comandas", active: true },
                      { label: "Pantalla KDS Cocina & Despacho", active: true },
                      { label: "Catálogo Inteligente & Precios", active: true },
                      { label: "Insumos, Stock & Recetas", active: true },
                      { label: "Analítica Financiera & Ventas", active: true },
                      { label: "Automatizaciones & Bot de WhatsApp", active: true },
                      { label: "Gestión de Turnos & Horarios", active: true },
                      { label: "Administración de Roles & Permisos", active: true },
                    ].map((perm, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-[#ECECEC]/40 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between"
                      >
                        <span className="text-xs font-bold text-[#212121] dark:text-[#ECECEC]">
                          {perm.label}
                        </span>
                        <div className="w-5 h-5 rounded-full bg-[#97D6DF] text-[#190088] flex items-center justify-center flex-none font-bold shadow-2xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#ECECEC]/30 dark:bg-zinc-900/60 border-t border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between flex-none">
          <div>
            {savedToast && (
              <div className="flex items-center gap-2 text-xs font-bold text-[#190088] dark:text-[#97D6DF] bg-[#97D6DF]/20 px-3 py-1.5 rounded-xl border border-[#97D6DF]/40 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
                <span>Ajustes guardados correctamente</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              intent="account.cancel"
              onClick={onClose}
              className="py-2 px-4 text-xs font-bold text-zinc-600 dark:text-zinc-300"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              intent="account.save"
              onClick={handleSave}
              className="py-2.5 px-6 text-xs font-bold shadow-sm"
            >
              <span>Guardar Cambios</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
