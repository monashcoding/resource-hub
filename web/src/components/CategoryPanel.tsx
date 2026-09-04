import { useState } from 'react';
import * as api from '../api.js';
import type { Outcome } from '../api.js';
import { ResourceForm } from './ResourceForm.js';
import { TYPE_LABELS, type TreeCategory, type TreeResource } from '../types.js';

export interface CategoryPanelProps {
  category: TreeCategory;
  /** Sibling ordering, so the up/down buttons know what to send. */
  siblingIds: number[];
  onReorderSelf: (direction: -1 | 1) => void;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}

/** Turn any non-ok Outcome into a sentence a committee member can act on. */
export function explain(outcome: Outcome<unknown>): string {
  switch (outcome.kind) {
    case 'ok':
      return '';
    case 'slug_taken':
      return `Another category in this region already uses the name “${outcome.slug}”. Pick a different one.`;
    case 'not_empty':
      return (
        `This category still holds ${outcome.liveResources} resource(s)` +
        (outcome.archivedResources > 0 ? ` and ${outcome.archivedResources} archived one(s)` : '') +
        `. Move them to another category first — nothing is deleted here.`
      );
    case 'invalid': {
      const first = Object.entries(outcome.issues)[0];
      return first ? `${first[0]}: ${first[1]?.[0] ?? 'invalid'}` : 'Some fields are invalid.';
    }
    case 'forbidden':
      return 'Your account is not on the committee roster.';
    default:
      return outcome.message;
  }
}

