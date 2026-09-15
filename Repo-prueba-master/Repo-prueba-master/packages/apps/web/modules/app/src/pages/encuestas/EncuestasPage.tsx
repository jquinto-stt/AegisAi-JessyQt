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
    return [{ value: "all", label: "Todas las colas" }, ...names.map((n) => ({ value: n, label: n }))];
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
        <Button size="sm" variant="outline" onClick={openConfig}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mr-1.5 h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          Configurar encuesta
        </Button>
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
      <Modal isOpen={configOpen} onClose={() => setConfigOpen(false)} className="max-w-[520px] p-6">
        <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Configurar encuesta</h4>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
          Personaliza la pantalla que ve el cliente al abrir el link de calificación.
        </p>
        <div className="space-y-4">
          <div>
            <Label htmlFor="cfg-name">Nombre del negocio</Label>
            <Input id="cfg-name" value={cfgForm.businessName} onChange={(e) => cfgField("businessName", e.target.value)} placeholder="Ej: Mis Carnes Parrilla" />
          </div>
          <div>
            <Label htmlFor="cfg-logo">URL del logo <span className="font-normal text-gray-400">(opcional)</span></Label>
            <Input id="cfg-logo" value={cfgForm.logoUrl} onChange={(e) => cfgField("logoUrl", e.target.value)} placeholder="https://.../logo.png" />
            <p className="mt-1.5 text-xs text-gray-400">Si lo dejas vacío se muestra un ícono por defecto.</p>
          </div>
          <div>
            <Label htmlFor="cfg-title">Título</Label>
            <Input id="cfg-title" value={cfgForm.title} onChange={(e) => cfgField("title", e.target.value)} placeholder="¿Cómo estuvo tu experiencia?" />
          </div>
          <div>
            <Label htmlFor="cfg-subtitle">Texto de apoyo</Label>
            <Input id="cfg-subtitle" value={cfgForm.subtitle} onChange={(e) => cfgField("subtitle", e.target.value)} placeholder="Tómate un momento para calificar tu visita." />
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
        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
          <Button size="sm" onClick={saveConfig}>Guardar</Button>
        </div>
      </Modal>
    </>
  );
});

export default EncuestasPage;
