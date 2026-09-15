import { useState } from "react";
import { Modal } from "@/elements/ui/modal";
import { Button } from "@/elements/ui/button";
import { ButtonsGroup } from "@/elements/ui/buttons-group";

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSent: (via: string, destino: string) => void;
}

type Channel = "whatsapp" | "email";

/**
 * ExportReportModal — Share the operations report via WhatsApp or email.
 */
export const ExportReportModal = ({ isOpen, onClose, onSent }: ExportReportModalProps) => {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [value, setValue] = useState("");

  const handleSend = () => {
    if (!value.trim()) return;
    if (channel === "whatsapp") {
      const phone = value.replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent("Reporte de turnos NECTO")}`, "_blank");
    }
    onSent(channel === "whatsapp" ? "WhatsApp" : "correo", value);
    setValue("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[440px] p-6">
      <h4 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Exportar reporte</h4>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Comparte el reporte de turnos por WhatsApp o correo.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Enviar por</label>
          <ButtonsGroup
            items={[
              { label: "WhatsApp", onClick: () => setChannel("whatsapp") },
              { label: "Correo", onClick: () => setChannel("email") },
            ]}
            variant="secondary"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {channel === "whatsapp" ? "Numero de telefono" : "Correo electronico"}
          </label>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            type={channel === "whatsapp" ? "tel" : "email"}
            placeholder={channel === "whatsapp" ? "+57 300 000 0000" : "nombre@empresa.com"}
            className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-gray-200"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button size="sm" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={handleSend}>Enviar reporte</Button>
      </div>
    </Modal>
  );
};

export default ExportReportModal;
