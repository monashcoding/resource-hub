# Start here 👋

This is a real project, not an exercise repo invented for you. It's the MAC
Resource Hub — a curated directory of resources for Monash CS students, which
the committee maintains through its own admin page.

Seven small functions have been taken out of it. Your job is to put them back.

Everything else — the database, the login, the API, the React pages — is
finished and working. You don't need to understand those yet, and you shouldn't
change them. What you're writing is the *logic*: the handful of functions that
decide what a visitor is allowed to see, what order things appear in, and what
happens when someone types in the search box.

They're small — the first is a single line, the last is about fifteen. Each one
has tests already written that tell you, precisely, whether you got it right.

---

## 1. Get it running (10 minutes)

You need [Node.js](https://nodejs.org). Version **22** is what this project runs
in production, and what I'd install. (20.19 or newer also works; anything older
will fail when it tries to build the front end.) Check what you've got:

```bash
node --version
```

Then, from the project folder:

```bash
npm install
```

That's it. **You do not need a database for any of these exercises.** Everything
you're writing is a *pure function* — it takes values in and returns values out,
without touching a database, a network, or a screen. That's exactly why these
are the pieces worth testing, and it's why you can do all seven on a laptop on a
train with no wifi.

---

## 2. The commands

```bash
npm test           # run every test once
npm run test:watch # leave this running — it re-runs the moment you save
npm run lint       # look for mistakes (unused variables, forgotten awaits…)
npm run typecheck  # check the types line up
npm run check      # all three of the above, in order
```

**Run `npm run test:watch` in a second terminal and leave it open while you
work.** Save a file, glance at that terminal, see whether you moved forward. That
loop is the whole job. Press `q` to quit it, or Ctrl-C.

To watch just the one file you're working on, name it:

```bash
npx vitest src/server/content/tree.test.ts
```

That's the command listed under each exercise below.

Right now, `npm test` fails. That's the starting position:

```
Tests  29 failed | 36 passed (65)
```

Your goal is `65 passed`.

### Reading a failure

A failing test looks like this:

```
 FAIL  src/server/admin/reorder.test.ts > nextSortOrder > places a new item after the current last
AssertionError: expected 10 to be 40 // Object.is equality

- Expected
+ Received

- 40
+ 10

 ❯ src/server/admin/reorder.test.ts:103:36
    101| describe('nextSortOrder', () => {
    102|   it('places a new item after the current last', () => {
    103|     expect(nextSortOrder(current)).toBe(40);
       |                                    ^
```

Read it from the top:

1. **Which file** — `reorder.test.ts`
2. **Which function** — `nextSortOrder`
3. **What it was checking** — "places a new item after the current last"
4. **What went wrong** — it wanted `40`, your code gave `10`
5. **The exact line** — `reorder.test.ts:103`, printed for you with the failing
   assertion marked. Open it.

`- Expected` is what the test wanted. `+ Received` is what your code actually
did. Getting comfortable reading these is genuinely half of learning to program.

**Open the test file and read the test.** It is not a locked box — it's plain
code, and it's the clearest possible description of what your function has to
do. `src/server/admin/reorder.test.ts` is about 115 lines of readable English-ish
JavaScript. Read it.

---

## 3. The exercises

Do them in order. They get harder, and each one uses something from the last.

Every one is marked in the code with a big comment block starting
`⭐ EXERCISE N`. Search the project for `TODO(exercise` to find them all.

| # | File | Function | What you'll practise | Tests it fixes |
|---|------|----------|----------------------|----------------|
| 1 | `src/server/content/tree.ts` | `isPubliclyVisible` | Comparing values, `&&`, returning a boolean | 4 |
| 2 | `src/server/admin/reorder.ts` | `nextSortOrder` | Looping over a list, finding a maximum | 2 |
| 3 | `src/server/admin/validate.ts` | `slugify` | String methods, chaining, a first regular expression | 7 |
| 4 | `src/server/admin/validate.ts` | `normaliseTags` | `Set`, de-duplicating, sorting, not mutating | 4 |
| 5 | `web/src/regions.ts` | `presentationFor` | Object lookup, `??`, designing a safe fallback | 1 |
| 6 | `web/src/search.ts` | `filterCategory` | `.filter()`, `.some()`, `.includes()`, copying an object | 4 |
| 7 | `src/server/admin/reorder.ts` | `renormalise` | Putting all of it together | 7 |

Those add up to the 29 failures, and none of them depend on each other — each
exercise can be finished and checked entirely on its own.

### 1 — `isPubliclyVisible`

`npx vitest src/server/content/tree.test.ts`

One line that decides whether a member of the public can see a resource. If it's
wrong, either the site is empty or it shows things that were meant to be hidden.
Start here because it's the smallest, and because it matters most.

### 2 — `nextSortOrder`

`npx vitest src/server/admin/reorder.test.ts`

Committee members drag resources up and down with ↑/↓ buttons. Positions are
numbers — 10, 20, 30 — and when someone adds a new resource it needs a number
that puts it at the bottom. Find the biggest number in the list, add 10.

The trap: the list isn't sorted. "The biggest" is not "the last one".

### 3 — `slugify`

`npx vitest src/server/admin/validate.test.ts`

