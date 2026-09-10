import React, { useState, useEffect } from "react";
import { Building2, AlertCircle } from "lucide-react";
import { StockLocation } from "../types/inventory.types";
import { Modal, Button, Field, Textarea } from "@/elements";

interface LocationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { name: string; code: string; description?: string }) => Promise<void>;
  existingLocations?: StockLocation[];
}

export const LocationFormModal: React.FC<LocationFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingLocations = [],
}) => {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      const nextNum = (existingLocations.length + 1).toString().padStart(3, "0");
      setCode(`BOD-${nextNum}`);
      setDescription("");
      setErrorMessage(null);
    }
  }, [isOpen, existingLocations.length]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("El nombre de la bodega es obligatorio.");
      return;
    }
    if (!code.trim()) {
      setErrorMessage("El código identificador es obligatorio.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Error al crear la bodega.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md p-6 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-theme-xl"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div className="w-9 h-9 rounded-xl bg-secondary-600/10 dark:bg-secondary-600/20 text-secondary-600 dark:text-secondary-400 border border-secondary-600/20 flex items-center justify-center">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-base text-gray-900 dark:text-white">
            Nueva Bodega o Sucursal
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Punto de almacenamiento y despacho físico
          </p>
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-none" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Field
          label="Nombre de la Bodega / Sucursal"
          labelStyle="bold"
          intent="location.form.name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Bodega Central, Sucursal Norte, Depósito Industrial"
          required
        />

        <Field
          label="Código Identificador"
          labelStyle="bold"
          mono
          intent="location.form.code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ej: BOD-003, SUC-NORTE"
          required
        />

        <Textarea
          label="Descripción o Dirección Física"
          intent="location.form.desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ej: Carrera 43A #1-50, Medellín. Módulo A de almacenamiento principal."
          rows={3}
        />

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creando..." : "Crear Bodega"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
