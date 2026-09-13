export default async function handler(req, res) {
  const { owner, repo } = req.query;
  if (!owner || !repo) return res.status(400).json({ error: "owner and repo are required." });

  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=10`,
    { headers: { Accept: "application/vnd.github+json", "User-Agent": "g-fetch" } }
  );

  if (!response.ok) {
    let message = "GitHub request failed.";
    try { message = (await response.json()).message || message; } catch {}
    return res.status(response.status).json({ error: message });
  }

  const releases = await response.json();
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  res.json({ releases });
}