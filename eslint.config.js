import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

// Flat config (ESLint 9). Run it with `npm run lint`, or `npm run lint:fix` to
// let it repair what it can.
//
// The rule set is deliberately small: enough to catch real mistakes (an unused
// import, a forgotten `await`, a React hook called conditionally) without
// turning every save into a style argument. Formatting is not linted at all —
// there is no Prettier here on purpose, so nobody is blocked by a comma.
export default tseslint.config(
  {
    // Build output, deps, and generated SQL are not ours to lint.
    ignores: ['dist/**', 'node_modules/**', 'drizzle/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ── Server (Node) ──────────────────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: globals.node,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },

  // ── SPA (browser + React) ──────────────────────────────────────────────────
  {
    files: ['web/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // The two hook rules that actually prevent bugs: hooks must run in the
      // same order every render, and an effect that reads a value must list it.
      ...reactHooks.configs.recommended.rules,
    },
  },

  // ── Rules shared by both ───────────────────────────────────────────────────
  {
    files: ['src/**/*.ts', 'web/src/**/*.{ts,tsx}'],
    rules: {
      // An unused variable is usually a leftover or a typo. A leading underscore
      // means "I know, I left this on purpose".
      //
      // `args: 'none'` — unused *parameters* are not flagged. A function's
      // signature is often fixed by its caller (Express handlers, callbacks) or
      // by a stub you have not filled in yet; that is not a mistake worth an
      // error. Unused locals and unused imports still are.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'none', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // A forgotten `await` on a promise is the single most common async bug in
      // this codebase's shape (every DB call returns one).
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      // `any` switches type-checking off. Allowed with a warning so it shows up
      // in review rather than silently spreading.
      '@typescript-eslint/no-explicit-any': 'warn',
      eqeqeq: ['error', 'smart'],
      'no-console': 'off', // boot/seed/audit logging is intentional here
    },
  },

  // Tests may reach for shortcuts the app code shouldn't.
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
