import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Link } from "react-router";
import { Check } from "lucide-react";

import { Alert } from "@/elements/ui/alert";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Textarea } from "@/elements/form/textarea";
import { Switch } from "@/elements/form/switch";
import {
  organizacionStore,
  slugDe,
  type HorarioAtencion,
  type OrganizacionWorkspace,
  type RedesNegocio,
} from "@/stores/organizacion.store";
import {
  ClockIcon,
  GlobeAltIcon,
  PhotoIcon,
  ShareIcon,
  SparklesIcon,
  SwatchIcon,
} from "@heroicons/react/24/outline";
import { VistaPreviaNegocio } from "./VistaPreviaNegocio";
import { SelectorImagen, LIMITE_IMAGEN_KB } from "./SelectorImagen";
import { IconoRed, nombreDeRed } from "./IconoRed";
import {
  COLORES_MARCA,
  COLOR_MARCA_DEFECTO,
  DIAS_SEMANA,
  HORARIO_DEFECTO,
  enlaceDeRed,
  esHexValido,
  horaLegible,
  resumenDias,
  textoSobre,
  type RedNegocio,
} from "./personalizacion";
import { BloqueConfig, CampoConfig, ChipDia, ConfigAcciones, Segmentado, ToggleRow } from "@/pages/config-layout";

const MAX_ESLOGAN = 60;
const REDES: { red: RedNegocio; placeholder: string }[] = [
  { red: "whatsapp", placeholder: "+57 300 123 4567" },
  { red: "instagram", placeholder: "@tutienda" },
  { red: "facebook", placeholder: "tutienda" },
  { red: "tiktok", placeholder: "@tutienda" },
];

