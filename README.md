# Monthly Money

A private, offline-first monthly spending tracker designed for an iPhone. Monthly Money starts with take-home pay, subtracts enabled fixed bills and subscriptions, then reduces the remaining balance as purchases are logged.

All financial data stays in IndexedDB on the device. There are no accounts, analytics, ads, APIs, external fonts, databases, or sync services.

## Starting budget

The included defaults reproduce the supplied budget exactly:

- Take-home pay: **$2,950.00**
- Fixed bills: **$1,966.65**
- Subscriptions: **$113.03**
- Starting spendable amount: **$870.32**

Google Drive and Discord Nitro are marked provisional and remain editable. Gas is a variable category; car insurance and cell-phone costs are intentionally omitted.

## Features

- Fast add, edit, and confirmed delete for purchases
- Prominent balance with healthy, low, and over-budget states
- Category totals, recent activity, and all current-month purchases
- Editable income, bills, subscriptions, and categories
- Automatic, idempotent calendar-month rollover (including skipped months)
- Read-only monthly archives with settings snapshots
- Versioned local data schema and guarded migrations
- Validated full-data JSON export and restore
- Explicit two-step destructive reset
- Responsive safe-area-aware design, dark mode, keyboard focus, and large tap targets
- Installable PWA with offline precaching and iPhone icons
- GitHub Pages workflow with repository-subpath-safe relative assets and PWA scope

## Local development

Requires Node.js 20 or newer (Node 22 is used in CI).

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Useful checks:

```bash
npm run format:check
npm run lint
npm test
npm run build
npm run preview
```

The service worker is generated only for a production build. Use `npm run build && npm run preview` when testing installation or offline behavior.

## Backups and privacy

Open **Settings → Your data → Export JSON backup** and save the downloaded file somewhere durable. Restore using **Restore from backup**. The full file is validated before the current local state is replaced, and replacement requires confirmation.

Deleting Safari website data, clearing browser storage, or some device restore operations can remove IndexedDB records. Export periodically. Backup files match `monthly-money-backup-*.json` and are gitignored to prevent accidental commits.

## Deploy to GitHub Pages

1. Push this repository to GitHub on a `main` or `master` branch.
2. In the GitHub repository, open **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Open the **Actions** tab and run **Deploy to GitHub Pages**, or push a new commit.
5. When the workflow completes, open the URL shown in its deployment step (normally `https://YOUR-NAME.github.io/REPOSITORY/`).

Vite uses relative asset paths (`base: './'`), while the manifest uses relative `start_url` and `scope`, so both project Pages URLs and custom domains work without a hard-coded repository name.

## Install on iPhone

1. Open the deployed HTTPS site in **Safari** while online.
2. Tap **Share** (the square with the up arrow).
3. Choose **Add to Home Screen**, then **Add**.
4. Launch **Monthly Money** from its Home Screen icon once while online. After the initial load, the application shell works offline.

Safari may refresh the PWA when an update is deployed. Local financial data remains in IndexedDB and is not part of the service-worker cache.

## Data lifecycle

At first launch in a later calendar month, each missed month is archived once. The active month then begins with no purchases and the normal calculated starting balance. Unspent money never rolls forward. Archives contain snapshots of that month’s income, entries, categories, and transactions so later settings edits do not rewrite history.

The current IndexedDB app-state schema is version 1. Future schema changes should be implemented in `migrateData` and covered by a fixture-based migration test before incrementing `SCHEMA_VERSION`.
