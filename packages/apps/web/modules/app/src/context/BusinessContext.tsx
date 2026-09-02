import React, { createContext, useContext, useState, useEffect } from "react";

export type BusinessType =
  | "restaurant_virtual"
  | "retail_store"
  | "services"
  | "ecommerce_direct";

export type NectoModuleKey =
  | "referidos"
  | "pedidos"
  | "agendamiento"
  | "reservas"
  | "inventarios"
  | "turnos";

export interface BusinessChannelConfig {
  whatsapp: boolean;
  web: boolean;
  pos: boolean;
}

export type BusinessIconKey = "utensils" | "flame" | "coffee" | "store" | "chef" | "layers";

export interface BusinessScheduledPause {
  isPaused: boolean;
  pauseStartDate?: string;
  pauseEndDate?: string;
  reason?: string;
  autoReplyMessage?: string;
}

export interface BusinessSetupProgress {
  whatsappConnected: boolean;
  menuConfigured: boolean;
  kitchenConfigured: boolean;
  teamInvited: boolean;
}

export type UserWorkspaceRole = "owner" | "manager" | "staff";
export type SoundAlertKey = "bell" | "chime" | "kitchen_ding" | "pos_beep" | "mute";


export interface ImageTransformConfig {
  scale: number;    // 0.5 to 3
  rotate: number;   // -180 to 180 degrees
  posX: number;     // -100 to 100 percentage offset
  posY: number;     // -100 to 100 percentage offset
}

export type BotPersonality = "amigable" | "ejecutivo" | "chef" | "dinamico";
export type HolidayTheme = "none" | "halloween" | "navidad" | "ano_nuevo" | "black_friday" | "san_valentin";

export interface WhatsAppBotConfig {
  welcomeMessage?: string;
  isWelcomeEnabled?: boolean;
  paymentInfoMessage?: string;
  isPaymentInfoEnabled?: boolean;
  closedHoursMessage?: string;
  isClosedHoursEnabled?: boolean;
  handoffToHumanMessage?: string;
  isHandoffEnabled?: boolean;
  orderConfirmedMessage?: string;
  isOrderConfirmedEnabled?: boolean;

  // AI & Personality
  botPersonality?: BotPersonality;
  isAiUpsellEnabled?: boolean;
  upsellMessage?: string;
  isAutoConfirmOrders?: boolean;
  autoConfirmMaxAmount?: number;
  delayAlertMinutes?: number;
  isDelayAlertEnabled?: boolean;

  // Holiday / Seasonal Profiles
  activeHolidayTheme?: HolidayTheme;
  isHolidayMessageEnabled?: boolean;
  holidayMessage?: string;

  // Payment Accounts & Methods
  nequiNumber?: string;
  daviplataNumber?: string;
  bancolombiaAccount?: string;
  accountHolder?: string;
  accountNit?: string;
  allowCashOnDelivery?: boolean;
  allowCardTerminal?: boolean;
  paymentInstructions?: string;
}

export interface BusinessInstance {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  iconKey: BusinessIconKey;
  logoUrl?: string;
  logoTransform?: ImageTransformConfig;
  bannerUrl?: string;
  bannerTransform?: ImageTransformConfig;
  brandColor?: string;
  soundAlert?: SoundAlertKey;
  currency: "COP" | "USD" | "MXN" | "ARS";
  city: string;
  country?: string;
  contactPhone?: string;
  contactEmail?: string;
  channels: BusinessChannelConfig;
  kitchenBufferMin: number;
  specialty?: string;
  activeModules: NectoModuleKey[];
  pauseConfig?: BusinessScheduledPause;
  setupProgress?: BusinessSetupProgress;
  whatsappBotConfig?: WhatsAppBotConfig;
  createdAt: string;
}



export interface RolePermissions {
  canViewBandeja: boolean;
  canCreateOrders: boolean;
  canViewKDS: boolean;
  canDispatchKDS: boolean;
  canViewCatalogo: boolean;
  canEditCatalogo: boolean;
  canViewInsumos: boolean;
  canEditInsumos: boolean;
  canViewAnalitica: boolean;
  canViewHistorial: boolean;
  canViewAutomatizaciones: boolean;
  canViewTurnos: boolean;
  canManageRoles: boolean;
}

