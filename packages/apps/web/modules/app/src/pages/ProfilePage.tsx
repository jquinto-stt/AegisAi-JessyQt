import React, { useState } from "react";
import {
  Pencil,
  KeyRound,
  LogOut,
  Trash2,
  Check,
  Globe,
  X,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { sessionStore } from "@/stores";

interface SocialLinks {
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
}

export default function ProfilePage() {
  // Estado de Datos Personales
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "Chowdury",
    lastName: "Musharof",
    email: "randomuser@pimjo.com",
    phone: "+09 363 398 46",
    bio: "Team Manager",
    title: "Team Manager",
    location: "Arizona, United States.",
    avatar: "/images/user/owner.png",
    socials: {
      facebook: "https://facebook.com",
      twitter: "https://x.com",
      linkedin: "https://linkedin.com",
      instagram: "https://instagram.com",
    } as SocialLinks,
  });

  // Estado de Dirección
  const [addressInfo, setAddressInfo] = useState({
    country: "United States",
    cityState: "Arizona, United States.",
    postalCode: "ERT 2489",
    taxId: "AS4568384",
  });

  // Seguridad
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modales
  const [isEditPersonalOpen, setIsEditPersonalOpen] = useState(false);
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isLogoutDevicesOpen, setIsLogoutDevicesOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

  // Formularios temporales de edición
  const [personalForm, setPersonalForm] = useState(personalInfo);
  const [addressForm, setAddressForm] = useState(addressInfo);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleSavePersonal = (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalInfo(personalForm);
    setIsEditPersonalOpen(false);
    showToast("Información personal actualizada correctamente");
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setAddressInfo(addressForm);
    setIsEditAddressOpen(false);
    showToast("Dirección actualizada correctamente");
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }
    setIsChangePasswordOpen(false);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    showToast("Contraseña cambiada con éxito");
  };

  const handleLogoutAllDevices = () => {
    setIsLogoutDevicesOpen(false);
    showToast("Se han cerrado todas las sesiones en otros dispositivos");
  };

  const handleDeleteAccount = () => {
    setIsDeleteAccountOpen(false);
    sessionStore.logout();
    window.location.href = "/login";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Toast flotante de éxito */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-xl dark:bg-white dark:text-gray-900 animate-in fade-in slide-in-from-bottom-2">
          <Check className="size-4 text-green-400 dark:text-green-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Título de la página */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl font-sans">
          My Profile
        </h1>
      </div>

      <div className="space-y-6">
        {/* ── TARJETA 1: INFORMACIÓN PERSONAL ── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition-colors">
          {/* Header de la tarjeta */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-6 dark:border-gray-800">
            <div className="flex items-center gap-4 sm:gap-5">
              <img
                src={personalInfo.avatar}
                alt={personalInfo.firstName}
                className="size-16 sm:size-20 rounded-full object-cover border-2 border-gray-100 dark:border-gray-800 shadow-xs"
              />
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {personalInfo.firstName} {personalInfo.lastName}
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                  {personalInfo.title} &nbsp;|&nbsp; {personalInfo.location}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPersonalForm(personalInfo);
                setIsEditPersonalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/80 cursor-pointer transition-colors"
            >
              <Pencil className="size-3.5 text-gray-500 dark:text-gray-400" />
              <span>Edit</span>
            </button>
          </div>

          {/* Grilla de datos */}
          <div className="grid grid-cols-1 gap-y-6 pt-6 sm:grid-cols-2 lg:grid-cols-4 sm:gap-x-6">
            <div>
              <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
                First Name
              </span>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {personalInfo.firstName}
              </p>
            </div>

            <div>
              <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
                Last Name
              </span>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {personalInfo.lastName}
              </p>
            </div>

            <div className="hidden lg:block" />
            <div className="hidden lg:block" />

            <div>
              <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
                Email address
              </span>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white truncate">
                {personalInfo.email}
              </p>
            </div>

            <div>
              <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
                Phone
              </span>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {personalInfo.phone}
              </p>
            </div>

            <div>
              <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
                Bio
              </span>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {personalInfo.bio}
              </p>
            </div>

            <div>
              <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
                Social Links
              </span>
              <div className="mt-1.5 flex items-center gap-3 text-gray-700 dark:text-gray-300">
                {/* Facebook */}
                <a
                  href={personalInfo.socials.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-600 transition-colors"
                  aria-label="Facebook"
                >
                  <svg className="size-4 fill-currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                {/* X / Twitter */}
                <a
                  href={personalInfo.socials.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-black dark:hover:text-white transition-colors"
                  aria-label="X"
                >
                  <svg className="size-4 fill-currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                {/* LinkedIn */}
                <a
                  href={personalInfo.socials.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-blue-700 transition-colors"
                  aria-label="LinkedIn"
                >
                  <svg className="size-4 fill-currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
                {/* Instagram */}
                <a
                  href={personalInfo.socials.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-pink-600 transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="size-4 fill-currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── TARJETA 2: ADDRESS ── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition-colors">
          {/* Header de la tarjeta */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-5 dark:border-gray-800">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Address
            </h3>

            <button
              type="button"
              onClick={() => {
                setAddressForm(addressInfo);
                setIsEditAddressOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/80 cursor-pointer transition-colors"
            >
              <Pencil className="size-3.5 text-gray-500 dark:text-gray-400" />
              <span>Edit</span>
            </button>
          </div>

          {/* Grilla de Address */}
          <div className="grid grid-cols-1 gap-y-6 pt-6 sm:grid-cols-2 sm:gap-x-12">
            <div>
              <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
                Country
              </span>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {addressInfo.country}
              </p>
            </div>

            <div>
              <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
                City/State
              </span>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {addressInfo.cityState}
              </p>
            </div>

            <div>
              <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
                Postal Code
              </span>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {addressInfo.postalCode}
              </p>
            </div>

            <div>
              <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
                TAX ID
              </span>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {addressInfo.taxId}
              </p>
            </div>
          </div>
        </section>

        {/* ── TARJETA 3: SECURITY ── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition-colors">
          <div className="border-b border-gray-100 pb-5 dark:border-gray-800">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Security
            </h3>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {/* Change Password */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-5 first:pt-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Change Password
                </h4>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Receive real-time notifications and team alerts.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/80 cursor-pointer transition-colors"
              >
                <KeyRound className="size-3.5 text-gray-500 dark:text-gray-400" />
                <span>Change Password</span>
              </button>
            </div>

            {/* Two-factor authentication */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-5 last:pb-0">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Two-factor authentication (2FA)
                </h4>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Keep your account secure by enabling 2FA
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={twoFactorEnabled}
                onClick={() => {
                  setTwoFactorEnabled(!twoFactorEnabled);
                  showToast(
                    !twoFactorEnabled
                      ? "Autenticación en dos pasos (2FA) activada"
                      : "Autenticación en dos pasos desactivada"
                  );
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  twoFactorEnabled ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    twoFactorEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ── TARJETA 4: DANGER ZONE ── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-xs dark:border-gray-800 dark:bg-gray-900 transition-colors">
          <div className="border-b border-gray-100 pb-5 dark:border-gray-800">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Danger Zone
            </h3>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {/* Logout all devices */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-5 first:pt-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Logout all devices
                </h4>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Sign out from every active session.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsLogoutDevicesOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/80 cursor-pointer transition-colors"
              >
                <LogOut className="size-3.5 text-gray-500 dark:text-gray-400" />
                <span>Logout all devices</span>
              </button>
            </div>

            {/* Delete account */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-5 last:pb-0">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Delete account
                </h4>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Sign out from every active session.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDeleteAccountOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/80 bg-white px-4 py-2 text-xs font-semibold text-red-600 shadow-2xs hover:bg-red-50 dark:bg-red-950/20 dark:border-red-500/50 dark:text-red-400 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
              >
                <Trash2 className="size-3.5 text-red-600 dark:text-red-400" />
                <span>Delete account</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ── MODAL: EDIT PERSONAL INFO ── */}
      {isEditPersonalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Editar Información Personal
              </h3>
              <button
                onClick={() => setIsEditPersonalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSavePersonal} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={personalForm.firstName}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, firstName: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={personalForm.lastName}
                    onChange={(e) =>
                      setPersonalForm({ ...personalForm, lastName: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={personalForm.email}
                  onChange={(e) =>
                    setPersonalForm({ ...personalForm, email: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={personalForm.phone}
                  onChange={(e) =>
                    setPersonalForm({ ...personalForm, phone: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Bio / Cargo
                </label>
                <input
                  type="text"
                  value={personalForm.bio}
                  onChange={(e) =>
                    setPersonalForm({
                      ...personalForm,
                      bio: e.target.value,
                      title: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditPersonalOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT ADDRESS ── */}
      {isEditAddressOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Editar Dirección
              </h3>
              <button
                onClick={() => setIsEditAddressOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={addressForm.country}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, country: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  City / State
                </label>
                <input
                  type="text"
                  value={addressForm.cityState}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, cityState: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={addressForm.postalCode}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, postalCode: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    TAX ID
                  </label>
                  <input
                    type="text"
                    value={addressForm.taxId}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, taxId: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditAddressOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CHANGE PASSWORD ── */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Cambiar Contraseña
              </h3>
              <button
                onClick={() => setIsChangePasswordOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
                >
                  Actualizar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: LOGOUT ALL DEVICES ── */}
      {isLogoutDevicesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-orange-100 text-brand-600 dark:bg-orange-950/40 dark:text-brand-400 mb-4">
              <ShieldCheck className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Cerrar sesión en todos los dispositivos
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Esta acción revocará todas las sesiones activas en navegadores y teléfonos móviles, excepto la sesión actual.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsLogoutDevicesOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogoutAllDevices}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
              >
                Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE ACCOUNT ── */}
      {isDeleteAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 mb-4">
              <AlertTriangle className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              ¿Eliminar cuenta permanentemente?
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Esta acción es irreversible. Se perderán todos tus accesos, registros y configuraciones vinculadas a esta cuenta.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteAccountOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Sí, eliminar mi cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
