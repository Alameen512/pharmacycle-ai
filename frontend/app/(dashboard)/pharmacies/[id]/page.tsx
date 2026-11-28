
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { RequestModal } from '@/components/RequestModal';
import {
  Badge,
  EmptyState,
  ErrorState,
  Icon,
  LoadingBlock,
  Pagination,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { formatDate, naira } from '@/lib/format';
import type { Listing, Pagination as Pg } from '@/lib/types';
import { useApi } from '@/lib/useApi';

type Partner = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string | null;
  logoUrl: string | null;
  verifiedAt: string | null;
};

type InventoryStatus =
  | 'ALL'
  | 'HEALTHY'
  | 'LOW_STOCK'
  | 'NEAR_EXPIRY'
  | 'OUT_OF_STOCK'
  | 'EXPIRED';

type InventoryItem = {
  id: string;
  medicine: {
    name: string;
    strength: string;
    dosageForm: string | null;
    category: string | null;
    imageUrl: string | null;
  };
  batchNumber: string;
  quantity: number;
  reservedQty: number;
  availableQuantity: number;
  expiryDate: string;
  daysToExpiry: number;
  status: Exclude<InventoryStatus, 'ALL'>;
  listedForTransfer: boolean;
  listedQuantity: number;
};

type InventorySummary = {
  totalBatches: number;
  totalUnits: number;
  availableUnits: number;
  listedBatches: number;
  healthy: number;
  lowStock: number;
  nearExpiry: number;
  outOfStock: number;
  expired: number;
};

type ProfileResponse = {
  pharmacy: Partner;
  summary: InventorySummary;
  inventory: InventoryItem[];
  inventoryPagination: Pg;
  listings: Listing[];
  pagination: Pg;
};

const inventoryStatuses: {
  value: InventoryStatus;
  label: string;
}[] = [
  { value: 'ALL', label: 'All stock' },
  { value: 'HEALTHY', label: 'Healthy stock' },
  { value: 'LOW_STOCK', label: 'Low stock' },
  { value: 'NEAR_EXPIRY', label: 'Near expiry' },
  { value: 'OUT_OF_STOCK', label: 'Out of stock' },
  { value: 'EXPIRED', label: 'Expired' },
];

const statusStyles: Record<
  Exclude<InventoryStatus, 'ALL'>,
  string
> = {
  HEALTHY: 'bg-green-50 text-green-700',
  LOW_STOCK: 'bg-amber-50 text-amber-700',
  NEAR_EXPIRY: 'bg-orange-50 text-orange-700',
  OUT_OF_STOCK: 'bg-gray-100 text-gray-700',
  EXPIRED: 'bg-red-50 text-red-700',
};

const statusLabels: Record<
  Exclude<InventoryStatus, 'ALL'>,
  string
> = {
  HEALTHY: 'Healthy',
  LOW_STOCK: 'Low stock',
  NEAR_EXPIRY: 'Near expiry',
  OUT_OF_STOCK: 'Out of stock',
  EXPIRED: 'Expired',
};

