import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ResourceRow } from '../components/ResourceRow.js';
import { presentationFor } from '../regions.js';
import { viewTransitionName, withTransition } from '../transition.js';
import { useContent } from '../useContent.js';
import { filterCategory } from '../search.js';

export function RegionPage(): JSX.Element {
  const { regionSlug = '' } = useParams();
  const navigate = useNavigate();
  const { tree, error, loading } = useContent();
  const [query, setQuery] = useState('');

  const region = tree?.regions.find((r) => r.slug === regionSlug);
  const look = presentationFor(regionSlug);

  // Filtering is free here because the whole tree is already client-side.
  const categories = useMemo(
    () => (region?.categories ?? []).map((c) => filterCategory(query, c)).filter((c) => c.resources.length > 0 || !query),
    [region, query],
  );

  const goBack = (e: React.MouseEvent): void => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    withTransition(() => navigate('/'));
  };

  if (loading) return <div className="shell"><div className="empty">Loading…</div></div>;
  if (error) return <div className="shell"><div className="notice notice--error">{error}</div></div>;

  if (!region) {
    return (
      <div className="shell">
        <div className="empty">
          <p>That region doesn’t exist (or isn’t published).</p>
          <Link className="textlink" to="/">
            Back to the map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="site-head">
        <a className="textlink small" href="/" onClick={goBack}>
          ← Back to the map
        </a>
      </header>

      {/* Shares its view-transition-name with the map card, so the card grows
          into this header on navigation. */}
      <div
        className="region-head"
        style={
          {
            '--accent': look.accent,
            '--accent-deep': look.accentDeep,
            viewTransitionName: viewTransitionName(region.slug),
          } as React.CSSProperties
        }
      >
        <h2>{region.name}</h2>
        {region.blurb && <p>{region.blurb}</p>}
      </div>

      {region.resourceCount > 0 && (
        <input
          className="search"
          type="search"
          placeholder={`Search ${region.name.toLowerCase()}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={`Search resources in ${region.name}`}
        />
      )}

      {categories.length === 0 && (
        <div className="empty">
          {query ? 'Nothing matches that search.' : 'No resources in this region yet.'}
        </div>
      )}

      {categories.map((category) => (
        <section className="category" key={category.id}>
          <h3>{category.name}</h3>
          {category.description && <p>{category.description}</p>}
          {category.resources.length === 0 ? (
            <div className="empty small">Nothing here yet.</div>
          ) : (
            <div className="resource-list">
              {category.resources.map((resource) => (
                <ResourceRow key={resource.id} resource={resource} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
