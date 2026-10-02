import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";

import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Badge } from "@/elements/ui/badge";
import { Input } from "@/elements/form/input";
import { Select } from "@/elements/form/select";
import {
  ConfigHeader,
  ConfigSectionNav,
  ConfigShell,
  Label2,
  claseFila,
  type GrupoNav,
} from "@/pages/config-layout";
import { BoxCubeIcon, GridIcon, PlugInIcon, TimeIcon } from "@/icons";
import {
  inventariosStore,
  puedeConfigurarInventarios,
  puedeGestionarCatalogo,
  puedeVerInventarios,
} from "@/stores";
import { OPCIONES_UNIDAD } from "./inventarios.constants";
import { CabeceraPagina, ContenedorPagina } from "./inventarios.ui";
import { cn } from "@/utils";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN — lo que se ajusta UNA VEZ
// ═══════════════════════════════════════════════════════════════════════════
//
// ── Qué vive aquí y qué no ─────────────────────────────────────────────────
//
// Aquí va lo que se decide una vez y rara vez se vuelve a tocar: cómo se cuenta
// por defecto, qué categorías se sugieren, a partir de cuántos días un conteo se
// considera estancado, y si un conteo se puede finalizar con diferencias.
//
// **No** vive aquí la gestión de personas (eso es recurrente y tiene su propia
// sección) ni las reglas de alerta configurables, que exigirían un motor de
// reglas con servidor — se declaran como ausentes en vez de pintar un formulario
// gris que no guarda nada.
//
// ── «Guardar» es una capacidad distinta de «entrar» ────────────────────────
//
// `inventory.read` deja entrar a mirar; `inventory.configure` deja guardar. Un
// analista que necesita consultar la configuración para entender un reporte no
// debería poder cambiarla, y entrar y operar se gobiernan por capacidades
// distintas (invariante C5).

type SeccionConfig = "general" | "categorias" | "alertas" | "avanzado";

export const InventariosConfigPage = observer(function InventariosConfigPage() {
  const navigate = useNavigate();
  const [seccion, setSeccion] = useState<SeccionConfig>("general");

  const puedeConfigurar = puedeConfigurarInventarios();
  const puedeGestionar = puedeGestionarCatalogo();

  if (!puedeVerInventarios()) {
    return (
      <ContenedorPagina>
        <CabeceraPagina titulo="Configuración de Inventarios" />
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.02]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No tienes permisos para visualizar la configuración de este módulo.
          </p>
        </div>
      </ContenedorPagina>
    );
  }

  const grupos: GrupoNav[] = [
    {
      grupo: "general",
      label: "Configuración",
      secciones: [
        { key: "general", label: "Medición y unidades", hint: HINT.general, icono: BoxCubeIcon },
        { key: "categorias", label: "Categorías sugeridas", hint: HINT.categorias, icono: GridIcon },
        { key: "alertas", label: "Umbrales de alertas", hint: HINT.alertas, icono: TimeIcon },
        { key: "avanzado", label: "Datos y restablecimiento", hint: HINT.avanzado, icono: PlugInIcon },
      ],
    },
  ];

  return (
    <>
      <PageMeta title="Configuración · Inventarios" />
      <div className="flex flex-col gap-5">
        <ConfigHeader
          titulo="Configuración de Inventarios"
          descripcion="Preferencias y parámetros para el registro de productos y conteos."
          acciones={
            <>
              <Badge color={puedeConfigurar ? "success" : "light"} size="sm">
                {puedeConfigurar ? "Edición habilitada" : "Solo lectura"}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => navigate("/inventarios")}>
                Volver a conteos
              </Button>
            </>
          }
        />

        <div className="flex flex-col gap-6 lg:flex-row">
          <ConfigSectionNav
            grupos={grupos}
            activa={seccion}
            onSeleccionar={(id) => setSeccion(id as SeccionConfig)}
            ariaLabel="Secciones de configuración de Inventarios"
          />

          <ConfigShell
            seccionKey={seccion}
            titulo={TITULO[seccion]}
            hint={HINT[seccion]}
          >
            {seccion === "general" && <SeccionGeneral disabled={!puedeConfigurar} />}
            {seccion === "categorias" && <SeccionCategorias disabled={!puedeConfigurar} />}
            {seccion === "alertas" && <SeccionAlertas disabled={!puedeConfigurar} />}
            {seccion === "avanzado" && <SeccionAvanzado disabled={!puedeConfigurar} puedeGestionar={puedeGestionar} />}
          </ConfigShell>
        </div>
      </div>
    </>
  );
});

const TITULO: Record<SeccionConfig, string> = {
  general: "Medición y unidades",
  categorias: "Categorías sugeridas",
  alertas: "Umbrales de alertas",
  avanzado: "Datos y restablecimiento",
};

const HINT: Record<SeccionConfig, string> = {
  general: "Valores por defecto al crear nuevos productos.",
  categorias: "Etiquetas sugeridas al clasificar productos.",
  alertas: "Criterios para considerar conteos detenidos o estancados.",
  avanzado: "Opciones de mantenimiento sobre los datos del módulo.",
};

// ── Sección: General ──────────────────────────────────────────────────────

