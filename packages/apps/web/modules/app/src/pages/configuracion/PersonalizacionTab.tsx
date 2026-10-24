import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Link } from "react-router";

import { Alert } from "@/elements/ui/alert";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Textarea } from "@/elements/form/textarea";
import { organizacionStore, slugDe, type OrganizacionWorkspace } from "@/stores/organizacion.store";
import { PhotoIcon, SparklesIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { VistaPreviaNegocio } from "./VistaPreviaNegocio";
import { SelectorImagen, LIMITE_IMAGEN_KB } from "./SelectorImagen";
import { BloqueConfig, CampoConfig, ConfigAcciones } from "@/pages/config-layout";

interface BorradorPersonalizacion {
  logoUrl: string;
  portadaUrl: string;
  descripcion: string;
  sitioWeb: string;
}

const SinOrganizacion = () => (
  <BloqueConfig
    icono={SparklesIcon}
    pregunta="Todavía no hay ningún negocio seleccionado"
    descripcion="Crea o selecciona un negocio para configurar su identidad visual, portada y enlaces."
  >
    <Link to="/onboarding/organizacion">
      <Button size="sm">Crear mi negocio</Button>
    </Link>
  </BloqueConfig>
);

const FormularioPersonalizacion = observer(({ org }: { org: OrganizacionWorkspace }) => {
  const sembrar = (): BorradorPersonalizacion => {
    const o = organizacionStore.organizacion ?? org;
    return {
      logoUrl: o.logoUrl ?? "",
      portadaUrl: o.portadaUrl ?? "",
      descripcion: o.descripcion ?? "",
      sitioWeb: o.sitioWeb ?? "",
    };
  };

  const [borrador, setBorrador] = useState<BorradorPersonalizacion>(sembrar);
  const [guardado, setGuardado] = useState(false);

  const set = <K extends keyof BorradorPersonalizacion>(campo: K, valor: BorradorPersonalizacion[K]) => {
    setBorrador((prev) => ({ ...prev, [campo]: valor }));
    setGuardado(false);
  };

  const guardadoActual = sembrar();
  const hayCambios = (Object.keys(borrador) as (keyof BorradorPersonalizacion)[]).some(
    (k) => borrador[k] !== guardadoActual[k],
  );

  const guardar = () => {
    if (!hayCambios) return;
    organizacionStore.actualizarOrganizacion({
      logoUrl: borrador.logoUrl,
      portadaUrl: borrador.portadaUrl,
      descripcion: borrador.descripcion,
      sitioWeb: borrador.sitioWeb,
    });
    setBorrador(sembrar());
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  const oActiva = organizacionStore.organizacion ?? org;

  return (
    <>
      {/* ── VISTA PREVIA EN VIVO DE LA MARCA ──────────────────────────────── */}
      <VistaPreviaNegocio
        nombre={oActiva.nombre}
        descripcion={borrador.descripcion}
        sitioWeb={borrador.sitioWeb}
        logoUrl={borrador.logoUrl}
        portadaUrl={borrador.portadaUrl}
        pais={oActiva.pais}
        moneda={oActiva.moneda}
        zonaHoraria={oActiva.zonaHoraria}
        tipoEmpresa={oActiva.tipoEmpresa}
        tamanoEquipo={oActiva.tamanoEquipo}
      />

      {/* ── IMÁGENES DE LA IDENTIDAD ───────────────────────────────────────── */}
      <BloqueConfig
        icono={PhotoIcon}
        pregunta="Imágenes de la identidad"
        descripcion="El logo y la portada de tu negocio. Se reflejan en tus comprobantes, cotizaciones y perfiles de cara al cliente."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectorImagen
            id="pers-logo"
            titulo="Imagen de perfil / Logo"
            descripcion="El logo que acompaña al nombre de la tienda."
            forma="cuadrado"
            recomendacion="600 × 600 px"
            valor={borrador.logoUrl}
            onChange={(v) => set("logoUrl", v)}
          />
          <SelectorImagen
            id="pers-portada"
            titulo="Imagen de portada"
            descripcion="La franja que encabeza tu negocio."
            forma="panoramica"
            recomendacion="851 × 315 px"
            valor={borrador.portadaUrl}
            onChange={(v) => set("portadaUrl", v)}
          />
        </div>

        <div className="mt-5">
          <Alert
            variant="warning"
            title="Recomendaciones para las imágenes"
            message={`Máximo ${LIMITE_IMAGEN_KB} KB por imagen. Formatos recomendados: PNG o JPG con fondo limpio. Para el logo, 600 × 600 px; para la portada, 851 × 315 px.`}
          />
        </div>
      </BloqueConfig>

      {/* ── PRESENCIA PÚBLICA & ENLACES ─────────────────────────────────────── */}
      <BloqueConfig
        icono={GlobeAltIcon}
        pregunta="Presencia pública & descripción"
        descripcion="Información visible para tus clientes en canales digitales, enlaces y comprobantes."
      >
        <div className="flex flex-col gap-5">
          <CampoConfig
            etiqueta="Identificador web propio"
            ayuda="Tu URL directa en Necto basada en el nombre comercial."
            ancho="max-w-none"
          >
            <span className="font-mono text-[14px] font-bold text-[#190088] dark:text-[#97D6DF]">
              necto.app/{slugDe(oActiva.nombre)}
            </span>
          </CampoConfig>

          <CampoConfig
            etiqueta="Sitio web o tienda externa"
            ayuda="Opcional. Si tienes una tienda online, catálogo o landing externa, enlazarla aquí."
            htmlFor="pers-sitio"
            ancho="max-w-md"
          >
            <Input
              id="pers-sitio"
              type="url"
              value={borrador.sitioWeb}
              placeholder="https://tu-tienda.com"
              onChange={(e) => set("sitioWeb", e.target.value)}
            />
          </CampoConfig>

          <CampoConfig
            etiqueta="Descripción del negocio"
            ayuda="Una o dos frases sobre lo que ofrece tu negocio. Se muestran en la vista previa y catálogo."
            htmlFor="pers-descripcion"
            ancho="max-w-none"
          >
            <Textarea
              id="pers-descripcion"
              rows={3}
              maxLength={160}
              value={borrador.descripcion}
              placeholder="Ej. Tienda especializada en calzado urbano y accesorios con envíos a todo el país."
              onChange={(v) => set("descripcion", v)}
            />
          </CampoConfig>
        </div>
      </BloqueConfig>

      {/* ── ACCIONES ────────────────────────────────────────────────────────── */}
      <ConfigAcciones
        mensaje={
          guardado ? (
            <span className="font-semibold text-accent-600 dark:text-accent-400">
              Personalización guardada
            </span>
          ) : !hayCambios ? (
            <span className="text-gray-400 dark:text-gray-500">
              No hay cambios pendientes.
            </span>
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
        <Button size="sm" disabled={!hayCambios} onClick={guardar}>
          Guardar cambios
        </Button>
      </ConfigAcciones>
    </>
  );
});

export const PersonalizacionTab = observer(() => {
  const org = organizacionStore.organizacion;
  if (!org || !organizacionStore.tieneOrganizacion) return <SinOrganizacion />;
  return <FormularioPersonalizacion org={org} />;
});

export default PersonalizacionTab;
