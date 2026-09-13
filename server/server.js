import express from "express";
import cors from "cors";
import { Readable } from "node:stream";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const GH_API = "https://api.github.com";
const headers = {
  "User-Agent": "GHFetch/1.0",
  "Accept": "application/vnd.github+json"
};

function githubRepo(value) {
  const u = new URL(value);
  if (u.hostname !== "github.com") throw new Error("Only github.com URLs are supported");
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("Invalid GitHub repository URL");
  return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
}

function safeUrl(value) {
  const u = new URL(value);
  if (!["http:", "https:"].includes(u.protocol)) throw new Error("Only HTTP/HTTPS URLs are allowed");
  return u;
}

async function gh(path) {
  const r = await fetch(GH_API + path, { headers });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || `GitHub API error ${r.status}`);
  return data;
}

app.get("/api/health", (_, res) => res.json({ ok: true, service: "GHFetch API" }));

// Latest release
app.get("/api/v1/github/latest", async (req, res) => {
  try {
    const { owner, repo } = githubRepo(req.query.url || `https://github.com/${req.query.repo}`);
    const release = await gh(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`);
    res.json({
      repository: `${owner}/${repo}`,
      tag: release.tag_name,
      name: release.name,
      published: release.published_at,
      prerelease: release.prerelease,
      assets: release.assets.map(a => ({
        name: a.name, size: a.size, downloads: a.download_count,
        contentType: a.content_type, url: a.browser_download_url
      }))
    });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// All releases
app.get("/api/v1/github/releases", async (req, res) => {
  try {
    const { owner, repo } = githubRepo(req.query.url);
    const releases = await gh(`/repos/${owner}/${repo}/releases?per_page=20`);
    res.json(releases.map(r => ({
      tag: r.tag_name, name: r.name, published: r.published_at,
      prerelease: r.prerelease, assets: r.assets.map(a => ({
        name: a.name, size: a.size, downloads: a.download_count,
        contentType: a.content_type, url: a.browser_download_url
      }))
    })));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Release asset proxy/stream
app.get("/api/v1/github/download", async (req, res) => {
  try {
    const u = safeUrl(req.query.url);
    if (u.hostname !== "github.com" && u.hostname !== "objects.githubusercontent.com")
      throw new Error("Only GitHub download URLs are supported");

    const r = await fetch(u, { redirect: "follow", headers: { "User-Agent": "GHFetch/1.0" } });
    if (!r.ok || !r.body) throw new Error(`Download failed (${r.status})`);

    const filename = decodeURIComponent(u.pathname.split("/").pop() || "download");
    res.setHeader("Content-Disposition", `attachment; filename="${filename.replace(/"/g, "")}"`);
    res.setHeader("Content-Type", r.headers.get("content-type") || "application/octet-stream");
    if (r.headers.get("content-length")) res.setHeader("Content-Length", r.headers.get("content-length"));
    Readable.fromWeb(r.body).pipe(res);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Repository ZIP download (GitHub archive)
app.get("/api/v1/github/repo", async (req, res) => {
  try {
    const { owner, repo } = githubRepo(req.query.url);
    const ref = req.query.ref || "main";
    const archive = `https://github.com/${owner}/${repo}/archive/refs/heads/${encodeURIComponent(ref)}.zip`;
    const r = await fetch(archive, { redirect: "follow", headers: { "User-Agent": "GHFetch/1.0" } });
    if (!r.ok || !r.body) throw new Error(`Repository download failed (${r.status})`);
    res.setHeader("Content-Disposition", `attachment; filename="${repo}-${ref}.zip"`);
    res.setHeader("Content-Type", "application/zip");
    Readable.fromWeb(r.body).pipe(res);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Website source viewer
app.get("/api/v1/source", async (req, res) => {
  try {
    const u = safeUrl(req.query.url);
    const r = await fetch(u, {
      redirect: "follow",
      headers: { "User-Agent": "GHFetch-SourceViewer/1.0", "Accept": "text/html,*/*;q=0.8" }
    });
    const text = await r.text();
    res.json({
      url: r.url, status: r.status, contentType: r.headers.get("content-type"),
      size: Buffer.byteLength(text), source: text
    });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Extract linked CSS/JS/image assets from HTML
app.get("/api/v1/source/assets", async (req, res) => {
  try {
    const u = safeUrl(req.query.url);
    const r = await fetch(u, { headers: { "User-Agent": "GHFetch-SourceViewer/1.0" } });
    const html = await r.text();
    const base = new URL(r.url);
    const assets = [];
    const add = (type, raw) => {
      try {
        if (!raw || raw.startsWith("data:") || raw.startsWith("#")) return;
        assets.push({ type, url: new URL(raw, base).href });
      } catch {}
    };
    for (const m of html.matchAll(/<link[^>]+href=["']([^"']+)["'][^>]*>/gi)) add("css", m[1]);
    for (const m of html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)) add("js", m[1]);
    for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) add("image", m[1]);
    for (const m of html.matchAll(/<source[^>]+src=["']([^"']+)["'][^>]*>/gi)) add("media", m[1]);
    res.json({ url: r.url, assets: [...new Map(assets.map(x => [x.type + x.url, x])).values()] });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// Fetch a public text asset (CSS/JS/etc.)
app.get("/api/v1/source/asset", async (req, res) => {
  try {
    const u = safeUrl(req.query.url);
    const r = await fetch(u, { headers: { "User-Agent": "GHFetch-SourceViewer/1.0" } });
    if (!r.ok) throw new Error(`Asset request failed (${r.status})`);
    const text = await r.text();
    res.json({ url: r.url, status: r.status, contentType: r.headers.get("content-type"), source: text });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.use(express.static("../frontend"));
app.listen(PORT, () => console.log(`GHFetch running on port ${PORT}`));