import { pathToFileURL } from 'node:url';
import { eq } from 'drizzle-orm';
import { db } from './index.js';
import { regions, categories } from './schema.js';

/**
 * Region seed — the fixed axis of the site.
 *
 * Adding a region means adding an entry here AND a matching entry in
 * `web/src/regions.ts` (same `slug`), plus artwork at
 * `web/public/regions/<slug>.svg`. That is deliberate: a region is bound to map
 * artwork and a grid slot, so it is a PR rather than a form in the admin.
 *
 * The seed is IDEMPOTENT and NON-DESTRUCTIVE: it inserts slugs that are missing
 * and never overwrites `name`, `blurb`, `sortOrder` or `visible` on rows that
 * already exist. A committee rename therefore survives every redeploy.
 */
export const REGION_SEED = [
  {
    slug: 'starting-comp-sci',
    name: 'Starting Comp Sci',
    blurb: 'Your first year: units, setup, study habits and finding your feet.',
    sortOrder: 10,
    starterCategories: [
      { slug: 'before-you-start', name: 'Before You Start', description: 'What to sort out before week one.' },
      { slug: 'first-year-units', name: 'First-Year Units', description: 'Surviving and enjoying the core units.' },
      { slug: 'tools-and-setup', name: 'Tools & Setup', description: 'Editors, terminals and the basics of a dev machine.' },
      { slug: 'learning-to-code', name: 'Learning to Code', description: 'Courses and practice for building real fluency.' },
    ],
  },
  {
    slug: 'internships-careers',
    name: 'Internships & Careers',
    blurb: 'Landing your first industry role — applications, interviews, offers.',
    sortOrder: 20,
    starterCategories: [
      { slug: 'resume-prep', name: 'Resume Prep', description: 'Writing a resume that gets past the first filter.' },
      { slug: 'where-to-find-internships', name: 'Where to Find Internships', description: 'Job boards, programs and timelines that matter in Australia.' },
      { slug: 'interview-prep', name: 'Interview Prep', description: 'Technical and behavioural interview preparation.' },
      { slug: 'networking', name: 'Networking', description: 'Events, communities and reaching out without cringing.' },
    ],
  },
  {
    slug: 'postgrad-grad-jobs',
    name: 'Postgrad & Grad Jobs',
    blurb: 'Life after the degree: grad programs, honours, research and further study.',
    sortOrder: 30,
    starterCategories: [
      { slug: 'grad-programs', name: 'Grad Programs', description: 'Graduate schemes and how their hiring cycles work.' },
      { slug: 'honours-and-research', name: 'Honours & Research', description: 'Research pathways, supervisors and applications.' },
      { slug: 'further-study', name: 'Further Study', description: 'Masters, PhD and study abroad options.' },
    ],
  },
  {
    slug: 'competitive-programming',
    name: 'Competitive Programming',
    blurb: 'Algorithms, contests and getting good at hard problems.',
    sortOrder: 40,
    starterCategories: [
      { slug: 'getting-started', name: 'Getting Started', description: 'Your first contests and where to practise.' },
      { slug: 'algorithms-and-data-structures', name: 'Algorithms & Data Structures', description: 'The core material, from basics to advanced.' },
      { slug: 'contests', name: 'Contests', description: 'ICPC, Codeforces and local competitions.' },
    ],
  },
] as const;

/**
 * Insert any missing regions (and, only for regions created right now, their
 * starter categories so a fresh deployment isn't an empty site). Existing rows
 * are left completely untouched.
 */
export async function seed(): Promise<void> {
  for (const region of REGION_SEED) {
    const existing = await db.select({ id: regions.id }).from(regions).where(eq(regions.slug, region.slug));
    if (existing.length > 0) continue;

    const [created] = await db
      .insert(regions)
      .values({
        slug: region.slug,
        name: region.name,
        blurb: region.blurb,
        sortOrder: region.sortOrder,
      })
      .returning({ id: regions.id });
    if (!created) continue;

    console.log(`[seed] created region "${region.slug}"`);

    // Starter categories are inserted once, with the region. From then on they
    // are ordinary admin-owned content — renaming or deleting one is expected,
    // and the seed will never put it back.
    await db.insert(categories).values(
      region.starterCategories.map((c, i) => ({
        regionId: created.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        sortOrder: (i + 1) * 10,
      })),
    );
  }
}

// Run the seed only when this file IS the entry point (`npm run db:seed`, and
// the Docker entrypoint). Importing it — as src/server/content/artwork-check.ts
// does for REGION_SEED — must never trigger a write.
const isEntryPoint =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntryPoint) {
  await seed();
  console.log('[seed] done');
  process.exit(0);
}
