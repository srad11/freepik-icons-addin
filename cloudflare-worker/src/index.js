// Cloudflare Worker: CORS proxy for Freepik API
// Forwards requests to https://api.freepik.com and adds CORS headers
// (Freepik's API has broken CORS - preflight works but responses lack the header)

const FREEPIK_API = "https://api.freepik.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-freepik-api-key",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(JSON.stringify({ status: "ok", service: "freepik-icons-proxy" }), {
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }

    // Proxy the request to Freepik API
    const targetUrl = `${FREEPIK_API}${url.pathname}${url.search}`;

    const proxyHeaders = new Headers();
    // Forward the API key header
    const apiKey = request.headers.get("x-freepik-api-key");
    if (apiKey) {
      proxyHeaders.set("x-freepik-api-key", apiKey);
    }
    // Forward content-type for POST requests
    const contentType = request.headers.get("Content-Type");
    if (contentType) {
      proxyHeaders.set("Content-Type", contentType);
    }

    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    });

    try {
      const response = await fetch(proxyRequest);
      // Clone the response and add CORS headers
      const newHeaders = new Headers(response.headers);
      for (const [key, value] of Object.entries(CORS_HEADERS)) {
        newHeaders.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      });
    }
  },
};
