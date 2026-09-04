/**
 * Sample resources for LOCAL DEVELOPMENT ONLY.
 *
 * ── Why this file is allowed to exist ────────────────────────────────────────
 * CLAUDE.md says, correctly: "Resources live in the database, never in a seed
 * file or a JSON blob." That rule is about the real site — resources are
 * committee-owned content, and code-owning them would leave v2's community
 * submissions nowhere to land.
 *
 * This is not that. These are throwaway FIXTURES so somebody working on their
 * own machine has something to look at, because `/admin` cannot work on
 * localhost (mac-auth's session cookie is scoped to .monashcoding.com), which
 * means there is no other way to get a row into a local database. It refuses to
 * run against anything but a local database, it is never imported by the app,
 * and it is not on `main`.
 *
 *     npm run db:sample
 *
 * It DELETES every resource row first, so the result is the same every time.
 * That is fine here and would be catastrophic anywhere else — hence the guard
 * below, which is not decoration.
 */
import { eq, and } from 'drizzle-orm';
import { db, connectionString } from '../src/server/db/index.js';
import { regions, categories, resources } from '../src/server/db/schema.js';

// ── Guard ────────────────────────────────────────────────────────────────────
// Refuse to touch anything that isn't a database on this machine.
const host = (() => {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return '';
  }
})();

if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
  console.error(
    `[sample] refusing to run: DATABASE_URL points at "${host}", not this machine.\n` +
      `[sample] This script deletes every resource row. It is for local development only.`,
  );
  process.exit(1);
}
if (process.env.NODE_ENV === 'production') {
  console.error('[sample] refusing to run with NODE_ENV=production.');
  process.exit(1);
}

// ── The fixtures ─────────────────────────────────────────────────────────────
// Keyed by the region and category slugs created by src/server/db/seed.ts.
//
// Four rows are deliberately NOT publicly visible — one of each way a resource
// can be invisible. They are what makes exercise 1 (`isPubliclyVisible`)
// something you can SEE rather than just test: when it is written correctly,
// these four are the rows that must not appear on the site.
interface Sample {
  title: string;
  url: string;
  description: string;
  type: 'course' | 'article' | 'tool' | 'community' | 'video' | 'other';
  tags: string[];
  status?: 'published' | 'hidden' | 'pending' | 'rejected';
  archived?: boolean;
}

