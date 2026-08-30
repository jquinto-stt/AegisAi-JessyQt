import React, { createContext, useContext, useState, useEffect } from "react";

export type BusinessType =
  | "restaurant_virtual"
  | "retail_store"
  | "services"
  | "ecommerce_direct";

export interface BusinessChannelConfig {
  whatsapp: boolean;
  web: boolean;
  pos: boolean;
}

export type BusinessIconKey = "utensils" | "flame" | "coffee" | "store" | "chef" | "layers";

export interface BusinessInstance {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  iconKey: BusinessIconKey;
  currency: "COP" | "USD" | "MXN" | "ARS";
  city: string;
  channels: BusinessChannelConfig;
  kitchenBufferMin: number;
  specialty?: string;
  createdAt: string;
}

interface BusinessContextType {
  businesses: BusinessInstance[];
  activeBusiness: BusinessInstance;
  activeBusinessId: string;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  createBusiness: (data: Omit<BusinessInstance, "id" | "createdAt">) => BusinessInstance;
  switchBusiness: (id: string) => void;
  updateBusiness: (id: string, updates: Partial<BusinessInstance>) => void;
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
  createdAt: new Date().toISOString(),
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businesses, setBusinesses] = useState<BusinessInstance[]>(() => {
    try {
      const saved = localStorage.getItem("necto_businesses");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [DEFAULT_BUSINESS];
  });

  const [activeBusinessId, setActiveBusinessId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("necto_active_business_id");
      if (saved) return saved;
    } catch (e) {}
    return DEFAULT_BUSINESS.id;
  });

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("necto_businesses", JSON.stringify(businesses));
    } catch (e) {}
  }, [businesses]);

  useEffect(() => {
    try {
      localStorage.setItem("necto_active_business_id", activeBusinessId);
    } catch (e) {}
  }, [activeBusinessId]);

  const activeBusiness =
    businesses.find(b => b.id === activeBusinessId) || businesses[0] || DEFAULT_BUSINESS;

  const createBusiness = (data: Omit<BusinessInstance, "id" | "createdAt">): BusinessInstance => {
    const newBiz: BusinessInstance = {
      ...data,
      id: `biz-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    setBusinesses(prev => [...prev, newBiz]);
    setActiveBusinessId(newBiz.id);
    return newBiz;
  };

  const switchBusiness = (id: string) => {
    const found = businesses.find(b => b.id === id);
    if (found) {
      setActiveBusinessId(id);
    }
  };

  const updateBusiness = (id: string, updates: Partial<BusinessInstance>) => {
    setBusinesses(prev =>
      prev.map(b => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        activeBusiness,
        activeBusinessId,
        isOnboardingOpen,
        setIsOnboardingOpen,
        createBusiness,
        switchBusiness,
        updateBusiness,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    throw new Error("useBusiness must be used within a BusinessProvider");
  }
  return ctx;
};
