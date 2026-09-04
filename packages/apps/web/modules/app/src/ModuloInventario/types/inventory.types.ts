export type ProductType = "standard" | "perishable" | "apparel" | "electronics" | "pharma" | "raw_material";

export type UnitOfMeasure = "UND" | "KG" | "GR" | "LT" | "ML" | "METRO" | "CAJA" | "PAR" | "PAQUETE" | "ROLLO";

export type ProductStatus = "active" | "inactive" | "low_stock" | "out_of_stock";

export interface DynamicFieldDefinition {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "boolean";
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

export interface ProductTypeTemplate {
  id: ProductType;
  label: string;
  description: string;
  iconName: string;
  fields: DynamicFieldDefinition[];
}

export interface StockLocation {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentLocationId?: string | null;
  itemsCount?: number;
}

export interface InventoryProduct {
  id: string;
  sku: string;
  ipn?: string; // Internal Part Number
  name: string;
  category: string;
  productType: ProductType;
  costPrice: number;
  salePrice: number;
  unit: UnitOfMeasure;
  stockActual: number;
  stockMinimo: number;
  locationId: string;
  locationName: string;
  barcode?: string;
  notes?: string;
  supplier?: string;
  imageUrl?: string;
  // Dynamic JSONB attributes & parameters
  metadata: Record<string, string | number | boolean | null>;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = "ENTRADA" | "SALIDA" | "CONTEO" | "TRASLADO";

export type StockTrackingAction =
  | "STOCK_ADD"
  | "STOCK_REMOVE"
  | "STOCK_COUNT"
  | "STOCK_TRANSFER"
  | "STOCK_CREATE";

export interface StockMovement {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  type: MovementType;
  action: StockTrackingAction;
  quantity: number;
  previousStock: number;
  newStock: number;
  fromLocation?: string;
  toLocation?: string;
  concept: string;
  referenceDoc?: string;
  timestamp: string;
  author: string;
  notes?: string;
  batchCode?: string;
}

export interface InventoryFilterOptions {
  searchQuery: string;
  productType?: ProductType | "all";
  status?: ProductStatus | "all";
  category?: string | "all";
  locationId?: string | "all";
}

// ── Purchasing & Suppliers ──
export interface Supplier {
  id: string;
  name: string;
  taxId: string; // NIT / RUT
  contactPerson: string;
  email: string;
  phone: string;
  leadTimeDays: number;
  rating?: number;
}

export type PurchaseOrderStatus = "draft" | "pending" | "received" | "cancelled";

export interface PurchaseOrderItem {
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit: UnitOfMeasure;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  targetLocationId: string;
  targetLocationName: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalAmount: number;
  issueDate: string;
  expectedDate?: string;
  receivedDate?: string;
  notes?: string;
}

// ── Manufacturing & BOM (Bill of Materials) ──
export interface BomItem {
  id: string;
  componentProductId: string;
  componentSku: string;
  componentName: string;
  quantityRequired: number;
  unit: UnitOfMeasure;
}

export type BuildOrderStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface BuildOrder {
  id: string;
  buildNumber: string;
  outputProductId: string;
  outputProductSku: string;
  outputProductName: string;
  quantityToBuild: number;
  status: BuildOrderStatus;
  bom: BomItem[];
  locationId: string;
  locationName: string;
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

