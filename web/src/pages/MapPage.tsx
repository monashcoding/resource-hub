import { Link } from 'react-router-dom';
import { RegionCard } from '../components/RegionCard.js';
import { useContent } from '../useContent.js';

export function MapPage(): JSX.Element {
  const { tree, error, loading } = useContent();

  return (
    <div className="shell">
      <header className="site-head">
        <div>
          <h1>MAC Resource Hub</h1>
          <p>Curated resources for Monash CS students. Pick where you are.</p>
        </div>
        <Link className="textlink small" to="/admin">
          Committee
        </Link>
      </header>

      {loading && <div className="empty">Loading…</div>}
      {error && <div className="notice notice--error">{error}</div>}

      {tree && tree.regions.length === 0 && (
        <div className="empty">Nothing here yet — a committee member needs to add some resources.</div>
      )}

      {tree && tree.regions.length > 0 && (
        <div className="map-grid">
          {tree.regions.map((region) => (
            <RegionCard key={region.slug} region={region} />
          ))}
        </div>
      )}
    </div>
  );
}
