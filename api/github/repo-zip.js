export default async function handler(req, res) {
  const { owner, repo, ref } = req.query;
  if (!owner || !repo) return res.status(400).json({ error: "owner and repo are required." });

  const safeOwner = encodeURIComponent(owner);
  const safeRepo = encodeURIComponent(repo);

  if (ref) {
    return res.redirect(302, `https://github.com/${safeOwner}/${safeRepo}/archive/refs/heads/${encodeURIComponent(ref)}.zip`);
  }

  try {
    const meta = await fetch(`https://api.github.com/repos/${safeOwner}/${safeRepo}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "g-fetch" }
    });
    if (!meta.ok) return res.status(meta.status).json({ error: "GitHub repository not found." });
    const data = await meta.json();
    return res.redirect(302, `https://github.com/${safeOwner}/${safeRepo}/archive/refs/heads/${encodeURIComponent(data.default_branch)}.zip`);
  } catch {
    return res.status(502).json({ error: "Could not resolve the repository default branch." });
  }
}