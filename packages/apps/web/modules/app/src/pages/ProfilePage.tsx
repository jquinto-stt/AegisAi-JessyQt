/**
 * Perfil del usuario (`/profile` & `/perfil`).
 *
 * Arquitectura de 4 burbujas nativas de Necto:
 * 1. Burbuja 1: Foto y Vista Previa de Perfil (Diseño de tarjeta con foto a sangre para visualización y gestión)
 * 2. Burbuja 2: Información Personal y de Contacto
 * 3. Burbuja 3: Organización y Permisos en Necto (Rol, permisos y módulos activos)
 * 4. Burbuja 4: Seguridad y Cuenta (Supabase Auth y control de sesión)
 */
import React, { useState, useRef } from "react";
import { observer } from "mobx-react-lite";
import {
  ArrowLeftIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  ShieldCheckIcon,
  XMarkIcon,
  UserIcon,
  BuildingOffice2Icon,
  KeyIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  PhotoIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import { organizacionStore, sessionStore } from "@/stores";
import { InsigniaVerificada } from "@/icons";
import { actualizarPerfilRemoto, cambiarPassword } from "@/lib/auth.service";
import type { RedesSociales } from "@/stores";

const CLASE_INPUT =
  "w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white transition-colors";
const CLASE_BOTON_SECUNDARIO =
  "rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors cursor-pointer";
const CLASE_BOTON_EDITAR =
  "inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all cursor-pointer";

// Foto de muestra profesional por defecto
const FOTO_POR_DEFECTO =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80";

interface FormPersonal {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  cargo: string;
  bio: string;
  ubicacion: string;
  avatarUrl: string;
  redes: RedesSociales;
}

const ProfilePage = observer(function ProfilePage() {
  const usuario = organizacionStore.usuario;
  const org = organizacionStore.organizacion;
  const orgNombre = org?.nombre || "Necto";
  const estaVerificado = org?.verificacion?.estado === "aprobado";

  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Estados de modales
  const [isEditPersonalOpen, setIsEditPersonalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

  // Gestión de foto de perfil
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [urlFotoInput, setUrlFotoInput] = useState("");
  const [mostrarInputUrl, setMostrarInputUrl] = useState(false);

  // Estados de formularios
  const [personalForm, setPersonalForm] = useState<FormPersonal>({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    cargo: "",
    bio: "",
    ubicacion: "",
    avatarUrl: "",
    redes: {},
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);

  const nombre = usuario?.nombre || "Milia";
  const apellido = usuario?.apellido || "Basova";
  const fullName = `${nombre} ${apellido}`.trim();
  const cargo = usuario?.cargo || "Brand Ambassador";
  const bio =
    usuario?.bio ||
    "Mi pasión por el sector comenzó al adquirir mi primer proyecto a los 24 años. Tras experimentar los desafíos y la satisfacción de crecer, hoy me dedico a compartir esa experiencia y generar valor con clientes y colaboradores.";
  const fotoAMostrar = usuario?.avatarUrl?.trim() || FOTO_POR_DEFECTO;
  const tieneFotoPersonalizada = Boolean(usuario?.avatarUrl && usuario.avatarUrl.trim().length > 0);

  // Datos de rol y sesión
  const rolSesion = sessionStore.tipoSesion === "operador" ? "Operador" : "Administrador";
  const modulosActivos = organizacionStore.modulosActivos;

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleFotoArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Por favor selecciona un archivo de imagen válido");
      return;
    }

    // 5MB máximo
    if (file.size > 5 * 1024 * 1024) {
      showToast("La imagen no debe superar los 5 MB");
      return;
    }

    setSubiendoFoto(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        await actualizarPerfilRemoto({ avatarUrl: dataUrl });
        showToast("Foto de perfil actualizada con éxito");
      } catch {
        showToast("Error al guardar la foto de perfil");
      } finally {
        setSubiendoFoto(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      setSubiendoFoto(false);
      showToast("Error al procesar el archivo de imagen");
    };
    reader.readAsDataURL(file);
  };

  const handleGuardarUrlFoto = async () => {
    if (!urlFotoInput.trim()) return;
    setSubiendoFoto(true);
    try {
      await actualizarPerfilRemoto({ avatarUrl: urlFotoInput.trim() });
      showToast("Foto de perfil actualizada con éxito");
      setUrlFotoInput("");
      setMostrarInputUrl(false);
    } catch {
      showToast("Error al guardar la foto de perfil");
    } finally {
      setSubiendoFoto(false);
    }
  };

  const handleEliminarFoto = async () => {
    setSubiendoFoto(true);
    try {
      await actualizarPerfilRemoto({ avatarUrl: "" });
      showToast("Foto de perfil eliminada");
    } catch {
      showToast("Error al eliminar la foto de perfil");
    } finally {
      setSubiendoFoto(false);
    }
  };

  const abrirPersonal = () => {
    setPersonalForm({
      nombre,
      apellido,
      email: usuario?.email ?? "",
      telefono: usuario?.telefono ?? "",
      cargo,
      bio: usuario?.bio ?? bio,
      ubicacion: usuario?.ubicacion ?? "",
      avatarUrl: usuario?.avatarUrl ?? "",
      redes: { ...usuario?.redes },
    });
    setIsEditPersonalOpen(true);
  };

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPersonal(true);
    try {
      await actualizarPerfilRemoto({
        nombre: personalForm.nombre,
        apellido: personalForm.apellido,
        email: personalForm.email,
        telefono: personalForm.telefono,
        cargo: personalForm.cargo,
        bio: personalForm.bio,
        ubicacion: personalForm.ubicacion,
        avatarUrl: personalForm.avatarUrl,
        redes: personalForm.redes,
      });
      setIsEditPersonalOpen(false);
      showToast("Información del perfil actualizada");
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    try {
      const res = await cambiarPassword(newPassword);
      if (!res.ok) {
        setPasswordError(res.motivo || "No se pudo cambiar la contraseña.");
        return;
      }
      setIsChangePasswordOpen(false);
      setNewPassword("");
      setConfirmPassword("");
      showToast("Contraseña actualizada con éxito");
    } catch {
      setPasswordError("Ocurrió un error inesperado al actualizar la contraseña.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    setIsDeleteAccountOpen(false);
    organizacionStore.reiniciar();
    sessionStore.reset();
    window.location.href = "/login";
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Toast de confirmación flotante */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-xl dark:bg-white dark:text-gray-900 animate-fade-in">
          <CheckIcon className="size-4 text-emerald-400 dark:text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ── CABECERA DE PÁGINA ── */}
      <div>
        <button
          type="button"
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer mb-2"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Volver</span>
        </button>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white font-sans">
              Perfil de {fullName}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Gestiona tu foto de perfil, información personal y credenciales de acceso a Necto.
            </p>
          </div>
          {estaVerificado && (
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50/90 dark:bg-blue-950/40 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70 shadow-2xs">
              <InsigniaVerificada className="size-5 sm:size-6 shrink-0" />
              <span>Verificado</span>
            </span>
          )}
        </div>
      </div>

      {/* ── BURBUJA 1: FOTO DE PERFIL Y VISTA PREVIA DE IDENTIDAD ── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
              <PhotoIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Foto de perfil
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Visualiza y administra la fotografía que identifica tu cuenta en Necto
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Tarjeta de visualización con foto a sangre */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center lg:items-start">
            <div className="relative flex w-full max-w-md h-44 sm:h-48 overflow-hidden rounded-2xl bg-[#28343c] text-white shadow-xl border border-slate-700/60 select-none">
              
              {/* Mitad izquierda: Foto a sangre completa sin márgenes */}
              <div className="w-[42%] h-full shrink-0 relative overflow-hidden bg-slate-800">
                {fotoAMostrar ? (
                  <img
                    src={fotoAMostrar}
                    alt={fullName}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-slate-400 bg-slate-800/80 p-2 text-center">
                    <PhotoIcon className="size-8 text-slate-500 mb-1" />
                    <span className="text-[11px] font-medium leading-tight text-slate-400">Sin foto</span>
                  </div>
                )}
                {estaVerificado && (
                  <span
                    className="absolute top-2 right-2 z-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 ring-1.5 ring-white dark:ring-gray-900 shadow-xs pointer-events-none"
                    title="Usuario verificado"
                  >
                    <InsigniaVerificada className="size-4 sm:size-4.5" />
                  </span>
                )}
              </div>

              {/* Mitad derecha: Datos en panel oscuro */}
              <div className="w-[58%] h-full p-4 sm:p-5 flex flex-col justify-center relative bg-[#28343c]">
                <div className="pr-2">
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight flex items-center gap-2">
                    <span>{fullName}</span>
                    {estaVerificado && <InsigniaVerificada className="size-5 shrink-0 inline-block" />}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-normal mt-1 leading-snug">
                    {cargo}
                    <span className="block text-slate-300 font-medium">at {orgNombre}</span>
                  </p>
                </div>

                {/* Sello de LOGO en esquina inferior derecha */}
                <div className="absolute bottom-3 right-3">
                  <div className="flex size-8 sm:size-9 items-center justify-center rounded-lg bg-[#141a1e] border border-white/10 shadow-inner overflow-hidden">
                    {org?.logoUrl ? (
                      <img
                        src={org.logoUrl}
                        alt={orgNombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex size-6 sm:size-7 items-center justify-center rounded-full border border-white/30 text-[8px] font-bold tracking-widest text-white uppercase">
                        LOGO
                      </div>
                    )}
                  </div>
                  {estaVerificado && (
                    <span
                      className="absolute -top-1 -right-1 z-10 flex items-center justify-center rounded-full bg-white dark:bg-gray-900 ring-1 ring-white dark:ring-gray-900 shadow-xs pointer-events-none"
                      title="Negocio verificado"
                    >
                      <InsigniaVerificada className="size-3" />
                    </span>
                  )}
                </div>
              </div>

            </div>

            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2.5 text-center lg:text-left">
              Visualización en tiempo real de tu credencial de usuario con foto a sangre.
            </p>
          </div>

          {/* Panel de administración de la foto */}
          <div className="lg:col-span-6 xl:col-span-7 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Actualizar fotografía
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Carga una imagen cuadrada desde tu equipo o vincúlala mediante una URL externa.
              </p>
            </div>

            {/* Input de archivo oculto */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFotoArchivo}
              className="hidden"
            />

            {/* Botones de acción rápida */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={subiendoFoto}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <ArrowUpTrayIcon className="size-4" />
                <span>{subiendoFoto ? "Procesando..." : "Subir nueva foto"}</span>
              </button>

              {tieneFotoPersonalizada && (
                <button
                  type="button"
                  disabled={subiendoFoto}
                  onClick={handleEliminarFoto}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 hover:bg-red-100/60 dark:bg-red-950/20 dark:hover:bg-red-950/40 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-red-600 dark:text-red-400 transition-all cursor-pointer disabled:opacity-50"
                >
                  <TrashIcon className="size-4" />
                  <span>Quitar foto</span>
                </button>
              )}
            </div>

            {/* Opción de enlazar vía URL web */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              {!mostrarInputUrl ? (
                <button
                  type="button"
                  onClick={() => setMostrarInputUrl(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors cursor-pointer"
                >
                  <LinkIcon className="size-3.5" />
                  <span>O vincular foto desde una URL web</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      URL directa de la imagen
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarInputUrl(false);
                        setUrlFotoInput("");
                      }}
                      className="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlFotoInput}
                      onChange={(e) => setUrlFotoInput(e.target.value)}
                      placeholder="https://ejemplo.com/mi-foto.jpg"
                      className={CLASE_INPUT}
                    />
                    <button
                      type="button"
                      disabled={subiendoFoto || !urlFotoInput.trim()}
                      onClick={handleGuardarUrlFoto}
                      className="shrink-0 rounded-xl bg-brand-500 hover:bg-brand-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-gray-400 dark:text-gray-500">
              Formatos aceptados: PNG, JPG o WebP. Tamaño máximo recomendado: 5 MB.
            </p>
          </div>
        </div>
      </section>

      {/* ── BURBUJA 2: INFORMACIÓN PERSONAL Y DE CONTACTO ── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <UserIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Información personal
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Tus datos de contacto e identidad como operador de Necto
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={abrirPersonal}
            className={CLASE_BOTON_EDITAR}
          >
            <PencilIcon className="size-3.5" />
            <span>Editar información</span>
          </button>
        </div>

        <div className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
                Nombre completo
              </span>
              <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {fullName}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
                Correo de acceso
              </span>
              <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white truncate">
                {usuario?.email || "Sin correo"}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
                Teléfono de contacto
              </span>
              <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {usuario?.telefono || "No especificado"}
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
                Ubicación declarada
              </span>
              <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {usuario?.ubicacion || usuario?.pais || "Colombia"}
              </div>
            </div>
          </div>

          {/* Presentación / Bio */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 border border-gray-100 dark:border-gray-800">
            <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              Acerca de mí / Biografía
            </span>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {usuario?.bio || bio}
            </p>
          </div>
        </div>
      </section>

      {/* ── BURBUJA 3: ORGANIZACIÓN Y PERMISOS EN NECTO ── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <BuildingOffice2Icon className="size-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Organización y permisos
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Datos de la empresa y permisos operativos asignados a tu usuario
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-4">
            <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
              Organización actual
            </span>
            <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white">
              {orgNombre}
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              {org?.slug ? `necto.app/${org.slug}` : "Workspace activo"}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-4">
            <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
              Rol de acceso
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                {rolSesion}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Capacidades completas de gestión y administración
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 p-4">
            <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">
              Módulos asignados
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {modulosActivos.map((mod) => (
                <span
                  key={mod}
                  className="inline-flex items-center rounded-md bg-gray-200/70 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-200 capitalize"
                >
                  {mod}
                </span>
              ))}
              {modulosActivos.length === 0 && (
                <span className="text-xs text-gray-400">Sin módulos activos</span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Módulos activos en este workspace
            </p>
          </div>
        </div>
      </section>

      {/* ── BURBUJA 4: SEGURIDAD Y CUENTA ── */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <ShieldCheckIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Seguridad y acceso
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Protección de credenciales y administración de sesión
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 divide-y divide-gray-100 dark:divide-gray-800">
          {/* Fila: Contraseña */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Contraseña de acceso
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Tu clave está cifrada mediante Supabase Auth. Puedes cambiarla en cualquier momento.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setPasswordError(null);
                setNewPassword("");
                setConfirmPassword("");
                setIsChangePasswordOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-2xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer"
            >
              <KeyIcon className="size-3.5 text-gray-500" />
              <span>Cambiar contraseña</span>
            </button>
          </div>

          {/* Fila: Zona de peligro */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-5">
            <div>
              <h3 className="text-sm font-semibold text-red-600 dark:text-red-400">
                Zona de riesgo
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Cierra la sesión activa o elimina los datos locales de tu cuenta en este navegador.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsDeleteAccountOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-gray-800 px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 shadow-2xs hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all cursor-pointer"
            >
              <span>Eliminar cuenta</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── MODAL: EDITAR INFORMACIÓN PERSONAL Y TARJETA ── */}
      {isEditPersonalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 sm:p-7 shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Editar perfil y tarjeta
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Actualiza tus datos personales y los elementos visibles en tu tarjeta digital
                </p>
              </div>
              <button
                onClick={() => setIsEditPersonalOpen(false)}
                aria-label="Cerrar"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSavePersonal} className="space-y-4 pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={personalForm.nombre}
                    onChange={(e) => setPersonalForm({ ...personalForm, nombre: e.target.value })}
                    className={CLASE_INPUT}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Apellido
                  </label>
                  <input
                    type="text"
                    value={personalForm.apellido}
                    onChange={(e) => setPersonalForm({ ...personalForm, apellido: e.target.value })}
                    className={CLASE_INPUT}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Cargo / Título profesional
                </label>
                <input
                  type="text"
                  placeholder="Ej. Brand Ambassador / Especialista de Operaciones"
                  value={personalForm.cargo}
                  onChange={(e) => setPersonalForm({ ...personalForm, cargo: e.target.value })}
                  className={CLASE_INPUT}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  URL de foto de perfil (para la tarjeta)
                </label>
                <input
                  type="url"
                  placeholder="https://... pega el enlace de tu foto"
                  value={personalForm.avatarUrl}
                  onChange={(e) => setPersonalForm({ ...personalForm, avatarUrl: e.target.value })}
                  className={CLASE_INPUT}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Se mostrará en la mitad izquierda de tu tarjeta digital exactamente a sangre completa.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={personalForm.email}
                    onChange={(e) => setPersonalForm({ ...personalForm, email: e.target.value })}
                    className={CLASE_INPUT}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Teléfono directo
                  </label>
                  <input
                    type="tel"
                    placeholder="+57 300 123 4567"
                    value={personalForm.telefono}
                    onChange={(e) => setPersonalForm({ ...personalForm, telefono: e.target.value })}
                    className={CLASE_INPUT}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Ubicación
                </label>
                <input
                  type="text"
                  placeholder="Bogotá, Colombia"
                  value={personalForm.ubicacion}
                  onChange={(e) => setPersonalForm({ ...personalForm, ubicacion: e.target.value })}
                  className={CLASE_INPUT}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Acerca de mí / Biografía
                </label>
                <textarea
                  rows={4}
                  value={personalForm.bio}
                  onChange={(e) => setPersonalForm({ ...personalForm, bio: e.target.value })}
                  placeholder="Breve resumen de tu trayectoria y rol..."
                  className={CLASE_INPUT}
                />
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditPersonalOpen(false)}
                  className={CLASE_BOTON_SECUNDARIO}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPersonal}
                  className="rounded-xl bg-brand-500 hover:bg-brand-600 px-5 py-2 text-sm font-semibold text-white transition-colors cursor-pointer"
                >
                  {savingPersonal ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ── MODAL: CAMBIAR CONTRASEÑA ── */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 sm:p-7 shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Cambiar contraseña
              </h3>
              <button
                onClick={() => setIsChangePasswordOpen(false)}
                aria-label="Cerrar"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <XMarkIcon className="size-5" />
              </button>
            </div>

            {passwordError && (
              <div className="mt-4 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
                {passwordError}
              </div>
            )}

            <form onSubmit={handleSavePassword} className="space-y-4 pt-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  className={CLASE_INPUT}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirmar nueva contraseña
                </label>
                <input
                  type="password"
                  placeholder="Repite la contraseña"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  className={CLASE_INPUT}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-5 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className={CLASE_BOTON_SECUNDARIO}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="rounded-xl bg-brand-500 hover:bg-brand-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {passwordLoading ? "Actualizando..." : "Guardar contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ELIMINAR CUENTA ── */}
      {isDeleteAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 sm:p-7 shadow-2xl dark:bg-gray-900 dark:border dark:border-gray-800 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 mb-4">
              <ExclamationTriangleIcon className="size-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              ¿Eliminar la cuenta permanentemente?
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Se borrarán tu usuario, tu organización y sus módulos de este navegador. Esta acción es irreversible.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteAccountOpen(false)}
                className={CLASE_BOTON_SECUNDARIO}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
              >
                Sí, eliminar mi cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ProfilePage;
