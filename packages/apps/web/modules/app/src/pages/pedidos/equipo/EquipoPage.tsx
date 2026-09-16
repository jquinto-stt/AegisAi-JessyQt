import { useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Tab } from "@/elements/ui/tabs";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { operadoresStore, rolesStore, type Operador, type OperadorEstado } from "@/stores";
import { PlusIcon } from "@/icons";
import { EquipoTabla } from "./EquipoTabla";
import { RolesTab } from "./RolesTab";
import {
  FILTRO_ESTADO_TODAS,
  OPCIONES_FILTRO_ESTADO,
  emailSugerido,
  type TabEquipo,
} from "./equipo.constants";

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA "EQUIPO" (pedidos)
// ═══════════════════════════════════════════════════════════════════════════
//
// Sustituye a la pantalla legacy de "Operadores" **solo para pedidos**. Los
// otros módulos siguen usando `OperadoresPage` con su modelo de secciones.
//
// Lo que cambia frente a la pantalla legacy:
//   1. Se gestiona un EQUIPO (personas con un rol), no "operadores con
//      secciones marcadas".
//   2. Hay una pestaña de ROLES: los paquetes de capacidades se definen una vez
//      y se reutilizan, en vez de marcar casillas persona por persona.
//   3. El perfil de cada persona es una RUTA (`/pedidos/equipo/:id`), no un
//      modal: el editor de rol + 16 capacidades + excepciones no cabe bien en
//      un diálogo.
//   4. "Ver como" (impersonación) vive aquí, no en el login.
//
// La página entera está detrás de `team.manage` (ver `App.tsx`).
//
// ═══════════════════════════════════════════════════════════════════════════

/** Formulario de invitación de un miembro del equipo. */
interface PersonaForm {
  nombre: string;
  email: string;
  telefono: string;
  cargo: string;
  rolId: string;
}

