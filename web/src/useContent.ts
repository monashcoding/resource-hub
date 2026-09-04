import { useEffect, useState } from 'react';
import { fetchContent } from './api.js';
import type { ContentTree } from './types.js';

export interface ContentState {
  tree: ContentTree | null;
  error: string | null;
  loading: boolean;
}

/**
 * Fetch the whole published tree once. Every drill-down after this is local
 * state, which is what keeps the zoom transition free of a loading spinner.
 */
export function useContent(): ContentState {
  const [state, setState] = useState<ContentState>({ tree: null, error: null, loading: true });

  useEffect(() => {
    let live = true;
    fetchContent()
      .then((tree) => live && setState({ tree, error: null, loading: false }))
      .catch(() => live && setState({ tree: null, error: 'Could not load resources.', loading: false }));
    return () => {
      live = false;
    };
  }, []);

  return state;
}
