export type Pagination = { page: number; pageSize: number; total: number; totalPages: number };
export type InventoryStatus = 'HEALTHY' | 'LOW_STOCK' | 'NEAR_EXPIRY' | 'OUT_OF_STOCK' | 'EXPIRED';
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
export type ListingStatus = 'AVAILABLE' | 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type Verification = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface MedicineInfo { name: string; strength: string; dosageForm: string; category?: string }

export interface InventoryItem {
  id: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  costPrice: number;
  sellingPrice: number;
  batchNumber: string;
  nafdacRegNo: string | null;
  expiryDate: string;
  daysToExpiry: number;
  status: InventoryStatus;
  imageUrl: string | null;
  source: string;
  createdAt: string;
  medicine: MedicineInfo & { id: string; category: string };
}

export interface Listing {
  id: string;
  status: ListingStatus;
  quantity: number;
  remaining: number;
  reservedQty: number;
  completedQty: number;
  discountPercent: number;
  originalPrice: number | null;
  unitPrice: number;
  createdAt: string;
  inventoryItemId: string;
  medicine: MedicineInfo;
  batchNumber: string;
  expiryDate: string;
  daysToExpiry: number;
  pharmacy?: { id: string; name: string; city: string; state: string };
  pendingRequests?: number;
}

export interface Partner { id: string; name: string; city: string; state: string; phone: string | null }

export interface TransferRequestRow {
  id: string;
  status: RequestStatus;
  quantity: number;
  unitPrice: number;
  total: number;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  completedAt: string | null;
  medicine: MedicineInfo;
  batchNumber: string;
  expiryDate: string;
  partner: Partner;
}

export interface AlertRow {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'URGENT';
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface AppConfig { ai: boolean; serverOcr: boolean; email: boolean; imageUploads: boolean }

export interface InsightPayload {
  summary: string;
  recommendations: { medicine: string; action: string; reason: string; priority: 'high' | 'medium' | 'low' }[];
  inputs?: Record<string, number>;
  disclaimer?: string;
}
export interface Insight { id: string; type: string; payload: InsightPayload; inputWindowDays: number; model: string | null; generatedAt: string }
