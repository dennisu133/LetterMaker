# LetterMaker frontend

Static [React](https://react.dev/) frontend for the LetterMaker application. Entirely rendered on client side. Developed with [Vite](https://vite.dev/) and [Bun](https://bun.com/).

Uses

- [React hook form](https://react-hook-form.com/) and [Zod](https://zod.dev/) for form validation
- [i18next](https://www.i18next.com/) for translation
- [shadcn](https://ui.shadcn.com/docs/components) for ui components
- [pdf.js](https://mozilla.github.io/pdf.js/) for local pdf validation (used for stamps)

# Scripts

- Install dependencies with `bun install`
- Start a development server using `bun dev`
- Build the static files using `bun run build`
- Format with prettier using `bun format` (Note: prettier is not part of the dependencies, use your own or install it locally)
- Lint with eslint using `bun lint`

# i18n

You can easily add new translations by creating additional locale files in [locales/](/frontend/src/locales/). Simply copy [en.json](/frontend/src/locales/en.json) and translate the values into another language.

# Backend communication

The project uses Vite's dev environment variable ([import.meta.env.DEV](https://vite.dev/guide/env-and-mode)) to determine between development and production environment.

- In development requests will be sent to http://localhost:8080/api/create
- In production the requests will use relative URLs (""). This is useful when the front and backend are hosted on the same machine and avoids CORS complications.
- The default value can be overriden by setting the environment variable VITE_API_URL (e.g. VITE_API_URL=http://mydomain.com:1337)
