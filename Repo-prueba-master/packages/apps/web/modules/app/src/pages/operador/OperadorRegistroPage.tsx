import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Card } from "@/elements/ui/card";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Textarea } from "@/elements/form/textarea";
import { ThemeToggleButton } from "@/shell";
import { sessionStore } from "@/stores";

// ═══════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-9 w-9">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface OperadorForm {
  nombre: string;
  email: string;
  telefono: string;
  adminEmail: string;
  nota: string;
}

const EMPTY_FORM: OperadorForm = {
  nombre: "",
  email: "",
  telefono: "",
  adminEmail: "",
  nota: "",
};

// ═══════════════════════════════════════════════════════════════════════════
// FIELD (Label + Input del catálogo Elements)
// ═══════════════════════════════════════════════════════════════════════════

interface FieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  required?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

/** Campo de formulario: Label (con asterisco si requerido) + Input de Elements. */
const Field = ({ id, label, type = "text", value, required, placeholder, onChange }: FieldProps) => (
  <div>
    <Label htmlFor={id}>
      {label} {required && <span className="text-error-500">*</span>}
    </Label>
    <Input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * OperadorRegistroPage — solicitud de acceso del operador (mock).
 *
 * Un operador "sale de" un administrador: en vez de entrar directo al módulo,
 * deja sus datos, que (mock, sin backend) se envían como notificación al
 * administrador para darlo de alta.
 *
 * Vista construida con el flujo Elements: Card + Label + Input + Textarea +
 * Button del catálogo. Al enviar, el formulario se reemplaza por una tarjeta
 * de éxito.
 */
export const OperadorRegistroPage = observer(() => {
  const navigate = useNavigate();
  const [form, setForm] = useState<OperadorForm>(EMPTY_FORM);
  const [enviado, setEnviado] = useState(false);

  const set = (campo: keyof OperadorForm) => (value: string) =>
    setForm((prev) => ({ ...prev, [campo]: value }));

  // Los 4 primeros campos son obligatorios; la nota es opcional.
  const requeridosCompletos =
    form.nombre.trim() !== "" &&
    form.email.trim() !== "" &&
    form.telefono.trim() !== "" &&
    form.adminEmail.trim() !== "";

  const enviar = () => {
    if (!requeridosCompletos) return;
    // Mock: no hay backend. Solo cambiamos al estado de éxito.
    setEnviado(true);
  };

  const volverAlInicio = () => {
    // Reinicia la sesión mock y vuelve al login (inicio del flujo).
    sessionStore.reset();
    navigate("/login");
  };

  return (
    <>
      <PageMeta title="Solicitar acceso como operador" description="Envía tus datos al administrador para obtener acceso" />

      <div className="relative min-h-screen bg-gray-50 px-6 py-12 dark:bg-gray-950">
        <div className="fixed right-6 top-6 z-50">
          <ThemeToggleButton variant="floating" />
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-col">
          {!enviado ? (
            <>
              {/* Encabezado centrado */}
              <div className="mb-8 flex flex-col items-center text-center">
                <img src="/images/logo/necto-icon.svg" alt="NECTO" className="mb-4 h-10 w-10" />
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                  Solicita tu acceso como operador
                </h1>
                <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
                  Completa tus datos y se enviarán al administrador para que revise y apruebe tu acceso.
                </p>
              </div>

              {/* Tarjeta con el formulario */}
              <Card>
                <div className="space-y-5">
                  <Field
                    id="op-nombre"
                    label="Nombre completo"
                    value={form.nombre}
                    required
                    placeholder="Ej. María Fernández"
                    onChange={set("nombre")}
                  />
                  <Field
                    id="op-email"
                    label="Correo electrónico"
                    type="email"
                    value={form.email}
                    required
                    placeholder="tu@correo.com"
                    onChange={set("email")}
                  />
                  <Field
                    id="op-telefono"
                    label="Teléfono"
                    type="tel"
                    value={form.telefono}
                    required
                    placeholder="+57 300 000 0000"
                    onChange={set("telefono")}
                  />
                  <Field
                    id="op-admin-email"
                    label="Correo del administrador a notificar"
                    type="email"
                    value={form.adminEmail}
                    required
                    placeholder="admin@negocio.com"
                    onChange={set("adminEmail")}
                  />
                  <div>
                    <Label htmlFor="op-nota">Nota / mensaje para el administrador</Label>
                    <Textarea
                      value={form.nota}
                      rows={4}
                      placeholder="Cuéntale al administrador quién eres o por qué necesitas acceso (opcional)."
                      onChange={set("nota")}
                    />
                  </div>
                </div>

                {/* Acciones */}
                <div className="mt-6 flex items-center justify-between gap-3">
                  <Button size="sm" variant="outline" onClick={() => navigate("/seleccionar")}>
                    Atrás
                  </Button>
                  <Button size="sm" disabled={!requeridosCompletos} onClick={enviar}>
                    Enviar solicitud
                  </Button>
                </div>
              </Card>
            </>
          ) : (
            /* Estado de éxito: reemplaza por completo al formulario */
            <Card>
              <div className="flex flex-col items-center py-6 text-center">
                <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-500 dark:bg-success-500/10">
                  <CheckCircleIcon />
                </span>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
                  Tu solicitud fue enviada
                </h2>
                <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                  El administrador la revisará y te dará acceso. Te avisaremos cuando tu cuenta esté lista.
                </p>
                <Button size="sm" className="mt-6" onClick={volverAlInicio}>
                  Volver al inicio
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </>
  );
});

export default OperadorRegistroPage;
