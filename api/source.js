const MAX_BYTES = 2 * 1024 * 1024;

export default async function handler(req, res) {
  const input = req.query.url;
  if (!input) return res.status(400).json({ error: "url is required." });

  let target;
  try {
    target = new URL(input);
  } catch {
    return res.status(400).json({ error: "Enter a valid URL." });
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return res.status(400).json({ error: "Only HTTP and HTTPS URLs are supported." });
  }

  // Public-site viewer: reject obvious local/private hostnames.
  const host = target.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    return res.status(403).json({ error: "Private/local hosts are not allowed." });
  }

  try {
    const response = await fetch(target, {
      redirect: "follow",
      headers: {
        "User-Agent": "g-fetch/1.0 public-source-viewer",
        "Accept": "text/html,text/plain,text/css,application/javascript,*/*;q=0.5"
      },
      signal: AbortSignal.timeout(12000)
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/") && !contentType.includes("javascript") && !contentType.includes("json") && !contentType.includes("xml")) {
      return res.status(415).json({ error: "The requested resource is not a public text resource." });
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return res.status(413).json({ error: "Resource is larger than the 2 MB viewer limit." });
    }

    const source = new TextDecoder().decode(buffer);
    const assets = contentType.includes("html") ? extractAssets(source, target) : [];

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      url: target.toString(),
      status: response.status,
      statusText: response.statusText,
      contentType,
      source,
      assets
    });
  } catch (error) {
    return res.status(502).json({ error: `Could not fetch the public resource: ${error.message}` });
  }
}

function extractAssets(html, base) {
  const found = new Map();

  const add = (raw, type) => {
    if (!raw || raw.startsWith("#") || raw.startsWith("data:") || raw.startsWith("javascript:")) return;
    try {
      const url = new URL(raw, base);
      if (!["http:", "https:"].includes(url.protocol)) return;
      found.set(url.toString(), {
        url: url.toString(),
        path: url.pathname.split("/").pop() || url.hostname,
        type
      });
    } catch {}
  };

  for (const match of html.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)) add(match[1], "CSS/link");
  for (const match of html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) add(match[1], "JavaScript");
  for (const match of html.matchAll(/<(?:img|source|video|audio)[^>]+(?:src|srcset)=["']([^"']+)["']/gi)) {
    const value = match[1].split(",")[0].trim().split(/\s+/)[0];
    add(value, "Media");
  }

  return [...found.values()].slice(0, 100);
}