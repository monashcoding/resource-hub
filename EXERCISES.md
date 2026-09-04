# Start here 👋

This is a real project, not an exercise repo invented for you. It's the MAC
Resource Hub — a curated directory of resources for Monash CS students, which
the committee maintains through its own admin page.

Five small functions have been taken out of it. Your job is to put them back.

Everything else — the database, the login, the API, the React pages — is
finished and working. You don't need to understand those yet, and you shouldn't
change them. What you're writing is the *logic*: the functions that decide what
a visitor is allowed to see, what order things appear in, and what happens when
someone types in the search box.

Two more functions have been left **finished**, as worked examples to read.
They're the two hardest ones, and you'll get more out of reading them than out
of being stuck on them.

They're small — the first is a single line, the biggest is about ten. Each one
has tests already written that tell you, precisely, whether you got it right.

---

## 1. Before you start

### What you need on your machine

| | What | Why | Check it's there |
|---|---|---|---|
| **1** | [**Git**](https://git-scm.com/downloads) | To get the code, and to save your work as you go | `git --version` |
| **2** | [**Node.js**](https://nodejs.org) — take the **LTS** download | Runs the project and the tests | `node --version` |
| **3** | A code editor — [**VS Code**](https://code.visualstudio.com) unless you already have one | Where you'll actually write | it opens |
| **4** | *Optional:* [**Docker Desktop**](https://www.docker.com/products/docker-desktop/) | Only if you want to see the real website running. The exercises don't need it. | `docker --version` |

Each `--version` command should print a version number rather than an error like
`command not found`. Mine print:

```
git version 2.46.0
v22.13.1
Docker version 27.4.0
```

On Node: **22 or newer**. That's what the site runs in production. Anything older
than 20.19 will install fine and then fail confusingly when it builds the front
end, so if `node --version` shows something older, update it before going on.

`npm` comes bundled with Node — you don't install it separately. If `node
--version` works, `npm --version` will too.

### Getting the code

```bash
git clone https://github.com/monashcoding/resource-hub.git
cd resource-hub
git checkout teaching/first-year-starter
npm install
```

Or land on the branch in one step, if you prefer — `-b` says which branch to
start on:

```bash
git clone -b teaching/first-year-starter https://github.com/monashcoding/resource-hub.git
cd resource-hub
npm install
```

Either is fine. Don't add `--single-branch` though: it skips downloading `main`,
and `main` is where the finished answers are.

That last one downloads the project's dependencies. It takes a minute and prints
a lot; as long as it doesn't end in `ERR!`, it worked.

It will finish with something like `9 moderate severity vulnerabilities` and
suggest `npm audit fix --force`. **Ignore that, and do not run it.** Those
warnings are about packages this project barely uses, `--force` upgrades things
across major versions whether or not anything is ready for it, and it is a
genuinely good way to break a working project in one command. Keeping
dependencies current is a real job, but it's a separate one, and it isn't
yours today.

**Check you're on the right branch before you write anything:**

```bash
git branch --show-current
```

It must say `teaching/first-year-starter`. If it says `main` you're looking at
the finished version, and every exercise will already be done.

### Check it all works

Run these three. This is the "is my setup broken, or is it me?" baseline — do it
now, while nothing is your fault yet.

```bash
npm test
```
> Should end `Tests  15 failed | 50 passed (65)`. **Failures here are correct** —
> those 15 are the exercises waiting for you.

```bash
npm run lint
```
> Should print almost nothing: two lines starting with `>`, then silence. For
> most command-line tools, **silence means success**. It only speaks up when
> something's wrong.

```bash
npm run typecheck
```
> Same — two `>` lines and nothing else.

If `npm test` errors instead of failing tests (something like `command not
found` or `Cannot find module`), that's a setup problem, not an exercise. Most
likely `npm install` didn't finish. Run it again, and bring me the error if it
still won't go.

### What I'm assuming you already know

- You've written *some* code before, in any language. Python from FIT1045 is
  exactly the right amount.
- You can open a terminal, `cd` into a folder, and run a command.
- You know what a variable, a function, an `if` and a loop are.

**What I'm not assuming**, and which you therefore don't need to learn first:
JavaScript, TypeScript, React, SQL, Docker, or anything about git beyond the
six commands this file spells out for you (`clone`, `checkout`, `branch`, `add`,
`commit`, `show`). Section 4 covers the JavaScript you need, in terms
of the Python you already know. Everything else in the project is already
written.

### If you're on Windows

The commands in this file assume a Unix-style terminal. Use **Git Bash** (it
comes with Git) or **PowerShell** and everything here works as written. The one
difference: where a command says

```bash
export DATABASE_URL=...
```

PowerShell wants

```powershell
$env:DATABASE_URL = "..."
```

You'll only hit that if you go off the beaten path — the normal setup doesn't
need it.

---

## 2. Get it running

**You do not need a database for any of these exercises.** Everything
you're writing is a *pure function* — it takes values in and returns values out,
without touching a database, a network, or a screen. That's exactly why these
are the pieces worth testing, and it's why you can do all five on a laptop on a
train with no wifi.

But you'll want to see the actual website at some point, so:

### Optional, and worth it: run the real site

You need [Docker Desktop](https://www.docker.com/products/docker-desktop/)
installed and running. Then, once:

```bash
npm run setup
```

That starts a throwaway Postgres in a container, creates the tables, adds the
four regions, and fills them with 26 sample resources to look at. It prints what
it did at each step. Give it a minute or two the first time — it has to download
the database image — and a few seconds every time after that.

Then, in two more terminals:

```bash
npm run dev        # the API, on http://localhost:3000
npm run dev:web    # the website, on http://localhost:5173
```

Open <http://localhost:5173>. That's the real thing, running on your machine,
with your code in it.

| Command | What it does |
|---|---|
| `npm run setup` | All of the below, in order — the only one you normally need |
| `npm run db:up` | Start the database container |
| `npm run db:down` | Stop it. Your data survives. |
| `npm run db:reset` | Stop it **and delete the data**, to start completely clean |
| `npm run db:sample` | Re-load the sample resources (safe to run any time) |

Two things that will look broken and aren't:

- **`/admin` won't work.** It shows the sign-in screen and stops there. Signing
  in needs MAC's login service, whose session cookie only works on
  `*.monashcoding.com` — never on `localhost`. That's why there's a sample-data
  script at all: it's the only way to get resources into a local database.
- **The site is empty until you've done exercise 1.** That's not a bug, it's
  the point — see below.

### Watching your own exercises change the site

Three of the five are visible in the browser, which is much more satisfying than
watching test output:

- **Exercise 1 (`isPubliclyVisible`)** — before you write it, every region says
  "0 resources" and every page is empty, because nothing is allowed through.
  Afterwards, 22 resources appear. The sample data deliberately includes four
  that must *never* show up — one hidden, one archived, one pending, one
  rejected — and `npm run db:sample` prints their names. If any of those four
  appear on the site, your version is letting things through that it shouldn't.
- **Exercise 4 (`presentationFor`)** — before, the map is four identical grey
  boxes sitting in one flat row, all the same size and with no pictures.
  Afterwards, each one has its own colour, its own artwork, and its own place in
  the deliberately irregular grid (two of them are twice the size of the others).
- **Exercise 5 (`filterCategory`)** — before, typing in a region's search box
  does nothing at all. Afterwards it filters as you type. Try "free": 15 of the
  sample resources are tagged that way.

Exercises 2 and 3 are on the write path — they run when a committee member adds
or reorders something — so you can only see those through the tests.

---

## 3. The commands

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
Tests  15 failed | 50 passed (65)
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
do. `src/server/admin/reorder.test.ts` is about 115 lines of readable
English-ish JavaScript. Read it.

---

## 4. JavaScript, if you know a bit of Python

This project is TypeScript, which is JavaScript with type labels added. If
FIT1045 taught you Python, most of your instincts transfer — but the syntax
doesn't. Here's the short version of everything the exercises use.

### Variables

```js
const name = 'Sam';   // can't be reassigned. Use this by default.
let count = 0;        // can be reassigned. Use when you genuinely need to.
count = count + 1;
```

Python needs neither word. JavaScript needs one of them. Prefer `const` — if you
never reassign something, saying so out loud makes the code easier to read.

### Functions, and the `=>` arrow

Two ways to write a function. The first will look familiar:

```js
function double(n) {
  return n * 2;
}
```

The second is the **arrow function**, and it's everywhere in this codebase:

```js
const double = (n) => n * 2;
```

Read `(n) => n * 2` as "given `n`, give back `n * 2`". It's the same idea as
Python's `lambda n: n * 2`, but you'll see it used far more often than lambdas
are in Python. With no braces, the value after `=>` is returned automatically.
With braces, you write `return` yourself:

```js
const double = (n) => { return n * 2; };   // identical to the line above
```

You'll almost always meet arrows as an argument to something else:

```js
[1, 2, 3].filter((n) => n > 1);   // [2, 3]
```

That reads as: "for each element, call it `n`; keep it if `n > 1`."

### Comparing things

```js
a === b   // equal. ALWAYS use three, never two.
a !== b   // not equal
a && b    // and     (Python: and)
a || b    // or      (Python: or)
!a        // not     (Python: not)
```

`==` exists and does surprising conversions — `'1' == 1` is `true`. Never use it.

### Nothing-values, and truthiness

Python has one `None`. JavaScript has two:

- `null` — "deliberately empty", what a database column with no value gives you
- `undefined` — "there was never anything here", what you get from a missing key

Both are **falsy**, along with `0`, `''` and `false`. So `if (query)` reads as
"if query has anything in it", exactly like Python's `if query:`.

`??` picks the left side unless it's `null` or `undefined`:

```js
undefined ?? 'backup';   // 'backup'
```

### Lists → arrays

Python list comprehensions become methods. Each one returns a **new** array:

| Python | JavaScript |
|---|---|
| `[f(x) for x in xs]` | `xs.map((x) => f(x))` |
| `[x for x in xs if x > 1]` | `xs.filter((x) => x > 1)` |
| `any(x > 1 for x in xs)` | `xs.some((x) => x > 1)` |
| `len(xs)` | `xs.length` |
| `xs + ys`, `list(xs)` | `[...xs, ...ys]`, `[...xs]` |
| `sorted(xs)` | `[...xs].sort()` ⚠️ `.sort()` alone changes `xs` itself |
| `for x in xs:` | `for (const x of xs) { }` |

### Dicts → objects, sets → Sets

```js
const colours = { red: '#f00' };   // like a Python dict
colours.red;                       // '#f00'
colours['red'];                    // same thing
colours['green'];                  // undefined — NOT an error

const seen = new Set();            // like a Python set
seen.add('a');
seen.has('a');                     // true
[...seen];                         // back to an array: ['a']
```

Copy an object with a change, without touching the original — the `...` is
called "spread", and you'll use it in exercise 5:

```js
const user = { name: 'Sam', age: 19 };
const older = { ...user, age: 20 };   // { name: 'Sam', age: 20 }
user.age;                             // still 19
```

### Strings

Strings never change in place — every method hands you a **new** string, which
is why they chain:

```js
'  Hi There  '.trim().toLowerCase();   // 'hi there'
'abc'.includes('b');                   // true  (Python: 'b' in 'abc')
`${count} items`;                      // f-string, with backticks
```

### The TypeScript bits

Types are labels after a colon. They're checked before your code runs, and never
appear in the running program:

```ts
function greet(name: string): string {
  return `hi ${name}`;
}
```

Two you'll meet in the exercises:

- `Pick<ResourceRow, 'status' | 'archivedAt'>` — "an object with (at least)
  those two fields of a resource row". You can read it as: this function only
  looks at `status` and `archivedAt`, so those are all you have to hand it.
- `string[]` — an array of strings.

One oddity that trips everyone up: imports say `./types.js` even though the file
on disk is `types.ts`. That's deliberate and correct here. Copy the pattern and
don't think about it.

---

## 5. The exercises

Do them in order. They get harder, and each one uses something from the last.

Every one is marked in the code with a comment block starting `⭐ EXERCISE N`.
Search the project for `TODO(exercise` to find them all.

| # | File | Function | What you'll practise | Tests it fixes |
|---|------|----------|----------------------|----------------|
| 1 | `src/server/content/tree.ts` | `isPubliclyVisible` | Comparing values, `&&`, returning a boolean | 4 |
| 2 | `src/server/admin/reorder.ts` | `nextSortOrder` | Looping over a list, finding a maximum | 2 |
| 3 | `src/server/admin/validate.ts` | `normaliseTags` | `Set`, de-duplicating, sorting, not mutating | 4 |
| 4 | `web/src/regions.ts` | `presentationFor` | Object lookup, `??`, designing a safe fallback | 1 |
| 5 | `web/src/search.ts` | `filterCategory` | `.filter()`, `.some()`, `.includes()`, copying an object | 4 |

Those add up to the 15 failures, and none of them depend on each other — each
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

### 3 — `normaliseTags`

`npx vitest src/server/admin/validate.test.ts`

Someone types `Free`, someone else types `free `, and a third person types
`FREE`. All three are the same tag. Clean them up on the way in and nothing
downstream ever has to think about it again.

### 4 — `presentationFor`

`npx vitest web/src/regions.test.ts`

Each region on the map has a colour and a slot in the grid. This looks those up.
The interesting part is what happens when the lookup fails — read the comment
about `??` versus `||`, it's a distinction you'll use forever. TypeScript will
refuse to compile the version without a fallback, which is the point.

### 5 — `filterCategory`

`npx vitest web/src/search.test.ts`

The search box. Type "interview", see only matching resources. The one thing
that can really bite you here is accidentally *modifying* the data instead of
building a filtered copy — there's a test specifically to catch that, and the
comment explains why it would be a nasty bug.

---

## 6. The two worked examples

These are already written. Nothing to do, and no tests waiting on you. They're
the two hardest functions in the project, left finished on purpose: you'll learn
more reading them than you would being stuck on them for an afternoon.

| File | Function | Worth reading for |
|---|---|---|
| `src/server/admin/validate.ts` | `slugify` | How a chain of five tiny steps beats one clever step — and your first regular expression, explained symbol by symbol |
| `src/server/admin/reorder.ts` | `renormalise` | How a real function handles the awkward cases: bad input, duplicates, and two people editing at once |

Read `slugify` before exercise 1 — it's short, and it shows you what a finished
function with its reasoning written down looks like. Save `renormalise` until
after exercise 5.

Both comments end with a **TRY IT**: break one line on purpose, run the tests,
see which ones complain, then put it back. Deliberately breaking working code is
one of the fastest ways to find out what a line was actually for, and it costs
you nothing when `git` can undo it:

```bash
git checkout -- src/server/admin/validate.ts    # undo my experiment
```

---

## 7. When you're stuck

In this order:

1. **Read the failing test.** Open the `.test.ts` file, find the test by its
   name, read what it does. It's the spec.
2. **Re-read the comment above the function.** The worked examples and the
   ⚠️ GOTCHAs are there because those are the things people actually get wrong.
3. **Check the primer in section 4.** Most "I don't understand this line"
   moments are syntax, not logic.
4. **Print things out.** Add `console.log(...)` inside your function and run the
   tests again — whatever you print shows up in the terminal. Delete them when
   you're done.
5. **Play with one piece on its own.** You don't need the project to try out a
   string method:
   ```bash
   node -e "console.log('C++ & Data Structures'.toLowerCase().replace(/[^a-z0-9]+/g, '-'))"
   ```
   Or open your browser's dev console and type it there. Five seconds of trying
   beats five minutes of guessing.
6. **Ask me.** Bring the failing test output — "I expected X, I got Y, here's
   what I tried" gets a much better answer than "it doesn't work".
7. **Look at the answer.** The finished version of every one of these lives on
   the `main` branch, and you can read it without leaving your own:
   ```bash
   git show origin/main:src/server/content/tree.ts
   ```
   (`origin/main` rather than `main` — that works no matter how you cloned.)
   This isn't cheating, but do it *after* you've had a real go — reading a
   solution to a problem you've wrestled with teaches you something; reading one
   to a problem you skimmed teaches you nothing. And if you do look, close it,
   then write your version from memory.

---

## 8. Rules of the road

- **Don't edit the test files.** Making a test pass by changing what it asks for
  is the one move that defeats the whole exercise. If you're certain a test is
  wrong, come and tell me — you might be right, and that's a good conversation.
- **Only touch the `TODO(exercise …)` spots.** Everything else already works.
- **Get one test green at a time.** Not all 15 at once.
- **`npm run lint` before you say you're done.** It catches the small stuff.
- **Commit as you go.** One commit per exercise is a nice habit:
  ```bash
  git add -A
  git commit -m "Exercise 1: implement isPubliclyVisible"
  ```

---

## 9. Words you'll see

| Term | What it means here |
|---|---|
| **Pure function** | A function that only looks at what it's given and only returns a value — no database, no screen, no surprises. Easy to test, which is why all five are pure. |
| **Unit test** | A small piece of code that calls your function with known input and checks the output. `expect(nextSortOrder([])).toBe(10)` reads as "I expect this to be 10". |
| **Slug** | The URL-safe version of a name. `"Interview Prep"` → `"interview-prep"`. |
| **Soft delete** | "Deleting" by marking a row as archived instead of actually removing it, so it can be brought back. Nothing in this app is ever truly deleted. |
| **Mutation** | Changing an existing object or array in place. Often a bug — see exercise 5. |
| **Immutable** | The opposite: instead of changing something, build a new copy with the change. Strings in JavaScript work this way already. |
| **Linting** | An automated read-through of your code looking for likely mistakes. Not the same as tests: tests check behaviour, the linter checks the code itself. |
| **Type** | TypeScript's note about what kind of value something is. `slug: string` means "this is text". Getting one wrong is caught by `npm run typecheck` before the code ever runs. |
| **Regular expression** | A pattern for matching text, written between slashes: `/[^a-z0-9]+/g`. The `slugify` worked example uses a small one and explains each symbol. |

---

## 10. When all 65 pass

```
Test Files  5 passed (5)
     Tests  65 passed (65)
```

Then run the whole thing:

```bash
npm run check     # lint + types + tests, all green
```

Come find me when you get there. If you haven't run the real site yet, do that
now (section 2) and go and look at what you built. After that, the next step is
adding a feature nobody has written yet, which is a different and much more
interesting kind of hard.

If you want to poke around in the meantime, the parts you didn't touch are worth
a read in roughly this order:

- `src/server/db/schema.ts` — the shape of the data. Three tables and an audit log.
- `src/server/content/tree.ts` — how flat database rows become the nested structure the website draws.
- `src/server/routes/content.ts` — an HTTP endpoint, start to finish, in 22 lines.
- `web/src/pages/RegionPage.tsx` — a React page, including the search box you made work.
- `README.md` — how the whole thing is deployed and run.
- `CLAUDE.md` — the design decisions, and the mistakes that were deliberately avoided. Read this one last; it'll make more sense once the rest is familiar.
