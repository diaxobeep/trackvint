import Link from 'next/link';
import './site-header.css';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link href="/" className="brand">
          <span className="brand-mark">TV</span>
          <span className="brand-name">TrackVint</span>
        </Link>
        <nav className="site-nav">
          <Link href="/#features">Fonctionnalités</Link>
          <Link href="/pricing">Tarifs</Link>
          <Link href="/auth" className="btn btn-ghost">
            Connexion
          </Link>
          <Link href="/app" className="btn btn-primary">
            Ouvrir l’app
          </Link>
        </nav>
      </div>
    </header>
  );
}
