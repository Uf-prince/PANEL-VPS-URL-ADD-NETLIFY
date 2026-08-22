// BILAL-MD — Vercel proxy (HTTP + HTTPS backend safe)
//
// Vercel ke rewrites sirf HTTPS destination allow karte hain.
// Hamara bot server HTTP hai (custom port 12573), isliye yeh
// serverless function har request ko chupke se backend ke paas
// proxy karta hai. User ko sirf Vercel URL dikhta hai — asli
// backend URL kabhi browser mein expose nahi hota.
//
// Example:  https://x-bilal-md.vercel.app/pair
//        →  http://node8.xzyx.qzz.io:23469/pair
// Root / bhi backend ke / par jata hai — koi path chhupti nahi.
// Method, headers, body, query — sab forward hota hai.

const BACKEND = "http://node12.xzyx.qzz.io:25608";

// HOP-BY-HOP headers — inhe forward nahi karna (HTTP spec)
const HOP_BY_HOP = new Set([
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade", "content-encoding",
  "content-length"
]);

export default async function handler(req, res) {
  try {
    // Full original path + query string forward karo
    const url = new URL(req.url, "https://x");
    const target = `${BACKEND}${url.pathname}${url.search}`;

    const headers = { ...req.headers };
    // Vercel ka apna host header hatado — backend ka host jana chahiye
    delete headers.host;
    delete headers["x-forwarded-for"];
    delete headers["x-forwarded-proto"];

    const fetchOpts = { method: req.method, headers, redirect: "manual" };

    // Body forward karo POST/PUT/PATCH ke liye
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      fetchOpts.body = await bufferBody(req);
    }

    const upstream = await fetch(target, fetchOpts);

    // Status set karo
    res.status(upstream.status);

    // Response headers copy karo (hop-by-hop chhor ke)
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    // Response body stream karo
    const dest = {
      write: (chunk) => res.write(chunk),
      close: () => res.end(),
      abort: (err) => res.destroy(err)
    };
    if (upstream.body) {
      await upstream.body.pipeTo(new WritableStream(dest));
    } else {
      res.end();
    }
  } catch (err) {
    console.error("[proxy] error:", err && err.message);
    res.status(502).json({
      error: "Backend unavailable",
      detail: err && err.message ? String(err.message) : ""
    });
  }
}

function bufferBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
