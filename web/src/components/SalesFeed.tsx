'use client';

import { useEffect, useState } from 'react';
import { fetchSales } from '@/lib/api';
import { VintedImage } from './VintedImage';

type Sale = {
  id: string;
  title: string;
  brand?: string;
  priceCents?: number;
  photoUrl?: string;
  sellerLogin?: string;
  sellerPhotoUrl?: string;
  itemUrl?: string;
  soldAt: string;
  saleSpeedHours?: number;
};

function euro(cents?: number) {
  if (cents == null) return '—';
  return `${(cents / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`;
}

export function SalesFeed() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetchSales(40)
      .then((d) => setSales(d.sales || []))
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <p className="text-sm text-red-600">{err}</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sales.map((s) => {
        const flash = (s.saleSpeedHours ?? 99) < 24;
        return (
          <article
            key={s.id}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
              <VintedImage
                src={s.photoUrl}
                alt={s.title}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                fallbackText="TV"
              />
              {flash ? (
                <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                  ⚡ Vendu en {Math.max(1, Math.round(s.saleSpeedHours || 1))}h
                </span>
              ) : null}
            </div>
            <div className="p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <VintedImage
                  src={s.sellerPhotoUrl}
                  alt={s.sellerLogin || 'vendeur'}
                  className="h-7 w-7 rounded-full object-cover"
                  fallbackText={(s.sellerLogin || '?').slice(0, 1)}
                />
                <span className="text-xs font-semibold text-slate-500">
                  @{s.sellerLogin || '—'}
                </span>
              </div>
              <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">
                {s.title}
              </h3>
              <div className="mt-2 flex items-center justify-between gap-2">
                {s.brand ? (
                  <span className="rounded-full bg-lime-100 px-2 py-0.5 text-[11px] font-bold text-lime-800">
                    {s.brand}
                  </span>
                ) : (
                  <span />
                )}
                <strong className="text-base text-slate-900">{euro(s.priceCents)}</strong>
              </div>
              {s.itemUrl ? (
                <a
                  href={s.itemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-xs font-bold text-lime-700 hover:underline"
                >
                  Ouvrir sur Vinted →
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
      {!sales.length ? (
        <p className="text-sm text-slate-500 col-span-full">
          Aucune vente détectée — tracke un vendeur ou une niche.
        </p>
      ) : null}
    </div>
  );
}
