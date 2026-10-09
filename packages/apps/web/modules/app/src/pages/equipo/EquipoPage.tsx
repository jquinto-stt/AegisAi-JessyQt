import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Tab } from "@/elements/ui/tabs";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Select } from "@/elements/form/select";
import { operadoresStore, rolesStore, type Modulo, type Operador, type OperadorEstado } from "@/stores";
import { PageMeta } from "@/shell/meta";
import { ConfigHeader } from "@/pages/config-layout";
import { PlusIcon } from "@/icons";
import { EquipoTabla } from "./EquipoTabla";
import { RolesTab } from "./RolesTab";
import {
  FILTRO_ESTADO_TODAS,
  OPCIONES_FILTRO_ESTADO,
  emailSugerido,
  type TabEquipo,
} from "./equipo.constants";
import { validarAlta, type AltaPersona } from "./equipo.presentacion";

// ═══════════════════════════════════════════════════════════════════════════
// PÁGINA "EQUIPO Y PERFILES" (Organización / Transversal)
// ═══════════════════════════════════════════════════════════════════════════
//
// Era una PESTAÑA de `/configuracion` (`?tab=equipo`). Vuelve a ser PÁGINA, en
// `/equipo`, porque Configuración de la organización agrupa lo que se ajusta
// UNA VEZ (nombre, región, módulos encendidos), mientras que gestionar personas
// es una tarea RECURRENTE que el admin hace cada semana. Enterrarla dentro de
// Configuración obligaba a dos clics y a saber de antemano que estaba ahí.
//
// Ahora el sidebar muestra las dos entradas seguidas —«Configuración» y
// «Equipo y perfiles»—, que es como el usuario las piensa: dos pantallas
// distintas, no una dentro de otra.
//
// Características principales:
//   1. Se gestionan PERSONAS con un rol. El listado es el del módulo Pedidos
//      (`operadoresStore.porModulo("pedidos")`) — y la sección lo dice, porque
//      un equipo que solo muestra parte de la organización sin avisar es una
//      media verdad.
//   2. Sub-vista de ROLES: los paquetes de capacidades se definen una vez y se
//      reutilizan. Es un nivel INTERNO de esta página.
//   3. El perfil de cada persona es una RUTA (`/equipo/:id`), que sigue viva.
//   4. "Ver como" (impersonación) vive aquí.
//
// La ruta entera está detrás de `team.manage` (ver `App.tsx`).
//
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Formulario de invitación de un miembro del equipo.
 *
 * Es un alias de `AltaPersona` (la forma que valida `equipo.presentacion`) en
 * vez de una interfaz propia: dos declaraciones paralelas de los mismos campos
 * se desincronizan en cuanto una cambia, y el validar deja de cubrir lo que la
 * pantalla pinta.
 */
type PersonaForm = AltaPersona;

/** Campos del formulario, para el mapa de "tocados". */
type CampoForm = keyof PersonaForm;

const FORM_VACIO: PersonaForm = {
  nombre: "",
  email: "",
  telefono: "",
  cargo: "",
  rolId: "",
};

export interface EquipoPageProps {
  modulo?: Modulo;
}

