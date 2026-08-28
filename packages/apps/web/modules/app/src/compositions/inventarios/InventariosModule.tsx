import React, { useState, useEffect } from "react";
import {
  ClipboardList, Users, ShieldAlert, ShieldCheck, FileSpreadsheet, History,
  Camera, Mic, FileText, Video, CheckCircle, CheckCircle2, AlertTriangle,
  Building2, MapPin, Search, ArrowRight, Download, Filter, Plus,
  ChevronRight, RefreshCcw, Eye, Play, Sparkles, Layers, ArrowLeft, Sun, Moon, Clock, LineChart,
  Trash2, Volume2, Square, Scan, Tag, Paperclip, Check, QrCode, X, TrendingUp, BarChart2, Award
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

/* ── Necto Design Tokens (Figma Official) ────────────────────────────────── */

const ORANGE = "#FF3F1A";
const NAVY = "#190088";
const CYAN = "#97D6DF";
const GRAY = "#ECECEC";
const DARK_BG = "#212121";
const DARK_CARD = "#2C2D31";
const DARK_DEEP = "#1E1F23";

/* ── Types for Inventarios Module ────────────────────────────────────────── */

export type InventariosRole = "operador" | "analista";
export type OperadorSubView = "inicio" | "captura" | "registro" | "resumen";
export type AnalistaSubView = "dashboard" | "directorio" | "historial" | "exportacion";

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  clientName: string;
  status: "Activo" | "En Mantenimiento" | "Inactivo" | "Baja";
  condition: "Buena" | "Requiere Revisión" | "Crítica";
  location: string;
  lastUpdated: string;
  evidenceCount: number;
  evidenceType: "foto" | "audio" | "video" | "texto";
  evidenceUrl?: string;
  notes?: string;
}

export interface InventoryTemplate {
  id: string;
  name: string;
  category: string;
  fields: string[];
  description: string;
}

/* ── Safe Image Component with Error Fallback ────────────────────────────── */

export const SafeImage = ({ src, alt, className }: { src?: string; alt: string; className?: string }) => {
  const [imgError, setImgError] = useState(false);

  if (imgError || !src) {
    return (
      <div className={`bg-slate-100 dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-[#FF3F1A] flex items-center justify-center font-bold text-xs p-2 shrink-0 ${className || ""}`}>
        <Camera className="w-4 h-4 opacity-70" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setImgError(true)}
    />
  );
};

/* ── Initial Mock Data ──────────────────────────────────────────────────── */

export const INITIAL_TEMPLATES: InventoryTemplate[] = [
  {
    id: "t1",
    name: "Control de Insumos & Perecederos (Cocina)",
    category: "Gastronomía",
    fields: ["Stock Actual (kg/unid)", "Lote Proveedor", "Vencimiento (FIFO)", "Punto de Reorden"],
    description: "Monitoreo de materias primas críticas (carnes, harinas, quesos, verduras) para cocina.",
  },
  {
    id: "t2",
    name: "Bebidas & Packaging de Despacho",
    category: "Gastronomía",
    fields: ["Unidades Disponibles", "Proveedor", "Costo Unitario", "Ubicación Almacén"],
    description: "Control de stock de gaseosas, cervezas, cajas térmicas de empanadas y descartables.",
  },
  {
    id: "t3",
    name: "Equipamiento & Hornos Gastronómicos",
    category: "Equipamiento",
    fields: ["Horas de Uso", "Estado Resistencias / Motor", "Último Service", "Operador Responsable"],
    description: "Mantenimiento preventivo de hornos convectores, amasadoras y cámaras frigoríficas.",
  },
  {
    id: "t4",
    name: "Control de Extintores y Seguridad SST",
    category: "SST & Emergencias",
    fields: ["Presión Manómetro", "Fecha Vencimiento", "Precinto", "Ubicación Físico-Espacial"],
    description: "Inspección periódica de seguridad, extintores y botiquines en sucursal.",
  },
  {
    id: "t5",
    name: "Stock de Mercadería & Retail",
    category: "Retail",
    fields: ["Cantidad Góndola", "SKU / Código Barra", "Precio Venta", "Margen Comercial"],
    description: "Inventario rápido de productos terminados para venta directa en mostrador.",
  },
];

export const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: "inv-101",
    code: "INS-001",
    name: "Carne Picada Especial Vacuno",
    category: "Gastronomía",
    clientName: "Empanadas Necto (Sucursal Centro)",
    status: "Activo",
    condition: "Buena",
    location: "Cámara Frigorífica #1 / Bandeja A",
    lastUpdated: "Hace 15 min",
    evidenceCount: 2,
    evidenceType: "foto",
    evidenceUrl: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=600&q=80",
    notes: "50 kg ingresados hoy de Frigorífico del Plata. Lote 2026-08.",
  },
  {
    id: "inv-102",
    code: "INS-002",
    name: "Queso Muzarella en Barra",
    category: "Gastronomía",
    clientName: "Empanadas Necto (Sucursal Centro)",
    status: "Activo",
    condition: "Requiere Revisión",
    location: "Cámara Frigorífica #2 / Estante 2",
    lastUpdated: "Hace 1 hora",
    evidenceCount: 1,
    evidenceType: "audio",
    evidenceUrl: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80",
    notes: "Stock remanente: 8 kg. Cercano al punto de reorden (10 kg).",
  },
  {
    id: "inv-103",
    code: "PAC-010",
    name: "Cajas Térmicas Docena Empanadas",
    category: "Gastronomía",
    clientName: "Empanadas Necto (Sucursal Centro)",
    status: "Activo",
    condition: "Buena",
    location: "Almacén Seco / Estante B",
    lastUpdated: "Ayer 18:20",
    evidenceCount: 1,
    evidenceType: "texto",
    evidenceUrl: "https://images.unsplash.com/photo-1526367790999-0150786686a2?auto=format&fit=crop&w=600&q=80",
    notes: "350 unidades listas para despacho de delivery.",
  },
  {
    id: "inv-104",
    code: "EQP-003",
    name: "Horno Convector Industrial 10 Bandejas",
    category: "Equipamiento",
    clientName: "Empanadas Necto (Sucursal Centro)",
    status: "En Mantenimiento",
    condition: "Crítica",
    location: "Cocina Principal / Estación Hornos",
    lastUpdated: "Hace 30 min",
    evidenceCount: 1,
    evidenceType: "video",
    evidenceUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
    notes: "Termostato con oscilación de +/- 20°C. Requiere calibración técnica.",
  },
  {
    id: "inv-105",
    code: "EXT-004",
    name: "Extintor PQS 10kg ABC",
    category: "SST & Emergencias",
    clientName: "Empanadas Necto (Sucursal Centro)",
    status: "Activo",
    condition: "Buena",
    location: "Sector Hornos / Pasillo A",
    lastUpdated: "Hace 2 días",
    evidenceCount: 1,
    evidenceType: "foto",
    evidenceUrl: "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?auto=format&fit=crop&w=600&q=80",
    notes: "Manómetro en zona verde, precinto y tarjeta vigentes.",
  },
];

/* ── Main Component ─────────────────────────────────────────────────────── */

