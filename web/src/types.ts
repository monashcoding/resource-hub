// Mirrors the server's content tree (src/server/content/tree.ts). The admin-only
// fields are optional here because the public /api/content payload omits them.

export type ResourceType = 'course' | 'article' | 'tool' | 'community' | 'video' | 'other';
export type ResourceStatus = 'published' | 'hidden' | 'pending' | 'rejected';

export interface TreeResource {
  id: number;
  title: string;
  url: string;
  description: string;
  type: ResourceType;
  tags: string[];
  sortOrder: number;
  status?: ResourceStatus;
  archived?: boolean;
}

export interface TreeCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  visible?: boolean;
  resources: TreeResource[];
}

export interface TreeRegion {
  id: number;
  slug: string;
  name: string;
  blurb: string;
  sortOrder: number;
  visible?: boolean;
  resourceCount: number;
  categories: TreeCategory[];
}

export interface ContentTree {
  regions: TreeRegion[];
  generatedAt: string;
}

export interface AuditEntry {
  id: number;
  actorMacUserId: string;
  actorName: string;
  action: 'create' | 'update' | 'delete' | 'reorder';
  entityType: string;
  entityId: number;
  at: string;
}

export const RESOURCE_TYPES: ResourceType[] = ['course', 'article', 'tool', 'community', 'video', 'other'];

export const TYPE_LABELS: Record<ResourceType, string> = {
  course: 'Course',
  article: 'Article',
  tool: 'Tool',
  community: 'Community',
  video: 'Video',
  other: 'Resource',
};
