import {
  DashboardStats,
  Location,
  Operation,
  Product,
  ProductCategory,
  StockLedgerItem,
  User,
  Warehouse,
} from '../types.ts';

const TOKEN_KEY = 'stocksense_auth_token';

export const getStoredToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

const getAuthHeaders = (): Record<string, string> => {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// API Client
export const api = {
  // Auth
  async register(data: { name: string; email: string; password: string; role?: string }) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    return res.json() as Promise<{ user: User; token: string }>;
  },

  async login(data: { email: string; password: string }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return res.json() as Promise<{ user: User; token: string }>;
  },

  async firebaseSync(idToken: string) {
    const res = await fetch('/api/auth/firebase-sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Firebase sync failed');
    }
    return res.json() as Promise<{ user: User; token: string }>;
  },

  async requestOtp(email: string) {
    const res = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to request OTP');
    }
    return res.json() as Promise<{
      success: boolean;
      message: string;
      testOtpCode?: string;
      recipient: string;
      expiresInMinutes: number;
    }>;
  },

  async verifyOtpResetPassword(data: { email: string; otpCode: string; newPassword: string }) {
    const res = await fetch('/api/auth/verify-otp-reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reset password');
    }
    return res.json() as Promise<{ success: boolean; message: string }>;
  },

  async getMe() {
    const res = await fetch('/api/auth/me', {
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Not authenticated');
    return res.json() as Promise<{ user: User }>;
  },

  // Dashboard
  async getDashboardStats() {
    const res = await fetch('/api/dashboard/stats', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load dashboard stats');
    return res.json() as Promise<DashboardStats>;
  },

  // Products
  async getProducts() {
    const res = await fetch('/api/products', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load products');
    return res.json() as Promise<Product[]>;
  },

  async createProduct(data: {
    name: string;
    sku: string;
    categoryId?: number;
    uom: string;
    costPrice?: string;
    salePrice?: string;
    minReorderLevel?: number;
    reorderQty?: number;
    description?: string;
    initialStock?: number;
    initialLocationId?: number;
  }) {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create product');
    }
    return res.json() as Promise<Product>;
  },

  async updateProduct(id: number, data: Partial<Product>) {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update product');
    return res.json() as Promise<Product>;
  },

  async getCategories() {
    const res = await fetch('/api/categories', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load categories');
    return res.json() as Promise<ProductCategory[]>;
  },

  async createCategory(name: string, description?: string) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) throw new Error('Failed to create category');
    return res.json() as Promise<ProductCategory>;
  },

  // Warehouses & Locations
  async getWarehouses() {
    const res = await fetch('/api/warehouses', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load warehouses');
    return res.json() as Promise<Warehouse[]>;
  },

  async createWarehouse(data: { name: string; shortCode: string; address?: string }) {
    const res = await fetch('/api/warehouses', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create warehouse');
    return res.json() as Promise<Warehouse>;
  },

  async getLocations() {
    const res = await fetch('/api/locations', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load locations');
    return res.json() as Promise<Location[]>;
  },

  async createLocation(data: {
    name: string;
    shortCode: string;
    warehouseId?: number;
    locationType?: string;
  }) {
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create location');
    return res.json() as Promise<Location>;
  },

  // Operations
  async getOperations(type?: string) {
    const url = type ? `/api/operations?type=${type}` : '/api/operations';
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load operations');
    return res.json() as Promise<Operation[]>;
  },

  async getOperation(id: number) {
    const res = await fetch(`/api/operations/${id}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load operation');
    return res.json() as Promise<Operation>;
  },

  async createOperation(data: {
    operationType: 'receipt' | 'delivery' | 'internal' | 'adjustment';
    contact?: string;
    sourceLocationId?: number;
    destLocationId?: number;
    scheduledDate?: string;
    responsible?: string;
    notes?: string;
    lines: Array<{ productId: number; demandQty: number; doneQty?: number }>;
  }) {
    const res = await fetch('/api/operations', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create operation');
    }
    return res.json() as Promise<Operation>;
  },

  async updateOperationStatus(id: number, status: string) {
    const res = await fetch(`/api/operations/${id}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json() as Promise<Operation>;
  },

  async cancelOperation(id: number) {
    return this.updateOperationStatus(id, 'canceled');
  },

  async validateOperation(id: number) {
    const res = await fetch(`/api/operations/${id}/validate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Validation failed');
    }
    return data as { success: boolean; message: string; operation: Operation };
  },

  // Stock Ledger
  async getStockLedger(search?: string, type?: string) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (type) params.append('type', type);
    const url = `/api/stock-ledger?${params.toString()}`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load stock ledger');
    return res.json() as Promise<StockLedgerItem[]>;
  },

  // Email Plans
  async getEmailPlans() {
    const res = await fetch('/api/email-plans');
    if (!res.ok) throw new Error('Failed to load email provider plans');
    return res.json();
  },
};
