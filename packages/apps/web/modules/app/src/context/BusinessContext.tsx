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

export interface BusinessInstance {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  iconKey: BusinessIconKey;
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
  createdAt: string;
}

interface BusinessContextType {
  businesses: BusinessInstance[];
  activeBusiness: BusinessInstance;
  activeBusinessId: string;
  userRole: UserWorkspaceRole;
  setUserRole: (role: UserWorkspaceRole) => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  createBusiness: (data: Omit<BusinessInstance, "id" | "createdAt">) => BusinessInstance;
  switchBusiness: (id: string) => void;
  updateBusiness: (id: string, updates: Partial<BusinessInstance>) => void;
  deleteBusiness: (id: string) => void;
  toggleModule: (moduleKey: NectoModuleKey) => void;
  updateSetupProgress: (bizId: string, progressUpdates: Partial<BusinessSetupProgress>) => void;
}


const DEFAULT_BUSINESS: BusinessInstance = {
  id: "biz-necto-central",
  name: "Burger House — Sede Principal",
  slug: "burger-house-central",
  businessType: "restaurant_virtual",
  iconKey: "utensils",
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

  const [userRole, setUserRole] = useState<UserWorkspaceRole>("owner");
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

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

  const toggleCommandPalette = () => setIsCommandPaletteOpen(prev => !prev);


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

  const updateSetupProgress = (bizId: string, progressUpdates: Partial<BusinessSetupProgress>) => {
    setBusinesses(prev =>
      prev.map(b => {
        if (b.id === bizId) {
          return {
            ...b,
            setupProgress: {
              ...(b.setupProgress || {
                whatsappConnected: false,
                menuConfigured: false,
                kitchenConfigured: false,
                teamInvited: false,
              }),
              ...progressUpdates,
            },
          };
        }
        return b;
      })
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

  const toggleModule = (moduleKey: NectoModuleKey) => {
    if (!activeBusiness) return;
    const currentModules = activeBusiness.activeModules || [];
    const newModules = currentModules.includes(moduleKey)
      ? currentModules.filter(m => m !== moduleKey)
      : [...currentModules, moduleKey];

    updateBusiness(activeBusiness.id, { activeModules: newModules });
  };

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        activeBusiness,
        activeBusinessId,
        userRole,
        setUserRole,
        isOnboardingOpen,
        setIsOnboardingOpen,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        toggleCommandPalette,
        createBusiness,
        switchBusiness,
        updateBusiness,
        deleteBusiness,
        toggleModule,
        updateSetupProgress,
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

