import { SPEC_SLUGS, SPEC_TITLES } from "@/lib/openapi";

/**
 * GET /api/docs — Swagger UI with a role selector (top-right dropdown).
 * Swagger UI is loaded from the unpkg CDN, so no extra npm dependency is needed.
 */
export async function GET() {
  const urls = SPEC_SLUGS.map((slug) => ({ name: SPEC_TITLES[slug], url: `/api/docs/${slug}` }));

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Kabadi-Wala API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>body { margin: 0; }</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = function () {
        window.ui = SwaggerUIBundle({
          urls: ${JSON.stringify(urls)},
          "urls.primaryName": ${JSON.stringify(SPEC_TITLES.collector)},
          dom_id: "#swagger-ui",
          deepLinking: true,
          persistAuthorization: true,
          tryItOutEnabled: true,
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
          layout: "StandaloneLayout",
        });
      };
    </script>
  </body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
