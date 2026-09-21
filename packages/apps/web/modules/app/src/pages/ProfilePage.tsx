/**
 * Perfil del usuario (`/profile`).
 *
 * ── Qué se puede honrar aquí y qué no ────────────────────────────────────────
 * Esta página tenía la misma enfermedad que la cabecera, en grado mayor: sembraba
 * su estado con una identidad inventada —«Chowdury Musharof», `randomuser@pimjo.com`,
 * «+09 363 398 46», «Arizona, United States.», `ERT 2489`, `AS4568384`— y sus
 * botones de guardar **solo escribían en estado de React**: el toast decía
 * «Información personal actualizada correctamente» y un F5 lo revertía.
 *
 * Ahora los datos salen de `organizacionStore.usuario` y los dos modales de edición
 * persisten con `actualizarPerfil()`. El avatar son **iniciales**, porque
 * `UsuarioPerfil` no tiene `avatarUrl` (mismo criterio que `UserDropdown`).
 *
 * Tres controles **no se pueden honrar con ningún campo de modelo**, porque no
 * dependen de datos sino de infraestructura que este prototipo no tiene: cambiar la
 * contraseña, activar 2FA y cerrar la sesión en otros dispositivos necesitan un
 * backend de autenticación. Se deshabilitan **con el motivo escrito y visible**, no
 * solo en un `title`: quien no pase el ratón merece la misma explicación, y un botón
 * apagado sin motivo es justo lo que hay que evitar (mismo criterio que `RolesTab`).
 *
 * «Eliminar cuenta» **sí** se puede honrar: `organizacionStore.reiniciar()` devuelve
 * la capa de Organización a su estado limpio —sin usuario, sin organización, sin
 * módulos y sin la clave de `localStorage`— y `sessionStore.reset()` cierra la
 * sesión. Antes solo hacía lo segundo, así que dejaba la organización atrás.
 *
 * ── Lo que sigue abierto ─────────────────────────────────────────────────────
 * La tarjeta «Dirección» guarda la dirección **del usuario** (`UsuarioPerfil.direccion`),
 * pero un TAX ID es un dato del negocio. Si en realidad es el domicilio fiscal de la
 * organización, su sitio es `OrganizacionWorkspace` y hay que moverlo: es decisión de
 * producto, no de código.
 */