const SAMPLES: Record<string, Record<string, Sample[]>> = {
  'starting-comp-sci': {
    'before-you-start': [
      {
        title: 'Monash Handbook',
        url: 'https://handbook.monash.edu',
        description: 'The official unit and course descriptions. Check prerequisites before you enrol.',
        type: 'other',
        tags: ['monash', 'official'],
      },
      {
        title: 'Monash Association of Coding',
        url: 'https://www.monashcoding.com',
        description: 'Us. Events, workshops and a Discord full of people one year ahead of you.',
        type: 'community',
        tags: ['monash', 'community', 'free'],
      },
    ],
    'tools-and-setup': [
      {
        title: 'Visual Studio Code',
        url: 'https://code.visualstudio.com',
        description: 'The editor most of the cohort uses. Free, and the extensions are the point.',
        type: 'tool',
        tags: ['free', 'beginner', 'editor'],
      },
      {
        title: 'Git — the official book',
        url: 'https://git-scm.com/book/en/v2',
        description: 'Free and complete. Read chapters 1-3 and you are ahead of most second years.',
        type: 'article',
        tags: ['free', 'git', 'beginner'],
      },
      {
        title: 'Oh My Zsh',
        url: 'https://ohmyz.sh',
        description: 'Makes the terminal pleasant. Entirely optional, widely loved.',
        type: 'tool',
        tags: ['terminal', 'free'],
        // HIDDEN — a committee member took it down as "not essential for a
        // first year". Must not appear publicly.
        status: 'hidden',
      },
    ],
    'learning-to-code': [
      {
        title: 'The Python Tutorial',
        url: 'https://docs.python.org/3/tutorial/',
        description: 'The official one. Dry, short, and more accurate than any video course.',
        type: 'course',
        tags: ['free', 'python', 'beginner'],
      },
      {
        title: 'Exercism',
        url: 'https://exercism.org',
        description: 'Small exercises with real human mentoring, in most languages.',
        type: 'course',
        tags: ['free', 'practice', 'beginner'],
      },
      {
        title: 'roadmap.sh',
        url: 'https://roadmap.sh',
        description: 'Visual maps of what to learn in what order, for most areas of software.',
        type: 'other',
        tags: ['free', 'beginner'],
      },
    ],
  },

  'internships-careers': {
    'resume-prep': [
      {
        title: 'Tech Interview Handbook — resume guide',
        url: 'https://www.techinterviewhandbook.org/resume/',
        description: 'What actually gets read in the first eight seconds, with before/after examples.',
        type: 'article',
        tags: ['free', 'resume', 'interview'],
      },
    ],
    'where-to-find-internships': [
      {
        title: 'GradConnection',
        url: 'https://au.gradconnection.com',
        description: 'Where most Australian internship and grad listings are, with closing dates.',
        type: 'other',
        tags: ['australia', 'internship'],
      },
      {
        title: 'Prosple',
        url: 'https://prosple.com',
        description: 'The other big Australian graduate job board. Worth checking both.',
        type: 'other',
        tags: ['australia', 'internship'],
      },
      {
        title: 'Seek',
        url: 'https://www.seek.com.au',
        description: 'General, not tech-specific, but casual and part-time dev roles turn up here.',
        type: 'other',
        tags: ['australia'],
        // ARCHIVED — soft-deleted, recoverable. Must not appear publicly.
        archived: true,
      },
    ],
    'interview-prep': [
      {
        title: 'LeetCode',
        url: 'https://leetcode.com',
        description: 'The standard technical interview practice site. Start with Easy, honestly.',
        type: 'tool',
        tags: ['free', 'interview', 'practice'],
      },
      {
        title: 'NeetCode',
        url: 'https://neetcode.io',
        description: 'A curated path through LeetCode, with a worked video for every problem.',
        type: 'video',
        tags: ['free', 'interview', 'practice'],
      },
      {
        title: 'Pramp',
        url: 'https://www.pramp.com',
        description: 'Free peer mock interviews. Deeply uncomfortable, extremely effective.',
        type: 'tool',
        tags: ['free', 'interview'],
      },
      {
        title: 'Some random blog about interviews',
        url: 'https://example.com/not-a-real-resource',
        description: 'A pretend community submission that a committee member turned down.',
        type: 'article',
        tags: ['interview'],
        // REJECTED — what a v2 community submission looks like after review.
        status: 'rejected',
      },
    ],
    networking: [
      {
        title: 'LinkedIn',
        url: 'https://www.linkedin.com',
        description: 'Yes, really. A tidy profile is how recruiters find Monash students.',
        type: 'other',
        tags: ['networking'],
      },
    ],
  },

  'postgrad-grad-jobs': {
    'grad-programs': [
      {
        title: 'Atlassian graduate program',
        url: 'https://www.atlassian.com/company/careers/graduates',
        description: 'One of the largest Australian tech grad intakes. Applications open early.',
        type: 'other',
        tags: ['australia', 'grad'],
      },
    ],
    'honours-and-research': [
      {
        title: 'Monash IT honours',
        url: 'https://www.monash.edu/it',
        description: 'Faculty pages for honours and research pathways, including supervisors.',
        type: 'other',
        tags: ['monash', 'research'],
      },
      {
        title: 'A promising new research guide',
        url: 'https://example.com/pending-submission',
        description: 'A pretend community submission, waiting for a committee member to review it.',
        type: 'article',
        tags: ['research'],
        // PENDING — exactly what v2's community submissions will look like
        // sitting in the queue. Must not appear publicly.
        status: 'pending',
      },
    ],
  },

  'competitive-programming': {
    'getting-started': [
      {
        title: 'CSES Problem Set',
        url: 'https://cses.fi/problemset/',
        description: 'A well-ordered set of 300 problems. The best structured start there is.',
        type: 'tool',
        tags: ['free', 'practice', 'algorithms'],
      },
      {
        title: 'USACO Guide',
        url: 'https://usaco.guide',
        description: 'Free, and genuinely the clearest ladder from beginner to advanced.',
        type: 'course',
        tags: ['free', 'algorithms', 'beginner'],
      },
    ],
    'algorithms-and-data-structures': [
      {
        title: 'cp-algorithms',
        url: 'https://cp-algorithms.com',
        description: 'Reference implementations and explanations for essentially every algorithm.',
        type: 'article',
        tags: ['free', 'algorithms'],
      },
      {
        title: 'VisuAlgo',
        url: 'https://visualgo.net',
        description: 'Watch the data structures actually move. Worth an hour before an exam.',
        type: 'tool',
        tags: ['free', 'algorithms', 'visual'],
      },
    ],
    contests: [
      {
        title: 'Codeforces',
        url: 'https://codeforces.com',
        description: 'Contests several times a week, at every difficulty. The main venue.',
        type: 'community',
        tags: ['free', 'contest', 'practice'],
      },
      {
        title: 'ICPC',
        url: 'https://icpc.global',
        description: 'The international university contest. Monash sends teams most years.',
        type: 'community',
        tags: ['contest'],
      },
    ],
  },
};

// ── Insert ───────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const existing = await db.select({ id: resources.id }).from(resources);
  if (existing.length > 0) {
    console.log(`[sample] clearing ${existing.length} existing resource row(s)…`);
    await db.delete(resources);
  }

  let inserted = 0;
  const invisible: string[] = [];

  for (const [regionSlug, byCategory] of Object.entries(SAMPLES)) {
    const [region] = await db.select().from(regions).where(eq(regions.slug, regionSlug));
    if (!region) {
      console.warn(`[sample] no region "${regionSlug}" — run "npm run db:seed" first. Skipping.`);
      continue;
    }

    for (const [categorySlug, items] of Object.entries(byCategory)) {
      const [category] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.regionId, region.id), eq(categories.slug, categorySlug)));
      if (!category) {
        console.warn(`[sample] no category "${regionSlug}/${categorySlug}". Skipping.`);
        continue;
      }

      await db.insert(resources).values(
        items.map((item, i) => ({
          categoryId: category.id,
          title: item.title,
          url: item.url,
          description: item.description,
          type: item.type,
          tags: item.tags,
          status: item.status ?? ('published' as const),
          sortOrder: (i + 1) * 10,
          archivedAt: item.archived ? new Date() : null,
        })),
      );

      inserted += items.length;
      for (const item of items) {
        if (item.archived) invisible.push(`${item.title} — archived`);
        else if (item.status && item.status !== 'published') invisible.push(`${item.title} — ${item.status}`);
      }
    }
  }

  console.log(`\n[sample] inserted ${inserted} resources.`);
  console.log(`[sample] ${inserted - invisible.length} of them should be visible to the public.`);
  console.log(`[sample] these ${invisible.length} must NOT appear on the site:`);
  for (const line of invisible) console.log(`[sample]   · ${line}`);
  console.log(
    `\n[sample] If you can see any of those four on http://localhost:5173, ` +
      `isPubliclyVisible() (exercise 1) is letting them through.\n`,
  );
  process.exit(0);
}

await main();
