'use client';

import { useEffect, useState } from 'react';
import { fetchNiches } from '@/lib/api';

type Niche = {
  brand: string;
  sold: number;
  avgPrice: number;
  sellThroughRate: number;
  sparkline: number[];
};

function rateColor(rate: number) {
  if (rate > 30) return 'bg-emerald-500';
  if (rate >= 15) return 'bg-amber-500';
  return 'bg-slate-300';
}

export function NichePerformance() {
  const [niches, setNiches] = useState<Niche[]>([]);

  useEffect(() => {
    fetchNiches()
      .then((d) => setNiches(d.niches || []))
      .catch(() => setNiches([]));
  }, []);

  return (
    <div className="space-y-3">
      {niches.map((n) => {
        const maxSpark = Math.max(1, ...n.sparkline);
        return (
          <article
            key={n.brand}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">{n.brand}</h3>
                <p className="text-xs text-slate-500">{n.sold} ventes · avg {n.avgPrice} €</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-slate-900">{n.sellThroughRate}%</div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">
                  Sell-through
                </div>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${rateColor(n.sellThroughRate)}`}
                style={{ width: `${n.sellThroughRate}%` }}
              />
            </div>
            <div className="mt-3 flex h-10 items-end gap-1">
              {n.sparkline.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-lime-400/80"
                  style={{ height: `${Math.max(8, (v / maxSpark) * 100)}%` }}
                  title={`J-${6 - i}: ${v}`}
                />
              ))}
            </div>
          </article>
        );
      })}
      {!niches.length ? (
        <p className="text-sm text-slate-500">Pas encore de niches — les ventes alimentent ce ranking.</p>
      ) : null}
    </div>
  );
}
