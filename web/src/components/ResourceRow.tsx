import { TYPE_LABELS, type TreeResource } from '../types.js';

export function ResourceRow({ resource }: { resource: TreeResource }): JSX.Element {
  return (
    <a className="resource" href={resource.url} target="_blank" rel="noreferrer noopener">
      <span className="resource__top">
        <span className="resource__title">{resource.title}</span>
        <span className="chip">{TYPE_LABELS[resource.type]}</span>
      </span>
      {resource.description && <p className="resource__desc">{resource.description}</p>}
      {resource.tags.length > 0 && (
        <span className="tags">
          {resource.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </span>
      )}
    </a>
  );
}
