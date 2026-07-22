import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import './landing.css';

export default function LandingPage() {
  return (
    <div className="lp">
      <SiteHeader />

      <section className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <div className="container hero-content">
          <p className="brand-hero">TrackVint</p>
          <h1>Tracke Vinted. Vends plus vite.</h1>
          <p className="hero-lead">
            Extension + dashboard liés. Le serveur analyse 24/7 si tes articles et
            vendeurs se vendent vraiment.
          </p>
          <div className="hero-cta">
            <Link href="/auth" className="btn btn-primary">
              Commencer gratuitement
            </Link>
            <Link href="/pricing" className="btn btn-ghost">
              Voir les tarifs
            </Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-panel">
            <div className="hero-panel__bar">
              <span />
              <span />
              <span />
            </div>
            <div className="hero-panel__grid">
              <div>
                <small>Trackers</small>
                <strong>Live</strong>
              </div>
              <div>
                <small>Source</small>
                <strong>Supabase</strong>
              </div>
              <div>
                <small>Sync</small>
                <strong>Web ↔ Ext</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="features">
        <div className="container">
          <h2>Une seule source de vérité</h2>
          <p className="section-lead">
            Ce que tu trackes dans l’extension apparaît instantanément sur le web.
          </p>
          <div className="feature-rows">
            <article>
              <h3>Extension Vinted</h3>
              <p>Radar vendeur, favoris, badges feed — sans quitter Vinted.</p>
            </article>
            <article>
              <h3>Crawler serveur</h3>
              <p>Détecte les ventes en fond (articles disparus = vendus).</p>
            </article>
            <article>
              <h3>Dashboard live</h3>
              <p>Volume, prix moyen, vitesse de vente — même data partout.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container how">
          <h2>Prêt pour la prod</h2>
          <p className="section-lead">
            Branche Supabase (auth/DB), Stripe (abos) et déploie sur Vercel.
          </p>
          <ol>
            <li>Push sur GitHub</li>
            <li>Import Vercel → dossier <code>web/</code></li>
            <li>Ajoute les clés Supabase + Stripe</li>
            <li>API crawler sur Railway / Fly</li>
          </ol>
          <Link href="/app" className="btn btn-primary">
            Ouvrir le dashboard
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <span className="brand-name">TrackVint</span>
          <div>
            <Link href="/pricing">Tarifs</Link>
            <Link href="/auth">Connexion</Link>
            <Link href="/app">App</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