export default function PharmacyProfilePage() {
  const params = useParams<{ id: string }>();
  const pharmacyId = params.id;

  const [page, setPage] = useState(1);
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryStatus, setInventoryStatus] =
    useState<InventoryStatus>('ALL');
  const [inventorySearch, setInventorySearch] = useState('');
  const [target, setTarget] = useState<Listing | null>(null);

  const { session } = useAuth();
  const toast = useToast();

  const verified =
    session?.kind === 'pharmacy' &&
    session.pharmacy.verificationStatus === 'VERIFIED';

  const { data, error, loading, reload } = useApi<ProfileResponse>(
    `/pharmacies/${pharmacyId}`,
    {
      page,
      pageSize: 12,
      inventoryPage,
      inventoryPageSize: 12,
      status: inventoryStatus,
      search: inventorySearch,
    }
  );

  const summaryCards = data
    ? [
        {
          label: 'Total batches',
          value: data.summary.totalBatches,
          detail: 'Medicine batches',
          style: 'bg-blue-50 text-blue-700',
          icon: 'package' as const,
        },
        {
          label: 'Total units',
          value: data.summary.totalUnits,
          detail: 'Recorded stock',
          style: 'bg-green-50 text-green-700',
          icon: 'layers' as const,
        },
        {
          label: 'Low stock',
          value: data.summary.lowStock,
          detail: '50 units or less',
          style: 'bg-amber-50 text-amber-700',
          icon: 'alertTriangle' as const,
        },
        {
          label: 'Near expiry',
          value: data.summary.nearExpiry,
          detail: 'Within 30 days',
          style: 'bg-orange-50 text-orange-700',
          icon: 'clock' as const,
        },
        {
          label: 'Out of stock',
          value: data.summary.outOfStock,
          detail: 'No available units',
          style: 'bg-gray-100 text-gray-700',
          icon: 'package' as const,
        },
        {
          label: 'Expired',
          value: data.summary.expired,
          detail: 'Past expiry date',
          style: 'bg-red-50 text-red-700',
          icon: 'alertTriangle' as const,
        },
      ]
    : [];

  return (
    <div className="min-w-0 space-y-6 overflow-x-clip">
      <div>
        <Link
          href="/pharmacies"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-green-700"
        >
          <Icon name="arrowLeft" className="h-4 w-4" />
          Back to partner pharmacies
        </Link>
      </div>

      {loading && !data ? (
        <div className="card">
          <LoadingBlock />
        </div>
      ) : error ? (
        <div className="card">
          <ErrorState message={error} onRetry={reload} />
        </div>
      ) : !data ? (
        <div className="card">
          <EmptyState
            title="Pharmacy not found"
            body="This pharmacy profile could not be loaded."
          />
        </div>
      ) : (
        <>
          {/* Pharmacy information */}
          <section className="card overflow-hidden">
            <div className="h-2 bg-green-600" />

            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-7">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-green-50 text-green-700">
                {data.pharmacy.logoUrl ? (
                  <img
                    src={data.pharmacy.logoUrl}
                    alt={`${data.pharmacy.name} logo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Icon name="pharmacy" className="h-8 w-8" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-words text-2xl font-bold tracking-tight text-gray-950">
                    {data.pharmacy.name}
                  </h1>
                  <Badge tone="green">Verified</Badge>
                </div>

                <p className="mt-2 flex items-start gap-2 text-sm text-gray-500">
                  <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {data.pharmacy.address}
                    {data.pharmacy.city ? `, ${data.pharmacy.city}` : ''}
                    {data.pharmacy.state ? `, ${data.pharmacy.state}` : ''}
                  </span>
                </p>

                {data.pharmacy.phone && (
                  <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <Icon name="phone" className="h-4 w-4" />
                    {data.pharmacy.phone}
                  </p>
                )}

                <p className="mt-3 text-xs text-gray-400">
                  Verified partner pharmacy
                </p>
              </div>

              <div className="shrink-0 rounded-xl bg-green-50 px-4 py-3">
                <p className="text-xs font-medium text-green-700">
                  Marketplace listings
                </p>
                <p className="mt-1 text-2xl font-bold text-green-800">
                  {data.pagination.total}
                </p>
              </div>
            </div>
          </section>

          {/* Inventory overview */}
          <section className="min-w-0 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-gray-950">
                Inventory overview
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                View this pharmacy's recorded stock levels, availability and
                expiry information.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {summaryCards.map((item) => (
                <article
                  key={item.label}
                  className="card min-w-0 p-4"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.style}`}
                  >
                    <Icon name={item.icon} className="h-4 w-4" />
                  </div>

                  <p className="mt-3 text-xs font-medium text-gray-500">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-950">
                    {item.value.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {item.detail}
                  </p>
                </article>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Available units
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-950">
                    {data.summary.availableUnits.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl bg-green-50 p-3 text-green-700">
                  <Icon name="package" className="h-5 w-5" />
                </div>
              </div>

              <div className="card flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Batches listed for transfer
                  </p>
                  <p className="mt-1 text-xl font-bold text-gray-950">
                    {data.summary.listedBatches.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                  <Icon name="shoppingBag" className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Inventory search and filters */}
            <div className="card space-y-4 p-4 sm:p-5">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Pharmacy stock records
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Search medicines or filter by their current stock status.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Icon
                    name="search"
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="search"
                    value={inventorySearch}
                    onChange={(event) => {
                      setInventorySearch(event.target.value);
                      setInventoryPage(1);
                    }}
                    placeholder="Search medicine or batch number..."
                    className="input w-full pl-9"
                  />
                </div>

                <select
                  value={inventoryStatus}
                  onChange={(event) => {
                    setInventoryStatus(
                      event.target.value as InventoryStatus
                    );
                    setInventoryPage(1);
                  }}
                  className="input w-full"
                >
                  {inventoryStatuses.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading && !data.inventory.length ? (
              <div className="card">
                <LoadingBlock />
              </div>
            ) : !data.inventory.length ? (
              <div className="card">
                <EmptyState
                  title="No inventory records found"
                  body="There are no stock records matching your search or selected filter."
                />
              </div>
            ) : (
              <>
                <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {data.inventory.map((item) => (
                    <article
                      key={item.id}
                      className="card min-w-0 p-4 sm:p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50 text-gray-500">
                          {item.medicine.imageUrl ? (
                            <img
                              src={item.medicine.imageUrl}
                              alt={item.medicine.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Icon name="package" className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="break-words font-semibold text-gray-900">
                            {item.medicine.name}
                          </h4>
                          <p className="mt-1 text-xs text-gray-500">
                            {item.medicine.strength}
                            {item.medicine.dosageForm
                              ? ` · ${item.medicine.dosageForm}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            statusStyles[item.status]
                          }`}
                        >
                          {statusLabels[item.status]}
                        </span>

                        {item.listedForTransfer && (
                          <span className="text-xs font-medium text-green-700">
                            Listed for transfer
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
                        <div>
                          <p className="text-xs text-gray-500">
                            Total quantity
                          </p>
                          <p className="mt-1 text-lg font-bold text-gray-900">
                            {item.quantity.toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Available units
                          </p>
                          <p className="mt-1 text-lg font-bold text-green-700">
                            {item.availableQuantity.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-gray-500">
                            Reserved units
                          </span>
                          <span className="font-medium text-gray-800">
                            {item.reservedQty.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-gray-500">
                            Expiry date
                          </span>
                          <span className="font-medium text-gray-800">
                            {formatDate(item.expiryDate)}
                          </span>
                        </div>

                        <div className="flex justify-between gap-3 text-sm">
                          <span className="text-gray-500">
                            Batch number
                          </span>
                          <span className="max-w-[60%] break-all text-right font-medium text-gray-800">
                            {item.batchNumber}
                          </span>
                        </div>

                        {item.daysToExpiry >= 0 &&
                          item.daysToExpiry <= 30 && (
                            <div className="flex justify-between gap-3 text-sm">
                              <span className="text-orange-700">
                                Time to expiry
                              </span>
                              <span className="font-semibold text-orange-700">
                                {item.daysToExpiry === 0
                                  ? 'Expires today'
                                  : `${item.daysToExpiry} days`}
                              </span>
                            </div>
                          )}

                        {item.daysToExpiry < 0 && (
                          <div className="flex justify-between gap-3 text-sm">
                            <span className="text-red-700">
                              Expired
                            </span>
                            <span className="font-semibold text-red-700">
                              {Math.abs(item.daysToExpiry)} days ago
                            </span>
                          </div>
                        )}

                        {item.listedForTransfer && (
                          <div className="flex justify-between gap-3 text-sm">
                            <span className="text-gray-500">
                              Listed quantity
                            </span>
                            <span className="font-medium text-gray-800">
                              {item.listedQuantity.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="rounded-xl border border-gray-100 bg-white px-4">
                  <Pagination
                    page={data.inventoryPagination.page}
                    totalPages={data.inventoryPagination.totalPages}
                    total={data.inventoryPagination.total}
                    onPage={setInventoryPage}
                  />
                </div>
              </>
            )}
          </section>

          {/* Marketplace listings */}
          <section className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-950">
                  Available stock
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Browse medicines this pharmacy has listed on the marketplace.
                </p>
              </div>

              <Link
                href="/transfers"
                className="text-sm font-semibold text-green-700 hover:text-green-800"
              >
                Open marketplace
              </Link>
            </div>

            {!data.listings.length ? (
              <div className="card">
                <EmptyState
                  title="No available listings"
                  body="This pharmacy currently has no stock listed on the marketplace. Check back later for new listings."
                />
              </div>
            ) : (
              <>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {data.listings.map((listing) => (
                    <article
                      key={listing.id}
                      className="card flex min-w-0 flex-col p-4 transition-shadow hover:shadow-md sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words font-semibold text-gray-900">
                            {listing.medicine.name}
                          </h3>
                          <p className="mt-1 text-xs text-gray-500">
                            {listing.medicine.strength}
                            {listing.medicine.dosageForm
                              ? ` · ${listing.medicine.dosageForm}`
                              : ''}
                          </p>
                        </div>

                        {listing.discountPercent > 0 && (
                          <span className="shrink-0 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
                            {listing.discountPercent}% OFF
                          </span>
                        )}
                      </div>

                      <div className="mt-5 rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">
                          Price per unit
                        </p>

                        <div className="mt-1 flex flex-wrap items-baseline gap-2">
                          <span className="text-xl font-bold text-gray-950">
                            {naira(listing.unitPrice)}
                          </span>

                          {listing.discountPercent > 0 && (
                            <span className="text-xs text-gray-400 line-through">
                              {naira(listing.originalPrice)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-400">
                            Available quantity
                          </p>
                          <p className="mt-1 text-sm font-semibold text-gray-800">
                            {listing.remaining}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-400">
                            Expiry date
                          </p>
                          <p className="mt-1 text-sm font-semibold text-gray-800">
                            {formatDate(listing.expiryDate)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-xs text-gray-400">
                          Batch number
                        </p>
                        <p className="mt-1 break-all text-sm text-gray-700">
                          {listing.batchNumber}
                        </p>
                      </div>

                      <div className="mt-5 border-t border-gray-100 pt-4">
                        <button
                          type="button"
                          className="btn btn-primary w-full"
                          disabled={!verified || listing.remaining < 1}
                          onClick={() =>
                            setTarget({
                              ...listing,
                              pharmacy: {
                                id: data.pharmacy.id,
                                name: data.pharmacy.name,
                                city: data.pharmacy.city,
                                state: data.pharmacy.state,
                              },
                            })
                          }
                        >
                          <Icon name="package" className="h-4 w-4" />
                          Request this stock
                        </button>

                        {!verified && (
                          <p className="mt-2 text-center text-xs text-amber-700">
                            A verified pharmacy account is required to request stock.
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>

                <div className="rounded-xl border border-gray-100 bg-white px-4">
                  <Pagination
                    page={data.pagination.page}
                    totalPages={data.pagination.totalPages}
                    total={data.pagination.total}
                    onPage={setPage}
                  />
                </div>
              </>
            )}
          </section>
        </>
      )}

      {target && (
        <RequestModal
          listing={target}
          onClose={() => setTarget(null)}
          onDone={() => {
            setTarget(null);
            toast.success(
              'Request sent. The supplier has been notified in the app.'
            );
            reload();
          }}
        />
      )}
    </div>
  );
}
