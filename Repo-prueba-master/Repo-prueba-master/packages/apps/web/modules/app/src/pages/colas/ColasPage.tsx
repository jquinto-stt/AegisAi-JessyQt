import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Select } from "@/elements/form/select";
import { Notification } from "@/elements/ui/notification";
import { queuesStore, type Queue, type AttentionMode, type CustomField, type FieldType } from "@/stores";
import { QueueCard } from "./components/QueueCard";

interface QueueForm {
  nombre: string;
  servicio: string;
  modo: AttentionMode;
  tiempo: string;
  campos: CustomField[];
}

const emptyForm: QueueForm = { nombre: "", servicio: "general", modo: "auto", tiempo: "10", campos: [] };

const fieldTypeLabels: { value: FieldType; label: string }[] = [
  { value: "text", label: "Texto corto" },
  { value: "textarea", label: "Texto largo" },
  { value: "number", label: "Número" },
  { value: "select", label: "Selección" },
];

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
  `campo-${Date.now()}`;

export const ColasPage = observer(() => {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QueueForm>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const queues = queuesStore.queues;
  const activeCount = queuesStore.activeCount;
  const totalWaiting = queuesStore.totalWaiting;

  const subtitle = queues.length === 0
    ? "Aun no tienes colas"
    : `${activeCount} ${activeCount === 1 ? "cola activa" : "colas activas"} · ${totalWaiting} ${totalWaiting === 1 ? "persona esperando" : "personas esperando"} en total`;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (q: Queue) => {
    setEditingId(q.id);
    setForm({ nombre: q.nombre, servicio: q.servicio, modo: q.mode, tiempo: String(q.tiempoProm), campos: q.campos.map((c) => ({ ...c })) });
    setModalOpen(true);
  };

  // ── Custom fields editor ──
  const addField = () => {
    setForm((f) => ({
      ...f,
      campos: [...f.campos, { id: `campo-${Date.now()}`, label: "", type: "text", required: false }],
    }));
  };
  const updateField = (idx: number, patch: Partial<CustomField>) => {
    setForm((f) => ({
      ...f,
      campos: f.campos.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  };
  const removeField = (idx: number) => {
    setForm((f) => ({ ...f, campos: f.campos.filter((_, i) => i !== idx) }));
  };

  const saveQueue = () => {
    if (!form.nombre.trim()) return;
    // Normalize fields: derive stable ids from labels, drop empty labels, clean select options.
    const campos: CustomField[] = form.campos
      .filter((c) => c.label.trim())
      .map((c) => ({
        id: slugify(c.label),
        label: c.label.trim(),
        type: c.type,
        required: c.required,
        options: c.type === "select" ? (c.options ?? []).map((o) => o.trim()).filter(Boolean) : undefined,
      }));

    if (editingId) {
      queuesStore.updateQueue(editingId, {
        nombre: form.nombre,
        servicio: form.servicio,
        mode: form.modo,
        tiempoProm: Number(form.tiempo) || 10,
        campos,
      });
      showToast("Cola actualizada");
    } else {
      queuesStore.createQueue({
        nombre: form.nombre,
        servicio: form.servicio,
        mode: form.modo,
        tiempoProm: Number(form.tiempo) || 10,
        campos,
      });
      showToast("Cola creada");
    }
    setModalOpen(false);
  };

  const toggleQueue = (id: string, active: boolean) => {
    queuesStore.toggleQueue(id, active);
    showToast(active ? "Cola reanudada" : "Cola pausada");
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    queuesStore.deleteQueue(deleteId);
    setDeleteId(null);
    showToast("Cola eliminada");
  };

  const shareQueue = (q: Queue) => {
    const msg = encodeURIComponent(`Hola! Quiero tomar un turno en ${q.nombre}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const deletingQueue = queues.find((q) => q.id === deleteId);

  return (
    <>
      <PageMeta title="Colas" description="Administra tus colas de atencion" />

      {/* Toast (top-center) */}
      {toast && (
        <div className="fixed left-1/2 top-6 z-99999 -translate-x-1/2">
          <Notification variant="success" title={toast} />
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Colas</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        <Button size="sm" onClick={openCreate}>+ Crear cola</Button>
      </div>

      {/* Grid or empty state */}
      {queues.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-7 w-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Aun no tienes colas</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Crea la primera para empezar a recibir turnos por WhatsApp.
          </p>
          <button onClick={openCreate} className="mt-5 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            Crear cola
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {queues.map((q) => (
            <QueueCard
              key={q.id}
              queue={q}
              saturation={queuesStore.saturationOf(q)}
              onToggle={(active) => toggleQueue(q.id, active)}
              onManage={() => navigate(`/turnos?cola=${q.id}`)}
              onShare={() => shareQueue(q)}
              onEdit={() => openEdit(q)}
              onDelete={() => setDeleteId(q.id)}
            />
          ))}
        </div>
      )}

      {/* Create / edit modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-[480px] p-6">
        <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          {editingId ? "Editar cola" : "Crear cola"}
        </h4>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre de la cola</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Consulta general"
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-gray-200"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Servicio</label>
              <Select
                defaultValue={form.servicio}
                onChange={(v) => setForm({ ...form, servicio: v })}
                options={[
                  { value: "general", label: "General" },
                  { value: "soporte", label: "Soporte" },
                  { value: "ventas", label: "Ventas" },
                  { value: "otro", label: "Otro" },
                ]}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Modo de atencion</label>
              <Select
                defaultValue={form.modo}
                onChange={(v) => setForm({ ...form, modo: v as AttentionMode })}
                options={[
                  { value: "auto", label: "Automatico" },
                  { value: "manual", label: "Manual" },
                ]}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Tiempo estimado (minutos)</label>
            <input
              type="number"
              min={1}
              value={form.tiempo}
              onChange={(e) => setForm({ ...form, tiempo: e.target.value })}
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-700 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-gray-200"
            />
          </div>

          {/* Custom fields editor */}
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Campos para crear un turno</label>
              <button
                type="button"
                onClick={addField}
                className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300"
              >
                + Agregar campo
              </button>
            </div>
            <p className="mb-3 text-xs text-gray-400">
              Datos que el operador (o el bot) debe llenar al crear un turno en esta cola. Ej: Pedido, Motivo, Documento.
            </p>

            {form.campos.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-200 py-4 text-center text-xs text-gray-400 dark:border-gray-700">
                Sin campos extra. Solo se pedirá nombre y teléfono.
              </p>
            ) : (
              <div className="space-y-3">
                {form.campos.map((c, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                    <div className="flex items-start gap-2">
                      <input
                        value={c.label}
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                        placeholder="Nombre del campo (ej: Pedido)"
                        className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:text-gray-200"
                      />
                      <select
                        value={c.type}
                        onChange={(e) => updateField(idx, { type: e.target.value as FieldType })}
                        className="rounded-lg border border-gray-300 bg-transparent px-2 py-2 text-sm text-gray-700 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                      >
                        {fieldTypeLabels.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeField(idx)}
                        aria-label="Quitar campo"
                        className="rounded-lg p-2 text-gray-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/15"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {c.type === "select" && (
                      <input
                        value={(c.options ?? []).join(", ")}
                        onChange={(e) => updateField(idx, { options: e.target.value.split(",").map((o) => o.trimStart()) })}
                        placeholder="Opciones separadas por coma (ej: En mesa, Para llevar)"
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none dark:border-gray-700 dark:text-gray-200"
                      />
                    )}

                    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={c.required}
                        onChange={(e) => updateField(idx, { required: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20"
                      />
                      Obligatorio
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button size="sm" onClick={saveQueue}>{editingId ? "Guardar" : "Crear cola"}</Button>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} showCloseButton={false} className="max-w-[420px] p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/15">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </div>
          <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">Eliminar cola</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {deletingQueue && `Se eliminara "${deletingQueue.nombre}".`} Esta accion no se puede deshacer.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button size="sm" variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button size="sm" variant="destructive" onClick={confirmDelete}>Eliminar</Button>
          </div>
        </div>
      </Modal>
    </>
  );
});

export default ColasPage;