export function InventariosModule({
  isDarkMode,
  onToggleDarkMode,
  roleProp = "operador",
  opSubViewProp = "inicio",
  anSubViewProp = "dashboard",
  onRoleChange,
  onOpSubViewChange,
  onAnSubViewChange,
}: {
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  roleProp?: InventariosRole;
  opSubViewProp?: OperadorSubView;
  anSubViewProp?: AnalistaSubView;
  onRoleChange?: (r: InventariosRole) => void;
  onOpSubViewChange?: (v: OperadorSubView) => void;
  onAnSubViewChange?: (v: AnalistaSubView) => void;
}) {
  const [role, setRoleState] = useState<InventariosRole>(roleProp);
  const [opSubView, setOpSubViewState] = useState<OperadorSubView>(opSubViewProp);
  const [anSubView, setAnSubViewState] = useState<AnalistaSubView>(anSubViewProp);

  useEffect(() => {
    setRoleState(roleProp);
  }, [roleProp]);

  useEffect(() => {
    setOpSubViewState(opSubViewProp);
  }, [opSubViewProp]);

  useEffect(() => {
    setAnSubViewState(anSubViewProp);
  }, [anSubViewProp]);

  const setRole = (r: InventariosRole) => {
    setRoleState(r);
    if (onRoleChange) onRoleChange(r);
  };

  const setOpSubView = (v: OperadorSubView) => {
    setOpSubViewState(v);
    if (onOpSubViewChange) onOpSubViewChange(v);
  };

  const setAnSubView = (v: AnalistaSubView) => {
    setAnSubViewState(v);
    if (onAnSubViewChange) onAnSubViewChange(v);
  };

  // State for Inventory Process
  const [selectedClient, setSelectedClient] = useState<string>("Acme Logistics S.A.");
  const [selectedTemplate, setSelectedTemplate] = useState<InventoryTemplate>(INITIAL_TEMPLATES[0]);
  const [captureMode, setCaptureMode] = useState<"texto" | "audio" | "foto" | "video">("foto");
  const [capturedCode, setCapturedCode] = useState<string>("EXT-005");
  const [capturedName, setCapturedName] = useState<string>("Extintor CO2 5kg");
  const [itemStatus, setItemStatus] = useState<"Activo" | "En Mantenimiento" | "Inactivo" | "Baja">("Activo");
  const [itemCondition, setItemCondition] = useState<"Buena" | "Requiere Revisión" | "Crítica">("Buena");
  const [itemLocation, setItemLocation] = useState<string>("Sucursal Norte / Piso 1 / Pasillo C");
  const [itemNotes, setItemNotes] = useState<string>("");
  const [itemsList, setItemsList] = useState<InventoryItem[]>(INITIAL_ITEMS);

  const handleSaveItem = () => {
    const newItem: InventoryItem = {
      id: `inv-${Date.now().toString().slice(-3)}`,
      code: capturedCode || "ITEM-NEW",
      name: capturedName || "Elemento Registrado",
      category: selectedTemplate.category,
      clientName: selectedClient,
      status: itemStatus,
      condition: itemCondition,
      location: itemLocation,
      lastUpdated: "Justo ahora",
      evidenceCount: 1,
      evidenceType: captureMode,
      notes: itemNotes || "Registro capturado correctamente."
    };
    setItemsList([newItem, ...itemsList]);
    setOpSubView("resumen");
  };

  return (
    <div className="w-full flex-1 flex flex-col font-sans transition-colors bg-white dark:bg-[#2C2D31] text-[#212121] dark:text-[#ECECEC]">
      {/* Top Header Navigation for Inventarios Module */}
      <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-[#374151] transition-colors bg-white dark:bg-[#2C2D31] shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: ORANGE }}>
            <ClipboardList className="w-5 h-5" />
          </div>
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span className="hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer">Home</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-none" />
            <span className="text-gray-600 dark:text-gray-300 font-bold">Inventarios</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-none" />
            <span className="text-[#FF3F1A] dark:text-orange-400 font-extrabold">
              {role === "operador" ? `Operador / ${opSubView.toUpperCase()}` : `Analista / ${anSubView.toUpperCase()}`}
            </span>
          </nav>
        </div>

        {/* Role Toggle Switcher & Dark Mode Button */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center rounded-full p-1 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 transition-colors">
            <button
              onClick={() => setRole("operador")}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                role === "operador"
                  ? "text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              style={role === "operador" ? { backgroundColor: ORANGE } : undefined}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Rol Operador (Captura)</span>
            </button>
            <button
              onClick={() => setRole("analista")}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                role === "analista"
                  ? "text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              style={role === "analista" ? { backgroundColor: NAVY } : undefined}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Rol Analista (Control)</span>
            </button>
          </div>

          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="relative flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-gray-500 transition-colors hover:bg-slate-100 hover:text-gray-700 dark:border-[#374151] dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white shadow-sm hover:scale-105 active:scale-95 cursor-pointer"
              title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-amber-400 fill-amber-400/20 transition-transform duration-300 transform rotate-0 hover:rotate-45" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300 transition-transform duration-300 transform rotate-0 hover:-rotate-12" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Sub-Navigation Bar per Role */}
      <div className="px-6 py-2 flex items-center justify-between text-xs border-b border-slate-200 dark:border-[#374151] transition-colors bg-white dark:bg-[#2C2D31]">
        {role === "operador" ? (
          <div className="flex items-center space-x-2">
            <span className="font-semibold mr-2 text-gray-400 dark:text-slate-400">Pasos Operador:</span>
            {[
              { id: "inicio", label: "1. Cliente y Plantilla" },
              { id: "captura", label: "2. Captura Multimodal" },
              { id: "registro", label: "3. Estado y Evidencia" },
              { id: "resumen", label: "4. Resumen y Alertas" },
            ].map(step => (
              <button
                key={step.id}
                onClick={() => setOpSubView(step.id as OperadorSubView)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  opSubView === step.id
                    ? "bg-[#FF3F1A] text-white shadow-sm"
                    : isDarkMode ? "text-slate-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className={`font-semibold mr-2 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>Vistas Analista:</span>
            {[
              { id: "dashboard", label: "Dashboard Inventarios", icon: Layers },
              { id: "historial", label: "Stock & Historial", icon: History },
              { id: "exportacion", label: "Alertas & Exportación", icon: FileSpreadsheet },
              { id: "directorio", label: "Directorio & Plantillas", icon: Building2 },
            ].map(step => {
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => setAnSubView(step.id as AnalistaSubView)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    anSubView === step.id
                      ? "bg-[#FF3F1A] text-white shadow-sm"
                      : isDarkMode ? "text-slate-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Body with Necto Card Aesthetics & Expanded Layout */}
      <div className="flex-1 p-6 max-w-[1440px] w-full mx-auto space-y-6">
        {role === "operador" ? (
          <OperadorViews
            opSubView={opSubView}
            setOpSubView={setOpSubView}
            selectedClient={selectedClient}
            setSelectedClient={setSelectedClient}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            captureMode={captureMode}
            setCaptureMode={setCaptureMode}
            capturedCode={capturedCode}
            setCapturedCode={setCapturedCode}
            capturedName={capturedName}
            setCapturedName={setCapturedName}
            itemStatus={itemStatus}
            setItemStatus={setItemStatus}
            itemCondition={itemCondition}
            setItemCondition={setItemCondition}
            itemLocation={itemLocation}
            setItemLocation={setItemLocation}
            itemNotes={itemNotes}
            setItemNotes={setItemNotes}
            onSaveItem={handleSaveItem}
            isDarkMode={isDarkMode}
          />
        ) : (
          <AnalistaViews
            anSubView={anSubView}
            setAnSubView={setAnSubView}
            items={itemsList}
            isDarkMode={isDarkMode}
            setRole={setRole}
            setOpSubView={setOpSubView}
          />
        )}
      </div>
    </div>
  );
}

/* ── Operador Views Component ────────────────────────────────────────────── */

function OperadorViews({
  opSubView, setOpSubView,
  selectedClient, setSelectedClient,
  selectedTemplate, setSelectedTemplate,
  captureMode, setCaptureMode,
  capturedCode, setCapturedCode,
  capturedName, setCapturedName,
  itemStatus, setItemStatus,
  itemCondition, setItemCondition,
  itemLocation, setItemLocation,
  itemNotes, setItemNotes,
  onSaveItem,
  isDarkMode
}: any) {
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [audioTimer, setAudioTimer] = useState(14);
  const [hasAudioSample, setHasAudioSample] = useState(true);
  const [audioTranscript, setAudioTranscript] = useState(
    "Ingresaron 50 kg de carne picada especial y 350 cajas térmicas de empanadas de Frigorífico del Plata. Lote verificado, cadena de frío a 3°C."
  );
  const [photosList, setPhotosList] = useState<string[]>([
    "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80"
  ]);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isScanningOCR, setIsScanningOCR] = useState(false);
  const [videoPlayState, setVideoPlayState] = useState(false);

  const quickTags = selectedTemplate.category === "Gastronomía" ? [
    "Lote de proveedor verificado",
    "Cadena de frío óptima (< 4°C)",
    "Punto de reorden alcanzado",
    "Vencimiento próximo (< 48h)",
    "Embalaje hermético e intacto",
    "Stock suficiente para el turno"
  ] : [
    "Manómetro en rango normal",
    "Sin precinto de seguridad",
    "Falta señalética de altura",
    "Corrosión visible en base",
    "Próximo a vencimiento",
    "Recarga técnica vigente"
  ];

  return (
    <div className="space-y-6 w-full animate-view-transition">
      {/* ── Paso 1: Cliente y Plantilla ────────────────────────────────────────── */}
      {opSubView === "inicio" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          {/* Card Left: Directorio de Empresas / Sucursales */}
          <div className="lg:col-span-5 bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-gray-900 dark:text-gray-100 rounded-2xl p-6 space-y-5 transition-all shadow-sm flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-gray-800 border border-orange-200 dark:border-[#374151] flex items-center justify-center text-[#FF3F1A] dark:text-[#97D6DF] font-bold shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF3F1A]">Paso 1 de 4</span>
                  <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-[#97D6DF]">Directorio de Sucursales & Empresas</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Seleccioná la sede para la toma de inventario:</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { name: "Empanadas Necto (Sucursal Centro)", sector: "Gastronomía & Restaurante", items: "18 insumos / equipos", isSynced: true },
                  { name: "Empanadas Necto (Sucursal Norte)", sector: "Gastronomía & Delivery", items: "14 insumos / equipos", isSynced: true },
                  { name: "Acme Logistics S.A.", sector: "Depósitos & Logística (SST)", items: "12 elementos", isSynced: false },
                  { name: "Tech Solutions SRL", sector: "Oficinas & TI (Retail / Hardware)", items: "8 elementos", isSynced: false }
                ].map(client => (
                  <button
                    key={client.name}
                    onClick={() => setSelectedClient(client.name)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      selectedClient === client.name
                        ? "bg-orange-50/70 dark:bg-gray-800 border-[#FF3F1A] text-gray-900 dark:text-white font-bold shadow-xs"
                        : "bg-slate-50/60 dark:bg-gray-800/60 border-slate-200 dark:border-[#374151] text-gray-700 dark:text-gray-300 hover:border-slate-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate block">{client.name}</span>
                        {client.isSynced && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Sync Pedidos
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 block">{client.sector} • {client.items}</span>
                    </div>
                    {selectedClient === client.name && (
                      <div className="w-6 h-6 rounded-full bg-[#FF3F1A] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card Right: Selección de Plantilla */}
          <div className="lg:col-span-7 bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-gray-900 dark:text-gray-100 rounded-2xl p-6 space-y-6 flex flex-col justify-between transition-all shadow-sm">
            <div className="space-y-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-gray-800 border border-orange-200 dark:border-[#374151] flex items-center justify-center text-[#FF3F1A] dark:text-[#97D6DF] font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF3F1A]">Paso 1.2 de 4</span>
                  <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-[#97D6DF]">Plantilla de Inspección</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Estructura técnica para <strong className="text-gray-800 dark:text-gray-200">{selectedClient}</strong>:</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INITIAL_TEMPLATES.map(tpl => (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                      selectedTemplate.id === tpl.id
                        ? "bg-orange-50/60 dark:bg-gray-800 border-[#FF3F1A] text-gray-900 dark:text-white shadow-xs font-bold"
                        : "bg-slate-50/60 dark:bg-gray-800/60 border-slate-200 dark:border-[#374151] hover:border-slate-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1.5 gap-2">
                        <h3 className="font-bold text-xs text-gray-900 dark:text-[#97D6DF]">{tpl.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold bg-orange-50 text-[#FF3F1A] dark:bg-gray-800 dark:text-orange-400 border border-orange-200 dark:border-gray-700 shrink-0">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{tpl.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100 dark:border-[#374151]/60">
                      {tpl.fields.map(f => (
                        <span key={f} className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-[#374151]">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setOpSubView("captura")}
              className="mt-4 w-full py-3.5 bg-[#FF3F1A] hover:bg-[#e03413] text-white font-bold rounded-xl text-xs shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <span>Continuar a Captura Multimodal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 2: Captura Multimodal ────────────────────────────────────────── */}
      {opSubView === "captura" && (
        <div className="space-y-6 w-full animate-view-transition">
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-gray-800 border border-orange-200 dark:border-[#374151] flex items-center justify-center text-[#FF3F1A] dark:text-[#97D6DF] font-bold shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF3F1A]">Paso 2 de 4 • Captura Multimodal</span>
                <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-[#97D6DF]">Captura de Evidencia de Campo</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Herramientas interactivas de fotografía, notas de voz IA y registro técnico
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-3 py-1 rounded-lg font-bold border border-blue-200 dark:border-blue-800">
                {selectedClient}
              </span>
              <span className="text-xs bg-slate-100 text-slate-800 dark:bg-gray-800 dark:text-gray-200 px-3 py-1 rounded-lg font-bold border border-slate-200 dark:border-[#374151]">
                {selectedTemplate.name}
              </span>
            </div>
          </div>

          {/* 2-Column Main Workspace (7 cols / 5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
            {/* Left Column: Herramienta de Captura Especializada (7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-gray-900 dark:text-gray-100 rounded-2xl p-6 space-y-5 transition-all shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                {/* Segmented Mode Selector */}
                <div className="flex items-center p-1 bg-slate-100 dark:bg-gray-800/80 border border-slate-200 dark:border-[#374151] rounded-xl gap-1">
                  {[
                    { id: "foto", label: "Cámara / Foto", icon: Camera },
                    { id: "audio", label: "Voz / Audio IA", icon: Mic },
                    { id: "texto", label: "Notas / OCR", icon: FileText },
                    { id: "video", label: "Video Corto", icon: Video },
                  ].map(mode => {
                    const Icon = mode.icon;
                    const active = captureMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setCaptureMode(mode.id as any)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                          active
                            ? "bg-[#FF3F1A] text-white shadow-xs"
                            : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{mode.label}</span>
                        <span className="sm:hidden">{mode.label.split("/")[0]}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Specialized Tool 1: CÁMARA / FOTO INTERACTIVA */}
                {captureMode === "foto" && (
                  <div className="space-y-4">
                    {/* Viewfinder Frame */}
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex flex-col items-center justify-center min-h-[260px]">
                      {/* Active Viewfinder Image */}
                      <SafeImage
                        src={photosList[activePhotoIdx] || "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?auto=format&fit=crop&w=600&q=80"}
                        alt="Visor de Cámara"
                        className="w-full h-64 object-cover opacity-90"
                      />

                      {/* Viewfinder HUD Overlays */}
                      <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                        {/* Top HUD */}
                        <div className="flex items-center justify-between">
                          <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2.5 py-1 rounded-md border border-white/20 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            CÁMARA HD • 1080P
                          </span>
                          <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2.5 py-1 rounded-md border border-white/20">
                            AUTO-ENFOQUE
                          </span>
                        </div>

                        {/* Center Reticle / Crosshair */}
                        <div className="w-28 h-28 border-2 border-dashed border-white/40 rounded-xl mx-auto flex items-center justify-center pointer-events-none">
                          <Plus className="w-5 h-5 text-white/50" />
                        </div>

                        {/* Bottom Shutter Controls */}
                        <div className="flex items-center justify-between pointer-events-auto bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 -m-4 pt-4">
                          <span className="text-[11px] font-bold text-white/80">
                            {photosList.length} capturas guardadas
                          </span>

                          <button
                            onClick={() => {
                              const newPhotos = [
                                ...photosList,
                                "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=600&q=80"
                              ];
                              setPhotosList(newPhotos);
                              setActivePhotoIdx(newPhotos.length - 1);
                            }}
                            title="Capturar Foto"
                            className="w-12 h-12 rounded-full border-4 border-white bg-[#FF3F1A] hover:bg-[#e03413] hover:scale-105 active:scale-95 text-white flex items-center justify-center shadow-lg transition-transform cursor-pointer"
                          >
                            <Camera className="w-5 h-5" />
                          </button>

                          <button
                            onClick={() => {
                              setActivePhotoIdx((prev) => (prev + 1) % Math.max(photosList.length, 1));
                            }}
                            className="text-[11px] font-bold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg backdrop-blur-xs cursor-pointer"
                          >
                            Cambiar toma
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Thumbnails Filmstrip */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Miniaturas de Evidencia:</span>
                        <span className="text-[11px] text-[#009966] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Geo-etiquetado activo
                        </span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {photosList.map((photo, idx) => (
                          <div
                            key={idx}
                            onClick={() => setActivePhotoIdx(idx)}
                            className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 cursor-pointer transition-all flex-none ${
                              activePhotoIdx === idx ? "border-[#FF3F1A] scale-105 shadow-xs" : "border-slate-200 dark:border-gray-700 opacity-70 hover:opacity-100"
                            }`}
                          >
                            <img src={photo} alt={`Toma ${idx + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0.5 right-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Specialized Tool 2: AUDIO & VOZ IA */}
                {captureMode === "audio" && (
                  <div className="space-y-4">
                    {/* Audio Recorder Console */}
                    <div className="bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] rounded-2xl p-5 space-y-4 text-center">
                      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-[#374151] pb-3">
                        <div className="flex items-center space-x-2">
                          <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Grabadora de Voz con Transcripción Necto IA</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          recordingAudio ? "bg-red-100 text-red-700 animate-pulse" : "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                        }`}>
                          {recordingAudio ? "Grabando en vivo..." : "Listo para grabar"}
                        </span>
                      </div>

                      {/* Animated Audio Waveform */}
                      <div className="h-16 flex items-center justify-center gap-1.5 py-2">
                        {[12, 28, 45, 20, 60, 35, 55, 75, 40, 25, 65, 30, 48, 22, 58, 32, 18, 44, 20].map((h, i) => (
                          <div
                            key={i}
                            className={`w-1.5 rounded-full transition-all duration-150 ${
                              recordingAudio ? "bg-[#FF3F1A] animate-pulse" : "bg-purple-300 dark:bg-purple-800"
                            }`}
                            style={{ height: recordingAudio ? `${Math.min(h * 1.2, 56)}px` : `${h * 0.4}px` }}
                          />
                        ))}
                      </div>

                      <div className="font-mono text-xl font-black text-gray-800 dark:text-gray-100">
                        {recordingAudio ? "00:08" : "00:14"}
                      </div>

                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => setRecordingAudio(!recordingAudio)}
                          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2 cursor-pointer ${
                            recordingAudio
                              ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                              : "bg-[#190088] hover:bg-[#150070] text-white"
                          }`}
                        >
                          {recordingAudio ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          <span>{recordingAudio ? "Detener y Procesar" : "Iniciar Grabación"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Live AI Transcription Box */}
                    <div className="space-y-1.5 text-left">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#FF3F1A]" />
                          Transcripción Automática (Necto Speech-to-Text):
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Confianza: 98%</span>
                      </div>
                      <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] rounded-xl text-xs text-gray-800 dark:text-gray-200 space-y-2">
                        <p className="italic leading-relaxed">"{audioTranscript}"</p>
                        <button
                          onClick={() => setItemNotes(audioTranscript)}
                          className="px-3 py-1 bg-white dark:bg-gray-700 text-[#190088] dark:text-[#97D6DF] border border-slate-200 dark:border-gray-600 rounded-lg text-[11px] font-bold hover:border-[#190088] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Aplicar texto a las notas del elemento</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Specialized Tool 3: NOTAS & OCR */}
                {captureMode === "texto" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800 dark:text-gray-200">Descripción Técnica & Hallazgos:</label>
                        <button
                          onClick={() => {
                            setIsScanningOCR(true);
                            setTimeout(() => {
                              setIsScanningOCR(false);
                              setCapturedName("Extintor PQS 10kg - Fabricación 2023 - Cilindro Clase ABC");
                            }, 800);
                          }}
                          className="text-[11px] font-bold text-[#190088] dark:text-[#97D6DF] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Scan className="w-3.5 h-3.5" />
                          <span>{isScanningOCR ? "Escaneando placa..." : "Escanear Placa / OCR"}</span>
                        </button>
                      </div>

                      <textarea
                        rows={4}
                        value={capturedName}
                        onChange={e => setCapturedName(e.target.value)}
                        placeholder="Ej: Extintor PQS 10kg en pared este pasillo 2. Manómetro en zona verde..."
                        className="w-full bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] rounded-xl p-3.5 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#FF3F1A] transition-colors"
                      />
                    </div>

                    {/* Quick Condition Tags */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-[#FF3F1A]" />
                        Atajos Rápidos de Estado SST (Click para añadir):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {quickTags.map((tag, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              const newNotes = itemNotes ? `${itemNotes}. ${tag}` : tag;
                              setItemNotes(newNotes);
                            }}
                            className="px-2.5 py-1 bg-slate-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-gray-700 hover:text-[#FF3F1A] text-gray-700 dark:text-gray-300 border border-slate-200 dark:border-[#374151] rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            + {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Specialized Tool 4: VIDEO CORTO */}
                {captureMode === "video" && (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[260px] flex flex-col items-center justify-center text-white">
                      <div className="w-64 h-36 bg-slate-900 rounded-xl flex flex-col items-center justify-center border border-slate-800 shadow-inner space-y-2">
                        <Play
                          onClick={() => setVideoPlayState(!videoPlayState)}
                          className="w-12 h-12 text-[#FF3F1A] fill-[#FF3F1A] hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                        />
                        <span className="text-[11px] text-gray-300 font-medium">
                          {videoPlayState ? "Reproduciendo clip de evidencia (00:06 / 00:15)" : "Click para reproducir video de inspección"}
                        </span>
                      </div>

                      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono px-2.5 py-1 rounded-md border border-white/20 flex items-center gap-1.5">
                        <Video className="w-3 h-3 text-[#FF3F1A]" />
                        CLIP DE SEGURIDAD (12s)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Back to Step 1 */}
              <div className="pt-4 border-t border-slate-100 dark:border-[#374151] flex items-center justify-between">
                <button
                  onClick={() => setOpSubView("inicio")}
                  className="text-xs text-gray-500 dark:text-gray-400 font-bold hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer"
                >
                  ← Volver a Selección de Plantilla
                </button>
              </div>
            </div>

            {/* Right Column: Contexto del Activo & Bandeja de Evidencias (5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-gray-900 dark:text-gray-100 rounded-2xl p-6 space-y-5 transition-all shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-[#374151] pb-3">
                  <QrCode className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Elemento en Inspección</h3>
                </div>

                {/* Asset ID Card */}
                <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Código de Etiqueta</span>
                    <span className="font-mono text-xs font-extrabold text-[#FF3F1A] bg-orange-50 dark:bg-gray-900 px-2 py-0.5 rounded border border-orange-200 dark:border-[#374151]">
                      {capturedCode}
                    </span>
                  </div>
                  <p className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">{capturedName}</p>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-gray-700">
                    <span>{selectedClient}</span>
                    <span>{selectedTemplate.name}</span>
                  </div>
                </div>

                {/* Evidences Acumulated Bundle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                      <Paperclip className="w-3 h-3 text-[#FF3F1A]" />
                      Evidencias Adjuntas al Registro:
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {photosList.length + (hasAudioSample ? 1 : 0)} adjuntos
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {/* Item 1: Photos */}
                    <div className="p-2.5 bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Camera className="w-3.5 h-3.5 text-[#FF3F1A]" />
                        <span className="font-bold text-gray-800 dark:text-gray-200">{photosList.length} Fotografías HD</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded">
                        Lista
                      </span>
                    </div>

                    {/* Item 2: Audio */}
                    <div className="p-2.5 bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <Mic className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span className="font-bold text-gray-800 dark:text-gray-200">Audio IA (14s)</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded">
                        Transcribiendo
                      </span>
                    </div>

                    {/* Item 3: Notes if any */}
                    {itemNotes && (
                      <div className="p-2.5 bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 truncate pr-2">
                          <FileText className="w-3.5 h-3.5 text-[#190088] dark:text-[#97D6DF] shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300 truncate">"{itemNotes}"</span>
                        </div>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 rounded shrink-0">
                          Notas
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Forward Navigation Action */}
              <div className="pt-4 border-t border-slate-100 dark:border-[#374151]">
                <button
                  onClick={() => setOpSubView("registro")}
                  className="w-full py-3 bg-[#FF3F1A] hover:bg-[#e03413] text-white font-bold rounded-xl text-xs shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <span>Continuar a Estado & Evidencia</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Paso 3: Estado y Evidencia ────────────────────────────────────────── */}
      {opSubView === "registro" && (
        <div className="bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-gray-900 dark:text-gray-100 rounded-2xl p-6 sm:p-7 space-y-6 shadow-sm transition-all w-full">
          <div className="border-b border-slate-100 dark:border-[#374151] pb-4">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF3F1A]">Paso 3 de 4</span>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-[#97D6DF]">Evaluación de Estado, Condición y Ubicación</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Asigná el diagnóstico técnico y la ubicación físico-espacial del elemento:</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            {/* Column 1: Código, Nombre y Ubicación */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200">Código de Inventario / Etiqueta:</label>
                <input
                  type="text"
                  value={capturedCode}
                  onChange={e => setCapturedCode(e.target.value)}
                  className="w-full bg-slate-50/80 dark:bg-gray-800/80 border border-slate-200 dark:border-[#374151] rounded-xl px-4 py-2.5 text-xs text-[#FF3F1A] font-mono font-extrabold focus:outline-none focus:border-[#FF3F1A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200">Nombre / Identificación del Elemento:</label>
                <input
                  type="text"
                  value={capturedName}
                  onChange={e => setCapturedName(e.target.value)}
                  className="w-full bg-slate-50/80 dark:bg-gray-800/80 border border-slate-200 dark:border-[#374151] rounded-xl px-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 font-bold focus:outline-none focus:border-[#FF3F1A]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200">Ubicación Físico-Espacial (Sucursal / Piso / Sector):</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={itemLocation}
                    onChange={e => setItemLocation(e.target.value)}
                    className="w-full bg-slate-50/80 dark:bg-gray-800/80 border border-slate-200 dark:border-[#374151] rounded-xl pl-10 pr-4 py-2.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#FF3F1A]"
                  />
                </div>
              </div>
            </div>

            {/* Column 2: Condición y Observaciones */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200">Condición Diagnostica SST:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Buena", color: "bg-[#F0FDF4] text-[#166534] border-[#B9F8CF] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700" },
                    { label: "Requiere Revisión", color: "bg-[#EFF6FF] text-[#1447E6] border-[#BEDBFF] dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700" },
                    { label: "Crítica", color: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] dark:bg-red-950/60 dark:text-red-300 dark:border-red-700" },
                  ].map(cond => (
                    <button
                      key={cond.label}
                      onClick={() => setItemCondition(cond.label as any)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center space-y-1 cursor-pointer ${
                        itemCondition === cond.label
                          ? `${cond.color} border-2 shadow-xs`
                          : "bg-slate-50/80 dark:bg-gray-800/80 border-slate-200 dark:border-[#374151] text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      <span>{cond.label}</span>
                      {itemCondition === cond.label && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200">Observaciones Técnicas y Notas de Campo:</label>
                <textarea
                  rows={3}
                  value={itemNotes}
                  onChange={e => setItemNotes(e.target.value)}
                  placeholder="Ej: Manómetro con baja presión. Se sugiere recarga inmediata antes del próximo vencimiento..."
                  className="w-full bg-slate-50/80 dark:bg-gray-800/80 border border-slate-200 dark:border-[#374151] rounded-xl p-3 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#FF3F1A]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-[#374151]">
            <button onClick={() => setOpSubView("captura")} className="text-xs text-gray-500 dark:text-gray-400 font-bold hover:text-gray-800 dark:hover:text-gray-200 cursor-pointer">
              ← Volver a Captura Multimodal
            </button>
            <button
              onClick={onSaveItem}
              className="px-6 py-2.5 bg-[#FF3F1A] hover:bg-[#e03413] text-white font-bold rounded-xl text-xs shadow-sm flex items-center space-x-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Guardar Registro SST</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Paso 4: Resumen y Alertas ────────────────────────────────────────── */}
      {opSubView === "resumen" && (
        <div className="space-y-6 w-full animate-view-transition">
          {/* Standard Left-Aligned Section Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF3F1A]">Paso 4 de 4 • Sincronización Exitosa</span>
                <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-[#97D6DF]">Resumen del Registro & Alertas SST</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Ficha técnica consolidada y sincronizada para <strong>{selectedClient}</strong>
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full text-xs font-bold">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Guardado en Directorio
            </span>
          </div>

          {/* 2-Column Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
            {/* Column Left: Ficha Técnica y Trazabilidad (7 Cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-gray-900 dark:text-gray-100 rounded-2xl p-6 space-y-5 transition-all shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#374151] pb-3">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-[#FF3F1A]" />
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Ficha Técnica del Elemento</h3>
                  </div>
                  <span className="font-mono text-xs font-extrabold text-[#FF3F1A] bg-orange-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-[#374151]">
                    {capturedCode}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Nombre / Modelo</span>
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{capturedName}</p>
                  </div>

                  <div className="p-3 bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Empresa Cliente</span>
                    <p className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{selectedClient}</p>
                  </div>

                  <div className="p-3 bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Plantilla Asignada</span>
                    <p className="font-bold text-gray-700 dark:text-gray-300 truncate">{selectedTemplate.name}</p>
                  </div>

                  <div className="p-3 bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Ubicación en Planta</span>
                    <p className="font-bold text-gray-700 dark:text-gray-300 truncate">{itemLocation}</p>
                  </div>
                </div>

                {itemNotes ? (
                  <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] rounded-xl space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Notas / Hallazgos del Operador:</span>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed italic">"{itemNotes}"</p>
                  </div>
                ) : null}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#374151] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  Sincronizado: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="font-mono text-[11px] text-gray-400">ID: INV-{Math.floor(1000 + Math.random() * 9000)}</span>
              </div>
            </div>

            {/* Column Right: Diagnóstico SST y Alertas (5 Cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-gray-900 dark:text-gray-100 rounded-2xl p-6 space-y-5 transition-all shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-[#374151] pb-3">
                  <ShieldCheck className="w-4 h-4 text-[#190088] dark:text-[#97D6DF]" />
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Diagnóstico de Seguridad SST</h3>
                </div>

                {/* State Card */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Condición Operativa Evaluada:</span>
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    itemCondition === "Crítica"
                      ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] dark:bg-red-950/60 dark:text-red-300 dark:border-red-800"
                      : itemCondition === "Requiere Revisión"
                      ? "bg-[#EFF6FF] text-[#1447E6] border-[#BEDBFF] dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                      : "bg-[#F0FDF4] text-[#166534] border-[#B9F8CF] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                  }`}>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest block opacity-75">Estado SST</span>
                      <h4 className="text-base font-extrabold">{itemCondition}</h4>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-white/80 dark:bg-black/30 rounded-lg shadow-xs">
                      {itemStatus}
                    </span>
                  </div>
                </div>

                {/* Alert Notification if not Buena */}
                {itemCondition === "Crítica" ? (
                  <div className="p-3.5 bg-red-50/90 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl flex items-start space-x-3 text-left">
                    <div className="w-7 h-7 rounded-lg bg-[#FF3F1A] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-red-900 dark:text-red-200">Alerta Crítica Emitida</h5>
                      <p className="text-[11px] text-red-700 dark:text-red-300 mt-0.5 leading-tight">
                        Disparó un aviso prioritario automático en la consola del Analista.
                      </p>
                    </div>
                  </div>
                ) : itemCondition === "Requiere Revisión" ? (
                  <div className="p-3.5 bg-blue-50/90 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start space-x-3 text-left">
                    <div className="w-7 h-7 rounded-lg bg-[#1447E6] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-blue-900 dark:text-blue-200">Revisión Programada</h5>
                      <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5 leading-tight">
                        Se agendó inspección técnica preventiva en el plan de mantenimiento.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-emerald-50/90 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start space-x-3 text-left">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Conforme a Norma SST</h5>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5 leading-tight">
                        El elemento cumple los requisitos de seguridad y operatividad.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions Footer inside Column Right */}
              <div className="pt-4 border-t border-slate-100 dark:border-[#374151] flex flex-wrap gap-2.5">
                <button
                  onClick={() => setOpSubView("captura")}
                  className="flex-1 px-4 py-2.5 bg-[#FF3F1A] hover:bg-[#e03413] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Siguiente</span>
                </button>
                <button
                  onClick={() => setOpSubView("inicio")}
                  className="px-4 py-2.5 bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-slate-200 dark:border-[#374151] rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Finalizar Flujo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Analista Views Component ────────────────────────────────────────────── */

function AnalistaViews({
  anSubView,
  setAnSubView,
  items,
  isDarkMode,
  setRole,
  setOpSubView,
}: {
  anSubView: AnalistaSubView;
  setAnSubView: any;
  items: InventoryItem[];
  isDarkMode?: boolean;
  setRole?: (r: InventariosRole) => void;
  setOpSubView?: (v: OperadorSubView) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCondition, setSelectedCondition] = useState<string>("Todas");
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("Todos");
  const [inspectedItem, setInspectedItem] = useState<InventoryItem | null>(null);

  // Template & Directorio State
  const [tplSearch, setTplSearch] = useState("");
  const [selectedCategoryTpl, setSelectedCategoryTpl] = useState("Todas");
  const [directorioSubTab, setDirectorioSubTab] = useState<"plantillas" | "clientes">("plantillas");
  const [previewTemplate, setPreviewTemplate] = useState<InventoryTemplate | null>(null);
  const [assignmentSuccessModal, setAssignmentSuccessModal] = useState<string | null>(null);

  // Export State
  const [exportClient, setExportClient] = useState("Todos los clientes");
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf" | "csv">("excel");
  const [exportSuccess, setExportSuccess] = useState(false);

  // Historial & Ubicación Filter State
  const [selectedLocHist, setSelectedLocHist] = useState<string>("Todas");
  const [selectedEvidenceType, setSelectedEvidenceType] = useState<string>("Todas");
  const [selectedHistCondition, setSelectedHistCondition] = useState<string>("Todas");
  const [histQuery, setHistQuery] = useState("");

  const alertsCount = items.filter(i => i.condition === "Crítica" || i.condition === "Requiere Revisión").length;

  const filteredItems = items.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          i.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          i.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCondition = selectedCondition === "Todas" || i.condition === selectedCondition;
    const matchesClient = selectedClientFilter === "Todos" || i.clientName === selectedClientFilter;
    return matchesSearch && matchesCondition && matchesClient;
  });

  const handleExport = (format: "excel" | "pdf" | "csv") => {
    setExportFormat(format);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 w-full animate-view-transition">
      {/* ── 1. Dashboard & KPIs ────────────────────────────────────────────── */}
      {anSubView === "dashboard" && (
        <div className="space-y-6 w-full">
          {/* Executive Hero Banner with Direct Quick Navigation Links */}
          <div className="bg-gradient-to-r from-[#212121] via-[#252629] to-[#2C2D31] border border-slate-200 dark:border-[#374151] text-white rounded-2xl p-6 sm:p-7 shadow-sm relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/10 text-orange-400 px-3 py-1 rounded-full border border-white/10">
                  Consola Ejecutiva SST
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-slate-300 font-medium">Monitoreo en Vivo</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Dashboard General de Inventarios & Alertas</h2>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Supervisá en tiempo real el estado de extintores, EPPs, herramientas e insumos de empresas clientes:
              </p>
            </div>

            {/* Quick Access Action Bar to other subviews */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 relative z-10">
              <button
                onClick={() => setAnSubView("directorio")}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
                title="Ir al Directorio de Empresas y Plantillas"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Directorio</span>
              </button>

              <button
                onClick={() => setAnSubView("historial")}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
                title="Ir al Historial de Trazabilidad y Ubicación"
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span>Historial</span>
              </button>

              <button
                onClick={() => setAnSubView("exportacion")}
                className="px-4 py-2 bg-[#FF3F1A] hover:bg-[#e03413] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                title="Generar y Exportar Reportes HD"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span>Alertas & Exportar</span>
              </button>

              {setRole && (
                <button
                  onClick={() => {
                    setRole("operador");
                    if (setOpSubView) setOpSubView("inicio");
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Cambiar a Modo Operador y Registrar Nuevo Item"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ Nueva Captura</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Executive KPI Cards Grid (Direct Click to Navigate) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
            {/* Card 1: Total Items -> Navigates to Historial */}
            <div
              onClick={() => setAnSubView("historial")}
              className={`border-2 border-t-4 border-t-[#FF3F1A] rounded-2xl p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer group ${
                isDarkMode ? "bg-[#2C2D31] border-[#374151] text-gray-100" : "bg-white border-slate-200 text-gray-900"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Total Items Fichados</p>
                  <h3 className="text-3xl font-black mt-1.5 text-[#190088] dark:text-[#97D6DF] group-hover:text-[#FF3F1A] transition-colors">{items.length}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 flex items-center justify-center text-[#FF3F1A] shadow-xs group-hover:scale-110 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#374151]/80 flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span>↑ +12.5%</span>
                  <span className="text-gray-400 font-normal">vs mes anterior</span>
                </span>
                <span className="text-[11px] text-[#FF3F1A] font-bold group-hover:underline flex items-center gap-0.5">
                  Ver Historial <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Card 2: Alertas Críticas -> Navigates to Exportacion / Alertas */}
            <div
              onClick={() => setAnSubView("exportacion")}
              className={`border-2 border-t-4 border-t-red-500 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer group ${
                isDarkMode ? "bg-[#2C2D31] border-[#374151] text-gray-100" : "bg-white border-slate-200 text-gray-900"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Alertas Críticas</p>
                  <h3 className="text-3xl font-black text-red-600 dark:text-red-400 mt-1.5">{alertsCount}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 shadow-xs group-hover:scale-110 transition-transform">
                  <ShieldAlert className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#374151]/80 flex items-center justify-between text-xs font-bold">
                <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Atención inmediata</span>
                </span>
                <span className="text-[11px] text-red-600 font-bold group-hover:underline flex items-center gap-0.5">
                  Auditar <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Card 3: Directorio Clientes -> Navigates to Directorio */}
            <div
              onClick={() => setAnSubView("directorio")}
              className={`border-2 border-t-4 border-t-blue-500 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer group ${
                isDarkMode ? "bg-[#2C2D31] border-[#374151] text-gray-100" : "bg-white border-slate-200 text-gray-900"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Directorio Clientes</p>
                  <h3 className="text-3xl font-black mt-1.5 text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">4</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-xs group-hover:scale-110 transition-transform">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#374151]/80 flex items-center justify-between text-xs font-bold">
                <span className="text-blue-600 dark:text-blue-400">100% plantillas activas</span>
                <span className="text-[11px] text-blue-600 font-bold group-hover:underline flex items-center gap-0.5">
                  Explorar <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Card 4: Evidencias Multimodales -> Navigates to Historial */}
            <div
              onClick={() => setAnSubView("historial")}
              className={`border-2 border-t-4 border-t-emerald-500 rounded-2xl p-5 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] cursor-pointer group ${
                isDarkMode ? "bg-[#2C2D31] border-[#374151] text-gray-100" : "bg-white border-slate-200 text-gray-900"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Evidencias Multimodales</p>
                  <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">12</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#374151]/80 flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-600 dark:text-emerald-400">Archivos adjuntos HD</span>
                <span className="text-[11px] text-emerald-600 font-bold group-hover:underline flex items-center gap-0.5">
                  Ver Galería <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* Executive Visual Charts Grid 1: Weekly Inspections Area & Maintenance Compliance Radial */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
            {/* Weekly Inspection Activity Area Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#FF3F1A]" />
                    Evolución de Inspecciones & Hallazgos
                  </h4>
                  <p className="text-xs text-gray-400">Total de elementos auditados vs. alertas detectadas por semana</p>
                </div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  +18.4% actividad
                </span>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { label: "Lun", inspecciones: 24, alertas: 2 },
                      { label: "Mar", inspecciones: 38, alertas: 3 },
                      { label: "Mié", inspecciones: 45, alertas: 5 },
                      { label: "Jue", inspecciones: 52, alertas: 4 },
                      { label: "Vie", inspecciones: 68, alertas: 7 },
                      { label: "Sáb", inspecciones: 42, alertas: 2 },
                      { label: "Dom", inspecciones: 15, alertas: 1 },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorInspecciones" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#190088" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#190088" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorAlertas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF3F1A" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#FF3F1A" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xl text-xs space-y-1">
                            <p className="font-extrabold text-gray-900 dark:text-gray-100">{label}</p>
                            {payload.map((entry: any, index: number) => (
                              <p key={index} className="font-semibold" style={{ color: entry.color }}>
                                {entry.name}: <strong>{entry.value}</strong>
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Area type="monotone" dataKey="inspecciones" name="Inspecciones" stroke="#190088" strokeWidth={3} fillOpacity={1} fill="url(#colorInspecciones)" />
                    <Area type="monotone" dataKey="alertas" name="Alertas Críticas" stroke="#FF3F1A" strokeWidth={2} fillOpacity={1} fill="url(#colorAlertas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Maintenance Compliance Radial Gauge */}
            <div className="bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                  Cumplimiento Preventivo SST
                </h4>
                <p className="text-xs text-gray-400">Meta de auditorías programadas del mes</p>
              </div>

              <div className="relative h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="50%"
                    innerRadius="75%"
                    outerRadius="100%"
                    barSize={16}
                    data={[{ name: "Cumplimiento", value: 91.8, fill: "#FF3F1A" }]}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar background={{ fill: isDarkMode ? "#374151" : "#f1f5f9" }} dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center -mt-2">
                  <span className="text-3xl font-black font-mono text-gray-900 dark:text-gray-100">
                    91.8%
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full mt-1">
                    +6.8% sobre meta
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-slate-100 dark:border-gray-800 text-xs">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Meta</p>
                  <p className="font-extrabold text-gray-800 dark:text-gray-200 mt-0.5">85%</p>
                </div>
                <div className="border-x border-slate-100 dark:border-gray-800">
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Real Mes</p>
                  <p className="font-extrabold text-emerald-600 mt-0.5">91.8%</p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-bold">Pendientes</p>
                  <p className="font-extrabold text-amber-600 mt-0.5">8</p>
                </div>
              </div>
            </div>
          </div>

          {/* Executive Visual Charts Grid 2: Stacked Category Distribution & Global Health Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            {/* Stacked Category Condition Bar Chart */}
            <div className="bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#FF3F1A]" />
                    Distribución de Activos por Categoría
                  </h4>
                  <p className="text-xs text-gray-400">Desglose de salud operativa según tipo de elemento</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Buena</span>
                  <span className="flex items-center gap-1 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-500" /> Revisión</span>
                  <span className="flex items-center gap-1 text-red-600"><span className="w-2 h-2 rounded-full bg-red-500" /> Crítica</span>
                </div>
              </div>

              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { category: "SST & Emergencias", buena: 42, revision: 8, critica: 4 },
                      { category: "Equipos Operativos", buena: 28, revision: 12, critica: 2 },
                      { category: "Almacén & Insumos", buena: 65, revision: 5, critica: 1 },
                      { category: "Tecnología", buena: 35, revision: 3, critica: 0 },
                    ]}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis dataKey="category" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xl text-xs space-y-1">
                            <p className="font-extrabold text-gray-900 dark:text-gray-100">{label}</p>
                            {payload.map((entry: any, index: number) => (
                              <p key={index} className="font-semibold" style={{ color: entry.color }}>
                                {entry.name}: <strong>{entry.value}</strong> items
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Bar dataKey="buena" name="Buena" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="revision" name="Requiere Revisión" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="critica" name="Crítica" stackId="a" fill="#FF3F1A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Global Condition Donut Chart */}
            <div className="bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-[#190088] dark:text-blue-400" />
                    Semáforo de Condición General de Activos
                  </h4>
                  <p className="text-xs text-gray-400">Estado de integridad técnica de la totalidad del parque</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                <div className="h-44 w-44 flex-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Buena Condición", value: 74, color: "#10b981" },
                          { name: "Requiere Revisión", value: 19, color: "#3b82f6" },
                          { name: "Condición Crítica", value: 7, color: "#FF3F1A" },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {[
                          { color: "#10b981" },
                          { color: "#3b82f6" },
                          { color: "#FF3F1A" },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 flex-1 w-full text-xs">
                  {[
                    { name: "Buena Condición", value: "74%", count: "170 items", color: "#10b981" },
                    { name: "Requiere Revisión", value: "19%", count: "44 items", color: "#3b82f6" },
                    { name: "Condición Crítica", value: "7%", count: "16 items", color: "#FF3F1A" },
                  ].map(c => (
                    <div
                      key={c.name}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-gray-800/80 border border-slate-100 dark:border-gray-700/60"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="font-bold text-gray-800 dark:text-gray-200">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[11px] text-gray-400 font-bold">{c.count}</span>
                        <span className="font-black text-gray-900 dark:text-gray-100">{c.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Contextual Actions Row mirroring ResumenDashboardView quality */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            {/* Action 1: Alertas y Control de Vencimientos */}
            <button
              onClick={() => setAnSubView("exportacion")}
              className="p-4 rounded-2xl bg-red-50/70 hover:bg-red-100/80 dark:bg-red-950/40 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800/80 text-left flex items-center justify-between transition-all cursor-pointer group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-red-900 dark:text-red-200 group-hover:text-red-700 transition-colors">
                    Auditar Alertas Críticas & Vencimientos ({alertsCount} pendientes)
                  </h4>
                  <p className="text-[11px] text-red-700/80 dark:text-red-300/80">
                    Inspeccionar hornos con oscilación y materias primas en punto de reorden
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-red-600 dark:text-red-400 group-hover:translate-x-1 transition-transform flex-none" />
            </button>

            {/* Action 2: Historial y Trazabilidad */}
            <button
              onClick={() => setAnSubView("historial")}
              className="p-4 rounded-2xl bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 text-left flex items-center justify-between transition-all cursor-pointer group shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-[#190088] dark:text-indigo-400 flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-indigo-900 dark:text-indigo-200 group-hover:text-[#190088] transition-colors">
                    Ver Historial & Trazabilidad por Ubicación
                  </h4>
                  <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                    Consultar fichas en cámaras frigoríficas, almacén seco y mostrador
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#190088] dark:text-indigo-400 group-hover:translate-x-1 transition-transform flex-none" />
            </button>
          </div>

          {/* Main Table Card */}
          <div className="bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-gray-900 dark:text-gray-100 rounded-2xl p-6 space-y-6 shadow-sm transition-all w-full">
            {/* Header & Segmented Condition Filter Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#374151] pb-4">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-gray-100">Control de Registros & Trazabilidad SST</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Filtrá e inspeccioná fichas de campo en tiempo real:</p>
              </div>

              {/* Segmented Condition Tabs */}
              <div className="flex flex-wrap items-center bg-slate-100 dark:bg-gray-800/80 p-1 rounded-xl border border-slate-200 dark:border-[#374151] gap-1">
                {[
                  { id: "Todas", label: `Todos (${items.length})` },
                  { id: "Crítica", label: `Críticos (${items.filter(i => i.condition === "Crítica").length})` },
                  { id: "Requiere Revisión", label: `Revisión (${items.filter(i => i.condition === "Requiere Revisión").length})` },
                  { id: "Buena", label: `Buenas (${items.filter(i => i.condition === "Buena").length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedCondition(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedCondition === tab.id
                        ? "bg-white dark:bg-gray-900 text-[#FF3F1A] shadow-xs"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toolbar Filter Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar por código, nombre o ubicación..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-50/80 dark:bg-gray-800/80 border border-slate-200 dark:border-[#374151] rounded-xl text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#FF3F1A] transition-colors"
                />
              </div>

              <select
                value={selectedClientFilter}
                onChange={e => setSelectedClientFilter(e.target.value)}
                className="w-full bg-slate-50/80 dark:bg-gray-800/80 border border-slate-200 dark:border-[#374151] rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#FF3F1A]"
              >
                <option value="Todos">Todos los Clientes</option>
                <option value="Acme Logistics S.A.">Acme Logistics S.A.</option>
                <option value="Construcciones del Sur">Construcciones del Sur</option>
                <option value="Tech Solutions SRL">Tech Solutions SRL</option>
              </select>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#374151] shadow-xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-800/80 border-b border-slate-200 dark:border-[#374151] text-gray-600 dark:text-gray-300">
                    <th className="py-3.5 px-4 font-bold">Código & Elemento</th>
                    <th className="py-3.5 px-4 font-bold">Empresa Cliente</th>
                    <th className="py-3.5 px-4 font-bold">Ubicación Sectorial</th>
                    <th className="py-3.5 px-4 font-bold">Evidencia Campo</th>
                    <th className="py-3.5 px-4 font-bold">Diagnóstico Condición</th>
                    <th className="py-3.5 px-4 font-bold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-gray-800/60 transition-colors group">
                      {/* Código & Elemento */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {item.evidenceUrl ? (
                            <SafeImage src={item.evidenceUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-[#374151] flex-none shadow-xs" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-[#374151] flex items-center justify-center text-[#FF3F1A] flex-none">
                              <Camera className="w-4 h-4" />
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <span className="font-mono font-extrabold text-[11px] text-[#FF3F1A] bg-orange-50 dark:bg-orange-950/60 px-2 py-0.5 rounded-lg border border-orange-200 dark:border-orange-900 inline-block">
                              {item.code}
                            </span>
                            <span className="font-bold text-gray-900 dark:text-gray-100 block text-xs truncate max-w-[180px]">{item.name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200 font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{item.clientName}</span>
                        </div>
                      </td>

                      {/* Ubicación */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#FF3F1A] shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </div>
                      </td>

                      {/* Evidencia Campo */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-slate-200 dark:border-[#374151]">
                          {item.evidenceType === "foto" && <Camera className="w-3 h-3 text-[#FF3F1A]" />}
                          {item.evidenceType === "audio" && <Mic className="w-3 h-3 text-purple-500" />}
                          {item.evidenceType === "video" && <Video className="w-3 h-3 text-indigo-500" />}
                          {item.evidenceType === "texto" && <FileText className="w-3 h-3 text-slate-500" />}
                          <span className="capitalize">{item.evidenceType || "Foto HD"}</span>
                        </span>
                      </td>

                      {/* Condición Diagnostica */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold rounded-full border ${
                            item.condition === "Crítica"
                              ? "bg-[#FEF2F2] text-[#DC2626] dark:bg-red-950/80 dark:text-red-300 border-[#FECACA] dark:border-red-800"
                              : item.condition === "Requiere Revisión"
                              ? "bg-[#EFF6FF] text-[#1447E6] dark:bg-blue-950/80 dark:text-blue-300 border-[#BEDBFF] dark:border-blue-800"
                              : "bg-[#F0FDF4] text-[#166534] dark:bg-emerald-950/80 dark:text-emerald-300 border-[#B9F8CF] dark:border-emerald-800"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.condition === "Crítica" ? "bg-[#DC2626] animate-pulse" : item.condition === "Requiere Revisión" ? "bg-[#1447E6]" : "bg-[#166534]"
                          }`} />
                          <span>{item.condition}</span>
                        </span>
                      </td>

                      {/* Acción */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setInspectedItem(item)}
                          className="px-3 py-1.5 bg-slate-50 dark:bg-[#1E1F23] hover:bg-[#FF3F1A] hover:text-white text-[#FF3F1A] dark:text-[#97D6DF] rounded-lg text-[11px] font-bold transition-all border border-slate-200 dark:border-[#374151] cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#FF3F1A] dark:text-[#97D6DF]" />
                          <span>Ficha</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table Summary Footer */}
              <div className="bg-slate-50 dark:bg-gray-800/80 px-4 py-3 border-t border-slate-200 dark:border-[#374151] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
                <span>Mostrando <strong>{filteredItems.length}</strong> de <strong>{items.length}</strong> elementos registrados</span>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Monitoreo SST Activo
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Directorio & Plantillas ─────────────────────────────────────── */}
      {anSubView === "directorio" && (
        <div className="bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-gray-900 dark:text-gray-100 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm transition-all w-full">
          {/* Header & Clean Sub-Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#374151] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF3F1A] dark:bg-gray-800 dark:text-[#97D6DF] border border-orange-200 dark:border-[#374151] flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-[#97D6DF]">Directorio Corporativo & Plantillas</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Estructuras de captura estandarizadas y empresas cliente vinculadas:</p>
            </div>

            {/* Segment Control Switcher */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-gray-800/90 rounded-xl border border-slate-200 dark:border-[#374151]/80 self-start md:self-auto">
              <button
                onClick={() => setDirectorioSubTab("plantillas")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  directorioSubTab === "plantillas"
                    ? "bg-[#FF3F1A] text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Plantillas SST ({INITIAL_TEMPLATES.length})</span>
              </button>

              <button
                onClick={() => setDirectorioSubTab("clientes")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  directorioSubTab === "clientes"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Empresas Cliente (4)</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Biblioteca de Plantillas SST */}
          {directorioSubTab === "plantillas" && (
            <div className="space-y-6 animate-view-transition">
              {/* Clean Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tplSearch}
                    onChange={e => setTplSearch(e.target.value)}
                    placeholder="Buscar plantilla por nombre o campo..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 dark:bg-gray-800/80 border border-slate-200 dark:border-[#374151] rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#FF3F1A] transition-colors"
                  />
                </div>

                <select
                  value={selectedCategoryTpl}
                  onChange={e => setSelectedCategoryTpl(e.target.value)}
                  className="w-full sm:w-auto bg-slate-50/80 dark:bg-gray-800/80 border border-slate-200 dark:border-[#374151] rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#FF3F1A]"
                >
                  <option value="Todas">Todas las Categorías</option>
                  <option value="Gastronomía">Gastronomía & Cocina</option>
                  <option value="Equipamiento">Equipamiento & Hornos</option>
                  <option value="SST & Emergencias">SST & Seguridad</option>
                  <option value="Retail">Retail & Mercadería</option>
                </select>

                <button
                  onClick={() => alert("Formulario interactivo para crear nueva plantilla inicializado.")}
                  className="w-full sm:w-auto px-4 py-2.5 bg-[#FF3F1A] hover:bg-[#e03413] text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Plantilla</span>
                </button>
              </div>

              {/* Grid of Clean Template Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {INITIAL_TEMPLATES.filter(tpl => {
                  const matchesSearch = tpl.name.toLowerCase().includes(tplSearch.toLowerCase()) || tpl.description.toLowerCase().includes(tplSearch.toLowerCase());
                  const matchesCat = selectedCategoryTpl === "Todas" || tpl.category === selectedCategoryTpl;
                  return matchesSearch && matchesCat;
                }).map(tpl => (
                  <div key={tpl.id} className="bg-white dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] p-5 rounded-2xl space-y-4 hover:border-orange-300 transition-all flex flex-col justify-between shadow-sm">
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-[#97D6DF]">{tpl.name}</h4>
                        <span className="text-[10px] bg-orange-50 text-[#FF3F1A] dark:bg-gray-800 dark:text-orange-400 px-2.5 py-0.5 rounded-lg font-extrabold shrink-0 border border-orange-200 dark:border-gray-700">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{tpl.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-[#374151]/80 space-y-3">
                      <div>
                        <span className="text-[11px] text-gray-400 dark:text-gray-400 font-bold block mb-1.5">Campos requeridos ({tpl.fields.length}):</span>
                        <div className="flex flex-wrap gap-1.5">
                          {tpl.fields.map(f => (
                            <span key={f} className="text-[11px] bg-slate-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-md font-medium">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setPreviewTemplate(tpl)}
                        className="w-full py-2 bg-slate-50 dark:bg-gray-700/80 hover:bg-[#FF3F1A] hover:text-white text-[#FF3F1A] dark:text-[#97D6DF] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-gray-600"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Previsualizar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Directorio de Empresas Cliente */}
          {directorioSubTab === "clientes" && (
            <div className="space-y-5 animate-view-transition">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[
                  { name: "Empanadas Necto (Sucursal Centro)", sector: "Gastronomía & Restaurante", items: 48, plantillas: ["Control de Insumos", "Bebidas & Packaging"], risk: "Óptimo", manager: "Matías Albarracín", isSynced: true },
                  { name: "Empanadas Necto (Sucursal Norte)", sector: "Gastronomía & Delivery", items: 34, plantillas: ["Control de Insumos", "Equipamiento & Hornos"], risk: "Bajo", manager: "Lucía Fernández", isSynced: true },
                  { name: "Acme Logistics S.A.", sector: "Logística y Transporte (SST)", items: 42, plantillas: ["Control de Extintores", "Stock Insumos"], risk: "Bajo", manager: "Carlos Mendoza", isSynced: false },
                  { name: "Tech Solutions SRL", sector: "Infraestructura TI (Retail / HW)", items: 19, plantillas: ["Control de Extintores", "Stock Retail"], risk: "Bajo", manager: "Esteban Rossi", isSynced: false },
                ].map(client => (
                  <div key={client.name} className="bg-white dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] p-5 rounded-2xl space-y-4 hover:border-[#FF3F1A]/40 transition-all shadow-sm">
                    <div className="flex justify-between items-start gap-2 border-b border-slate-100 dark:border-[#374151]/80 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-gray-800 border border-orange-200 dark:border-[#374151] text-[#FF3F1A] dark:text-[#97D6DF] flex items-center justify-center font-black text-sm">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-gray-900 dark:text-[#97D6DF]">{client.name}</h4>
                          <span className="text-[11px] text-gray-400 font-medium">{client.sector}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                        client.risk === "Atención"
                          ? "bg-red-50 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800"
                          : client.risk === "Medio"
                          ? "bg-amber-50 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      }`}>
                        Riesgo {client.risk}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Monitoreo: <strong className="text-gray-900 dark:text-gray-100">{client.items} elementos</strong></span>
                      <span>Resp: <strong className="text-gray-900 dark:text-gray-100">{client.manager}</strong></span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-[#374151]/80 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {client.plantillas.map(p => (
                          <span key={p} className="text-[10px] bg-orange-50/80 dark:bg-orange-950/40 text-[#FF3F1A] dark:text-orange-400 border border-orange-200 dark:border-orange-800 px-2 py-0.5 rounded-md font-semibold">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Clean Preview Modal */}
          {previewTemplate && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl animate-view-transition">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#374151] pb-3">
                  <div>
                    <span className="text-[10px] text-[#FF3F1A] font-bold uppercase">{previewTemplate.category}</span>
                    <h3 className="font-bold text-base text-gray-900 dark:text-[#97D6DF]">{previewTemplate.name}</h3>
                  </div>
                  <button onClick={() => setPreviewTemplate(null)} className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{previewTemplate.description}</p>

                <div className="bg-slate-50 dark:bg-gray-800/60 p-3.5 rounded-xl space-y-2 border border-slate-200 dark:border-[#374151]">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Campos del Formulario</span>
                  <div className="space-y-1.5 text-xs">
                    {previewTemplate.fields.map((f, idx) => (
                      <div key={f} className="flex items-center justify-between bg-white dark:bg-gray-900 p-2 rounded-lg border border-slate-200 dark:border-[#374151]">
                        <span className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-[#FF3F1A]/10 text-[#FF3F1A] flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                          {f}
                        </span>
                        <span className="text-[10px] font-semibold text-[#190088] dark:text-[#97D6DF]">Requerido</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      const templateName = previewTemplate.name;
                      setPreviewTemplate(null);
                      setAssignmentSuccessModal(templateName);
                    }}
                    className="flex-1 py-2.5 bg-[#FF3F1A] hover:bg-[#e03413] text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-colors"
                  >
                    Asignar a Cliente
                  </button>
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Custom Success Modal for Template Assignment */}
          {assignmentSuccessModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-view-transition text-center">
                <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-gray-800 border border-orange-200 dark:border-[#374151] flex items-center justify-center text-[#FF3F1A] dark:text-[#97D6DF] mx-auto shadow-xs">
                  <CheckCircle className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF3F1A]">Vincular Plantilla SST</span>
                  <h3 className="font-bold text-base text-gray-900 dark:text-[#97D6DF]">Asignación Exitosa</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium pt-1">
                    Plantilla <strong className="text-gray-900 dark:text-white font-bold">"{assignmentSuccessModal}"</strong> vinculada.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-gray-800/80 p-3 rounded-xl border border-slate-200 dark:border-[#374151] text-left flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-gray-800 text-blue-700 dark:text-[#97D6DF] border border-blue-200 dark:border-[#374151] flex items-center justify-center text-xs font-bold shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Empresa Cliente</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">Acme Logistics S.A.</span>
                  </div>
                </div>

                <button
                  onClick={() => setAssignmentSuccessModal(null)}
                  className="w-full py-2.5 bg-[#FF3F1A] hover:bg-[#e03413] text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-colors"
                >
                  Entendido y Continuar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 3. Historial & Ubicación ───────────────────────────────────────── */}
      {anSubView === "historial" && (() => {
        const matchingHistory = items.filter(item => {
          const matchesLoc = selectedLocHist === "Todas" || item.location === selectedLocHist;
          const matchesEv = selectedEvidenceType === "Todas" || item.evidenceType === selectedEvidenceType;
          const matchesCond = selectedHistCondition === "Todas" || item.condition === selectedHistCondition;
          const matchesQ = !histQuery ||
            item.name.toLowerCase().includes(histQuery.toLowerCase()) ||
            item.code.toLowerCase().includes(histQuery.toLowerCase()) ||
            item.location.toLowerCase().includes(histQuery.toLowerCase()) ||
            item.clientName.toLowerCase().includes(histQuery.toLowerCase()) ||
            item.notes?.toLowerCase().includes(histQuery.toLowerCase());
          return matchesLoc && matchesEv && matchesCond && matchesQ;
        });

        const uniqueLocations = Array.from(new Set(items.map(i => i.location)));

        return (
          <div className="space-y-6 w-full animate-view-transition">
            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Historial & Ubicación
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Registro cronológico de inspecciones y trazabilidad de activos por sector.
                </p>
              </div>
              <button
                onClick={() => handleExport("pdf")}
                className="px-4 py-2 bg-[#FF3F1A] hover:bg-[#e03413] text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Trazabilidad</span>
              </button>
            </div>

            {/* Prominent High-Contrast Search & Smart Filters Box */}
            <div className="bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] rounded-2xl p-5 shadow-xs space-y-4">
              {/* Prominent Search Input */}
              <div className="relative w-full">
                <Search className="w-5 h-5 text-[#190088] dark:text-[#97D6DF] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={histQuery}
                  onChange={e => setHistQuery(e.target.value)}
                  placeholder="Buscar por código de activo, nombre, sector, cliente o notas de campo..."
                  className="w-full pl-12 pr-10 py-3.5 bg-slate-50 dark:bg-gray-800/80 border-2 border-slate-200 dark:border-[#374151] rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#FF3F1A] focus:bg-white dark:focus:bg-gray-800 transition-all shadow-inner"
                />
                {histQuery && (
                  <button
                    onClick={() => setHistQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                    title="Limpiar búsqueda"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Inline Smart Filter Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Location Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Ubicación / Sector
                  </label>
                  <select
                    value={selectedLocHist}
                    onChange={e => setSelectedLocHist(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-[#374151] rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#FF3F1A]"
                  >
                    <option value="Todas">Todos los sectores ({uniqueLocations.length})</option>
                    {uniqueLocations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>

                {/* Condition Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Estado / Diagnóstico
                  </label>
                  <select
                    value={selectedHistCondition}
                    onChange={e => setSelectedHistCondition(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-[#374151] rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#FF3F1A]"
                  >
                    <option value="Todas">Todos los estados</option>
                    <option value="Crítica">Crítica</option>
                    <option value="Requiere Revisión">Requiere Revisión</option>
                    <option value="Buena">Buena (Óptimo)</option>
                  </select>
                </div>

                {/* Evidence Type Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Tipo de Evidencia
                  </label>
                  <select
                    value={selectedEvidenceType}
                    onChange={e => setSelectedEvidenceType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-[#374151] rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#FF3F1A]"
                  >
                    <option value="Todas">Todas las evidencias</option>
                    <option value="foto">Fotografía</option>
                    <option value="audio">Audio / Dictado IA</option>
                    <option value="video">Video de campo</option>
                    <option value="texto">Notas & OCR</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Clean, Scannable Minimalist Table / Audit List */}
            <div className="bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] rounded-2xl shadow-xs overflow-hidden">
              <div className="px-6 py-3.5 border-b border-slate-100 dark:border-[#374151] flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  Mostrando {matchingHistory.length} de {items.length} registros
                </span>
                {(selectedLocHist !== "Todas" || selectedEvidenceType !== "Todas" || selectedHistCondition !== "Todas" || histQuery) && (
                  <button
                    onClick={() => {
                      setSelectedLocHist("Todas");
                      setSelectedEvidenceType("Todas");
                      setSelectedHistCondition("Todas");
                      setHistQuery("");
                    }}
                    className="text-xs font-bold text-[#FF3F1A] hover:underline cursor-pointer"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              {matchingHistory.length === 0 ? (
                <div className="py-16 text-center text-gray-400">
                  <p className="text-sm font-semibold">No se encontraron registros con los filtros seleccionados.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 dark:bg-gray-800/60 border-b border-slate-100 dark:border-[#374151] text-gray-500 dark:text-gray-400 uppercase text-[10px] tracking-wider font-bold">
                        <th className="py-3.5 px-5">Código & Activo</th>
                        <th className="py-3.5 px-4">Cliente</th>
                        <th className="py-3.5 px-4">Ubicación</th>
                        <th className="py-3.5 px-4">Evidencia</th>
                        <th className="py-3.5 px-4">Fecha / Hora</th>
                        <th className="py-3.5 px-4">Estado</th>
                        <th className="py-3.5 px-5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#374151]">
                      {matchingHistory.map(item => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-gray-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[#FF3F1A]">
                                {item.code}
                              </span>
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {item.name}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-xs mt-0.5">
                                {item.notes}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 font-medium">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
                              <span>{item.clientName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-[#FF3F1A] shrink-0" />
                              <span className="truncate max-w-[150px]">{item.location}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-[11px]">
                              {item.evidenceType === "foto" && <Camera className="w-4 h-4 text-blue-500" />}
                              {item.evidenceType === "audio" && <Mic className="w-4 h-4 text-purple-500" />}
                              {item.evidenceType === "video" && <Video className="w-4 h-4 text-amber-500" />}
                              {item.evidenceType === "texto" && <FileText className="w-4 h-4 text-emerald-500" />}
                              <span className="capitalize font-semibold">{item.evidenceType}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 font-mono text-[11px]">
                            {item.lastUpdated}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-3 py-0.5 rounded-full text-[10px] font-extrabold ${
                              item.condition === "Crítica"
                                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800"
                                : item.condition === "Requiere Revisión"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            }`}>
                              {item.condition}
                            </span>
                          </td>
                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => setInspectedItem(item)}
                              className="px-3.5 py-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-[#FF3F1A] hover:text-white text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                            >
                              <Eye className="w-4 h-4" />
                              <span>Ver</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── 4. Alertas & Exportación ───────────────────────────────────────── */}
      {anSubView === "exportacion" && (
        <div className="space-y-6 w-full animate-view-transition">
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-gray-800 border border-orange-200 dark:border-[#374151] flex items-center justify-center text-[#FF3F1A] dark:text-[#97D6DF] font-bold shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF3F1A]">Analista • Consola de Informes</span>
                <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-[#97D6DF]">Centro de Alertas & Exportación SST</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Generación de actas tabuladas, auditorías y trazabilidad de alertas en tiempo real
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-100 text-slate-800 dark:bg-gray-800 dark:text-gray-200 px-3 py-1 rounded-lg font-bold border border-slate-200 dark:border-[#374151]">
                Total: {items.length} activos
              </span>
              <span className="text-xs bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 px-3 py-1 rounded-lg font-bold border border-red-200 dark:border-red-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {alertsCount} Alertas
              </span>
            </div>
          </div>

          {/* 2-Column Main Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
            {/* Columna Izquierda: Generador de Informes (7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-gray-900 dark:text-gray-100 rounded-2xl p-6 space-y-5 transition-all shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#374151] pb-3">
                  <div className="flex items-center space-x-2">
                    <Download className="w-4 h-4 text-[#FF3F1A]" />
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Configuración del Reporte a Descargar</h3>
                  </div>
                  <span className="text-[11px] font-bold text-gray-400">Paso 1 de 2: Filtro y Formato</span>
                </div>

                {/* Client Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200">Empresa Cliente / Sede:</label>
                  <select
                    value={exportClient}
                    onChange={e => setExportClient(e.target.value)}
                    className="w-full bg-slate-50/80 dark:bg-gray-800/80 border border-slate-200 dark:border-[#374151] rounded-xl p-3 text-xs text-gray-900 dark:text-gray-100 font-bold focus:outline-none focus:border-[#FF3F1A] transition-colors"
                  >
                    <option value="Todos los clientes">Todos los clientes registrados</option>
                    <option value="Acme Logistics S.A.">Acme Logistics S.A.</option>
                    <option value="Construcciones del Sur">Construcciones del Sur</option>
                    <option value="Tech Solutions SRL">Tech Solutions SRL</option>
                    <option value="Hospital Central SST">Hospital Central SST</option>
                  </select>
                </div>

                {/* Format Cards Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200">Formato del Documento:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: "excel", title: "Excel (.xlsx)", desc: "Matriz completa con fórmulas y filtros", icon: FileSpreadsheet },
                      { id: "pdf", title: "PDF Oficial", desc: "Informe para fiscalización y actas", icon: Download },
                      { id: "csv", title: "CSV Crudo", desc: "Integración con ERP / Power BI", icon: FileText }
                    ].map(fmt => {
                      const Icon = fmt.icon;
                      const active = exportFormat === fmt.id;
                      return (
                        <button
                          key={fmt.id}
                          onClick={() => setExportFormat(fmt.id as any)}
                          className={`p-3.5 rounded-xl border text-left flex flex-col justify-between space-y-2 transition-all cursor-pointer ${
                            active
                              ? "border-[#FF3F1A] bg-orange-50/30 dark:bg-gray-800 ring-2 ring-[#FF3F1A]/20 shadow-xs"
                              : "border-slate-200 dark:border-[#374151] bg-slate-50/50 dark:bg-gray-800/40 hover:border-slate-300 dark:hover:border-gray-600"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                              active ? "bg-[#FF3F1A] text-white" : "bg-slate-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            {active && <span className="w-2 h-2 rounded-full bg-[#FF3F1A]" />}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-gray-900 dark:text-gray-100 block">{fmt.title}</span>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{fmt.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Scope Filter Pills */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 dark:text-gray-200">Alcance de Datos:</label>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1.5 bg-slate-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-bold border border-slate-200 dark:border-[#374151] cursor-pointer hover:border-[#FF3F1A] flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500" /> Todos los campos ({items.length} activos)
                    </span>
                    <span className="px-3 py-1.5 bg-slate-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#374151] cursor-pointer hover:border-[#FF3F1A]">
                      Incluir URLs de Evidencias Fotográficas
                    </span>
                    <span className="px-3 py-1.5 bg-slate-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#374151] cursor-pointer hover:border-[#FF3F1A]">
                      Incluir Geo-ubicación
                    </span>
                  </div>
                </div>

                {/* Success Notification */}
                {exportSuccess && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 font-bold animate-view-transition">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Informe en formato {exportFormat.toUpperCase()} descargado exitosamente para {exportClient}.
                    </span>
                    <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 px-2 py-0.5 rounded font-bold">
                      Listo
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-[#374151]">
                <button
                  onClick={() => handleExport(exportFormat)}
                  className="w-full py-3.5 bg-[#FF3F1A] hover:bg-[#e03413] text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Generar y Descargar Informe ({exportFormat.toUpperCase()})</span>
                </button>
              </div>
            </div>

            {/* Columna Derecha: Bandeja de Alertas Críticas SST (5 cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] text-gray-900 dark:text-gray-100 rounded-2xl p-6 space-y-4 transition-all shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#374151] pb-3">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-[#FF3F1A]" />
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100">Alertas Activas de Seguridad</h3>
                  </div>
                  <span className="font-mono text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 px-2.5 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                    {alertsCount} pendientes
                  </span>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Elementos que requieren intervención o fiscalización prioritaria:
                </p>

                {/* Alerts Stream List */}
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {items
                    .filter(i => i.condition === "Crítica" || i.condition === "Requiere Revisión")
                    .map(item => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50/80 dark:bg-gray-800/60 border border-slate-200 dark:border-[#374151] rounded-xl space-y-2 hover:border-[#FF3F1A]/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[11px] text-[#FF3F1A]">{item.code}</span>
                              <span className="text-[10px] text-gray-400">({item.clientName})</span>
                            </div>
                            <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100 mt-0.5">{item.name}</h4>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border flex-none ${
                            item.condition === "Crítica"
                              ? "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA] dark:bg-red-950/60 dark:text-red-300 dark:border-red-800"
                              : "bg-[#EFF6FF] text-[#1447E6] border-[#BEDBFF] dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                          }`}>
                            {item.condition}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-slate-200/50 dark:border-gray-700">
                          <span className="flex items-center gap-1 truncate max-w-[180px]">
                            <MapPin className="w-3 h-3 text-gray-400 flex-none" />
                            <span className="truncate">{item.location}</span>
                          </span>

                          <button
                            onClick={() => setInspectedItem(item)}
                            className="text-[11px] font-bold text-[#190088] dark:text-[#97D6DF] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Inspeccionar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-[#374151] flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>Directorio SST 100% Sincronizado</span>
                <span className="font-mono text-gray-400">Necto v3.4</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inspector for Evidence (Ficha de Inspección SST) */}
      {inspectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            style={{ borderRadius: "24px" }}
            className="bg-white dark:bg-[#2C2D31] border border-slate-200 dark:border-[#374151] p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl animate-view-transition"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#374151] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-[#FF3F1A] flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-xs text-[#FF3F1A] bg-orange-50 dark:bg-orange-950/60 px-2.5 py-1 rounded-lg border border-orange-200 dark:border-orange-900">
                      {inspectedItem.code}
                    </span>
                    <span className="text-[11px] font-bold text-[#190088] dark:text-[#97D6DF] bg-indigo-50 dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-[#374151]">
                      {inspectedItem.category}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100 mt-1.5">{inspectedItem.name}</h3>
                </div>
              </div>

              <button
                onClick={() => setInspectedItem(null)}
                className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Evidence Image Preview (if present) */}
            {inspectedItem.evidenceUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-[#374151] max-h-52 shadow-xs group">
                <SafeImage src={inspectedItem.evidenceUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute bottom-2.5 left-2.5 bg-slate-900/80 text-white text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-xs">
                  <Camera className="w-3.5 h-3.5 text-[#FF3F1A]" />
                  <span>Evidencia Fotográfica de Campo</span>
                </div>
              </div>
            )}

            {/* Structured Details Card */}
            <div className="bg-slate-50/70 dark:bg-gray-800/60 p-4.5 rounded-2xl space-y-3.5 border border-slate-200 dark:border-[#374151] text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-200/60 dark:border-[#374151]/60">
                <span className="text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-gray-800 flex items-center justify-center text-[#190088] dark:text-[#97D6DF]">
                    <Building2 className="w-4 h-4" />
                  </div>
                  Empresa Cliente:
                </span>
                <span className="font-bold text-[#190088] dark:text-[#97D6DF] bg-white dark:bg-gray-900 px-3 py-1 rounded-xl border border-slate-200 dark:border-[#374151]">
                  {inspectedItem.clientName}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-200/60 dark:border-[#374151]/60">
                <span className="text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-gray-800 flex items-center justify-center text-[#FF3F1A]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  Ubicación & Sector:
                </span>
                <span className="font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 px-3 py-1 rounded-xl border border-slate-200 dark:border-[#374151]">
                  {inspectedItem.location}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-slate-200/60 dark:border-[#374151]/60">
                <span className="text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  Estado & Condición:
                </span>
                <span
                  className={`px-3 py-1 text-[11px] font-extrabold rounded-full border ${
                    inspectedItem.condition === "Crítica"
                      ? "bg-[#FEF2F2] text-[#DC2626] dark:bg-red-950 dark:text-red-300 border-[#FECACA] dark:border-red-800"
                      : inspectedItem.condition === "Requiere Revisión"
                      ? "bg-[#EFF6FF] text-[#1447E6] dark:bg-blue-950 dark:text-blue-300 border-[#BEDBFF] dark:border-blue-800"
                      : "bg-[#F0FDF4] text-[#166534] dark:bg-emerald-950 dark:text-emerald-300 border-[#B9F8CF] dark:border-emerald-800"
                  }`}
                >
                  Condición {inspectedItem.condition}
                </span>
              </div>

              {inspectedItem.notes && (
                <div className="pt-1.5 space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                    Notas de Campo del Inspector:
                  </span>
                  <div className="bg-white dark:bg-gray-900/90 p-3.5 rounded-xl border border-slate-200 dark:border-[#374151] text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                    {inspectedItem.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setInspectedItem(null)}
                className="flex-1 py-3 bg-[#FF3F1A] hover:bg-[#e03413] text-white font-bold text-xs rounded-xl cursor-pointer shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4.5 h-4.5" />
                <span>Cerrar Inspección</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