function SeccionGeneral({ disabled }: { disabled: boolean }) {
  const [unidad, setUnidad] = useState(inventariosStore.config.unidadPorDefecto);

  return (
    <div className={claseFila}>
      <div className="sm:max-w-md">
        <Label2
          titulo="Unidad por defecto"
          descripcion="La que se propone al crear un elemento. Siempre se puede cambiar en cada uno."
        />
      </div>
      <div className="w-full sm:w-56">
        <Select
          options={OPCIONES_UNIDAD}
          defaultValue={unidad}
          onChange={(v) => {
            setUnidad(v as typeof unidad);
            inventariosStore.guardarConfig({ unidadPorDefecto: v as typeof unidad });
          }}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

// ── Sección: Categorías ───────────────────────────────────────────────────

/**
 * Sugerencias de categoría.
 *
 * Es la sección donde se entiende por qué la categoría es texto libre: aquí se
 * **proponen** nombres, no se define un catálogo. Escribir «Bebidas» en la lista
 * no impide que alguien cree un elemento con categoría «Repuestos» — y eso es
 * deliberado, porque un módulo de conteo universal no puede saber de antemano
 * qué categorías necesita un negocio.
 */
function SeccionCategorias({ disabled }: { disabled: boolean }) {
  const [nueva, setNueva] = useState("");
  const sugeridas = inventariosStore.config.categoriasSugeridas;
  const usadas = inventariosStore.categoriasUsadas;

  function agregar() {
    const valor = nueva.trim();
    if (!valor) return;
    if (sugeridas.includes(valor)) {
      setNueva("");
      return;
    }
    inventariosStore.guardarConfig({ categoriasSugeridas: [...sugeridas, valor] });
    setNueva("");
  }

  function quitar(c: string) {
    inventariosStore.guardarConfig({ categoriasSugeridas: sugeridas.filter((x) => x !== c) });
  }

  return (
    <>
      <div>
        <Label2
          titulo="Sugerencias"
          descripcion="Aparecen como chips al crear un elemento. Escribir una categoría nueva sigue estando permitido siempre."
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {sugeridas.length === 0 ? (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Sin sugerencias. Las categorías que ya usan tus elementos siguen apareciendo como chips.
            </span>
          ) : (
            sugeridas.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 dark:bg-white/5 dark:text-gray-200"
              >
                {c}
                <button
                  type="button"
                  onClick={() => quitar(c)}
                  disabled={disabled}
                  aria-label={`Quitar ${c}`}
                  className="text-gray-500 transition-colors hover:text-error-500 disabled:opacity-40"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>

        {/* El `<Input>` del catálogo no acepta `onKeyDown`, así que el envío con
            Enter lo hace el `<form>`: el `onSubmit` es nativo y no exige tocar
            la primitiva. El `<Button>` es `type="submit"` por defecto. */}
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            agregar();
          }}
        >
          <Input
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            placeholder="Añadir una categoría sugerida…"
            disabled={disabled}
            aria-label="Nueva categoría sugerida"
          />
          <Button variant="outline" type="submit" disabled={disabled || !nueva.trim()}>
            Añadir
          </Button>
        </form>
      </div>

      <div className={cn(claseFila, "mt-2")}>
        <div className="sm:max-w-md">
          <Label2
            titulo="Categorías en uso"
            descripcion="Las que ya tienen elementos asignados. No se pueden borrar desde aquí: se quitan dando de baja sus elementos."
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {usadas.length === 0 ? (
            <span className="text-xs text-gray-600 dark:text-gray-400">Todavía no hay elementos</span>
          ) : (
            usadas.map((c) => (
              <Badge key={c} color="light" size="xs">
                {c}
              </Badge>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// ── Sección: Alertas ──────────────────────────────────────────────────────

function SeccionAlertas({ disabled }: { disabled: boolean }) {
  const [dias, setDias] = useState(String(inventariosStore.config.diasInventarioEstancado));
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    setGuardado(false);
  }, [dias]);

  const n = Number(dias);
  const valido = Number.isFinite(n) && n >= 1 && n <= 365;

  function guardar() {
    if (!valido) return;
    inventariosStore.guardarConfig({ diasInventarioEstancado: Math.trunc(n) });
    setGuardado(true);
  }

  return (
    <div className={claseFila}>
      <div className="sm:max-w-md">
        <Label2
          titulo="Días para alertar conteo estancado"
          descripcion="Tiempo sin registros tras el cual un conteo en curso se marca como estancado."
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="w-24">
          <Input
            type="text"
            value={dias}
            onChange={(e) => setDias(e.target.value.replace(/[^\d]/g, ""))}
            disabled={disabled}
            error={!valido}
            aria-label="Días para considerar un conteo estancado"
          />
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">días</span>
        <Button variant="outline" size="sm" onClick={guardar} disabled={disabled || !valido || guardado}>
          {guardado ? "Guardado" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

// ── Sección: Avanzado ─────────────────────────────────────────────────────

function SeccionAvanzado({ disabled, puedeGestionar }: { disabled: boolean; puedeGestionar: boolean }) {
  const [confirmar, setConfirmar] = useState(false);
  const [restaurado, setRestaurado] = useState(false);

  function reiniciar() {
    inventariosStore.reiniciar();
    setConfirmar(false);
    setRestaurado(true);
  }

  return (
    <div className="space-y-4">
      <div className={claseFila}>
        <div className="sm:max-w-md">
          <Label2
            titulo="Restaurar datos de prueba"
            descripcion="Restablece productos, ubicaciones y conteos de demostración a su estado inicial."
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => (confirmar ? reiniciar() : setConfirmar(true))}
            disabled={disabled && !puedeGestionar}
          >
            {confirmar ? "Confirmar restablecimiento" : "Restablecer datos"}
          </Button>
          {confirmar && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {restaurado && (
        <div className="rounded-xl border border-success-200 bg-success-50 p-3 text-xs text-success-800 dark:border-success-500/20 dark:bg-success-500/10 dark:text-success-400">
          Los datos de demostración han sido restablecidos exitosamente.
        </div>
      )}
    </div>
  );
}

export default InventariosConfigPage;