export interface RolePermission {
  id: string;
  name: string;
  description: string;
  badgeColor: "rose" | "blue" | "amber" | "emerald" | "purple" | "zinc";
  isSystem?: boolean;
  permissions: RolePermissions;
}

export const INITIAL_ROLES: RolePermission[] = [
  {
    id: "role-owner",
    name: "Dueño / Propietario",
    description: "Acceso total irrestricto a todas las funciones financieras, operativas, roles y configuración.",
    badgeColor: "rose",
    isSystem: true,
    permissions: {
      canViewBandeja: true,
      canCreateOrders: true,
      canViewKDS: true,
      canDispatchKDS: true,
      canViewCatalogo: true,
      canEditCatalogo: true,
      canViewInsumos: true,
      canEditInsumos: true,
      canViewAnalitica: true,
      canViewHistorial: true,
      canViewAutomatizaciones: true,
      canViewTurnos: true,
      canManageRoles: true,
    },
  },
  {
    id: "role-admin",
    name: "Administrador de Tienda",
    description: "Gerente contratado para la gestión integral de la tienda: administración de comandas, catálogo, stock, personal, turnos y configuración operativa.",
    badgeColor: "blue",
    isSystem: true,
    permissions: {
      canViewBandeja: true,
      canCreateOrders: true,
      canViewKDS: true,
      canDispatchKDS: true,
      canViewCatalogo: true,
      canEditCatalogo: true,
      canViewInsumos: true,
      canEditInsumos: true,
      canViewAnalitica: true,
      canViewHistorial: true,
      canViewAutomatizaciones: true,
      canViewTurnos: true,
      canManageRoles: true,
    },
  },
  {
    id: "role-cook",
    name: "Cocinero / KDS Chef",
    description: "Visualización y despacho táctil de tickets en Pantalla KDS Cocina sin acceso a finanzas.",
    badgeColor: "amber",
    isSystem: true,
    permissions: {
      canViewBandeja: false,
      canCreateOrders: false,
      canViewKDS: true,
      canDispatchKDS: true,
      canViewCatalogo: false,
      canEditCatalogo: false,
      canViewInsumos: false,
      canEditInsumos: false,
      canViewAnalitica: false,
      canViewHistorial: false,
      canViewAutomatizaciones: false,
      canViewTurnos: false,
      canManageRoles: false,
    },
  },
  {
    id: "role-waiter",
    name: "Mesero / Cajero POS",
    description: "Recepción de comandas, cobro en salón y emisión de tickets en Bandeja Unificada.",
    badgeColor: "emerald",
    isSystem: true,
    permissions: {
      canViewBandeja: true,
      canCreateOrders: true,
      canViewKDS: false,
      canDispatchKDS: false,
      canViewCatalogo: true,
      canEditCatalogo: false,
      canViewInsumos: false,
      canEditInsumos: false,
      canViewAnalitica: false,
      canViewHistorial: true,
      canViewAutomatizaciones: false,
      canViewTurnos: false,
      canManageRoles: false,
    },
  },
  {
    id: "role-inventory",
    name: "Encargado de Insumos & Stock",
    description: "Control de materias primas, escandallos, recetas y registro de inventario.",
    badgeColor: "purple",
    isSystem: true,
    permissions: {
      canViewBandeja: false,
      canCreateOrders: false,
      canViewKDS: false,
      canDispatchKDS: false,
      canViewCatalogo: true,
      canEditCatalogo: true,
      canViewInsumos: true,
      canEditInsumos: true,
      canViewAnalitica: false,
      canViewHistorial: false,
      canViewAutomatizaciones: false,
      canViewTurnos: false,
      canManageRoles: false,
    },
  },
];



interface BusinessContextType {
  businesses: BusinessInstance[];
  activeBusiness: BusinessInstance;
  activeBusinessId: string;
  userRole: UserWorkspaceRole;
  roles: RolePermission[];
  activeRoleId: string;
  activeRole: RolePermission;
  setActiveRoleId: (roleId: string) => void;
  createRole: (role: Omit<RolePermission, "id">) => RolePermission;
  updateRole: (roleId: string, updates: Partial<RolePermission>) => void;
  deleteRole: (roleId: string) => void;
  canAccess: (permission: keyof RolePermissions) => boolean;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  createBusiness: (data: Omit<BusinessInstance, "id" | "createdAt">) => BusinessInstance;
  switchBusiness: (id: string) => void;
  updateBusiness: (id: string, updates: Partial<BusinessInstance>) => void;
  deleteBusiness: (id: string) => void;
  storePace: "rapida" | "habitual" | "demorada";
  setStorePace: (pace: "rapida" | "habitual" | "demorada") => void;
  userAvatarUrl: string;
  setUserAvatarUrl: (url: string) => void;
}