/** Move an id one step within a list, returning the new full ordering. */
function moved(ids: number[], id: number, direction: -1 | 1): number[] {
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

export function CategoryPanel({
  category,
  siblingIds,
  onReorderSelf,
  onChanged,
  onError,
}: CategoryPanelProps): JSX.Element {
  const [adding, setAdding] = useState(false);
  const [editingResource, setEditingResource] = useState<TreeResource | null>(null);
  const [editingCategory, setEditingCategory] = useState(false);
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description);
  const [busy, setBusy] = useState(false);

  // Archived resources stay visible to the admin (greyed out) so an accidental
  // archive is obviously recoverable rather than an apparent deletion.
  const live = category.resources.filter((r) => !r.archived);
  const archived = category.resources.filter((r) => r.archived);
  const liveIds = live.map((r) => r.id);

  const run = async (action: () => Promise<Outcome<unknown>>): Promise<void> => {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.kind !== 'ok') {
      onError(explain(result));
      return;
    }
    await onChanged();
  };

  const canMoveUp = siblingIds.indexOf(category.id) > 0;
  const canMoveDown = siblingIds.indexOf(category.id) < siblingIds.length - 1;

  return (
    <div className="panel">
      <div className="panel__head">
        <h3>
          {category.name}
          {category.visible === false && <span className="chip" style={{ marginLeft: 8 }}>Hidden</span>}
        </h3>
        {/* Up/down rather than drag-and-drop: works on touch, works with a
            keyboard, and cannot be triggered by an accidental drag. */}
        <button className="btn btn--icon" onClick={() => onReorderSelf(-1)} disabled={!canMoveUp} aria-label={`Move ${category.name} up`}>
          ↑
        </button>
        <button className="btn btn--icon" onClick={() => onReorderSelf(1)} disabled={!canMoveDown} aria-label={`Move ${category.name} down`}>
          ↓
        </button>
        <button className="btn" onClick={() => setEditingCategory((v) => !v)}>
          {editingCategory ? 'Close' : 'Edit'}
        </button>
        <button
          className="btn"
          onClick={() => void run(() => api.patchCategory(category.id, { visible: category.visible === false }))}
          disabled={busy}
        >
          {category.visible === false ? 'Show' : 'Hide'}
        </button>
        <button
          className="btn btn--danger"
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`Delete the category “${category.name}”? This only works if it holds no resources.`)) return;
            void run(() => api.deleteCategory(category.id));
          }}
        >
          Delete
        </button>
      </div>

      {category.description && !editingCategory && <p className="muted small">{category.description}</p>}

      {editingCategory && (
        <div style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor={`c-name-${category.id}`}>Name</label>
            <input id={`c-name-${category.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div className="field">
            <label htmlFor={`c-desc-${category.id}`}>Description</label>
            <textarea
              id={`c-desc-${category.id}`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={400}
            />
          </div>
          <button
            className="btn btn--primary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const result = await api.patchCategory(category.id, { name: name.trim(), description: description.trim() });
                if (result.kind === 'ok') setEditingCategory(false);
                return result;
              })
            }
          >
            Save category
          </button>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        {live.length === 0 && archived.length === 0 && <p className="muted small">No resources yet.</p>}

        {live.map((resource, i) =>
          editingResource?.id === resource.id ? (
            <ResourceForm
              key={resource.id}
              initial={resource}
              busy={busy}
              onCancel={() => setEditingResource(null)}
              onSubmit={(input) =>
                void run(async () => {
                  const result = await api.patchResource(resource.id, input);
                  if (result.kind === 'ok') setEditingResource(null);
                  return result;
                })
              }
            />
          ) : (
            <div className={`admin-row${resource.status === 'hidden' ? ' admin-row--dim' : ''}`} key={resource.id}>
              <div className="admin-row__main">
                <div className="admin-row__title">
                  {resource.title} <span className="chip">{TYPE_LABELS[resource.type]}</span>
                  {resource.status === 'hidden' && <span className="chip" style={{ marginLeft: 6 }}>Hidden</span>}
                </div>
                <a className="admin-row__url" href={resource.url} target="_blank" rel="noreferrer noopener">
                  {resource.url}
                </a>
              </div>
              <div className="admin-row__actions">
                <button
                  className="btn btn--icon"
                  disabled={i === 0 || busy}
                  aria-label={`Move ${resource.title} up`}
                  onClick={() => void run(() => api.reorderResources(category.id, moved(liveIds, resource.id, -1)))}
                >
                  ↑
                </button>
                <button
                  className="btn btn--icon"
                  disabled={i === live.length - 1 || busy}
                  aria-label={`Move ${resource.title} down`}
                  onClick={() => void run(() => api.reorderResources(category.id, moved(liveIds, resource.id, 1)))}
                >
                  ↓
                </button>
                <button className="btn btn--icon" onClick={() => setEditingResource(resource)}>
                  Edit
                </button>
                <button
                  className="btn btn--icon"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      api.patchResource(resource.id, { status: resource.status === 'hidden' ? 'published' : 'hidden' }),
                    )
                  }
                >
                  {resource.status === 'hidden' ? 'Show' : 'Hide'}
                </button>
                <button
                  className="btn btn--icon btn--danger"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(`Archive “${resource.title}”? You can restore it from this page.`)) return;
                    void run(() => api.archiveResource(resource.id));
                  }}
                >
                  Archive
                </button>
              </div>
            </div>
          ),
        )}

        {archived.length > 0 && (
          <details style={{ marginTop: 10 }}>
            <summary className="muted small">{archived.length} archived</summary>
            {archived.map((resource) => (
              <div className="admin-row admin-row--dim" key={resource.id}>
                <div className="admin-row__main">
                  <div className="admin-row__title">{resource.title}</div>
                  <span className="admin-row__url">{resource.url}</span>
                </div>
                <div className="admin-row__actions">
                  <button className="btn btn--icon" disabled={busy} onClick={() => void run(() => api.restoreResource(resource.id))}>
                    Restore
                  </button>
                </div>
              </div>
            ))}
          </details>
        )}

        {adding ? (
          <ResourceForm
            busy={busy}
            onCancel={() => setAdding(false)}
            onSubmit={(input) =>
              void run(async () => {
                const result = await api.createResource(category.id, input);
                if (result.kind === 'ok') setAdding(false);
                return result;
              })
            }
          />
        ) : (
          <button className="btn" style={{ marginTop: 10 }} onClick={() => setAdding(true)}>
            + Add resource
          </button>
        )}
      </div>
    </div>
  );
}
