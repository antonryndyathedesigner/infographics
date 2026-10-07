# Semantic infographic generation (Gemini)

This version prepares image-based artistic SVG generation. It is not activated on the current GitHub Pages site. Live model quality and availability have not been verified because no Gemini API key is configured.

The model receives the selected reference images, exact source data, palette and free-text direction. It analyzes visual metaphors and creates three original parametric vector scenes. Curves, organic silhouettes, radial marks, grain and blurred accents are supported. The renderer binds values and labels to source rows and computes dimensions from source numbers. There are no fixed artistic templates in this path. Scene validation rejects missing/duplicate records, invalid geometry, mismatched numeric scales, executable markup and invented numeric annotations. It does not establish that the model's design choices are clear, attractive or semantically correct; those need real-reference evaluation.

## Hosting

A server is required. GitHub Pages serves static files and cannot execute `api/generate.js`. The `api/` handler is compatible with Vercel Node functions. Deploy this branch as a Vite project with `npm run build` and output directory `dist`.

Configure securely in hosting settings:

- `INFOGRAPHICS_PROVIDER=gemini`
- `INFOGRAPHICS_MODEL=gemini-flash-latest` (configurable; this alias is used in the official Google Gen AI SDK README)
- `GEMINI_API_KEY`: Google AI Studio API key on a project without billing for a free-tier trial; never enter it in chat, Git, a client bundle, or a VITE_ variable.
- `INFOGRAPHICS_ACCESS_TOKEN`: a private access password for this MVP. The browser asks for it; this is a service password, not the provider API key. Requests without it are rejected.
- `VITE_AI_ENDPOINT=/api/generate`

If keeping the front end on GitHub Pages, build it with `VITE_AI_ENDPOINT` equal to the hosted HTTPS API endpoint, and configure `INFOGRAPHICS_ALLOWED_ORIGIN=https://antonryndyathedesigner.github.io` on the API server. No wildcard CORS is enabled. This configuration is a private MVP, not a multi-user authentication/billing system.

Free-tier availability and limits depend on the model, project and region. Create the key in Google AI Studio and leave billing disabled when evaluating free quota. Free availability has not been verified with this user's account. No paid-model fallback, automatic retry or billing activation is implemented. Each generation/revision uses available API quota. Nothing is called or billed merely by building this branch. API requests are limited to 50 records and 5 compressed images; each generation/revision creates one model call, with a 110-second timeout. A slow or truncated response is reported rather than replaced with a template.

## Local development

Place credentials securely in an ignored `.env.local`, using `.env.example` as the field list. Run `npm run dev:api` and `npm run dev` in separate terminals. Vite forwards `/api` to the local API. Do not share `.env.local`.

`npm test` includes request/response validation and mocked model tests. These tests do not verify a live Gemini response. The regular browser suite verifies the existing offline workflow. `npm run test:ai-browser` verifies the AI-enabled UI with a mocked server response, including images, instructions, free-text revision, undo and SVG export. This command builds with the AI endpoint enabled. It does not call a provider.

Complete live generation, free-text revision and export checks after credentials and hosting are configured; do not advertise the AI path as ready beforehand.

Provider adapters also exist for Claude and OpenAI, but the selected deployment default is Gemini. Claude uses INFOGRAPHICS_API_KEY, while Gemini uses GEMINI_API_KEY. No provider secrets are committed.