`"Interview Prep"` needs to become `"interview-prep"` — lowercase, no spaces, safe
to put in a URL. Five transformations, chained. This is your first regular
expression; the comment above the function explains every symbol you need and
nothing more. It's the biggest single jump in the set, so take it slowly.

### 4 — `normaliseTags`

`npx vitest src/server/admin/validate.test.ts`

Someone types `Free`, someone else types `free `, and a third person types
`FREE`. All three are the same tag. Clean them up on the way in and nothing
downstream ever has to think about it again.

### 5 — `presentationFor`

`npx vitest web/src/regions.test.ts`

Each region on the map has a colour and a slot in the grid. This looks those up.
The interesting part is what happens when the lookup fails — read the comment
about `??` versus `||`, it's a distinction you'll use forever.

### 6 — `filterCategory`

`npx vitest web/src/search.test.ts`

The search box. Type "interview", see only matching resources. The one thing
that can really bite you here is accidentally *modifying* the data instead of
building a filtered copy — there's a test specifically to catch that, and the
comment explains why it would be a nasty bug.

### 7 — `renormalise`

`npx vitest src/server/admin/reorder.test.ts`

The boss. Four steps, and the comment breaks each one down. **Write one step,
run the tests, write the next.** Trying to write all four before running
anything is how people get stuck for an hour.

---

## 4. When you're stuck

In this order:

1. **Read the failing test.** Open the `.test.ts` file, find the test by its
   name, read what it does. It's the spec.
2. **Re-read the comment above the function.** The worked examples and the
   ⚠️ GOTCHAs are there because those are the things people actually get wrong.
3. **Print things out.** Add `console.log(...)` inside your function and run the
   tests again — whatever you print shows up in the terminal. Delete them when
   you're done.
4. **Play with one piece on its own.** You don't need the project to try out a
   string method:
   ```bash
   node -e "console.log('C++ & Data Structures'.toLowerCase().replace(/[^a-z0-9]+/g, '-'))"
   ```
   Or open your browser's dev console and type it there. Five seconds of trying
   beats five minutes of guessing.
5. **Ask me.** Bring the failing test output — "I expected X, I got Y, here's
   what I tried" gets a much better answer than "it doesn't work".
6. **Look at the answer.** The finished version of every one of these lives on
   the `main` branch:
   ```bash
   git show main:src/server/admin/reorder.ts
   ```
   This isn't cheating, but do it *after* you've had a real go — reading a
   solution to a problem you've wrestled with teaches you something; reading one
   to a problem you skimmed teaches you nothing. And if you do look, close it,
   then write your version from memory.

---

## 5. Rules of the road

- **Don't edit the test files.** Making a test pass by changing what it asks for
  is the one move that defeats the whole exercise. If you're certain a test is
  wrong, come and tell me — you might be right, and that's a good conversation.
- **Only touch the `TODO(exercise …)` spots.** Everything else already works.
- **Get one test green at a time.** Not all 29 at once.
- **`npm run lint` before you say you're done.** It catches the small stuff.
- **Commit as you go.** One commit per exercise is a nice habit:
  ```bash
  git add -A
  git commit -m "Exercise 1: implement isPubliclyVisible"
  ```

---

## 6. Words you'll see

| Term | What it means here |
|---|---|
| **Pure function** | A function that only looks at what it's given and only returns a value — no database, no screen, no surprises. Easy to test, which is why all seven are pure. |
| **Unit test** | A small piece of code that calls your function with known input and checks the output. `expect(nextSortOrder([])).toBe(10)` reads as "I expect this to be 10". |
| **Slug** | The URL-safe version of a name. `"Interview Prep"` → `"interview-prep"`. |
| **Soft delete** | "Deleting" by marking a row as archived instead of actually removing it, so it can be brought back. Nothing in this app is ever truly deleted. |
| **Mutation** | Changing an existing object or array in place. Often a bug — see exercise 6. |
| **Immutable** | The opposite: instead of changing something, build a new copy with the change. Strings in JavaScript work this way already. |
| **Linting** | An automated read-through of your code looking for likely mistakes. Not the same as tests: tests check behaviour, the linter checks the code itself. |
| **Type** | TypeScript's note about what kind of value something is. `slug: string` means "this is text". Getting one wrong is caught by `npm run typecheck` before the code ever runs. |
| **Regular expression** | A pattern for matching text, written between slashes: `/[^a-z0-9]+/g`. Exercise 3 uses a small one and explains each symbol. |

---

## 7. When all 65 pass

```
Test Files  5 passed (5)
     Tests  65 passed (65)
```

Then run the whole thing and see your code in a real site:

```bash
npm run check     # lint + types + tests, all green
```

Come find me when you get there — the next step is running it against a real
database and adding a feature nobody has written yet, which is a different and
much more interesting kind of hard.

If you want to poke around in the meantime, the parts you didn't touch are worth
a read in roughly this order:

- `src/server/db/schema.ts` — the shape of the data. Three tables and an audit log.
- `src/server/content/tree.ts` — how flat database rows become the nested structure the website draws.
- `src/server/routes/content.ts` — an HTTP endpoint, start to finish, in 22 lines.
- `web/src/pages/RegionPage.tsx` — a React page, including the search box you made work.
- `README.md` — how the whole thing is deployed and run.
- `CLAUDE.md` — the design decisions, and the mistakes that were deliberately avoided. Read this one last; it'll make more sense once the rest is familiar.
