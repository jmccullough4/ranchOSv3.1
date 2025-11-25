# Repository Guidelines

## Project Structure & Module Organization
`frontend/` hosts the Vite-powered React dashboard, `server/` contains the Express simulator that feeds herd, sensor, and gate data, and `backend/` houses a FastAPI mirror used when Python hosting is requested. UI assets belong in `frontend/public/static/` (logo plus `media/cameras/cam1.mp4`…`cam4.mp4`). JSON data under `server/` (`pastures.json`, `sensors.json`, `users.json`) doubles as persistent state for the simulator—use the REST endpoints instead of editing files directly so state stays consistent. `simulator/` keeps standalone visualization prototypes for herd experiments.

## Build, Test, and Development Commands
- `npm run dev` — concurrent Vite + Nodemon loop (ports 5173 and 8082) for day-to-day UI/API work.
- `npm run build` — runs `scripts/generate-version.js` and emits `frontend/dist`, which both Express and FastAPI serve.
- `npm run start` — production Express server on `:8082`; assumes an existing build.
- `docker compose up --build` — reproducible demo stack with Mapbox token injection; override via `export MAPBOX_TOKEN=...`.
- `python -m uvicorn backend.app:app --reload` — local FastAPI preview if stakeholders prefer the Python service.
Always seed `frontend/public/static` with the logo and camera clips before running any command above to avoid 404s.

## Coding Style & Naming Conventions
Stick with two-space indentation, single quotes, and no trailing semicolons in JavaScript. React components follow `PascalCase.jsx` under `frontend/src/components/`, hooks/utilities are `camelCase.js`, and cattle/device IDs remain in the `3S-###` pattern. Express routes stick to `/api/<resource>`, and configuration constants live near the top of `server/index.js` or `frontend/src/constants.js`. Run `npm run build` after style-heavy changes so the generated version metadata and static imports remain valid.

## Testing Guidelines
There is no automated suite yet, so document manual verification in each PR (e.g., `npm run dev`, login with `jay/3strands`, confirm herd drift, gate toggles, and camera playback). If you introduce Vitest or Jest, colocate specs next to helpers—`MapPanel.spec.js` for geospatial utilities or `simulator/*.spec.js` for movement math—and mock fetch calls to keep runs under a minute.

## Commit & Pull Request Guidelines
Git history favors short, imperative subjects (“Gate notifications behind demo mode”) with supporting detail in the body; keep subjects under 72 characters and mention relevant issues using `#123`. Squash unrelated work into separate commits so reviewers can trace regressions quickly. Each PR should outline the scenario addressed, commands executed during QA, asset requirements (Mapbox token, media files), and screenshots or recordings for UI shifts. Tag maintainers responsible for the touched areas (`frontend/`, `server/`, or `backend/`) to keep ranch ops aligned.
