'use client';

import { FormEvent, useState } from 'react';
import { addTracker } from '@/lib/api';

type Props = {
  open: boolean;
  onClose: () => void;
  onAdded?: () => void;
};

export function AddTrackerModal({ open, onClose, onAdded }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setLoading(true);
    try {
      const data = await addTracker(url.trim());
      setMsg(data.message || 'Tracker ajouté');
      setUrl('');
      onAdded?.();
      setTimeout(onClose, 700);
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
          Colle une URL Vinted (profil /member/… ou recherche /catalog/…).
        </p>
        <input
          className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none focus:border-lime-500"
          placeholder="https://www.vinted.fr/member/… ou /catalog?…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
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
