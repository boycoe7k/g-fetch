import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Download, Code2, Github, Search, ExternalLink, FolderDown, FileCode2 } from "lucide-react";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

function App() {
  const [mode, setMode] = useState("release");
  const [url, setUrl] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true); setError(""); setData(null);
    try {
      let endpoint;
      if (mode === "release") endpoint = `/api/v1/github/latest?url=${encodeURIComponent(url)}`;
      if (mode === "repo") endpoint = `/api/v1/github/releases?url=${encodeURIComponent(url)}`;
      if (mode === "source") endpoint = `/api/v1/source?url=${encodeURIComponent(url)}`;
      const r = await fetch(API + endpoint);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Request failed");
      setData(d);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const downloadRepo = () => {
    window.open(`${API}/api/v1/github/repo?url=${encodeURIComponent(url)}`, "_blank");
  };

  const downloadAsset = (asset) => {
    window.open(`${API}/api/v1/github/download?url=${encodeURIComponent(asset.url)}`, "_blank");
  };

  const scanAssets = async () => {
    try {
      const r = await fetch(`${API}/api/v1/source/assets?url=${encodeURIComponent(url)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
    } catch (e) { setError(e.message); }
  };

  return <div className="app">
    <nav><div className="brand"><span>GH</span>Fetch</div><div className="navpill">Developer tools</div></nav>

    <main>
      <section className="hero">
        <div className="eyebrow"><Github size={15}/> GitHub & Web utilities</div>
        <h1>Fetch it.<br/><em>Without the detour.</em></h1>
        <p>Download GitHub releases and repositories, or inspect public website source from one clean interface.</p>
      </section>

      <section className="panel">
        <div className="tabs">
          <button className={mode==="release"?"active":""} onClick={()=>{setMode("release");setData(null)}}><Download size={17}/> Release</button>
          <button className={mode==="repo"?"active":""} onClick={()=>{setMode("repo");setData(null)}}><FolderDown size={17}/> Repository</button>
          <button className={mode==="source"?"active":""} onClick={()=>{setMode("source");setData(null)}}><Code2 size={17}/> Source viewer</button>
        </div>
        <div className="inputrow">
          <div className="inputwrap"><Search size={18}/><input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&run()} placeholder={mode==="source"?"https://example.com":"https://github.com/owner/repository"}/></div>
          <button className="run" onClick={run} disabled={loading}>{loading?"Fetching...":"Fetch"}</button>
        </div>
        {mode==="repo" && <button className="secondary" onClick={downloadRepo}><FolderDown size={16}/> Download repository ZIP</button>}
        {error && <div className="error">{error}</div>}
      </section>

      {data && mode==="release" && <div className="result">
        <div className="resulthead"><div><small>LATEST RELEASE</small><h2>{data.name || data.tag}</h2><p>{data.repository} · {data.tag}</p></div><span className="badge">{data.prerelease?"Pre-release":"Latest"}</span></div>
        <div className="assets">{data.assets?.map((a,i)=><div className="asset" key={i}><FileCode2 size={19}/><div><b>{a.name}</b><small>{(a.size/1024/1024).toFixed(2)} MB · {a.downloads} downloads</small></div><button onClick={()=>downloadAsset(a)}><Download size={16}/></button></div>)}</div>
      </div>}

      {data && mode==="repo" && <div className="result"><div className="resulthead"><div><small>RECENT RELEASES</small><h2>Releases</h2><p>{url}</p></div></div>{data.map((r,i)=><div className="release" key={i}><div><b>{r.name || r.tag}</b><small>{r.tag} · {r.published ? new Date(r.published).toLocaleDateString():""}</small></div><span>{r.assets.length} assets</span></div>)}</div>}

      {data && mode==="source" && <div className="result">
        <div className="resulthead"><div><small>SOURCE</small><h2>{new URL(data.url).hostname}</h2><p>{data.status} · {data.contentType || "text"} · {data.size.toLocaleString()} bytes</p></div><button className="secondary" onClick={scanAssets}>Scan assets</button></div>
        {data.assets ? <div className="assets">{data.assets.map((a,i)=><div className="asset" key={i}><FileCode2 size={19}/><div><b>{a.type}</b><small>{a.url}</small></div><ExternalLink size={16}/></div>)}</div> :
        <pre className="code"><code>{data.source}</code></pre>}
      </div>}
    </main>
    <footer>GHFetch · Public resources only · Built for developers</footer>
  </div>
}
createRoot(document.getElementById("root")).render(<App/>);