import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import {
  Pencil,
  KeyRound,
  LogOut,
  Trash2,
  Check,
  X,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { organizacionStore, sessionStore } from "@/stores";
import type { RedesSociales } from "@/stores";

/** Motivo único de los tres controles que dependen de un backend de autenticación. */
const MOTIVO_SIN_BACKEND =
  "Requiere un backend de autenticación. Este prototipo no tiene uno, así que el cambio no se guardaría.";

/** Iconos de las redes sociales: glifo, etiqueta accesible y color de realce. */
const ICONOS_RED: Record<
  keyof RedesSociales,
  { label: string; path: string; clase: string }
> = {
  facebook: {
    label: "Facebook",
    clase: "hover:text-black dark:hover:text-white",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  x: {
    label: "X",
    clase: "hover:text-black dark:hover:text-white",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  linkedin: {
    label: "LinkedIn",
    clase: "hover:text-black dark:hover:text-white",
    path: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z",
  },
  instagram: {
    label: "Instagram",
    clase: "hover:text-black dark:hover:text-white",
    path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  },
};

const CLASE_INPUT =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const CLASE_BOTON_SECUNDARIO =
  "rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800";

/** Fila de solo lectura de una tarjeta: etiqueta + valor. */
function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="block text-xs font-medium text-gray-400 dark:text-gray-500">{etiqueta}</span>
      <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{children}</div>
    </div>
  );
}

/**
 * Acción que este prototipo **no puede** ejecutar, con el motivo a la vista.
 *
 * El `title` explica el caso puntual al pasar el ratón; el `<p>` visible existe
 * porque quien no pase el ratón merece la misma explicación. Un botón apagado sin
 * motivo es peor que un botón que falta.
 */
function AccionBloqueada({
  titulo,
  motivo,
  icono,
}: {
  titulo: string;
  motivo: string;
  icono: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-5">
      <div>
        <h4 className="text-sm font-semibold text-ink-title dark:text-white">{titulo}</h4>
        <p className="mt-0.5 max-w-prose text-xs text-gray-500 dark:text-gray-400">{motivo}</p>
      </div>
      <button
        type="button"
        disabled
        title={motivo}
        aria-label={`${titulo} — ${motivo}`}
        className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-400 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-600"
      >
        {icono}
        <span>{titulo}</span>
      </button>
    </div>
  );
}

interface FormPersonal {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  cargo: string;
  bio: string;
  ubicacion: string;
  redes: RedesSociales;
}

interface FormDireccion {
  pais: string;
  ciudad: string;
  codigoPostal: string;
  identificacionFiscal: string;
}

const ProfilePage = observer(function ProfilePage() {
  const usuario = organizacionStore.usuario;

  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isEditPersonalOpen, setIsEditPersonalOpen] = useState(false);
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

  const [personalForm, setPersonalForm] = useState<FormPersonal>({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    cargo: "",
    bio: "",
    ubicacion: "",
    redes: {},
  });
  const [addressForm, setAddressForm] = useState<FormDireccion>({
    pais: "",
    ciudad: "",
    codigoPostal: "",
    identificacionFiscal: "",
  });

  const nombre = usuario?.nombre ?? "";
  const apellido = usuario?.apellido ?? "";
  const cargo = usuario?.cargo ?? "";
  const ubicacion = usuario?.ubicacion ?? "";
  const iniciales = `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
  const direccion = usuario?.direccion ?? {};

  /** Redes con valor: las vacías no se pintan, para no dejar enlaces muertos. */
  const redesConValor = (Object.keys(ICONOS_RED) as (keyof RedesSociales)[])
    .map((clave) => ({ clave, url: usuario?.redes?.[clave]?.trim() ?? "" }))
    .filter((r) => r.url !== "");

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const abrirPersonal = () => {
    setPersonalForm({
      nombre,
      apellido,
      email: usuario?.email ?? "",
      telefono: usuario?.telefono ?? "",
      cargo,
      bio: usuario?.bio ?? "",
      ubicacion,
      redes: { ...usuario?.redes },
    });
    setIsEditPersonalOpen(true);
  };

  const abrirDireccion = () => {
    setAddressForm({
      pais: usuario?.pais ?? "",
      ciudad: direccion.ciudad ?? "",
      codigoPostal: direccion.codigoPostal ?? "",
      identificacionFiscal: direccion.identificacionFiscal ?? "",
    });
    setIsEditAddressOpen(true);
  };

  const handleSavePersonal = (e: React.FormEvent) => {
    e.preventDefault();
    organizacionStore.actualizarPerfil({
      nombre: personalForm.nombre,
      apellido: personalForm.apellido,
      email: personalForm.email,
      telefono: personalForm.telefono,
      cargo: personalForm.cargo,
      bio: personalForm.bio,
      ubicacion: personalForm.ubicacion,
      redes: personalForm.redes,
    });
    setIsEditPersonalOpen(false);
    showToast("Información personal actualizada");
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    organizacionStore.actualizarPerfil({
      pais: addressForm.pais,
      direccion: {
        ciudad: addressForm.ciudad,
        codigoPostal: addressForm.codigoPostal,
        identificacionFiscal: addressForm.identificacionFiscal,
      },
    });
    setIsEditAddressOpen(false);
    showToast("Dirección actualizada");
  };

  /**
   * Eliminar cuenta = empezar de cero.
   *
   * `reiniciar()` limpia la capa de Organización (usuario, organización, módulos y
   * la clave de `localStorage`) y `reset()` cierra la sesión. Antes solo se llamaba
   * al segundo, así que la organización quedaba viva tras «eliminar la cuenta».
   */
  const handleDeleteAccount = () => {
    setIsDeleteAccountOpen(false);
    organizacionStore.reiniciar();
    sessionStore.reset();
    window.location.href = "/login";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-theme-xl dark:bg-white dark:text-gray-900 animate-entrada-lista">
          <Check className="size-4 text-success-400 dark:text-success-600" />
          <span>{successToast}</span>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-title dark:text-white sm:text-3xl font-sans">
          Mi perfil
        </h1>
      </div>

      <div className="space-y-6">
        {/* ── TARJETA 1: INFORMACIÓN PERSONAL ── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-6 dark:border-gray-800">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* Iniciales, no una foto: `UsuarioPerfil` no tiene `avatarUrl`. */}
              <div
                aria-hidden="true"
                className="flex size-16 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 sm:size-20 sm:text-xl"
              >
                {iniciales || "—"}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-ink-title dark:text-white">
                  {nombre || apellido ? `${nombre} ${apellido}`.trim() : "Sin nombre"}
                </h2>
                {(cargo || ubicacion) && (
                  <p className="mt-0.5 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                    {[cargo, ubicacion].filter(Boolean).join(" | ")}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={abrirPersonal}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/80 cursor-pointer transition-colors"
            >
              <Pencil className="size-3.5 text-gray-500 dark:text-gray-400" />
              <span>Editar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-y-6 pt-6 sm:grid-cols-2 lg:grid-cols-4 sm:gap-x-6">
            <Dato etiqueta="Nombre">{nombre || "—"}</Dato>
            <Dato etiqueta="Apellido">{apellido || "—"}</Dato>
            <Dato etiqueta="Correo">
              <span className="block truncate">{usuario?.email || "—"}</span>
            </Dato>
            <Dato etiqueta="Teléfono">{usuario?.telefono || "—"}</Dato>
            <Dato etiqueta="Cargo">{cargo || "—"}</Dato>
            <Dato etiqueta="Bio">{usuario?.bio || "—"}</Dato>
            <Dato etiqueta="Ubicación">{ubicacion || "—"}</Dato>
            <Dato etiqueta="Redes">
              {redesConValor.length === 0 ? (
                <span className="text-gray-400 dark:text-gray-500">Sin redes</span>
              ) : (
                <div className="mt-1.5 flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  {redesConValor.map(({ clave, url }) => {
                    const icono = ICONOS_RED[clave];
                    return (
                      <a
                        key={clave}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className={`transition-colors ${icono.clase}`}
                        aria-label={icono.label}
                      >
                        <svg className="size-4 fill-currentColor" viewBox="0 0 24 24">
                          <path d={icono.path} />
                        </svg>
                      </a>
                    );
                  })}
                </div>
              )}
            </Dato>
          </div>
        </section>

        {/* ── TARJETA 2: DIRECCIÓN ── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 transition-colors">
          <div className="flex items-center justify-between border-b border-gray-100 pb-5 dark:border-gray-800">
            <h3 className="text-base sm:text-lg font-bold text-ink-title dark:text-white">
              Dirección
            </h3>

            <button
              type="button"
              onClick={abrirDireccion}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700/80 cursor-pointer transition-colors"
            >
              <Pencil className="size-3.5 text-gray-500 dark:text-gray-400" />
              <span>Editar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-y-6 pt-6 sm:grid-cols-2 sm:gap-x-12">
            <Dato etiqueta="País">{usuario?.pais || "—"}</Dato>
            <Dato etiqueta="Ciudad">{direccion.ciudad || "—"}</Dato>
            <Dato etiqueta="Código postal">{direccion.codigoPostal || "—"}</Dato>
            <Dato etiqueta="Identificación fiscal">{direccion.identificacionFiscal || "—"}</Dato>
          </div>
        </section>

        {/* ── TARJETA 3: SEGURIDAD ── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 transition-colors">
          <div className="border-b border-gray-100 pb-5 dark:border-gray-800">
            <h3 className="text-base sm:text-lg font-bold text-ink-title dark:text-white">
              Seguridad
            </h3>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <AccionBloqueada
              titulo="Cambiar contraseña"
              motivo={MOTIVO_SIN_BACKEND}
              icono={<KeyRound className="size-3.5" />}
            />
            <AccionBloqueada
              titulo="Verificación en dos pasos (2FA)"
              motivo={MOTIVO_SIN_BACKEND}
              icono={<ShieldCheck className="size-3.5" />}
            />
          </div>
        </section>

        {/* ── TARJETA 4: ZONA DE RIESGO ── */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 transition-colors">
          <div className="border-b border-gray-100 pb-5 dark:border-gray-800">
            <h3 className="text-base sm:text-lg font-bold text-ink-title dark:text-white">
              Zona de riesgo
            </h3>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <AccionBloqueada
              titulo="Cerrar sesión en otros dispositivos"
              motivo="Cerrar las sesiones de otros dispositivos requiere un backend de autenticación. Para salir de este dispositivo, usa el menú de la cabecera."
              icono={<LogOut className="size-3.5" />}
            />

            <div className="flex flex-wrap items-center justify-between gap-4 py-5">
              <div>
                <h4 className="text-sm font-semibold text-ink-title dark:text-white">
                  Eliminar cuenta
                </h4>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Borra tu usuario y deja la organización vacía. No se puede deshacer.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsDeleteAccountOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-error-500/80 bg-white px-4 py-2 text-xs font-semibold text-error-600 shadow-theme-xs hover:bg-error-50 dark:bg-error-950/20 dark:border-error-500/50 dark:text-error-400 dark:hover:bg-error-950/40 cursor-pointer transition-colors"
              >
                <Trash2 className="size-3.5 text-error-600 dark:text-error-400" />
                <span>Eliminar cuenta</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ── MODAL: EDITAR INFORMACIÓN PERSONAL ── */}
      {isEditPersonalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 dark:border dark:border-gray-800">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-ink-title dark:text-white">
                Editar información personal
              </h3>
              <button
                onClick={() => setIsEditPersonalOpen(false)}
                aria-label="Cerrar"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSavePersonal} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
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
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
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
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Correo
                </label>
                <input
                  type="email"
                  value={personalForm.email}
                  onChange={(e) => setPersonalForm({ ...personalForm, email: e.target.value })}
                  className={CLASE_INPUT}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={personalForm.telefono}
                    onChange={(e) => setPersonalForm({ ...personalForm, telefono: e.target.value })}
                    className={CLASE_INPUT}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Cargo
                  </label>
                  <input
                    type="text"
                    value={personalForm.cargo}
                    onChange={(e) => setPersonalForm({ ...personalForm, cargo: e.target.value })}
                    className={CLASE_INPUT}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Bio
                </label>
                <input
                  type="text"
                  value={personalForm.bio}
                  onChange={(e) => setPersonalForm({ ...personalForm, bio: e.target.value })}
                  className={CLASE_INPUT}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Ubicación
                </label>
                <input
                  type="text"
                  value={personalForm.ubicacion}
                  onChange={(e) => setPersonalForm({ ...personalForm, ubicacion: e.target.value })}
                  placeholder="Bogotá, Colombia"
                  className={CLASE_INPUT}
                />
              </div>

              <fieldset>
                <legend className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Redes
                </legend>
                <div className="grid grid-cols-2 gap-4">
                  {(Object.keys(ICONOS_RED) as (keyof RedesSociales)[]).map((clave) => (
                    <div key={clave}>
                      <label className="block text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-1">
                        {ICONOS_RED[clave].label}
                      </label>
                      <input
                        type="url"
                        value={personalForm.redes[clave] ?? ""}
                        onChange={(e) =>
                          setPersonalForm({
                            ...personalForm,
                            redes: { ...personalForm.redes, [clave]: e.target.value },
                          })
                        }
                        placeholder="https://"
                        className={CLASE_INPUT}
                      />
                    </div>
                  ))}
                </div>
              </fieldset>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditPersonalOpen(false)}
                  className={CLASE_BOTON_SECUNDARIO}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDITAR DIRECCIÓN ── */}
      {isEditAddressOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 dark:border dark:border-gray-800">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-ink-title dark:text-white">
                Editar dirección
              </h3>
              <button
                onClick={() => setIsEditAddressOpen(false)}
                aria-label="Cerrar"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  País
                </label>
                <input
                  type="text"
                  value={addressForm.pais}
                  onChange={(e) => setAddressForm({ ...addressForm, pais: e.target.value })}
                  className={CLASE_INPUT}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={addressForm.ciudad}
                  onChange={(e) => setAddressForm({ ...addressForm, ciudad: e.target.value })}
                  className={CLASE_INPUT}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Código postal
                  </label>
                  <input
                    type="text"
                    value={addressForm.codigoPostal}
                    onChange={(e) => setAddressForm({ ...addressForm, codigoPostal: e.target.value })}
                    className={CLASE_INPUT}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Identificación fiscal
                  </label>
                  <input
                    type="text"
                    value={addressForm.identificacionFiscal}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, identificacionFiscal: e.target.value })
                    }
                    className={CLASE_INPUT}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsEditAddressOpen(false)}
                  className={CLASE_BOTON_SECUNDARIO}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ELIMINAR CUENTA ── */}
      {isDeleteAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900 dark:border dark:border-gray-800 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-error-100 text-error-600 dark:bg-error-950/40 dark:text-error-400 mb-4">
              <AlertTriangle className="size-6" />
            </div>
            <h3 className="text-lg font-bold text-ink-title dark:text-white">
              ¿Eliminar la cuenta permanentemente?
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Se borran tu usuario, tu organización y sus módulos de este navegador. Esta acción es
              irreversible.
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
                className="rounded-lg bg-error-600 px-4 py-2 text-sm font-medium text-white hover:bg-error-700"
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
