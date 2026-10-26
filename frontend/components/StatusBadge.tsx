import { REQUEST_META, LISTING_META, STOCK_META } from '@/lib/format';
import type { InventoryStatus, ListingStatus, RequestStatus } from '@/lib/types';
import { Badge } from './ui';

export function StatusBadge({ status }: { status: InventoryStatus }) {
  const m = STOCK_META[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
export function RequestBadge({ status }: { status: RequestStatus }) {
  const m = REQUEST_META[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
export function ListingBadge({ status }: { status: ListingStatus }) {
  const m = LISTING_META[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
