import { useState } from "react";
import { observer } from "mobx-react-lite";
import { PageMeta } from "@/shell/meta";
import { Button } from "@/elements/ui/button";
import { Modal } from "@/elements/ui/modal";
import { useModal } from "@/hooks/useModal";
import { MetricCard } from "@/compositions/metric-card";
import { queuesStore } from "@/stores";
import {
  GroupIcon,
  TimeIcon,
  BoxIconLine,
  ShootingStarIcon,
} from "@/icons";
import { CurrentTicketCard } from "./components/CurrentTicketCard";
import { DashboardCharts } from "./components/DashboardCharts";
import { QueuesOverview } from "./components/QueuesOverview";
import { ActivityFeed } from "./components/ActivityFeed";
import { ExportReportModal } from "./components/ExportReportModal";
import { ConfigureDisplayModal } from "./components/ConfigureDisplayModal";
import { Notification } from "@/elements/ui/notification";

const WhatsAppDot = () => (
  <span className="relative flex h-2.5 w-2.5">
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success-500" />
  </span>
);

/**
 * DashboardPage — NECTO real-time queue operations control panel.
 * Reads live data from the shared queues store.
 */
export const DashboardPage = observer(() => {
  const { isOpen, openModal, closeModal } = useModal();
  const [pendingAction, setPendingAction] = useState<string>("");
  const [exportOpen, setExportOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const confirmAction = (label: string) => {
    setPendingAction(label);
    openModal();
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const totalWaiting = queuesStore.totalWaiting;
  const avgWait = queuesStore.avgWaitMin;
  const emitted = queuesStore.totalEmittedToday;

  return (
    <>
      <PageMeta title="Panel de Control de Turnos" description="Monitoreo y gestion en tiempo real" />

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white/90">
              Panel de Control de Turnos
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
              <WhatsAppDot />
              en vivo
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Monitoreo y gestion en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>Exportar Reporte</Button>
          <Button size="sm" onClick={() => setDisplayOpen(true)}>Configurar Display</Button>
        </div>
      </div>

      {/* Current ticket + KPI cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CurrentTicketCard onAction={confirmAction} />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <MetricCard
            layout="horizontal"
            icon={<GroupIcon className="size-6" />}
            title="Turnos en espera"
            value={String(totalWaiting)}
            iconSize="w-14 h-14"
          />
          <MetricCard
            layout="horizontal"
            icon={<TimeIcon className="size-6" />}
            title="Tiempo esp. promedio"
            value={avgWait > 0 ? `${avgWait}m` : "--"}
            iconSize="w-14 h-14"
          />
          <MetricCard
            layout="horizontal"
            icon={<BoxIconLine className="size-6" />}
            title="Tickets emitidos hoy"
            value={String(emitted)}
            iconSize="w-14 h-14"
          />
          <MetricCard
            layout="horizontal"
            icon={<ShootingStarIcon className="size-6" />}
            title="Satisfaccion"
            value="4.8/5"
            change="0.3"
            trend="up"
            iconSize="w-14 h-14"
          />
        </div>
      </div>

      {/* Per-queue status */}
      <div className="mt-6">
        <QueuesOverview />
      </div>

      {/* Statistics */}
      <div className="mt-6">
        <DashboardCharts />
      </div>

      {/* Activity feed */}
      <div className="mt-6">
        <ActivityFeed />
      </div>

      {/* Export report + configure display modals */}
      <ExportReportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        onSent={(via, destino) => showToast(`Reporte enviado por ${via} a ${destino}`)}
      />
      <ConfigureDisplayModal isOpen={displayOpen} onClose={() => setDisplayOpen(false)} />

      {/* Toast (top-center) */}
      {toast && (
        <div className="fixed left-1/2 top-6 z-99999 -translate-x-1/2">
          <Notification variant="success" title={toast} />
        </div>
      )}

      {/* Confirmation modal */}
      <Modal isOpen={isOpen} onClose={closeModal} showCloseButton={false} className="max-w-[440px] p-6 lg:p-8">
        <div className="text-center">
          <h4 className="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
            Confirmar accion
          </h4>
          <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
            Estas seguro de que quieres <span className="font-medium text-gray-700 dark:text-gray-300">{pendingAction}</span>?
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="sm" variant="outline" onClick={closeModal}>Cancelar</Button>
            <Button size="sm" onClick={closeModal}>Confirmar</Button>
          </div>
        </div>
      </Modal>
    </>
  );
});

export default DashboardPage;
