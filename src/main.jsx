import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const api = (path) => path;

function GithubTab() {
  const [repo, setRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [release, setRelease] = useState(null);
  const [releases, setReleases] = useState([]);
  const [error, setError] = useState("");

  const parseRepo = (value) => {
    const clean = value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/+$/, "");
    const parts = clean.split("/");
    if (parts.length < 2) throw new Error("Enter a GitHub repository like owner/repo.");
    return { owner: parts[0], name: parts[1] };
  };

  const load = async () => {
    setError("");
    setRelease(null);
    setReleases([]);
    try {
      setLoading(true);
      const { owner, name } = parseRepo(repo);
      const [latestRes, listRes] = await Promise.all([
        fetch(api(`/api/github/release?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}`)),
        fetch(api(`/api/github/releases?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}`))
      ]);
      const latest = await latestRes.json();
      const list = await listRes.json();
      if (!latestRes.ok) throw new Error(latest.error || "Could not load release.");
      if (!listRes.ok) throw new Error(list.error || "Could not load releases.");
      setRelease(latest);
      setReleases(list.releases || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const zipUrl = useMemo(() => {
    if (!repo.trim()) return "#";
    try {
      const { owner, name } = parseRepo(repo);
      return `/api/github/repo-zip?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}`;
    } catch {
      return "#";
    }
  }, [repo]);

  return (
    <section className="panel">
      <div className="hero-small">
        <span className="eyebrow">GITHUB</span>
        <h1>Fetch releases and source archives.</h1>
        <p>Paste a public repository and grab its latest release or repository ZIP.</p>
      </div>

      <div className="search-row">
        <input
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="owner/repository or https://github.com/owner/repository"
        />
        <button onClick={load} disabled={loading}>
          {loading ? "Fetching…" : "Fetch"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {release && (
        <div className="result-card">
          <div className="result-head">
            <div>
              <span className="label">LATEST RELEASE</span>
              <h2>{release.name || release.tag_name}</h2>
              <p>{release.tag_name} · {release.published_at ? new Date(release.published_at).toLocaleDateString() : "—"}</p>
            </div>
            <a className="button secondary" href={zipUrl}>Repository ZIP</a>
          </div>

          <div className="assets">
            {release.assets?.length ? release.assets.map((asset) => (
              <a
                className="asset"
                key={asset.id}
                href={`/api/github/download?url=${encodeURIComponent(asset.browser_download_url)}`}
              >
                <span>{asset.name}</span>
                <small>{formatBytes(asset.size)} · Download</small>
              </a>
            )) : <div className="empty">This release has no uploaded assets.</div>}
          </div>
        </div>
      )}

      {releases.length > 0 && (
        <div className="result-card">
          <div className="label">RECENT RELEASES</div>
          <div className="release-list">
            {releases.map((item) => (
              <div className="release-line" key={item.id}>
                <div>
                  <strong>{item.name || item.tag_name}</strong>
                  <span>{item.tag_name}</span>
                </div>
                <span>{item.assets?.length || 0} assets</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SourceTab() {
  const [url, setUrl] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeAsset, setActiveAsset] = useState(null);

  const load = async () => {
    setError("");
    setData(null);
    setActiveAsset(null);
    try {
      setLoading(true);
      const res = await fetch(`/api/source?url=${encodeURIComponent(url.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not fetch the public page.");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const viewAsset = async (asset) => {
    try {
      const res = await fetch(`/api/source?url=${encodeURIComponent(asset.url)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not fetch asset.");
      setActiveAsset({ ...asset, source: json.source });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section className="panel">
      <div className="hero-small">
        <span className="eyebrow">SOURCE VIEWER</span>
        <h1>Inspect public website source.</h1>
        <p>Paste a public website URL to view its HTML and discover linked assets.</p>
      </div>

      <div className="search-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="https://example.com"
        />
        <button onClick={load} disabled={loading}>
          {loading ? "Loading…" : "View source"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {data && (
        <>
          <div className="source-meta">
            <span>{data.status} {data.statusText}</span>
            <span>{data.contentType || "text/html"}</span>
            <span>{data.assets?.length || 0} linked assets</span>
          </div>

          <div className="code-wrap">
            <pre><code>{activeAsset ? activeAsset.source : data.source}</code></pre>
          </div>

          {data.assets?.length > 0 && (
            <div className="result-card">
              <div className="label">LINKED ASSETS</div>
              <div className="asset-grid">
                {data.assets.map((asset, i) => (
                  <button className="asset asset-button" key={`${asset.url}-${i}`} onClick={() => viewAsset(asset)}>
                    <span>{asset.path}</span>
                    <small>{asset.type} · View</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function App() {
  const [tab, setTab] = useState("github");

  return (
    <main>
      <nav className="nav">
        <div className="brand">
          <div className="brand-mark">G</div>
          <span>g-fetch</span>
        </div>
        <div className="nav-pill">
          <button className={tab === "github" ? "active" : ""} onClick={() => setTab("github")}>GitHub</button>
          <button className={tab === "source" ? "active" : ""} onClick={() => setTab("source")}>Source viewer</button>
        </div>
      </nav>

      <div className="page">
        <div className="hero">
          <span className="eyebrow">DEVELOPER TOOL</span>
          <h1>Fetch. Inspect. Ship.</h1>
          <p>One clean workspace for GitHub downloads and public website source.</p>
        </div>

        {tab === "github" ? <GithubTab /> : <SourceTab />}

        <footer>g-fetch · Built for public resources</footer>
      </div>
    </main>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

createRoot(document.getElementById("root")).render(<App />);