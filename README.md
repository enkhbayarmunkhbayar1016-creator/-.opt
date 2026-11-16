# Ops Control App

A React + Vite frontend paired with an Express API for an equipment operations dashboard. The app includes:

- website dashboard for desktop
- phone/mobile operations flow
- role-based login backed by persistent PostgreSQL accounts
- Gmail email-code verification for registration and password recovery
- mock dashboard data API

## Tech stack

- React 19
- Vite 8
- Tailwind CSS v4
- Express 4
- PostgreSQL (`pg`)
- Nodemailer (Gmail SMTP)
- Node.js

## Local development

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Copy `.env.example` to `.env`, then set the Supabase `DATABASE_URL`, a random `OTP_SECRET` with at least 32 characters, and Gmail SMTP credentials. Use a Google App Password for `SMTP_PASS`, not your normal Gmail password.
3. Start the app in development mode:
   ```bash
   pnpm dev
   ```
4. Open the frontend at the Vite URL shown in the terminal, usually:
   ```bash
   http://localhost:8443
   ```
5. The Express API runs on:
   ```bash
   http://localhost:4000
   ```

## Production build

```bash
npm run build
npm start
```

When the app is built, the Express server serves the generated Vite files from the `dist/` folder and keeps the `/api/*` routes available.

## Tests

Test files and shared test setup are kept in `tests/`.

```bash
pnpm test           # backend API tests and frontend unit tests
pnpm test:unit      # frontend unit tests only
pnpm test:coverage  # frontend coverage report
```

For new behavior, use Red-Green-Refactor: add a test that fails for the missing behavior, implement the smallest change that makes it pass, then refactor and rerun the tests.
The coverage command enforces 90% statement, function, and line coverage for the app modules exercised by the suite; branch coverage is reported as a metric.

## Docker deployment

This project now includes a Dockerfile so you can push it to GitHub and deploy on Render as a Docker Web Service.

### Build locally

```bash
docker build -t ops-control-app .
docker run --rm -p 10000:10000 ops-control-app
```

Then open:

```bash
http://localhost:10000
```

### Verify the health endpoint

```bash
curl http://localhost:10000/api/health
```

## Render deployment

Use Render with a Docker-based web service.

### Render settings

- Type: Web Service
- Runtime: Docker
- Dockerfile path: `./Dockerfile`
- Docker context: `.`
- Port: `10000`
- Health check path: `/api/health`

### Why this setup works on Render

- The app builds inside Docker with Node 22.
- The Express server serves the built frontend and API on the same port.
- Render can pull the repo from GitHub and deploy the container automatically.
- Configure `DATABASE_URL`, `OTP_SECRET`, `SMTP_USER`, `SMTP_PASS`, and optionally `SMTP_FROM` in the Render dashboard.

## Environment variables

Create a `.env` file from `.env.example`. The API creates its `users`, `auth_sessions`, and `email_verification_codes` tables in Supabase on startup.

Verification codes expire after 10 minutes, allow up to five attempts, and can be re-requested once per minute. Passwords are stored as scrypt hashes; verification codes are stored as keyed hashes. Public registration creates renter accounts only.

## Project structure

```bash
src/                # React app
server/             # Express API
tests/              # frontend unit tests, backend API tests, and test setup
public/             # static assets
package.json        # app scripts and dependencies
vite.config.ts      # Vite config with API proxy for local dev
render.yaml         # Render deployment configuration
```

## Account registration and recovery

- New accounts enter a six-digit code emailed to the address they registered with before an account is created.
- Forgot-password requests email a separate six-digit code; the user enters it with a new password.
- Manager and fixer accounts must be provisioned by an administrator; public registration is restricted to renters.
- The database stores account credentials, hashed session tokens, and short-lived verification challenges. Dashboard equipment data remains sample data.

##NOTES
https://docs.google.com/document/d/1hfwc3QhKvPXcPAYTpc-VPqFWlpHFA3iaJMNPgIMcyV8/edit?usp=sharing
