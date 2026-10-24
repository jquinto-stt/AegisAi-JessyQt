import { useState } from "react";
import { observer } from "mobx-react-lite";

import { Alert } from "@/elements/ui/alert";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Select } from "@/elements/form/select";
import { organizacionStore, type OrganizacionWorkspace } from "@/stores/organizacion.store";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { BloqueConfig, CampoConfig, ConfigAcciones } from "@/pages/config-layout";
import { VerificacionFiscal } from "./verificacion/VerificacionFiscal";

/**
 * Datos fiscales de la organización — `?tab=general&seccion=fiscales`.
 *
 * ── Qué es y qué no ───────────────────────────────────────────────────────
 *
 * Son los datos de identificación tributaria de la empresa. **Hoy no alimentan
 * ningún documento**: Necto no emite facturas ni comprobantes. Se guardan
 * porque son datos de la organización y este es su sitio, y el aviso de abajo
 * lo dice — prometer facturación electrónica con estos campos sería el tipo de
 * control que este proyecto no acepta.
 *
 * ── Las dos reglas de siempre ─────────────────────────────────────────────
 *
 * Guardar es una acción con efecto: el botón está apagado mientras no haya
 * cambios y lo dice. Y cada campo tiene un lector: la tarjeta del submenú
 * enseña el NIT guardado, así que lo escrito se ve fuera de este formulario.
 */

/** Regímenes que ofrece el desplegable. Texto libre en el store: no son un enum. */
const REGIMENES = [
  "Responsable de IVA",
  "No responsable de IVA",
  "Régimen simple de tributación",
  "Régimen especial",
];

interface BorradorFiscal {
  razonSocial: string;
  nit: string;
  regimen: string;
  direccion: string;
  correoFacturacion: string;
}

