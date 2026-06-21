# Deploy

`mdapp` is a static frontend (Vite → `dist/`). Any static host works; configs
for **Vercel** and **Netlify** are checked in, so a deploy is "connect the repo
once, then every `git push` ships." Pick one — you don't need both.

## 0. Prerequisite: push the repo to GitHub (one time)

Both platforms deploy by watching a Git repo. The code is committed locally but
has no remote yet.

```bash
# create an empty repo on github.com first (no README/license), then:
git remote add origin https://github.com/<you>/mdapp.git
git push -u origin main
```

## Option A — Vercel (recommended for Vite)

Reads [vercel.json](vercel.json): build `npm run build`, output `dist/`,
SPA rewrites so deep links resolve.

1. Go to **vercel.com** → sign in with GitHub.
2. **Add New… → Project** → import the `mdapp` repo.
3. Vercel auto-detects Vite and reads `vercel.json` — leave the defaults, click
   **Deploy**.
4. ~1 min later you get a live URL like `mdapp-<you>.vercel.app`.

Every push to `main` redeploys production; every PR gets its own preview URL.

CLI alternative (no dashboard):

```bash
npm i -g vercel
vercel          # first run links the project + deploys a preview
vercel --prod   # promote to the production URL
```

## Option B — Netlify

Reads [netlify.toml](netlify.toml): same build, plus an SPA fallback redirect.

1. Go to **netlify.com** → sign in with GitHub.
2. **Add new site → Import an existing project** → pick the `mdapp` repo.
3. Build command and publish dir are read from `netlify.toml` — click **Deploy**.
4. Live at `random-name.netlify.app`; rename it under **Site settings → Domain**.

CLI alternative:

```bash
npm i -g netlify-cli
netlify init     # link the repo + set up CI deploys
netlify deploy --prod
```

## Notes

- **No env vars, no secrets, no backend.** `public/prices.json` ships as a static
  asset inside `dist/`, so the live site is fully self-contained.
- **Node version** is pinned to 22 via [.nvmrc](.nvmrc) (Vite 7 needs ≥ 20.19);
  Netlify also gets it from `netlify.toml`. If a build ever fails on an old Node,
  that's the knob.
- **Refreshing data:** run `npm run pull:prices`, commit the updated
  `public/prices.json`, and push — the host rebuilds automatically.
- **Custom domain:** add it in the host's dashboard (Domains/Domain management)
  and follow the DNS instructions; both issue HTTPS certs automatically.
