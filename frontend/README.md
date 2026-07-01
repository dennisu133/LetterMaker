# LetterMaker frontend

Static [React](https://react.dev/) frontend for the LetterMaker application. Entirely rendered on client side. Developed with [Vite](https://vite.dev/) and [Bun](https://bun.com/).

## Stack

- [React hook form](https://react-hook-form.com/) and [Zod](https://zod.dev/) for form validation
- [i18next](https://www.i18next.com/) for translation
- [shadcn](https://ui.shadcn.com/docs/components) for ui components
- [pdf.js](https://mozilla.github.io/pdf.js/) for local pdf validation (used for stamps)

## Development

```sh
bun install
bun run dev
```

The main quality gate runs formatting, accessibility-aware linting, the unit/integration suite, TypeScript, and a production build:

```sh
bun run check
```

## Testing

The test suite is split by feedback speed:

- `bun run test` — Vitest unit and React Testing Library integration tests.
- `bun run test:coverage` — the same suite with enforced coverage thresholds.
- `bun run test:e2e:install` — one-time Chromium installation for Playwright.
- `bun run test:e2e` — desktop and 320px mobile browser flows, including axe accessibility checks and real PDF.js stamp validation.
- `bun run test:all` — all unit, integration, and browser tests.

Run `bun run test:watch` while developing or `bun run test:e2e:ui` to debug browser flows interactively.

## Internationalization

You can easily add new translations by creating additional locale files in [locales/](/frontend/src/locales/). Simply copy [en.json](/frontend/src/locales/en.json) and translate the values into another language.

## Backend communication

The project uses Vite's dev environment variable ([import.meta.env.DEV](https://vite.dev/guide/env-and-mode)) to determine between development and production environment.

- In development requests will be sent to `http://localhost:8080/api/create`
- In production the requests will use relative URLs (""). This is useful when the front and backend are hosted on the same machine and avoids CORS complications.
- The default value can be overridden by setting `VITE_API_URL` (for example, `VITE_API_URL=http://mydomain.com:1337`).
