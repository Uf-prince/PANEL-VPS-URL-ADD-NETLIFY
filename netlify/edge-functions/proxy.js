const TARGET = "http://node8.xzyx.qzz.io:23469";

export default async (request, context) => {
  const url = new URL(request.url);
  const targetUrl = TARGET + url.pathname + url.search;

  try {
    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: (() => {
        const h = new Headers(request.headers);
        h.set("host", "node8.xzyx.qzz.io:23469");
        h.delete("x-forwarded-proto");
        return h;
      })(),
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    });

    const response = await fetch(proxyRequest);

    const newHeaders = new Headers(response.headers);
    newHeaders.delete("content-security-policy");
    newHeaders.delete("x-frame-options");

    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  } catch (err) {
    return new Response("Proxy Error: " + err.message, { status: 500 });
  }
};

export const config = {
  path: "/*",
};
