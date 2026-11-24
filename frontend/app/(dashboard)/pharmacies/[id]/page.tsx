
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

type ProfileResponse = {
  pharmacy: Partner;
  listings: Listing[];
  pagination: Pg;
};

export default function PharmacyProfilePage() {
  const params = useParams<{ id: string }>();
  const pharmacyId = params.id;

  const [page, setPage] = useState(1);
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
    }
  );

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
