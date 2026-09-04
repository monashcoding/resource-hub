import type { TreeCategory } from './types.js';

/**
 * Filter a category's resources down to the ones matching a search query.
 *
 * Case-insensitive match across title, description and tags. An empty query
 * matches everything (the category is returned untouched).
 *
 * Pure and DOM-free so the region search box's behaviour is unit-testable
 * without rendering a page — see `web/src/search.test.ts`.
 */
export function filterCategory(query: string, category: TreeCategory): TreeCategory {
  if (!query) return category;
  const q = query.toLowerCase();
  return {
    ...category,
    resources: category.resources.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some((t) => t.includes(q)),
    ),
  };
}