export const EquipoPage = observer(() => {
  const [vista, setVista] = useState<"equipo" | "roles">("equipo");
  const [tab, setTab] = useState<"todos" | "pendientes">("todos");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>(FILTRO_ESTADO_TODAS);
  const [modalOpen, setModalOpen] = useState(false);

  // ── Invitación de persona ──────────────────────────────────────────────────
  const [form, setForm] = useState<PersonaForm>({
    nombre: "",
    email: "",
    telefono: "",
    cargo: "",
    rolId: "",
  });
  const [emailTocado, setEmailTocado] = useState(false);

  const equipo = operadoresStore.porModulo("pedidos");
  const pendientes = operadoresStore.pendientesCount("pedidos");

  const set = (campo: keyof PersonaForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [campo]: value }));

  /** Roles asignables: todos, menos el de administrador (no se reparte por error). */
  const rolesAsignables = rolesStore.roles.filter((r) => r.id !== "admin_tienda");

  const abrirCrear = () => {
    setForm({
      nombre: "",
      email: "",
      telefono: "",
      cargo: "",
      rolId: rolesAsignables[0]?.id ?? "",
    });
    setEmailTocado(false);
    setModalOpen(true);
  };

  const datosOk =
    form.nombre.trim() !== "" && form.email.trim() !== "" && form.telefono.trim() !== "" && form.rolId !== "";

  const guardar = () => {
    if (!datosOk) return;
    operadoresStore.crear("pedidos", {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
      cargo: form.cargo.trim() || undefined,
      rolId: form.rolId,
      estado: "pendiente",
    });
    setModalOpen(false);
  };

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const q = busqueda.trim().toLowerCase();
  const listaFiltrada = equipo.filter((op: Operador) => {
    if (tab === "pendientes" && op.estado !== "pendiente") return false;
    if (tab === "todos" && filtroEstado !== FILTRO_ESTADO_TODAS && op.estado !== (filtroEstado as OperadorEstado)) {
      return false;
    }
    if (q && !(op.nombre.toLowerCase().includes(q) || op.email.toLowerCase().includes(q))) return false;
    return true;
  });

  return (
    <>
      <PageMeta title="Equipo · Pedidos" description="Personas, roles y capacidades del módulo de pedidos" />

      {/* Encabezado */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-800 dark:text-white/90">
              {vista === "roles" ? "Roles y Permisos" : "Equipo"}
            </h1>
            {vista === "equipo" && pendientes > 0 && (
              <Badge color="warning" size="sm">
                {pendientes} pendiente{pendientes === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {vista === "roles"
              ? "Configuración de los paquetes de capacidades para cada rol de usuario."
              : "Cada persona tiene un rol, y el rol define qué puede hacer. Haz clic en una persona para ver su perfil."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant={vista === "roles" ? "primary" : "outline"}
            onClick={() => setVista((v) => (v === "roles" ? "equipo" : "roles"))}
          >
            {vista === "roles" ? "← Volver a equipo" : "Gestionar roles"}
          </Button>
          {vista === "equipo" && (
            <Button
              size="sm"
              startIcon={<PlusIcon className="h-4 w-4" />}
              onClick={abrirCrear}
            >
              Invitar miembro
            </Button>
          )}
        </div>
      </div>

      {vista === "roles" ? (
        <RolesTab />
      ) : (
        <>
          {/* Pestañas de filtrado de personas */}
          <div className="mb-5">
            <Tab
              variant="underline"
              items={[
                { key: "todos", label: "Todos", badge: equipo.length },
                { key: "pendientes", label: "Pendientes", badge: pendientes },
              ]}
              activeTab={tab}
              onTabChange={(k) => setTab(k as "todos" | "pendientes")}
            />
          </div>

          {/* Buscador + filtro de estado */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o correo…"
                className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
              />
            </div>
            {tab === "todos" && (
              <div className="w-full sm:w-48">
                <Select
                  options={OPCIONES_FILTRO_ESTADO}
                  defaultValue={FILTRO_ESTADO_TODAS}
                  onChange={setFiltroEstado}
                  aria-label="Filtrar por estado"
                />
              </div>
            )}
          </div>

          <EquipoTabla operadores={listaFiltrada} />
        </>
      )}

      {/* Modal: invitar miembro */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-md p-6">
        <h2 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Invitar miembro</h2>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Se enviará una invitación a su correo electrónico. La persona aparecerá como pendiente hasta confirmar su registro.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="eq-nombre">Nombre completo <span className="text-error-500">*</span></Label>
            <Input
              id="eq-nombre"
              value={form.nombre}
              placeholder="Ej. María Fernández"
              onChange={(e) => {
                const valor = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  nombre: valor,
                  email: emailTocado ? prev.email : emailSugerido(valor),
                }));
              }}
            />
          </div>

          <div>
            <Label htmlFor="eq-cargo">Cargo o designación</Label>
            <Input
              id="eq-cargo"
              value={form.cargo}
              placeholder="Ej. Operador de Mostrador, Despacho"
              onChange={(e) => set("cargo")(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="eq-email">Correo electrónico <span className="text-error-500">*</span></Label>
            <Input
              id="eq-email"
              type="email"
              value={form.email}
              placeholder="persona@negocio.com"
              onChange={(e) => {
                setEmailTocado(true);
                set("email")(e.target.value);
              }}
            />
          </div>

          <div>
            <Label htmlFor="eq-tel">Teléfono <span className="text-error-500">*</span></Label>
            <Input
              id="eq-tel"
              type="tel"
              value={form.telefono}
              placeholder="+57 300 000 0000"
              onChange={(e) => set("telefono")(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="eq-rol">Rol asignado <span className="text-error-500">*</span></Label>
            <Select
              options={rolesAsignables.map((r) => ({ value: r.id, label: r.nombre }))}
              defaultValue={form.rolId}
              onChange={set("rolId")}
              placeholder="Elige un rol"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              El rol determina qué puede hacer. Podrás ajustar excepciones en su perfil.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button size="sm" disabled={!datosOk} onClick={guardar}>Enviar invitación</Button>
        </div>
      </Modal>
    </>
  );
});

export default EquipoPage;
