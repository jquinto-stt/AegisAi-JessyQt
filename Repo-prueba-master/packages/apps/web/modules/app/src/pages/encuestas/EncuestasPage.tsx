import { useMemo, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { MetricCard } from "@/compositions/metric-card";
import { ButtonsGroup } from "@/elements/ui/buttons-group";
import { Select } from "@/elements/form/select";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { Notification } from "@/elements/ui/notification";
import { queuesStore, type Survey, type SurveyConfig } from "@/stores";
import { GroupIcon, ShootingStarIcon, CheckCircleIcon, TimeIcon } from "@/icons";
import { StarRating } from "./components/StarRating";
import { CommentCard } from "./components/CommentCard";
import { SurveyCharts } from "./components/SurveyCharts";
import { OperariosEncuestas } from "./components/OperariosEncuestas";
import { cn } from "@/utils";

type RatingFilter = "all" | "positive" | "negative";

const topicTint: Record<"positive" | "negative", string> = {
  positive: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400",
  negative: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400",
};

export const EncuestasPage = observer(() => {
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [queueFilter, setQueueFilter] = useState("all");
  const commentsRef = useRef<HTMLDivElement>(null);

  // Toast de confirmación (top-center)
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Config de la vista pública de encuesta
  const [configOpen, setConfigOpen] = useState(false);
  const [cfgForm, setCfgForm] = useState<SurveyConfig>(queuesStore.surveyConfig);

  const openConfig = () => { setCfgForm({ ...queuesStore.surveyConfig }); setConfigOpen(true); };
  const saveConfig = () => {
    queuesStore.updateSurveyConfig(cfgForm);
    setConfigOpen(false);
    showToast("Encuesta configurada correctamente");
  };
  const cfgField = (k: keyof SurveyConfig, v: string) => setCfgForm((f) => ({ ...f, [k]: v }));

  // Previsualizar: guarda la config actual del formulario y abre la encuesta
  // real en una pestaña nueva, para que refleje los últimos cambios.
  const previsualizar = () => {
    queuesStore.updateSurveyConfig(cfgForm);
    window.open("/s/demo", "_blank");
  };

  // Sube el logo desde el dispositivo: lo lee como data URL (base64) y lo guarda
  // en logoUrl. Mock sin backend — la imagen vive en memoria/estado.
  const handleLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => cfgField("logoUrl", String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = ""; // permite re-subir el mismo archivo
  };

  const avg = queuesStore.avgRating;
  const total = queuesStore.totalResponses;
  const rate = queuesStore.responseRate;
  const low = queuesStore.lowRatingSurveys;
  const topics = queuesStore.topics;

  const subtitle = total > 0
    ? `Tu servicio tiene ${avg.toFixed(1)} de 5 en promedio`
    : "Aun no hay opiniones de tus clientes";

  const queueOptions = useMemo(() => {
    const names = Array.from(new Set(queuesStore.surveys.map((s) => s.queueName)));
    return [{ value: "all", label: "Todas las filas" }, ...names.map((n) => ({ value: n, label: n }))];
  }, [queuesStore.surveys]);

  const filtered = queuesStore.surveys.filter((s) => {
    const sentiment = queuesStore.sentimentOf(s.rating);
    const matchRating =
      ratingFilter === "all" ||
      (ratingFilter === "positive" && sentiment === "positive") ||
      (ratingFilter === "negative" && sentiment === "negative");
    const matchQueue = queueFilter === "all" || s.queueName === queueFilter;
    return matchRating && matchQueue;
  });

  const viewNegatives = () => {
    setRatingFilter("negative");
    setQueueFilter("all");
    setTimeout(() => commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const reply = (s: Survey) => {
    const msg = encodeURIComponent(`Hola ${s.cliente}, gracias por tu opinion sobre ${s.queueName}.`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const hasSurveys = queuesStore.surveys.length > 0;

  return (
    <>
      <PageMeta title="Encuestas" description="Satisfaccion de tus clientes" />

      {/* Toast (top-center) */}
      {toast && (
        <div className="fixed left-1/2 top-6 z-99999 -translate-x-1/2">
          <Notification variant="success" title={toast} />
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Encuestas</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="outline" onClick={previsualizar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mr-1.5 h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Previsualizar
          </Button>
          <Button size="sm" variant="outline" onClick={openConfig}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mr-1.5 h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            Configurar encuesta
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-theme-sm dark:bg-gray-900">
          <p className="text-sm text-gray-500 dark:text-gray-400">Calificacion promedio</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-800 dark:text-white/90">{avg.toFixed(1)}/5</span>
          </div>
          <div className="mt-1"><StarRating value={avg} size="sm" /></div>
        </div>
        <MetricCard layout="horizontal" icon={<GroupIcon className="size-6" />} title="Total de respuestas" value={String(total)} iconSize="w-14 h-14" />
        <MetricCard layout="horizontal" icon={<CheckCircleIcon className="size-6" />} title="Tasa de respuesta" value={`${rate}%`} iconSize="w-14 h-14" />
        <MetricCard layout="horizontal" icon={<TimeIcon className="size-6" />} title="Tendencia" value="+0.3" change="vs periodo ant." trend="up" iconSize="w-14 h-14" />
      </div>

      {/* Charts */}
      <div className="mt-6">
        <SurveyCharts />
      </div>

      {/* Encuestas compartidas por operarios */}
      <div className="mt-6">
        <OperariosEncuestas />
      </div>

      {/* Frequent topics */}
      {topics.length > 0 && (
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-theme-sm dark:bg-gray-900">
          <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">Temas frecuentes</h3>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <span key={t.word} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium capitalize", topicTint[t.sentiment])}>
                {t.word}
                <span className="rounded-full bg-white/60 px-1.5 text-xs dark:bg-black/20">{t.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Necesitan atencion */}
      {low.length > 0 && (
        <div className="mt-6 rounded-2xl border border-error-200 bg-error-50 p-5 dark:border-error-500/30 dark:bg-error-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-error-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <h3 className="text-sm font-semibold text-error-700 dark:text-error-400">
                {low.length} {low.length === 1 ? "cliente necesita" : "clientes necesitan"} seguimiento
              </h3>
            </div>
            <button onClick={viewNegatives} className="text-sm font-medium text-error-600 hover:text-error-700 dark:text-error-400">
              Ver todas
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {low.slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 dark:bg-gray-900">
                <div className="flex items-center gap-3">
                  <StarRating value={s.rating} size="sm" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{s.cliente}</span>
                  <span className="hidden text-xs text-gray-400 sm:inline">{s.queueName}</span>
                </div>
                <button onClick={() => reply(s)} className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400">Responder</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent comments */}
      <div ref={commentsRef} className="mt-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Comentarios recientes</h3>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonsGroup
              items={[
                { label: "Todas", onClick: () => setRatingFilter("all") },
                { label: "Positivas", onClick: () => setRatingFilter("positive") },
                { label: "Negativas", onClick: () => setRatingFilter("negative") },
              ]}
              variant="secondary"
            />
            <div className="sm:w-48">
              <Select defaultValue={queueFilter} onChange={setQueueFilter} options={queueOptions} />
            </div>
          </div>
        </div>

        {!hasSurveys ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
            <p className="text-lg font-semibold text-gray-800 dark:text-white/90">Aun no hay opiniones</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Las encuestas de tus clientes apareceran aqui.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center dark:border-gray-700 dark:bg-gray-900">
            <p className="text-sm text-gray-500 dark:text-gray-400">No hay comentarios con estos filtros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filtered.map((s) => (
              <CommentCard key={s.id} survey={s} sentiment={queuesStore.sentimentOf(s.rating)} onReply={() => reply(s)} />
            ))}
          </div>
        )}
      </div>

      {/* Configurar la vista pública de encuesta */}
      <Modal isOpen={configOpen} onClose={() => setConfigOpen(false)} className="max-w-[1040px] p-6 sm:p-8">
        <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Configurar encuesta</h4>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Personaliza la pantalla que ve el cliente al abrir el link de calificación.
        </p>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* ── Columna izquierda: formulario ── */}
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-2">
          <div>
            <Label htmlFor="cfg-name">Nombre del negocio</Label>
            <Input id="cfg-name" value={cfgForm.businessName} onChange={(e) => cfgField("businessName", e.target.value)} placeholder="Ej: Mis Carnes Parrilla" />
          </div>
          <div>
            <Label>Logo <span className="font-normal text-gray-400">(opcional)</span></Label>
            <div className="flex items-center gap-3">
              {cfgForm.logoUrl ? (
                <img src={cfgForm.logoUrl} alt="Logo" className="h-14 w-14 shrink-0 rounded-lg border border-gray-200 object-contain dark:border-gray-700" />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-300 dark:border-gray-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6 6h.008v.008H6V6z" />
                  </svg>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="inline-flex w-fit cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                  Subir imagen
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                </label>
                {cfgForm.logoUrl && (
                  <button type="button" onClick={() => cfgField("logoUrl", "")} className="w-fit text-xs text-error-500 hover:text-error-600">
                    Quitar logo
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1.5 text-xs text-gray-400">Sube el logo desde tu dispositivo. Si lo dejas vacío se muestra un ícono por defecto.</p>
          </div>
          <div>
            <Label htmlFor="cfg-title">Título</Label>
            <Input id="cfg-title" value={cfgForm.title} onChange={(e) => cfgField("title", e.target.value)} placeholder="¿Cómo estuvo tu experiencia?" />
          </div>
          <div>
            <Label htmlFor="cfg-subtitle">Texto de apoyo</Label>
            <Input id="cfg-subtitle" value={cfgForm.subtitle} onChange={(e) => cfgField("subtitle", e.target.value)} placeholder="Tómate un momento para calificar tu visita." />
          </div>

          {/* Textos de los campos de la encuesta */}
          <div>
            <Label htmlFor="cfg-satis">Pregunta de satisfacción</Label>
            <Input id="cfg-satis" value={cfgForm.satisfactionLabel} onChange={(e) => cfgField("satisfactionLabel", e.target.value)} placeholder="Tu satisfacción general" />
          </div>
          <div>
            <Label htmlFor="cfg-recom">Pregunta de recomendación</Label>
            <Input id="cfg-recom" value={cfgForm.recommendationLabel} onChange={(e) => cfgField("recommendationLabel", e.target.value)} placeholder="¿Qué tan probable es que nos recomiendes?" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cfg-comlbl">Etiqueta de comentarios</Label>
              <Input id="cfg-comlbl" value={cfgForm.commentsLabel} onChange={(e) => cfgField("commentsLabel", e.target.value)} placeholder="Comentarios" />
            </div>
            <div>
              <Label htmlFor="cfg-comph">Placeholder de comentarios</Label>
              <Input id="cfg-comph" value={cfgForm.commentsPlaceholder} onChange={(e) => cfgField("commentsPlaceholder", e.target.value)} placeholder="Cuéntanos qué te pareció..." />
            </div>
          </div>
          <div>
            <Label htmlFor="cfg-submit">Texto del botón de envío</Label>
            <Input id="cfg-submit" value={cfgForm.submitLabel} onChange={(e) => cfgField("submitLabel", e.target.value)} placeholder="Enviar calificación" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cfg-tytitle">Título de agradecimiento</Label>
              <Input id="cfg-tytitle" value={cfgForm.thankYouTitle} onChange={(e) => cfgField("thankYouTitle", e.target.value)} placeholder="¡Gracias por tu opinión!" />
            </div>
            <div>
              <Label htmlFor="cfg-tymsg">Mensaje de agradecimiento</Label>
              <Input id="cfg-tymsg" value={cfgForm.thankYouMessage} onChange={(e) => cfgField("thankYouMessage", e.target.value)} placeholder="Tu respuesta nos ayuda a mejorar." />
            </div>
          </div>
        </div>

        {/* ── Columna derecha: previsualización en vivo del card ── */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">Previsualización</p>
          <SurveyPreview cfg={cfgForm} />
        </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
          <Button size="sm" onClick={saveConfig}>Guardar</Button>
        </div>
      </Modal>
    </>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PREVIEW — mini-card de cómo se verá la encuesta del cliente
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SurveyPreview — previsualización en vivo del card que verá el cliente,
 * usando los valores actuales del formulario de configuración.
 */
const SurveyPreview = ({ cfg }: { cfg: SurveyConfig }) => (
  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
    {/* Simula la pantalla que abre el cliente */}
    <div className="mx-auto max-w-xs rounded-2xl bg-white p-6 text-center shadow-theme-sm dark:bg-gray-900">
      {/* Logo o ícono por defecto */}
      {cfg.logoUrl ? (
        <img src={cfg.logoUrl} alt="Logo" className="mx-auto mb-4 h-16 w-16 rounded-xl object-contain" />
      ) : (
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
            <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8l-5.8 3.1 1.1-6.5L2.6 9.8l6.5-.9L12 2.5z" />
          </svg>
        </div>
      )}

      {cfg.businessName && (
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-500">{cfg.businessName}</p>
      )}
      <h5 className="text-base font-bold text-gray-800 dark:text-white/90">
        {cfg.title || "¿Cómo estuvo tu experiencia?"}
      </h5>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {cfg.subtitle || "Tómate un momento para calificar tu visita."}
      </p>

      {/* Satisfacción */}
      <p className="mt-4 text-xs font-medium text-gray-700 dark:text-gray-300">{cfg.satisfactionLabel}</p>
      <div className="mt-1 flex justify-center">
        <StarRating value={0} size="md" />
      </div>

      {/* Recomendación */}
      <p className="mt-3 text-xs font-medium text-gray-700 dark:text-gray-300">{cfg.recommendationLabel}</p>
      <div className="mt-1 flex justify-center">
        <StarRating value={0} size="md" />
      </div>

      {/* Comentarios */}
      <p className="mt-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{cfg.commentsLabel}</p>
      <div className="mt-1 rounded-lg border border-gray-200 px-3 py-2 text-left text-xs text-gray-400 dark:border-gray-700">
        {cfg.commentsPlaceholder}
      </div>

      <div className="mt-4 rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white">{cfg.submitLabel || "Enviar"}</div>
    </div>
    <p className="mt-3 text-center text-xs text-gray-400">Así verá el cliente el link de la encuesta.</p>
  </div>
);

export default EncuestasPage;
