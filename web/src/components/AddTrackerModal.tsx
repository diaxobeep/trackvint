'use client';

import { FormEvent, useEffect, useState } from 'react';
import { addTracker, fetchCategories } from '@/lib/api';

type CategoryOpt = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  is_system?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
};

export function AddTrackerModal({ open, onClose, onAdded }: Props) {
  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    fetchCategories()
      .then((d) => {
        const list = (d.categories || []) as CategoryOpt[];
        setCategories(list);
        // Auto : laisse vide = catégorie système selon type d'URL
        setCategoryId('');
      })
      .catch(() => setCategories([]));
  }, [open]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setLoading(true);
    try {
      const data = await addTracker(url.trim(), categoryId || undefined);
      const catName = data.category?.name ? ` → ${data.category.name}` : '';
      setMsg((data.message || 'Tracker ajouté') + catName);
      setUrl('');
      onAdded?.();
      setTimeout(onClose, 800);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Fermer"
        onClick={onClose}
      />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Ajouter un tracker
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Colle une URL Vinted. Sans choix, le tracker va dans{' '}
          <strong>Vendeurs</strong> ou <strong>Recherches</strong> (jamais au hasard).
        </p>
        <input
          className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none focus:border-lime-500"
          placeholder="https://www.vinted.fr/member/… ou /catalog?…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-400">
          Catégorie
        </label>
        <select
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none focus:border-lime-500"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Auto (Vendeurs / Recherches selon l’URL)</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.is_system ? ' · système' : ''}
            </option>
          ))}
        </select>
        {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
        {msg ? <p className="mt-2 text-sm text-lime-700">{msg}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#92ef4a] px-4 py-2 text-sm font-bold text-[#0b1702] disabled:opacity-50"
          >
            {loading ? 'Ajout…' : 'Tracker'}
          </button>
        </div>
      </form>
    </div>
  );
}
