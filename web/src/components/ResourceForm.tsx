import { useState } from 'react';
import { RESOURCE_TYPES, TYPE_LABELS, type ResourceType, type TreeResource } from '../types.js';
import type { ResourceInput } from '../api.js';

export interface ResourceFormProps {
  initial?: TreeResource;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (input: ResourceInput) => void;
}

/** Add/edit form for a single resource. Same fields either way. */
export function ResourceForm({ initial, busy, error, onCancel, onSubmit }: ResourceFormProps): JSX.Element {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [type, setType] = useState<ResourceType>(initial?.type ?? 'other');
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      url: url.trim(),
      description: description.trim(),
      type,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      // Status is changed with the Hide/Show button, not buried in this form.
      status: initial?.status === 'hidden' ? 'hidden' : 'published',
    });
  };

  return (
    <form className="panel" onSubmit={submit}>
      {error && <div className="notice notice--error">{error}</div>}
      <div className="row">
        <div className="field">
          <label htmlFor="r-title">Title</label>
          <input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} />
        </div>
        <div className="field">
          <label htmlFor="r-type">Type</label>
          <select id="r-type" value={type} onChange={(e) => setType(e.target.value as ResourceType)}>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="r-url">Link (must start with https://)</label>
        <input id="r-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} required placeholder="https://" />
      </div>
      <div className="field">
        <label htmlFor="r-desc">Short description</label>
        <textarea id="r-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} />
      </div>
      <div className="field">
        <label htmlFor="r-tags">Tags (comma separated, optional)</label>
        <input id="r-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="free, beginner" />
      </div>
      <div className="row">
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {initial ? 'Save changes' : 'Add resource'}
        </button>
        <button className="btn" type="button" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
