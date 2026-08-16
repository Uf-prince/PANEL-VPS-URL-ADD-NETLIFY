// Netlify Edge Function - reverse proxy to the VPS backend
// Converted from the original Vercel api/index.js (Node http/https proxy)

const TARGET = "http://node8.xzyx.qzz.io:23469/";

export default async (request, context) => {
  const url = new URL(request.url);
  const targetUrl = TARGET + url.pathname + url.search;

  try {
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    });

    const response = await fetch(proxyRequest);
    return response;
  } catch (err) {
    return new Response("Proxy Error: " + err.message, { status: 500 });
  }
};

export const config = {
  path: "/*",
};