interface BorradorPersonalizacion {
  logoUrl: string;
  portadaUrl: string;
  descripcion: string;
  sitioWeb: string;
  colorMarca: string;
  eslogan: string;
  redes: Record<RedNegocio, string>;
  /** `null` = el negocio no muestra horario. */
  horario: HorarioAtencion | null;
  direccion: string;
  soloEnLinea: boolean;
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

/** Muestra de color. La marca de selección toma el contraste del propio color. */
const Muestra = ({
  hex,
  nombre,
  activo,
  onClick,
}: {
  hex: string;
  nombre: string;
  activo: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={activo}
    aria-label={nombre}
    title={nombre}
    className={`flex size-9 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-white transition-[transform,box-shadow] duration-150 hover:scale-110 dark:ring-offset-gray-900 ${
      activo ? "ring-2 ring-[#212121] dark:ring-white" : "ring-1 ring-black/10"
    }`}
    style={{ backgroundColor: hex }}
  >
    {activo && <Check className="size-4" strokeWidth={3} style={{ color: textoSobre(hex) }} />}
  </button>
);

const FormularioPersonalizacion = observer(({ org }: { org: OrganizacionWorkspace }) => {
  const sembrar = (): BorradorPersonalizacion => {
    const o = organizacionStore.organizacion ?? org;
    const r: RedesNegocio = o.redesNegocio ?? {};
    return {
      logoUrl: o.logoUrl ?? "",
      portadaUrl: o.portadaUrl ?? "",
      descripcion: o.descripcion ?? "",
      sitioWeb: o.sitioWeb ?? "",
      colorMarca: o.colorMarca ?? COLOR_MARCA_DEFECTO,
      eslogan: o.eslogan ?? "",
      redes: {
        whatsapp: r.whatsapp ?? "",
        instagram: r.instagram ?? "",
        facebook: r.facebook ?? "",
        tiktok: r.tiktok ?? "",
      },
      horario: o.horario ?? null,
      direccion: o.direccion ?? "",
      soloEnLinea: o.soloEnLinea ?? false,
    };
  };

  const [borrador, setBorrador] = useState<BorradorPersonalizacion>(sembrar);
  const [guardado, setGuardado] = useState(false);

  const set = <K extends keyof BorradorPersonalizacion>(campo: K, valor: BorradorPersonalizacion[K]) => {
    setBorrador((prev) => ({ ...prev, [campo]: valor }));
    setGuardado(false);
  };
  const setRed = (red: RedNegocio, valor: string) => set("redes", { ...borrador.redes, [red]: valor });
  const setHorario = (cambio: Partial<HorarioAtencion>) =>
    borrador.horario && set("horario", { ...borrador.horario, ...cambio });

  // El borrador tiene objetos anidados (redes, horario): se compara serializado.
  // Los días se guardan siempre ordenados, así que el orden no da falsos cambios.
  const hayCambios = JSON.stringify(borrador) !== JSON.stringify(sembrar());
  const colorValido = esHexValido(borrador.colorMarca);
  const puedeGuardar = hayCambios && colorValido;

  const guardar = () => {
    if (!puedeGuardar) return;
    const redes = Object.fromEntries(
      Object.entries(borrador.redes).filter(([, v]) => v.trim() !== ""),
    ) as RedesNegocio;
    organizacionStore.actualizarOrganizacion({
      logoUrl: borrador.logoUrl,
      portadaUrl: borrador.portadaUrl,
      descripcion: borrador.descripcion,
      sitioWeb: borrador.sitioWeb,
      colorMarca: borrador.colorMarca,
      eslogan: borrador.eslogan,
      redesNegocio: Object.keys(redes).length > 0 ? redes : undefined,
      horario: borrador.horario ?? undefined,
      direccion: borrador.direccion,
      soloEnLinea: borrador.soloEnLinea,
    });
    setBorrador(sembrar());
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  };

  const oActiva = organizacionStore.organizacion ?? org;
  const colorPropio = !COLORES_MARCA.some((c) => c.hex.toLowerCase() === borrador.colorMarca.toLowerCase());

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
        tipoEmpresa={oActiva.tipoEmpresa ?? ""}
        tamanoEquipo={oActiva.tamanoEquipo ?? ""}
        colorMarca={borrador.colorMarca}
        eslogan={borrador.eslogan}
        redes={borrador.redes}
        horario={borrador.horario}
        direccion={borrador.direccion}
        soloEnLinea={borrador.soloEnLinea}
      />

      {/* ── COLOR Y ESLOGAN ─────────────────────────────────────────────────── */}
      <BloqueConfig
        icono={SwatchIcon}
        pregunta="Color y eslogan"
        descripcion="El color de tu marca tiñe la portada y los botones de tu perfil. El eslogan va justo debajo del nombre."
      >
        <div className="flex flex-col gap-5">
          <CampoConfig etiqueta="Color de marca" ancho="max-w-none">
            <div className="flex flex-wrap items-center gap-2.5">
              {COLORES_MARCA.map((c) => (
                <Muestra
                  key={c.hex}
                  hex={c.hex}
                  nombre={c.nombre}
                  activo={borrador.colorMarca.toLowerCase() === c.hex.toLowerCase()}
                  onClick={() => set("colorMarca", c.hex)}
                />
              ))}

              {/* Color propio: el selector nativo vive dentro de una muestra con
                  el arcoíris; elegido, la muestra toma ese color. */}
              <label
                title="Color propio"
                className={`relative flex size-9 cursor-pointer items-center justify-center rounded-full ring-offset-2 ring-offset-white transition-transform duration-150 hover:scale-110 dark:ring-offset-gray-900 ${
                  colorPropio ? "ring-2 ring-[#212121] dark:ring-white" : "ring-1 ring-black/10"
                }`}
                style={{
                  background:
                    colorPropio && colorValido
                      ? borrador.colorMarca
                      : "conic-gradient(#FF3F1A, #CA8A04, #16A34A, #2563EB, #7C3AED, #DB2777, #FF3F1A)",
                }}
              >
                <input
                  type="color"
                  value={colorValido ? borrador.colorMarca : COLOR_MARCA_DEFECTO}
                  onChange={(e) => set("colorMarca", e.target.value.toUpperCase())}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Elegir un color propio"
                />
                {colorPropio && colorValido && (
                  <Check className="size-4" strokeWidth={3} style={{ color: textoSobre(borrador.colorMarca) }} />
                )}
              </label>

              <div className="w-[120px]">
                <Input
                  value={borrador.colorMarca}
                  maxLength={7}
                  error={!colorValido}
                  aria-label="Código del color"
                  onChange={(e) => set("colorMarca", e.target.value.trim())}
                  className="font-mono uppercase"
                />
              </div>
            </div>
            {!colorValido && (
              <p className="mt-1.5 text-[12px] text-error-600 dark:text-error-400">
                Escribe el color como #RRGGBB, por ejemplo #FF3F1A.
              </p>
            )}
          </CampoConfig>

          <CampoConfig
            etiqueta="Eslogan"
            ayuda={`Opcional · ${borrador.eslogan.length}/${MAX_ESLOGAN}`}
            htmlFor="pers-eslogan"
            ancho="max-w-md"
          >
            <Input
              id="pers-eslogan"
              value={borrador.eslogan}
              maxLength={MAX_ESLOGAN}
              placeholder="Ej. Lo mejor del café colombiano, a tu puerta"
              onChange={(e) => set("eslogan", e.target.value)}
            />
          </CampoConfig>
        </div>
      </BloqueConfig>

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
            descripcion="La franja que encabeza tu negocio. Sin imagen, se usa tu color de marca."
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

      {/* ── REDES SOCIALES ──────────────────────────────────────────────────── */}
      <BloqueConfig
        icono={ShareIcon}
        pregunta="Redes sociales"
        descripcion="Escribe tu usuario o pega el enlace de tu perfil. Con WhatsApp, tu perfil muestra el botón «Escríbenos»."
      >
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          {REDES.map(({ red, placeholder }) => {
            const valor = borrador.redes[red];
            const enlace = valor.trim() ? enlaceDeRed(red, valor) : null;
            return (
              <CampoConfig
                key={red}
                etiqueta={nombreDeRed(red)}
                ayuda={
                  enlace
                    ? enlace.replace(/^https:\/\//, "")
                    : valor.trim()
                      ? "Revisa el dato: no forma un enlace válido."
                      : "Opcional"
                }
                htmlFor={`pers-red-${red}`}
                ancho="max-w-none"
              >
                <div className="flex items-center gap-2.5">
                  <IconoRed red={red} className="size-10 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <Input
                      id={`pers-red-${red}`}
                      type={red === "whatsapp" ? "tel" : "text"}
                      value={valor}
                      placeholder={placeholder}
                      onChange={(e) => setRed(red, e.target.value)}
                    />
                  </div>
                </div>
              </CampoConfig>
            );
          })}
        </div>
      </BloqueConfig>

      {/* ── HORARIO Y UBICACIÓN ─────────────────────────────────────────────── */}
      <BloqueConfig
        icono={ClockIcon}
        pregunta="Horario y ubicación"
        descripcion="Tus clientes ven si estás abierto ahora y dónde encontrarte."
      >
        <div className="flex flex-col gap-5">
          <ToggleRow
            titulo="Mostrar horario de atención"
            descripcion={
              borrador.horario
                ? `${resumenDias(borrador.horario.dias)} · ${horaLegible(borrador.horario.abre)} a ${horaLegible(borrador.horario.cierra)}`
                : "Sin horario, tu perfil no dice si estás abierto."
            }
            control={
              <Switch
                checked={borrador.horario !== null}
                onChange={(v) => set("horario", v ? HORARIO_DEFECTO : null)}
                aria-label="Mostrar horario de atención"
              />
            }
          />

          {borrador.horario && (
            <div className="animate-entrada-panel space-y-4 rounded-2xl border border-[#ECECEC] bg-[#ECECEC]/30 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <div>
                <p className="mb-2 text-[12px] font-bold text-[#212121] dark:text-gray-200">Días que atiendes</p>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map((d) => {
                    const activo = borrador.horario!.dias.includes(d.dia);
                    return (
                      <ChipDia
                        key={d.dia}
                        activo={activo}
                        label={d.corto}
                        titulo={d.largo}
                        onClick={() =>
                          setHorario({
                            dias: (activo
                              ? borrador.horario!.dias.filter((x) => x !== d.dia)
                              : [...borrador.horario!.dias, d.dia]
                            ).sort((a, b) => a - b),
                          })
                        }
                      />
                    );
                  })}
                </div>
              </div>

              <div className="grid max-w-sm grid-cols-2 gap-3">
                <CampoConfig etiqueta="Abre" htmlFor="pers-abre" ancho="max-w-none">
                  <Input
                    id="pers-abre"
                    type="time"
                    value={borrador.horario.abre}
                    onChange={(e) => setHorario({ abre: e.target.value })}
                  />
                </CampoConfig>
                <CampoConfig etiqueta="Cierra" htmlFor="pers-cierra" ancho="max-w-none">
                  <Input
                    id="pers-cierra"
                    type="time"
                    value={borrador.horario.cierra}
                    onChange={(e) => setHorario({ cierra: e.target.value })}
                  />
                </CampoConfig>
              </div>
            </div>
          )}

          <CampoConfig etiqueta="¿Dónde atiendes?" ancho="max-w-none">
            <Segmentado
              ariaLabel="Dónde atiendes"
              tamaño="md"
              opciones={[
                { value: "local", label: "Tengo un local" },
                { value: "linea", label: "Solo vendo en línea" },
              ]}
              valor={borrador.soloEnLinea ? "linea" : "local"}
              onChange={(v) => set("soloEnLinea", v === "linea")}
            />
          </CampoConfig>

          {!borrador.soloEnLinea && (
            <CampoConfig
              etiqueta="Dirección del local"
              ayuda="Opcional. Como la escribirías para que te encuentren."
              htmlFor="pers-direccion"
              ancho="max-w-md"
            >
              <Input
                id="pers-direccion"
                value={borrador.direccion}
                placeholder="Ej. Cra. 7 # 12-34, Bogotá"
                onChange={(e) => set("direccion", e.target.value)}
              />
            </CampoConfig>
          )}
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
          ) : !colorValido ? (
            <span className="text-error-600 dark:text-error-400">Corrige el color de marca para guardar.</span>
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

export const PersonalizacionTab = observer(() => {
  const org = organizacionStore.organizacion;
  if (!org || !organizacionStore.tieneOrganizacion) return <SinOrganizacion />;
  return <FormularioPersonalizacion org={org} />;
});

export default PersonalizacionTab;
