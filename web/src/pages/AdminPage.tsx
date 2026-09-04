import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api.js';
import { ForbiddenError, UnauthorizedError } from '../api.js';
import { decodeClaims, ensureToken, signOut } from '../auth.js';
import { CategoryPanel, explain } from '../components/CategoryPanel.js';
import { NotCommittee, SignIn } from '../components/SignIn.js';
import type { ContentTree } from '../types.js';

type Gate = 'checking' | 'signed_out' | 'not_committee' | 'ready';

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

export function AdminPage(): JSX.Element {
  const [gate, setGate] = useState<Gate>('checking');
  const [tree, setTree] = useState<ContentTree | null>(null);
  const [regionSlug, setRegionSlug] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    try {
      const next = await api.fetchAdminTree();
      setTree(next);
      setGate('ready');
    } catch (err) {
      if (err instanceof UnauthorizedError) setGate('signed_out');
      else if (err instanceof ForbiddenError) setGate('not_committee');
      else setMessage('Could not load the admin data.');
    }
  }, []);

  useEffect(() => {
    void (async () => {
      // No token at all means nobody is signed in — show sign-in without
      // bouncing a request off the API first.
      if (!(await ensureToken())) {
        setGate('signed_out');
        return;
      }
      await load();
    })();
  }, [load]);

  if (gate === 'checking') return <div className="shell"><div className="empty">Checking your access…</div></div>;
  if (gate === 'signed_out') return <SignIn />;
  if (gate === 'not_committee') return <NotCommittee email={decodeClaims()?.email} />;

  const regions = tree?.regions ?? [];
  const region = regions.find((r) => r.slug === regionSlug) ?? regions[0];
  const categoryIds = (region?.categories ?? []).map((c) => c.id);

  const run = async (action: () => Promise<api.Outcome<unknown>>): Promise<void> => {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.kind !== 'ok') {
      setMessage(explain(result));
      return;
    }
    setMessage(null);
    await load();
  };

  return (
    <div className="shell">
      <header className="site-head">
        <div>
          <h1>Resource admin</h1>
          <p className="small">
            Signed in as {decodeClaims()?.email ?? 'committee'} ·{' '}
            <button
              className="textlink small"
              style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
              onClick={() => void signOut().then(() => window.location.reload())}
            >
              sign out
            </button>
          </p>
        </div>
        <Link className="textlink small" to="/">
          View the map
        </Link>
      </header>

      {message && <div className="notice notice--error">{message}</div>}

      {/* Regions are seeded, not created here — adding one needs artwork and a
          grid slot, so it is a code change. See web/src/regions.ts. */}
      <div className="tabs" role="tablist">
        {regions.map((r) => (
          <button
            key={r.slug}
            role="tab"
            className="tab"
            aria-selected={r.slug === region?.slug}
            onClick={() => setRegionSlug(r.slug)}
          >
            {r.name}
            {r.visible === false && ' (hidden)'}
          </button>
        ))}
      </div>

      {!region && <div className="empty">No regions found. Has the seed run?</div>}

      {region && (
        <>
          <div className="panel">
            <div className="panel__head">
              <h3>{region.name}</h3>
              <button
                className="btn"
                disabled={busy}
                onClick={() => void run(() => api.patchRegion(region.id, { visible: region.visible === false }))}
              >
                {region.visible === false ? 'Show region' : 'Hide region'}
              </button>
            </div>
            <p className="muted small">
              {region.blurb} · Regions can’t be added or removed here — that needs a code change
              (a seed entry plus artwork). Rename or hide instead.
            </p>
          </div>

          {region.categories.map((category) => (
            <CategoryPanel
              key={category.id}
              category={category}
              siblingIds={categoryIds}
              onReorderSelf={(direction) =>
                void run(() => api.reorderCategories(region.id, moved(categoryIds, category.id, direction)))
              }
              onChanged={load}
              onError={setMessage}
            />
          ))}

          <div className="panel">
            <div className="field">
              <label htmlFor="new-category">New category in {region.name}</label>
              <input
                id="new-category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Interview prep"
                maxLength={80}
              />
            </div>
            <button
              className="btn btn--primary"
              disabled={busy || newCategory.trim().length === 0}
              onClick={() =>
                void run(async () => {
                  const result = await api.createCategory(region.id, {
                    name: newCategory.trim(),
                    description: '',
                  });
                  if (result.kind === 'ok') setNewCategory('');
                  return result;
                })
              }
            >
              Add category
            </button>
          </div>
        </>
      )}
    </div>
  );
}
