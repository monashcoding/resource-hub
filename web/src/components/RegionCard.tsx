import { useNavigate } from 'react-router-dom';
import { presentationFor } from '../regions.js';
import { viewTransitionName, withTransition } from '../transition.js';
import type { TreeRegion } from '../types.js';

export function RegionCard({ region }: { region: TreeRegion }): JSX.Element {
  const navigate = useNavigate();
  const look = presentationFor(region.slug);

  return (
    <a
      className="region-card"
      href={`/r/${region.slug}`}
      style={
        {
          gridArea: look.area,
          '--accent': look.accent,
          '--accent-deep': look.accentDeep,
          // Shared with the region page's header — this pair is the zoom.
          viewTransitionName: viewTransitionName(region.slug),
        } as React.CSSProperties
      }
      onClick={(e) => {
        // Let modifier-clicks and middle-clicks open a new tab as normal: this
        // is a real link, not a div pretending to be one.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        withTransition(() => navigate(`/r/${region.slug}`));
      }}
    >
      {look.art && <img className="region-card__art" src={look.art} alt="" aria-hidden="true" />}
      <span className="region-card__name">{region.name}</span>
      {region.blurb && <p className="region-card__blurb">{region.blurb}</p>}
      <span className="region-card__count">
        {region.resourceCount} {region.resourceCount === 1 ? 'resource' : 'resources'}
      </span>
    </a>
  );
}
