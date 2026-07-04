# ADR-0008: Angular SPA served same-origin by the host

**Status:** Accepted

## Context

The app needs a web frontend. The chosen framework is **Angular** — not because it is the
lowest-friction option here (it is not; see below), but as a deliberate skill-deepening choice: it
is the developer's day-job stack, and the goal is to build real depth against a backend they fully
understand.

The frontend lives in a sibling `frontend/` directory at the repository root — **same repo**, but
**outside** the .NET project tree:

```
HabitTracker/
├── HabitTracker.sln
├── HabitTracker/        ← API host
├── Modules/
├── compose.yaml
└── frontend/            ← Angular app (own package.json, node_modules)
```

The same repo keeps front- and back-end changes atomic (a new endpoint and its consuming screen move in
one commit, against the same Contracts DTOs). A sibling folder keeps the npm/node toolchain out of
the MSBuild tree and out of the `.sln`.

The decision this forced is **how the browser reaches the SPA and the API**, because the backend
auth is already **cookie + server-side OIDC** ([Authentication](../../../HabitTracker.Authentication)):
`/api/auth/login` does an OIDC redirect and the session is a cookie. How the SPA is served determines
whether that cookie "just works" or needs reworking.

An **origin** is `scheme + host + port`; the browser only sends the auth cookie automatically, and
skips CORS, when a request is *same-origin* with the page. Two axes are independent and were
conflated at first:

- **Deployment topology** — one process serves both, vs. separate processes behind a proxy.
- **Origin (what the browser sees)** — same origin, vs. separate origins.

A reverse proxy decouples them: separate processes can still present a single origin via path-based
routing. So three shapes were on the table:

1. **Host serves the built SPA from `wwwroot`** — one process, same origin.
2. **Separate processes behind a proxy, same origin** — path-routes `/api`→API, `/`→static files.
3. **Separate origins** — SPA on its own domain/CDN, API on another; requires CORS + `SameSite=None`
   credentialed cookies, or a move to bearer tokens.

## Decision

The Angular SPA is served **same-origin**, via **option 1**: the existing host serves the built
Angular output as static files, with a fallback route for client-side routing. Existing cookie/OIDC
auth is left untouched.

- **Production:** `ng build` output lands in the host's `wwwroot`; the single existing container
  serves the SPA, `/api/*`, and `/api/auth/*` on one origin. `compose.yaml` is unchanged. The host adds
  `app.UseStaticFiles()` and `app.MapFallbackToFile("index.html")` so a refresh on a client route
  (e.g. `/calendar`) returns `index.html` and lets the Angular router take over.
- **Development:** `ng serve` runs on its own port (:4200); an Angular `proxy.conf.json` forwards
  `/api` and the OIDC callbacks (`/signin-oidc`, `/signout-callback-oidc`) to the host
  (`http://localhost:8080`). The browser only ever talks to the dev-server origin, so dev behaves
  same-origin too — hot reload *and* working cookies.
- **Auth stays as-is.** Because the SPA is same-origin with the API, the browser attaches the auth
  cookie automatically and there is no CORS. Login is a `window.location` redirect to
  `/api/auth/login`; the server runs OIDC and redirects back authenticated. Angular writes no auth code.
- **DTO contracts** are handwritten TypeScript interfaces mirroring the module Contracts DTOs to
  start; OpenAPI codegen is a later option, not a prerequisite.

Options 2 and 3 are **deferred, not rejected** — they are recorded as intentional later exercises:

- **Option 2 (proxy, same origin)** is how front and back deploy/scale independently while the
  browser still sees one origin. Moving option 1 → option 2 changes **zero Angular code and zero
  auth code**: split the one container into an API container plus a nginx/static container, and add
  a path-routing proxy. It is pure ops, learnable on its own.
- **Option 3 (separate origins + tokens)** is the deliberate way to learn the cross-origin auth
  boundary (CORS, credentialed cookies or bearer tokens + an HTTP interceptor). It touches backend
  auth and one Angular interceptor, not the whole app.

Same-origin is chosen now because the cost of options 2–3 is ops/auth plumbing that teaches nothing
about *Angular*, which is the actual goal.

## Consequences

**Easier**
- Auth is free on the frontend: same-origin cookies attach automatically, no CORS, no token
  plumbing, no `SameSite`/`withCredentials` config. The existing OIDC flow is untouched.
- One deployable artifact and one container — the current `compose.yaml` and deploy story are
  unchanged; the only backend delta is two lines (`UseStaticFiles` + `MapFallbackToFile`).
- Front- and back-end stay in one repo, so a contract change and its UI consumer move together;
  Angular interfaces track the Contracts DTOs directly.
- A clean, low-risk learning path: ship the MVP on option 1, then take on option 2 (deployment
  topology) and option 3 (cross-origin auth) as separate, app-preserving exercises.

**Harder**
- Front- and back-end are coupled at deployment time — they ship as one unit and cannot be released or
  scaled independently until the option-2 split is done. Acceptable for a single-developer app; the
  migration path is recorded above.
- A build step must land `ng build` output in `wwwroot` (a copy step now, or an MSBuild `dotnet
  publish` target later). The Angular toolchain (node/npm) becomes part of producing a release
  artifact even though it lives outside the .NET tree.
- The host now serves static files and owns an SPA fallback route, so it is no longer a pure API —
  the catch-all must sit after the `/api` routes so it never shadows them.
- DTOs are duplicated in TypeScript by hand until/unless OpenAPI codegen is adopted, so a Contracts
  change must be mirrored manually in the frontend.