export const EquipoPage = observer(({ modulo = "pedidos" }: EquipoPageProps) => {
  const [vista, setVista] = useState<"equipo" | "roles">("equipo");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>(FILTRO_ESTADO_TODAS);
  const [modalOpen, setModalOpen] = useState(false);

  // ── Invitación de persona ──────────────────────────────────────────────────
  const [form, setForm] = useState<PersonaForm>(FORM_VACIO);
  /** El correo se autosugiere desde el nombre hasta que se edita a mano. */
  const [emailTocado, setEmailTocado] = useState(false);
  /**
   * Campos editados por el admin. Igual que en el perfil: los errores se
   * calculan siempre, pero solo se muestran en lo que ya se tocó, para que el
   * formulario no nazca en rojo.
   */
  const [tocados, setTocados] = useState<Partial<Record<CampoForm, boolean>>>({});

  const moduloActivo: Modulo = modulo;
  const moduloLabel = moduloActivo === "inventarios" ? "Inventarios" : "Pedidos";
  const equipo = operadoresStore.porModulo(moduloActivo);
  const pendientes = operadoresStore.pendientesCount(moduloActivo);

  /**
   * Roles asignables: todos, menos el de administrador (no se reparte por error).
   *
   * Un rol creado a mano es asignable, así que esto se recalcula en cada render:
   * si el admin crea un rol en la pestaña "Roles" y vuelve, aparece aquí.
   */
  const rolesAsignables = rolesStore.roles.filter((r) => r.id !== "admin_tienda");

  /**
   * Correos ya presentes en la organización (de TODOS los módulos, no solo
   * pedidos): la colisión que se quiere evitar es contra la organización
   * entera, porque el correo identifica a la persona.
   */
  const correosExistentes = operadoresStore.operadores.map((o) => o.email);

  const validez = validarAlta(form, correosExistentes);

  const set = (campo: CampoForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [campo]: value }));

  /** Marca un campo como editado, para decidir si se pinta su error. */
  const tocar = (campo: CampoForm) => setTocados((prev) => ({ ...prev, [campo]: true }));

  /** Mensaje de error de un campo, o `undefined` si aún no se ha tocado. */
  const errorDe = (campo: CampoForm): string | undefined =>
    tocados[campo] ? validez.errores[campo] || undefined : undefined;

  const cerrarModal = () => setModalOpen(false);

  const abrirCrear = () => {
    setForm({ ...FORM_VACIO, rolId: rolesAsignables[0]?.id ?? "" });
    setEmailTocado(false);
    setTocados({});
    setModalOpen(true);
  };

  const guardar = () => {
    // Revalidar aquí, no solo confiar en el `disabled` del botón: la guarda de
    // UI y la de datos son capas distintas a propósito.
    if (!validez.valido) {
      setTocados({ nombre: true, email: true, telefono: true, cargo: true, rolId: true });
      return;
    }

    operadoresStore.crear(moduloActivo, {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      telefono: form.telefono.trim(),
      cargo: form.cargo.trim() || undefined,
      rolId: form.rolId,
      estado: "activo",
    });

    // Limpieza para la próxima apertura. El `key` del Select remonta el rol.
    setForm(FORM_VACIO);
    setEmailTocado(false);
    setTocados({});
    setModalOpen(false);
  };

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const q = busqueda.trim().toLowerCase();
  const listaFiltrada = equipo.filter((op: Operador) => {
    if (filtroEstado !== FILTRO_ESTADO_TODAS && op.estado !== (filtroEstado as OperadorEstado)) {
      return false;
    }
    if (q && !(op.nombre.toLowerCase().includes(q) || op.email.toLowerCase().includes(q))) return false;
    return true;
  });

  return (
    <>
      <PageMeta
        title={`Operadores · ${moduloLabel}`}
        description={`Operadores del módulo de ${moduloLabel}, sus roles y qué puede hacer cada uno`}
      />

      <div className="mb-5">
        <ConfigHeader
          titulo={vista === "roles" ? "Gestión de Roles" : `Operadores · ${moduloLabel}`}
          descripcion={
            vista === "roles"
              ? "Un rol es un paquete de permisos con nombre. Se define una vez y se asigna a varias personas."
              : `Las personas del módulo de ${moduloLabel}, el rol de cada una y qué puede hacer. El rol define los permisos; el perfil los muestra en detalle.`
          }
        />
      </div>

      {/* Acciones y Filtros (Barra Única) */}
      {vista === "equipo" ? (
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full sm:w-auto">
            <div className="w-full sm:w-64">
              <Input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o correo…"
                aria-label="Buscar personas"
              />
            </div>
            <div className="w-full sm:w-44">
              <Select
                options={OPCIONES_FILTRO_ESTADO}
                defaultValue={FILTRO_ESTADO_TODAS}
                onChange={setFiltroEstado}
                aria-label="Filtrar por estado"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              size="md"
              variant="outline"
              className="px-5 py-2.5 text-sm font-semibold shadow-theme-xs transition-all hover:shadow-md active:scale-95"
              onClick={() => setVista("roles")}
            >
              Gestionar roles
            </Button>
            <Button
              size="md"
              startIcon={<PlusIcon className="h-4 w-4" />}
              className="px-5 py-2.5 text-sm font-semibold shadow-theme-xs transition-all hover:shadow-md active:scale-95 bg-brand-500 hover:bg-brand-600 text-white"
              onClick={abrirCrear}
            >
              Invitar miembro
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex justify-start">
          <Button
            size="md"
            variant="outline"
            className="px-5 py-2.5 text-sm font-semibold shadow-theme-xs transition-all hover:shadow-md active:scale-95"
            onClick={() => setVista("equipo")}
          >
            ← Volver a operadores
          </Button>
        </div>
      )}

      {vista === "roles" ? (
        <RolesTab modulo={moduloActivo} />
      ) : (
        <EquipoTabla operadores={listaFiltrada} />
      )}

      {/* Modal: invitar miembro */}
      <Modal isOpen={modalOpen} onClose={cerrarModal} className="max-w-md p-6">
        <h2 className="mb-1 text-lg font-semibold text-ink-title dark:text-white/90">Invitar miembro</h2>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Se añadirá al equipo como <span className="font-medium">activo</span>, con el rol que elijas.
          Podrá entrar de inmediato y ajustar sus permisos desde su perfil.
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="eq-nombre">Nombre completo <span className="text-error-500">*</span></Label>
            <Input
              id="eq-nombre"
              value={form.nombre}
              placeholder="Ej. María Fernández"
              error={!!errorDe("nombre")}
              hint={errorDe("nombre")}
              onChange={(e) => {
                const valor = e.target.value;
                tocar("nombre");
                setForm((prev) => ({
                  ...prev,
                  nombre: valor,
                  // La sugerencia se detiene en cuanto el correo se escribe a
                  // mano: si no, seguiría pisando lo que el admin ya decidió.
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
              onChange={(e) => {
                tocar("cargo");
                set("cargo")(e.target.value);
              }}
            />
          </div>

          <div>
            <Label htmlFor="eq-email">Correo electrónico <span className="text-error-500">*</span></Label>
            <Input
              id="eq-email"
              type="email"
              value={form.email}
              placeholder="persona@negocio.com"
              error={!!errorDe("email")}
              hint={errorDe("email")}
              onChange={(e) => {
                setEmailTocado(true);
                tocar("email");
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
              error={!!errorDe("telefono")}
              hint={errorDe("telefono")}
              onChange={(e) => {
                tocar("telefono");
                set("telefono")(e.target.value);
              }}
            />
          </div>

          <div>
            <Label htmlFor="eq-rol">Rol asignado <span className="text-error-500">*</span></Label>
            {/* El `key` remonta el Select cuando el formulario se limpia: es
                uncontrolled y solo lee `defaultValue` al montar, así que sin
                esto conservaría el rol de la invitación anterior. */}
            <Select
              key={form.rolId || "rol-vacio"}
              options={rolesAsignables.map((r) => ({ value: r.id, label: r.nombre }))}
              defaultValue={form.rolId}
              onChange={set("rolId")}
              placeholder="Elige un rol"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              El rol determina qué puede hacer. Después podrás ajustar sus permisos desde su perfil.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button size="sm" variant="outline" onClick={cerrarModal}>Cancelar</Button>
          <Button size="sm" disabled={!validez.valido} onClick={guardar}>Añadir al equipo</Button>
        </div>
      </Modal>
    </>
  );
});

export default EquipoPage;
