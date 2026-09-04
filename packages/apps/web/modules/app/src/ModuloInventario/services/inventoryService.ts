import {
  InventoryProduct,
  StockMovement,
  MovementType,
  ProductStatus,
  StockLocation,
  StockTrackingAction,
  InventoryFilterOptions,
  Supplier,
  PurchaseOrder,
  BuildOrder,
} from "../types/inventory.types";
import {
  INITIAL_PRODUCTS_MOCK,
  INITIAL_MOVEMENTS_MOCK,
  STOCK_LOCATIONS_MOCK,
  PRODUCT_TYPE_TEMPLATES,
  SUPPLIERS_MOCK,
  PURCHASE_ORDERS_MOCK,
  BUILD_ORDERS_MOCK,
} from "../mock/inventoryMockData";

const STORAGE_KEYS = {
  PRODUCTS: "modulo_inventario_products_v2",
  MOVEMENTS: "modulo_inventario_movements_v2",
  LOCATIONS: "modulo_inventario_locations_v2",
  SUPPLIERS: "modulo_inventario_suppliers_v2",
  PURCHASE_ORDERS: "modulo_inventario_po_v2",
  BUILD_ORDERS: "modulo_inventario_bo_v2",
};

class InventoryService {
  private products: InventoryProduct[] = [];
  private movements: StockMovement[] = [];
  private locations: StockLocation[] = [];
  private suppliers: Supplier[] = [];
  private purchaseOrders: PurchaseOrder[] = [];
  private buildOrders: BuildOrder[] = [];
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const savedMovements = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
      const savedLocations = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
      const savedSuppliers = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
      const savedPOs = localStorage.getItem(STORAGE_KEYS.PURCHASE_ORDERS);
      const savedBOs = localStorage.getItem(STORAGE_KEYS.BUILD_ORDERS);

      if (savedProducts) {
        const parsed = JSON.parse(savedProducts);
        this.products = parsed.map((p: InventoryProduct) => {
          const defaultMock = INITIAL_PRODUCTS_MOCK.find((m) => m.id === p.id);
          if (!p.imageUrl && defaultMock?.imageUrl) {
            return { ...p, imageUrl: defaultMock.imageUrl };
          }
          return p;
        });
        this.persistProducts();
      } else {
        this.products = [...INITIAL_PRODUCTS_MOCK];
        this.persistProducts();
      }

      if (savedMovements) {
        this.movements = JSON.parse(savedMovements);
      } else {
        this.movements = [...INITIAL_MOVEMENTS_MOCK];
        this.persistMovements();
      }

      if (savedLocations) {
        this.locations = JSON.parse(savedLocations);
      } else {
        this.locations = [...STOCK_LOCATIONS_MOCK];
        this.persistLocations();
      }

      if (savedSuppliers) {
        this.suppliers = JSON.parse(savedSuppliers);
      } else {
        this.suppliers = [...SUPPLIERS_MOCK];
        this.persistSuppliers();
      }

      if (savedPOs) {
        this.purchaseOrders = JSON.parse(savedPOs);
      } else {
        this.purchaseOrders = [...PURCHASE_ORDERS_MOCK];
        this.persistPurchaseOrders();
      }

