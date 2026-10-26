import type { InventoryStatus, ListingStatus, RequestStatus } from './types';

const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 });
export const naira = (n: number | null | undefined) => (n === null || n === undefined ? '-' : money.format(n));
export const num = (n: number) => new Intl.NumberFormat('en-NG').format(n);

// Calendar dates (expiry) have no time zone; timestamps are shown in Lagos time.
export const formatDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '-';
export const formatDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' }) : '-';

export type Tone = 'green' | 'orange' | 'red' | 'blue' | 'purple' | 'gray';

export const STOCK_META: Record<InventoryStatus, { label: string; tone: Tone; color: string }> = {
  HEALTHY: { label: 'Healthy', tone: 'green', color: '#16a34a' },
  LOW_STOCK: { label: 'Low stock', tone: 'orange', color: '#f59e0b' },
  NEAR_EXPIRY: { label: 'Near expiry', tone: 'orange', color: '#f97316' },
  OUT_OF_STOCK: { label: 'Out of stock', tone: 'gray', color: '#9ca3af' },
  EXPIRED: { label: 'Expired', tone: 'red', color: '#dc2626' },
};

export const REQUEST_META: Record<RequestStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'orange' },
  ACCEPTED: { label: 'Accepted, awaiting receipt', tone: 'blue' },
  REJECTED: { label: 'Rejected', tone: 'red' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'gray' },
};

export const LISTING_META: Record<ListingStatus, { label: string; tone: Tone }> = {
  AVAILABLE: { label: 'Available', tone: 'green' },
  PENDING: { label: 'Fully reserved', tone: 'blue' },
  COMPLETED: { label: 'Completed', tone: 'gray' },
  CANCELLED: { label: 'Cancelled', tone: 'gray' },
};

export const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Cream', 'Ointment', 'Drops', 'Inhaler', 'Other'];

export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export const expiryNote = (days: number) => (days < 0 ? `expired ${-days}d ago` : days === 0 ? 'expires today' : `${days}d left`);