const FormularioFiscal = observer(({ org }: { org: OrganizacionWorkspace }) => {
  // Se siembra desde el STORE y no desde el prop: tras `actualizarOrganizacion`
  // el prop de la clausura ya está obsoleto y el borrador volvería atrás.
  const sembrar = (): BorradorFiscal => {
    const o = organizacionStore.organizacion ?? org;
    return {
      razonSocial: o.datosFiscales?.razonSocial ?? "",
      nit: o.datosFiscales?.nit ?? "",
      regimen: o.datosFiscales?.regimen ?? REGIMENES[0],
      direccion: o.datosFiscales?.direccion ?? "",
      correoFacturacion: o.datosFiscales?.correoFacturacion ?? "",
    };
  };

  const [borrador, setBorrador] = useState<BorradorFiscal>(sembrar);
  const [guardado, setGuardado] = useState(false);

  const set = <K extends keyof BorradorFiscal>(campo: K, valor: BorradorFiscal[K]) => {
    setBorrador((prev) => ({ ...prev, [campo]: valor }));
    setGuardado(false);
  };

  const guardadoActual = sembrar();
  const hayCambios = (Object.keys(borrador) as (keyof BorradorFiscal)[]).some(
    (k) => borrador[k] !== guardadoActual[k],
  );

  const correoValido =
    !borrador.correoFacturacion.trim() || borrador.correoFacturacion.includes("@");
  const puedeGuardar = hayCambios && correoValido;

  const guardar = () => {
    if (!puedeGuardar) return;
    organizacionStore.actualizarOrganizacion({
      datosFiscales: {
        razonSocial: borrador.razonSocial.trim(),
        nit: borrador.nit.trim(),
        regimen: borrador.regimen.trim(),
        direccion: borrador.direccion.trim(),
        correoFacturacion: borrador.correoFacturacion.trim(),
      },
    });
    setBorrador(sembrar());
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  return (
    <>
      <BloqueConfig
        icono={DocumentTextIcon}
        pregunta="¿Cómo se identifica tu negocio ante impuestos?"
        descripcion="Identificación fiscal de la organización. Todos los campos son opcionales."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <CampoConfig
            etiqueta="Razón social"
            ayuda="El nombre legal, si difiere del nombre comercial."
            htmlFor="fis-razon"
            ancho="max-w-none"
          >
            <Input
              id="fis-razon"
              value={borrador.razonSocial}
              placeholder="Ej. Boutique Roma S.A.S."
              onChange={(e) => set("razonSocial", e.target.value)}
            />
          </CampoConfig>

          <CampoConfig
            etiqueta="NIT"
            ayuda="Con dígito de verificación si lo tienes. No se valida automáticamente."
            htmlFor="fis-nit"
            ancho="max-w-none"
          >
            <Input
              id="fis-nit"
              value={borrador.nit}
              placeholder="900.123.456-7"
              onChange={(e) => set("nit", e.target.value)}
            />
          </CampoConfig>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <CampoConfig
            etiqueta="Régimen tributario"
            ayuda="Determina cómo se factura. Hoy solo se guarda."
            htmlFor="fis-regimen"
            ancho="max-w-none"
          >
            <Select
              key={`regimen-${borrador.regimen}`}
              options={REGIMENES.map((r) => ({ value: r, label: r }))}
              defaultValue={borrador.regimen}
              onChange={(v) => set("regimen", v)}
              aria-label="Régimen tributario"
            />
          </CampoConfig>

          <CampoConfig
            etiqueta="Correo de facturación"
            ayuda="A dónde llegarían las facturas. Opcional."
            htmlFor="fis-correo"
            ancho="max-w-none"
          >
            <Input
              id="fis-correo"
              type="email"
              value={borrador.correoFacturacion}
              placeholder="facturacion@tu-negocio.com"
              error={!correoValido}
              hint={correoValido ? undefined : "Debe ser una dirección de correo."}
              onChange={(e) => set("correoFacturacion", e.target.value)}
            />
          </CampoConfig>
        </div>

        <div className="mt-5">
          <CampoConfig
            etiqueta="Dirección fiscal"
            ayuda="La que figura en tus documentos tributarios."
            htmlFor="fis-direccion"
            ancho="max-w-none"
          >
            <Input
              id="fis-direccion"
              value={borrador.direccion}
              placeholder="Ej. Calle 45 #12-30, Bogotá"
              onChange={(e) => set("direccion", e.target.value)}
            />
          </CampoConfig>
        </div>
      </BloqueConfig>

      <Alert
        variant="info"
        title="Estos datos todavía no emiten documentos"
        message="Necto no genera facturas ni comprobantes fiscales, así que aquí no cambian nada más. Se guardan con la organización para cuando exista facturación."
      />

      <ConfigAcciones
        mensaje={
          guardado ? (
            <span className="font-semibold text-accent-600 dark:text-accent-400">
              Cambios guardados
            </span>
          ) : !hayCambios ? (
            <span className="text-gray-400 dark:text-gray-500">No hay cambios pendientes.</span>
          ) : undefined
        }
      >
        <Button
          size="sm"
          variant="outline"
          disabled={!hayCambios}
          onClick={() => {
            setBorrador(sembrar());
            setGuardado(false);
          }}
        >
          Descartar
        </Button>
        <Button size="sm" disabled={!puedeGuardar} onClick={guardar}>
          Guardar cambios
        </Button>
      </ConfigAcciones>
    </>
  );
});

export const DatosFiscalesTab = observer(() => {
  const org = organizacionStore.organizacion;
  if (!org || !organizacionStore.tieneOrganizacion) {
    return (
      <BloqueConfig
        icono={DocumentTextIcon}
        pregunta="Todavía no hay ninguna organización"
        descripcion="Los datos fiscales pertenecen a una organización. Créala primero y vuelve a esta pantalla."
      >
        <span />
      </BloqueConfig>
    );
  }
  return (
    <VerificacionFiscal>
      <FormularioFiscal org={org} />
    </VerificacionFiscal>
  );
});

export default DatosFiscalesTab;
