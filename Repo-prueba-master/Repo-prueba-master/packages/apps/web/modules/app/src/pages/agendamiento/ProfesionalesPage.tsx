import { useState } from "react";
import { useNavigate } from "react-router";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Card } from "@/elements/ui/card";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { Input } from "@/elements/form/input";
import { Label } from "@/elements/form/label";
import { agendaStore, type Profesional } from "@/stores";

const RequiredMark = () => <span className="text-error-500">*</span>;

const EditIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const inicialesDe = (nombre: string) => {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : (p[0]?.[1] ?? ""))).toUpperCase();
};

interface ProfForm {
  nombre: string;
  especialidad: string;
  color: string;
}
const emptyForm = (color: string): ProfForm => ({ nombre: "", especialidad: "", color });

export const ProfesionalesPage = observer(() => {
  const navigate = useNavigate();
  const colores = agendaStore.profColorOptions;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfForm>(emptyForm(colores[0]));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const profesionales = agendaStore.profesionales;

  const openCreate = () => { setEditingId(null); setForm(emptyForm(colores[profesionales.length % colores.length])); setErrors({}); setModalOpen(true); };
  const openEdit = (p: Profesional) => { setEditingId(p.id); setForm({ nombre: p.nombre, especialidad: p.especialidad, color: p.color }); setErrors({}); setModalOpen(true); };

  const save = () => {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = "El nombre es obligatorio";
    if (!form.especialidad.trim()) e.especialidad = "La especialidad es obligatoria";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    if (editingId) {
      agendaStore.updateProfesional(editingId, { nombre: form.nombre.trim(), especialidad: form.especialidad.trim(), color: form.color });
    } else {
      agendaStore.crearProfesional({ nombre: form.nombre.trim(), especialidad: form.especialidad.trim(), color: form.color });
    }
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (deleteId) agendaStore.deleteProfesional(deleteId);
    setDeleteId(null);
  };

  const deleting = profesionales.find((p) => p.id === deleteId);
  const previewIniciales = form.nombre.trim() ? inicialesDe(form.nombre) : "?";

  return (
    <>
      <PageMeta title="Profesionales" description="Gestiona los profesionales de tu negocio" />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">Profesionales</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Cada profesional tiene su propia agenda de citas</p>
        </div>
        <Button size="sm" onClick={openCreate}>+ Agregar profesional</Button>
      </div>

      {/* Grid o estado vacío */}
      {profesionales.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white py-20 text-center dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-7 w-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Aún no tienes profesionales</h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">Crea el primero para empezar a gestionar su agenda de citas.</p>
          <Button size="sm" className="mt-5" onClick={openCreate}>Agregar profesional</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {profesionales.map((p) => {
            const total = agendaStore.citasDeProfesional(p.id).length;
            const hoy = agendaStore.citasHoyDe(p.id);
            return (
              <Card key={p.id} className="rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${p.color}`}>{p.avatar}</span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-800 dark:text-white/90">{p.nombre}</p>
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">{p.especialidad}</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800/50">
                    <p className="text-xl font-bold text-gray-800 dark:text-white/90">{total}</p>
                    <p className="text-xs text-gray-400">Citas</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-gray-800/50">
                    <p className="text-xl font-bold text-brand-600 dark:text-brand-400">{hoy}</p>
                    <p className="text-xs text-gray-400">Hoy</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Button size="sm" className="flex-1" onClick={() => navigate(`/agendamiento?prof=${p.id}`)}>Ver agenda</Button>
                  <Button size="icon" variant="outline" aria-label="Editar" onClick={() => openEdit(p)}><EditIcon /></Button>
                  <Button size="icon" variant="outline" aria-label="Eliminar" onClick={() => setDeleteId(p.id)}>
                    <span className="text-error-500"><TrashIcon /></span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal crear / editar */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} className="max-w-[480px] p-6">
        <h4 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          {editingId ? "Editar profesional" : "Agregar profesional"}
        </h4>

        {/* Previsualización del avatar */}
        <div className="mb-5 flex items-center gap-3">
          <span className={`flex h-14 w-14 items-center justify-center rounded-full text-base font-bold text-white ${form.color}`}>{previewIniciales}</span>
          <p className="text-sm text-gray-500 dark:text-gray-400">Así se verá el avatar del profesional.</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="prof-nombre">Nombre <RequiredMark /></Label>
              <Input id="prof-nombre" placeholder="Ej: Dra. Ana Gómez" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} error={!!errors.nombre} hint={errors.nombre} />
            </div>
            <div>
              <Label htmlFor="prof-esp">Especialidad <RequiredMark /></Label>
              <Input id="prof-esp" placeholder="Ej: Psicología" value={form.especialidad} onChange={(e) => setForm({ ...form, especialidad: e.target.value })} error={!!errors.especialidad} hint={errors.especialidad} />
            </div>
          </div>

          {/* Selector de color */}
          <div>
            <Label htmlFor="prof-color">Color del avatar</Label>
            <div className="flex flex-wrap gap-3">
              {colores.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Color ${c}`}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`h-9 w-9 rounded-full ${c} transition-transform ${form.color === c ? "ring-2 ring-offset-2 ring-brand-500 dark:ring-offset-gray-900 scale-110" : "hover:scale-105"}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button size="sm" onClick={save}>{editingId ? "Guardar" : "Agregar"}</Button>
        </div>
      </Modal>

      {/* Modal eliminar */}
      <Modal isOpen={!!deleteId} onClose={() => setDeleteId(null)} showCloseButton={false} className="max-w-[420px] p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-50 text-error-500 dark:bg-error-500/15">
            <TrashIcon />
          </div>
          <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">Eliminar profesional</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {deleting && `Se eliminará "${deleting.nombre}".`} Esta acción no se puede deshacer. Las citas asociadas quedarán sin profesional.
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

export default ProfesionalesPage;
