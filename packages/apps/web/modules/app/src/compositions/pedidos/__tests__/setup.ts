const mockStorage: Record<string, string> = {};

if (typeof (globalThis as any).localStorage === "undefined" || !(globalThis as any).localStorage.getItem) {
  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => {
      mockStorage[key] = String(val);
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      for (const k in mockStorage) delete mockStorage[k];
    },
  };
}

if (typeof (globalThis as any).window === "undefined") {
  (globalThis as any).window = globalThis;
}

export {};