      if (savedBOs) {
        this.buildOrders = JSON.parse(savedBOs);
      } else {
        this.buildOrders = [...BUILD_ORDERS_MOCK];
        this.persistBuildOrders();
      }
    } catch (e) {
      console.warn("Failed to load inventory from localStorage, using memory default", e);
      this.products = [...INITIAL_PRODUCTS_MOCK];
      this.movements = [...INITIAL_MOVEMENTS_MOCK];
      this.locations = [...STOCK_LOCATIONS_MOCK];
      this.suppliers = [...SUPPLIERS_MOCK];
      this.purchaseOrders = [...PURCHASE_ORDERS_MOCK];
      this.buildOrders = [...BUILD_ORDERS_MOCK];
    }
  }

  private persistProducts() {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(this.products));
    } catch (e) {}
  }

  private persistMovements() {
    try {
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(this.movements));
    } catch (e) {}
  }

  private persistLocations() {
    try {
      localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(this.locations));
    } catch (e) {}
  }

  private persistSuppliers() {
    try {
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(this.suppliers));
    } catch (e) {}
  }

  private persistPurchaseOrders() {
    try {
      localStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(this.purchaseOrders));
    } catch (e) {}
  }

  private persistBuildOrders() {
    try {
      localStorage.setItem(STORAGE_KEYS.BUILD_ORDERS, JSON.stringify(this.buildOrders));
    } catch (e) {}
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public async getProducts(): Promise<InventoryProduct[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...this.products]), 40);
    });
  }

  public async getStockLocations(): Promise<StockLocation[]> {
    return new Promise((resolve) => {
      // Recalcular conteo de productos por ubicación
      const locCounts = this.locations.map((loc) => ({
        ...loc,
        itemsCount: this.products.filter((p) => p.locationId === loc.id).length,
      }));
      resolve(locCounts);
    });
  }

  public async getProductById(id: string): Promise<InventoryProduct | null> {
    const product = this.products.find((p) => p.id === id);
    return product ? { ...product } : null;
  }

  public async getMovements(): Promise<StockMovement[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const sorted = [...this.movements].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        resolve(sorted);
      }, 40);
    });
  }

  public calculateStatus(stockActual: number, stockMinimo: number): ProductStatus {
    if (stockActual <= 0) return "out_of_stock";
    if (stockActual <= stockMinimo) return "low_stock";
    return "active";
  }

  public async saveProduct(
    productData: Partial<InventoryProduct> & { name: string; sku: string }
  ): Promise<InventoryProduct> {
    const now = new Date().toISOString();
    let saved: InventoryProduct;

    const locId = productData.locationId || "loc-001";
    const locObj = this.locations.find((l) => l.id === locId);
    const locName = locObj ? locObj.name : "Almacén Central";

    if (productData.id) {
      const index = this.products.findIndex((p) => p.id === productData.id);
      if (index === -1) throw new Error("Producto no encontrado.");

      const existing = this.products[index];
      const stock = productData.stockActual !== undefined ? Number(productData.stockActual) : existing.stockActual;
      const minStock = productData.stockMinimo !== undefined ? Number(productData.stockMinimo) : existing.stockMinimo;

      saved = {
        ...existing,
        ...productData,
        stockActual: stock,
        stockMinimo: minStock,
        locationId: locId,
        locationName: locName,
        costPrice: Number(productData.costPrice ?? existing.costPrice),
        salePrice: Number(productData.salePrice ?? existing.salePrice),
        metadata: productData.metadata ? { ...existing.metadata, ...productData.metadata } : existing.metadata,
        status: this.calculateStatus(stock, minStock),
        updatedAt: now,
      };

      this.products[index] = saved;
    } else {
      const stock = Number(productData.stockActual ?? 0);
      const minStock = Number(productData.stockMinimo ?? 5);
      const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      saved = {
        id,
        sku: productData.sku.toUpperCase().trim(),
        ipn: productData.ipn || `IPN-${Math.floor(10000 + Math.random() * 90000)}`,
        name: productData.name.trim(),
        category: productData.category || "General",
        productType: productData.productType || "standard",
        costPrice: Number(productData.costPrice || 0),
        salePrice: Number(productData.salePrice || 0),
        unit: productData.unit || "UND",
        stockActual: stock,
        stockMinimo: minStock,
        locationId: locId,
        locationName: locName,
        barcode: productData.barcode || "",
        notes: productData.notes || "",
        supplier: productData.supplier || "",
        imageUrl: productData.imageUrl || "",
        metadata: productData.metadata || {},
        status: this.calculateStatus(stock, minStock),
        createdAt: now,
        updatedAt: now,
      };

      this.products.unshift(saved);

      if (stock > 0) {
        const initialMovement: StockMovement = {
          id: `mov-${Date.now()}`,
          productId: saved.id,
          productSku: saved.sku,
          productName: saved.name,
          type: "ENTRADA",
          action: "STOCK_CREATE",
          quantity: stock,
          previousStock: 0,
          newStock: stock,
          toLocation: locName,
          concept: "Inventario Inicial (Creación de Producto)",
          timestamp: now,
          author: "Sistema",
          notes: "Creación de ítem con balance inicial.",
        };
        this.movements.unshift(initialMovement);
        this.persistMovements();
      }
    }

    this.persistProducts();
    this.notify();
    return saved;
  }

  public async deleteProduct(id: string): Promise<boolean> {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return false;

    this.products.splice(index, 1);
    this.persistProducts();
    this.notify();
    return true;
  }

  /**
   * Registra Entrada (STOCK_ADD) o Salida (STOCK_REMOVE)
   */
  public async registerMovement(params: {
    productId: string;
    type: "ENTRADA" | "SALIDA";
    quantity: number;
    concept: string;
    referenceDoc?: string;
    author?: string;
    notes?: string;
    batchCode?: string;
  }): Promise<{ product: InventoryProduct; movement: StockMovement }> {
    const { productId, type, quantity, concept, referenceDoc, author = "Usuario", notes, batchCode } = params;

    const productIndex = this.products.findIndex((p) => p.id === productId);
    if (productIndex === -1) throw new Error(`Producto con ID ${productId} no encontrado.`);
    if (quantity <= 0) throw new Error("La cantidad debe ser mayor a 0.");

    const currentProduct = this.products[productIndex];
    const previousStock = currentProduct.stockActual;
    let newStock = previousStock;

    if (type === "ENTRADA") {
      newStock = previousStock + Number(quantity);
    } else {
      if (previousStock < quantity) {
        throw new Error(
          `Stock insuficiente. Stock actual: ${previousStock} ${currentProduct.unit}, intentando retirar: ${quantity} ${currentProduct.unit}`
        );
      }
      newStock = previousStock - Number(quantity);
    }

    const now = new Date().toISOString();
    const updatedProduct: InventoryProduct = {
      ...currentProduct,
      stockActual: Number(newStock.toFixed(2)),
      status: this.calculateStatus(newStock, currentProduct.stockMinimo),
      updatedAt: now,
    };

    this.products[productIndex] = updatedProduct;
    this.persistProducts();

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      productId: updatedProduct.id,
      productSku: updatedProduct.sku,
      productName: updatedProduct.name,
      type,
      action: type === "ENTRADA" ? "STOCK_ADD" : "STOCK_REMOVE",
      quantity: Number(quantity),
      previousStock: Number(previousStock.toFixed(2)),
      newStock: Number(newStock.toFixed(2)),
      toLocation: type === "ENTRADA" ? updatedProduct.locationName : undefined,
      fromLocation: type === "SALIDA" ? updatedProduct.locationName : undefined,
      concept,
      referenceDoc,
      timestamp: now,
      author,
      notes,
      batchCode,
    };

    this.movements.unshift(movement);
    this.persistMovements();
    this.notify();
    return { product: updatedProduct, movement };
  }

  /**
   * Operación de Stock: Conteo Físico (STOCK_COUNT)
   */
  public async registerStockCount(params: {
    productId: string;
    countedStock: number;
    author?: string;
    notes?: string;
  }): Promise<{ product: InventoryProduct; movement: StockMovement }> {
    const { productId, countedStock, author = "Auditor", notes } = params;
    const productIndex = this.products.findIndex((p) => p.id === productId);
    if (productIndex === -1) throw new Error("Producto no encontrado.");

    const currentProduct = this.products[productIndex];
    const previousStock = currentProduct.stockActual;
    const diff = countedStock - previousStock;
    const now = new Date().toISOString();

    const updatedProduct: InventoryProduct = {
      ...currentProduct,
      stockActual: Number(countedStock.toFixed(2)),
      status: this.calculateStatus(countedStock, currentProduct.stockMinimo),
      updatedAt: now,
    };

    this.products[productIndex] = updatedProduct;
    this.persistProducts();

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      productId: updatedProduct.id,
      productSku: updatedProduct.sku,
      productName: updatedProduct.name,
      type: "CONTEO",
      action: "STOCK_COUNT",
      quantity: Math.abs(diff),
      previousStock: Number(previousStock.toFixed(2)),
      newStock: Number(countedStock.toFixed(2)),
      toLocation: updatedProduct.locationName,
      concept: `Ajuste por Conteo Físico (${diff >= 0 ? `+${diff}` : diff} ${updatedProduct.unit})`,
      timestamp: now,
      author,
      notes: notes || `Conteo físico realizado. Diferencia neta: ${diff} ${updatedProduct.unit}`,
    };

    this.movements.unshift(movement);
    this.persistMovements();
    this.notify();
    return { product: updatedProduct, movement };
  }

  /**
   * Operación de Stock: Traslado entre Ubicaciones (STOCK_TRANSFER)
   */
  public async registerStockTransfer(params: {
    productId: string;
    toLocationId: string;
    quantity: number;
    author?: string;
    notes?: string;
  }): Promise<{ product: InventoryProduct; movement: StockMovement }> {
    const { productId, toLocationId, quantity, author = "Operador", notes } = params;
    const productIndex = this.products.findIndex((p) => p.id === productId);
    if (productIndex === -1) throw new Error("Producto no encontrado.");

    const currentProduct = this.products[productIndex];
    const targetLoc = this.locations.find((l) => l.id === toLocationId);
    if (!targetLoc) throw new Error("Ubicación destino no válida.");

    const fromLocName = currentProduct.locationName;
    const toLocName = targetLoc.name;
    const now = new Date().toISOString();

    const updatedProduct: InventoryProduct = {
      ...currentProduct,
      locationId: targetLoc.id,
      locationName: targetLoc.name,
      updatedAt: now,
    };

    this.products[productIndex] = updatedProduct;
    this.persistProducts();

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      productId: updatedProduct.id,
      productSku: updatedProduct.sku,
      productName: updatedProduct.name,
      type: "TRASLADO",
      action: "STOCK_TRANSFER",
      quantity: Number(quantity),
      previousStock: currentProduct.stockActual,
      newStock: currentProduct.stockActual,
      fromLocation: fromLocName,
      toLocation: toLocName,
      concept: `Traslado de Ubicación: [${fromLocName}] ➔ [${toLocName}]`,
      timestamp: now,
      author,
      notes: notes || "Reubicación física de existencias.",
    };

    this.movements.unshift(movement);
    this.persistMovements();
    this.notify();
    return { product: updatedProduct, movement };
  }

  public extractDynamicColumns(products: InventoryProduct[]): Array<{ key: string; label: string }> {
    const keyMap = new Map<string, string>();
    const fieldDict: Record<string, string> = {};
    PRODUCT_TYPE_TEMPLATES.forEach((tpl) => {
      tpl.fields.forEach((f) => {
        fieldDict[f.key] = f.label;
      });
    });

    products.forEach((p) => {
      if (p.metadata && typeof p.metadata === "object") {
        Object.keys(p.metadata).forEach((k) => {
          const val = p.metadata[k];
          if (val !== undefined && val !== null && val !== "") {
            const label = fieldDict[k] || k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, " $1");
            keyMap.set(k, label);
          }
        });
      }
    });

    return Array.from(keyMap.entries()).map(([key, label]) => ({ key, label }));
  }

  // ── Purchasing Operations ──
  public async getSuppliers(): Promise<Supplier[]> {
    return new Promise((resolve) => resolve([...this.suppliers]));
  }

  public async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    return new Promise((resolve) => resolve([...this.purchaseOrders]));
  }

  public async createPurchaseOrder(
    poData: Omit<PurchaseOrder, "id" | "orderNumber" | "status" | "issueDate">
  ): Promise<PurchaseOrder> {
    const now = new Date().toISOString();
    const orderNumber = `OC-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now()}`,
      orderNumber,
      status: "pending",
      issueDate: now,
    };

    this.purchaseOrders.unshift(newPO);
    this.persistPurchaseOrders();
    this.notify();
    return newPO;
  }

  public async receivePurchaseOrder(poId: string): Promise<PurchaseOrder> {
    const poIndex = this.purchaseOrders.findIndex((po) => po.id === poId);
    if (poIndex === -1) throw new Error("Orden de compra no encontrada.");

    const po = this.purchaseOrders[poIndex];
    if (po.status === "received") throw new Error("Esta orden ya fue recibida.");

    const now = new Date().toISOString();

    // Actualizar stock de cada producto recibido e insertar movimiento Kardex
    for (const item of po.items) {
      const pIndex = this.products.findIndex((p) => p.id === item.productId);
      if (pIndex !== -1) {
        const product = this.products[pIndex];
        const prevStock = product.stockActual;
        const nextStock = prevStock + item.quantity;

        this.products[pIndex] = {
          ...product,
          stockActual: Number(nextStock.toFixed(2)),
          costPrice: item.unitPrice > 0 ? item.unitPrice : product.costPrice,
          status: this.calculateStatus(nextStock, product.stockMinimo),
          updatedAt: now,
        };

        const movement: StockMovement = {
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          productId: product.id,
          productSku: product.sku,
          productName: product.name,
          type: "ENTRADA",
          action: "STOCK_ADD",
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: nextStock,
          toLocation: po.targetLocationName,
          concept: `Recepción Orden de Compra: ${po.orderNumber} (${po.supplierName})`,
          referenceDoc: po.orderNumber,
          timestamp: now,
          author: "Recepción Almacén",
          notes: `Ingreso por compra a proveedor ${po.supplierName}. Costo unitario: $${item.unitPrice}`,
        };
        this.movements.unshift(movement);
      }
    }

    const updatedPO: PurchaseOrder = {
      ...po,
      status: "received",
      receivedDate: now,
    };

    this.purchaseOrders[poIndex] = updatedPO;
    this.persistProducts();
    this.persistMovements();
    this.persistPurchaseOrders();
    this.notify();
    return updatedPO;
  }

  // ── Manufacturing / BOM Operations ──
  public async getBuildOrders(): Promise<BuildOrder[]> {
    return new Promise((resolve) => resolve([...this.buildOrders]));
  }

  public async createBuildOrder(
    boData: Omit<BuildOrder, "id" | "buildNumber" | "status" | "createdAt">
  ): Promise<BuildOrder> {
    const now = new Date().toISOString();
    const buildNumber = `BOM-ENS-${Math.floor(100 + Math.random() * 900)}`;
    const newBO: BuildOrder = {
      ...boData,
      id: `bo-${Date.now()}`,
      buildNumber,
      status: "pending",
      createdAt: now,
    };

    this.buildOrders.unshift(newBO);
    this.persistBuildOrders();
    this.notify();
    return newBO;
  }

  public async executeBuildOrder(boId: string): Promise<BuildOrder> {
    const boIndex = this.buildOrders.findIndex((b) => b.id === boId);
    if (boIndex === -1) throw new Error("Orden de ensamble no encontrada.");

    const bo = this.buildOrders[boIndex];
    if (bo.status === "completed") throw new Error("Esta orden ya fue completada.");

    // Validar disponibilidad de insumos en stock
    for (const comp of bo.bom) {
      const prod = this.products.find((p) => p.id === comp.componentProductId);
      const totalNeeded = comp.quantityRequired * bo.quantityToBuild;
      if (!prod || prod.stockActual < totalNeeded) {
        throw new Error(
          `Stock insuficiente para el insumo ${comp.componentName}. Requiere: ${totalNeeded} ${comp.unit}, disponible: ${prod ? prod.stockActual : 0} ${comp.unit}`
        );
      }
    }

    const now = new Date().toISOString();

    // 1. Deducir materias primas del BOM
    for (const comp of bo.bom) {
      const pIndex = this.products.findIndex((p) => p.id === comp.componentProductId);
      if (pIndex !== -1) {
        const prod = this.products[pIndex];
        const qtyToDeduct = comp.quantityRequired * bo.quantityToBuild;
        const prevStock = prod.stockActual;
        const nextStock = prevStock - qtyToDeduct;

        this.products[pIndex] = {
          ...prod,
          stockActual: Number(nextStock.toFixed(2)),
          status: this.calculateStatus(nextStock, prod.stockMinimo),
          updatedAt: now,
        };

        const movement: StockMovement = {
          id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          productId: prod.id,
          productSku: prod.sku,
          productName: prod.name,
          type: "SALIDA",
          action: "STOCK_REMOVE",
          quantity: qtyToDeduct,
          previousStock: prevStock,
          newStock: nextStock,
          fromLocation: prod.locationName,
          concept: `Consumo Ensamble BOM: ${bo.buildNumber} (${bo.outputProductName})`,
          referenceDoc: bo.buildNumber,
          timestamp: now,
          author: "Producción",
          notes: `Consumo para armar ${bo.quantityToBuild} unidades de ${bo.outputProductName}`,
        };
        this.movements.unshift(movement);
      }
    }

    // 2. Incrementar stock del producto terminado
    const outputIndex = this.products.findIndex((p) => p.id === bo.outputProductId);
    if (outputIndex !== -1) {
      const outputProduct = this.products[outputIndex];
      const prevStock = outputProduct.stockActual;
      const nextStock = prevStock + bo.quantityToBuild;

      this.products[outputIndex] = {
        ...outputProduct,
        stockActual: Number(nextStock.toFixed(2)),
        status: this.calculateStatus(nextStock, outputProduct.stockMinimo),
        updatedAt: now,
      };

      const movement: StockMovement = {
        id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        productId: outputProduct.id,
        productSku: outputProduct.sku,
        productName: outputProduct.name,
        type: "ENTRADA",
        action: "STOCK_ADD",
        quantity: bo.quantityToBuild,
        previousStock: prevStock,
        newStock: nextStock,
        toLocation: bo.locationName,
        concept: `Producción Terminada BOM: ${bo.buildNumber}`,
        referenceDoc: bo.buildNumber,
        timestamp: now,
        author: "Producción",
        notes: `Ingreso de producto terminado ensamble ${bo.buildNumber}`,
      };
      this.movements.unshift(movement);
    }

    const updatedBO: BuildOrder = {
      ...bo,
      status: "completed",
      completedAt: now,
    };

    this.buildOrders[boIndex] = updatedBO;
    this.persistProducts();
    this.persistMovements();
    this.persistBuildOrders();
    this.notify();
    return updatedBO;
  }

  public resetToDefaults() {
    this.products = [...INITIAL_PRODUCTS_MOCK];
    this.movements = [...INITIAL_MOVEMENTS_MOCK];
    this.locations = [...STOCK_LOCATIONS_MOCK];
    this.suppliers = [...SUPPLIERS_MOCK];
    this.purchaseOrders = [...PURCHASE_ORDERS_MOCK];
    this.buildOrders = [...BUILD_ORDERS_MOCK];
    this.persistProducts();
    this.persistMovements();
    this.persistLocations();
    this.persistSuppliers();
    this.persistPurchaseOrders();
    this.persistBuildOrders();
    this.notify();
  }
}

export const inventoryService = new InventoryService();
