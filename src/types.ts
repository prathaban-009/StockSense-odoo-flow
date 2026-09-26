export type UserRole = 'Inventory Manager' | 'Warehouse Staff';

export interface User {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  canCreateReceipts?: boolean;
  warehouseId?: number | null;
  warehouseName?: string;
}

export interface Employee {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  canCreateReceipts: boolean;
  warehouseId?: number | null;
  warehouseName?: string;
  activeTasksCount?: number;
  createdAt?: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  categoryId?: number | null;
  categoryName?: string;
  uom: string; // Units, kg, m, box
  costPrice: string;
  salePrice: string;
  minReorderLevel: number;
  reorderQty: number;
  description?: string;
  onHand: number;
  reserved: number;
  freeToUse: number;
  stockPerLocation?: Array<{
    id: number;
    locationId: number;
    onHand: number;
    reserved: number;
  }>;
}

export interface Warehouse {
  id: number;
  name: string;
  shortCode: string;
  address?: string;
  locations?: Location[];
}

export interface Location {
  id: number;
  name: string;
  shortCode: string;
  locationType: 'internal' | 'vendor' | 'customer' | 'inventory_loss';
  warehouseId?: number | null;
  warehouseName?: string;
  warehouseCode?: string;
}

export type OperationType = 'receipt' | 'delivery' | 'internal' | 'adjustment';
export type OperationStatus = 'draft' | 'waiting' | 'ready' | 'processing' | 'done' | 'canceled';

export interface OperationLine {
  id?: number;
  operationId?: number;
  productId: number;
  productName?: string;
  productSku?: string;
  productUom?: string;
  costPrice?: string;
  demandQty: number;
  doneQty: number;
  destLocationId?: number;
  destLocationName?: string;
  sourceLocationId?: number;
  sourceLocationName?: string;
  status?: 'pending' | 'done';
}

export interface Operation {
  id: number;
  reference: string;
  operationType: OperationType;
  status: OperationStatus;
  contact?: string;
  warehouseId?: number | null;
  warehouseName?: string;
  sourceLocationId?: number | null;
  sourceLocationName?: string;
  destLocationId?: number | null;
  destLocationName?: string;
  scheduledDate?: string;
  responsible?: string;
  assignedToId?: number | null;
  assignedStaffName?: string;
  notes?: string;
  lines: OperationLine[];
  createdAt?: string;
}

export interface StockLedgerItem {
  id: number;
  reference: string;
  operationType: OperationType;
  productId: number;
  productName: string;
  productSku: string;
  productUom: string;
  fromLocation: string;
  toLocation: string;
  contact?: string;
  quantity: number;
  status: string;
  date: string;
  createdAt?: string;
}

export interface DashboardStats {
  totalProductsCount: number;
  totalProductsInStock: number;
  lowStockCount: number;
  receipts: {
    total: number;
    toReceive: number;
    late: number;
    waiting: number;
  };
  deliveries: {
    total: number;
    toDeliver: number;
    late: number;
    waiting: number;
  };
  internalTransfersScheduled: number;
}

export interface MailProviderPlan {
  provider: string;
  status: string;
  recommendedFor: string;
  setupSteps: string[];
}
