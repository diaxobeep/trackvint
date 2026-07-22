'use client';

import { useEffect, useState } from 'react';
import { fetchSellerDetail } from '@/lib/api';
import { VintedImage } from './VintedImage';

type Props = { vintedId: string };

export function SellerDetailView({ vintedId }: Props) {
  const [data, setData] = useState<{
    seller: { login: string; photoUrl?: string; domain?: string; vintedId: string };
    kpis: {
      avgPrice: number;
      estimatedRevenue: number;
      soldThisMonth: number;
      topBrands: Array<{ name: string; count: number }>;
    };
    soldItems: Array<{
      id: string;
      title: string;
      brand?: string;
      priceCents?: number;
      photoUrl?: string;
      itemUrl?: string;
    }>;
  } | null>(null);
  const [filter, setFilter] = useState<'sold' | 'active'>('sold');
  const [err, setErr] = useState('');

  useEffect(() => {
    fetchSellerDetail(vintedId)
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [vintedId]);

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!data) return <p className="text-sm text-slate-500">Chargement…</p>;

  const { seller, kpis, soldItems } = data;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <VintedImage
          src={seller.photoUrl}
          alt={seller.login}
          className="h-20 w-20 rounded-2xl object-cover"
          fallbackText={seller.login.slice(0, 2)}
        />
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">@{seller.login}</h2>
          <p className="text-sm text-slate-500">{seller.domain}</p>
          <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
            Actif
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Prix moyen', value: `${kpis.avgPrice} €` },
          { label: 'CA estimé', value: `${kpis.estimatedRevenue} €` },
          { label: 'Vendus (période)', value: String(kpis.soldThisMonth) },
          {
            label: 'Top marques',
            value: kpis.topBrands.map((b) => b.name).join(', ') || '—',
          },
        ].map((k) => (
          <div
            key={k.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {k.label}
            </div>
            <div className="mt-1 text-lg font-extrabold text-slate-900">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFilter('sold')}
          className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
            filter === 'sold' ? 'bg-[#92ef4a] text-[#0b1702]' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Vendu
        </button>
        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
            filter === 'active' ? 'bg-[#92ef4a] text-[#0b1702]' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Actif
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(filter === 'sold' ? soldItems : []).map((it) => (
          <a
            key={it.id}
            href={it.itemUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <VintedImage
              src={it.photoUrl}
              alt={it.title}
              className="aspect-square w-full object-cover"
            />
            <div className="p-2">
              <div className="line-clamp-2 text-xs font-semibold text-slate-800">{it.title}</div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                {it.priceCents != null
                  ? `${(it.priceCents / 100).toLocaleString('fr-FR')} €`
                  : '—'}
              </div>
            </div>
          </a>
        ))}
        {filter === 'active' ? (
          <p className="col-span-full text-sm text-slate-500">
            Les articles actifs apparaissent après sync crawler.
          </p>
        ) : null}
      </div>
    </div>
  );
}