const DEFAULT_BUSINESS: BusinessInstance = {
  id: "biz-necto-central",
  name: "Burger House — Sede Principal",
  slug: "burger-house-central",
  businessType: "restaurant_virtual",
  iconKey: "utensils",
  logoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  currency: "COP",
  city: "Bogotá, Colombia",
  channels: {
    whatsapp: true,
    web: true,
    pos: true,
  },
  kitchenBufferMin: 20,
  specialty: "Hamburguesas & Comidas Rápidas",
  activeModules: ["pedidos", "inventarios", "referidos"],
  setupProgress: {
    whatsappConnected: true,
    menuConfigured: true,
    kitchenConfigured: true,
    teamInvited: false,
  },
  createdAt: new Date().toISOString(),
};

const SECONDARY_BUSINESS: BusinessInstance = {
  id: "biz-necto-pizza",
  name: "Pizza Necto — Delivery Express",
  slug: "pizza-necto-express",
  businessType: "restaurant_virtual",
  iconKey: "flame",
  currency: "COP",
  city: "Medellín, Colombia",
  channels: {
    whatsapp: true,
    web: true,
    pos: false,
  },
  kitchenBufferMin: 15,
  specialty: "Pizzas Artesanales & Calzones",
  activeModules: ["pedidos", "inventarios"],
  setupProgress: {
    whatsappConnected: true,
    menuConfigured: true,
    kitchenConfigured: false,
    teamInvited: false,
  },
  createdAt: new Date(Date.now() - 86400000).toISOString(),
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businesses, setBusinesses] = useState<BusinessInstance[]>(() => {
    try {
      const saved = localStorage.getItem("necto_businesses");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((b: any) => ({
            ...b,
            activeModules: b.activeModules || ["pedidos", "inventarios", "referidos"],
            setupProgress: b.setupProgress || {
              whatsappConnected: true,
              menuConfigured: true,
              kitchenConfigured: false,
              teamInvited: false,
            },
          }));
        }
      }
    } catch (e) {
      console.warn("Error reading businesses from storage", e);
    }
    return [DEFAULT_BUSINESS, SECONDARY_BUSINESS];
  });

  const [activeBusinessId, setActiveBusinessId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("necto_active_business_id");
      if (saved && saved !== "GLOBAL_OVERVIEW") return saved;
    } catch (e) {}
    return DEFAULT_BUSINESS.id;
  });

  const [userRole] = useState<UserWorkspaceRole>("owner");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [storePace, setStorePaceState] = useState<"rapida" | "habitual" | "demorada">(() => {
    try {
      const saved = localStorage.getItem("necto_store_pace");
      if (saved === "rapida" || saved === "habitual" || saved === "demorada") return saved;
    } catch (e) {}
    return "habitual";
  });

  const setStorePace = (pace: "rapida" | "habitual" | "demorada") => {
    setStorePaceState(pace);
    try {
      localStorage.setItem("necto_store_pace", pace);
      window.dispatchEvent(new CustomEvent("necto_store_pace_changed", { detail: pace }));
    } catch (e) {}
  };

  useEffect(() => {
    const handlePaceChange = (e: Event) => {
      const customEvent = e as CustomEvent<"rapida" | "habitual" | "demorada">;
      if (customEvent.detail && (customEvent.detail === "rapida" || customEvent.detail === "habitual" || customEvent.detail === "demorada")) {
        setStorePaceState(customEvent.detail);
      }
    };
    window.addEventListener("necto_store_pace_changed", handlePaceChange);
    return () => window.removeEventListener("necto_store_pace_changed", handlePaceChange);
  }, []);

  // Global Keyboard listener for Command Palette (Ctrl+K or Cmd+K)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("necto_businesses", JSON.stringify(businesses));
    } catch (e) {}
  }, [businesses]);

  useEffect(() => {
    try {
      if (activeBusinessId && activeBusinessId !== "GLOBAL_OVERVIEW") {
        localStorage.setItem("necto_active_business_id", activeBusinessId);
      }
    } catch (e) {}
  }, [activeBusinessId]);

  const activeBusiness =
    businesses.find(b => b.id === activeBusinessId) || businesses[0] || DEFAULT_BUSINESS;

  const createBusiness = (data: Omit<BusinessInstance, "id" | "createdAt">): BusinessInstance => {
    const newBiz: BusinessInstance = {
      ...data,
      id: `biz-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      activeModules: data.activeModules || ["pedidos", "inventarios"],
      setupProgress: {
        whatsappConnected: data.channels?.whatsapp || false,
        menuConfigured: false,
        kitchenConfigured: false,
        teamInvited: false,
      },
      createdAt: new Date().toISOString(),
    };

    setBusinesses(prev => [newBiz, ...prev]);
    setActiveBusinessId(newBiz.id);
    return newBiz;
  };

  const switchBusiness = (id: string) => {
    if (businesses.some(b => b.id === id)) {
      setActiveBusinessId(id);
    }
  };

  const updateBusiness = (id: string, updates: Partial<BusinessInstance>) => {
    setBusinesses(prev =>
      prev.map(b => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  const deleteBusiness = (id: string) => {
    setBusinesses(prev => {
      const filtered = prev.filter(b => b.id !== id);
      if (filtered.length === 0) {
        return [DEFAULT_BUSINESS];
      }
      if (activeBusinessId === id) {
        setActiveBusinessId(filtered[0].id);
      }
      return filtered;
    });
  };

  // Roles & Permissions state

  const [roles, setRoles] = useState<RolePermission[]>(() => {
    try {
      const saved = localStorage.getItem("necto_custom_roles");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_ROLES;
  });

  const [activeRoleId, setActiveRoleIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("necto_active_role_id");
      if (saved) return saved;
    } catch (e) {}
    return "role-owner";
  });

  const setActiveRoleId = (roleId: string) => {
    setActiveRoleIdState(roleId);
    try {
      localStorage.setItem("necto_active_role_id", roleId);
    } catch (e) {}
  };

  useEffect(() => {
    try {
      localStorage.setItem("necto_custom_roles", JSON.stringify(roles));
    } catch (e) {}
  }, [roles]);

  const activeRole: RolePermission =
    roles.find(r => r.id === activeRoleId) || roles[0] || INITIAL_ROLES[0];

  const createRole = (newRoleData: Omit<RolePermission, "id">): RolePermission => {
    const newRole: RolePermission = {
      ...newRoleData,
      id: `role-custom-${Date.now()}`,
    };
    setRoles(prev => [...prev, newRole]);
    return newRole;
  };

  const updateRole = (roleId: string, updates: Partial<RolePermission>) => {
    setRoles(prev =>
      prev.map(r => (r.id === roleId ? { ...r, ...updates, permissions: { ...r.permissions, ...(updates.permissions || {}) } } : r))
    );
  };

  const deleteRole = (roleId: string) => {
    setRoles(prev => {
      const filtered = prev.filter(r => r.id !== roleId || r.isSystem);
      return filtered;
    });
    if (activeRoleId === roleId) {
      setActiveRoleId("role-owner");
    }
  };

  const canAccess = (permission: keyof RolePermissions): boolean => {
    if (!activeRole || !activeRole.permissions) return true;
    return !!activeRole.permissions[permission];
  };

  const [userAvatarUrl, setUserAvatarUrlState] = useState<string>(() => {
    try {
      return localStorage.getItem("necto_user_avatar") || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
    } catch (e) {
      return "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";
    }
  });

  const setUserAvatarUrl = (url: string) => {
    setUserAvatarUrlState(url);
    try {
      localStorage.setItem("necto_user_avatar", url);
    } catch (e) {}
  };

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        activeBusiness,
        activeBusinessId,
        userRole,
        roles,
        activeRoleId,
        activeRole,
        setActiveRoleId,
        createRole,
        updateRole,
        deleteRole,
        canAccess,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        createBusiness,
        switchBusiness,
        updateBusiness,
        deleteBusiness,
        storePace,
        setStorePace,
        userAvatarUrl,
        setUserAvatarUrl,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );


};

export const useBusiness = () => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return context;
};

