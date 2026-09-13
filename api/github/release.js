export default async function handler(req, res) {
  const { owner, repo } = req.query;
  if (!owner || !repo) return res.status(400).json({ error: "owner and repo are required." });

  const response = await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`);
  if (!response.ok) {
    return res.status(response.status).json({ error: await githubError(response) });
  }

  const data = await response.json();
  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
  res.json(data);
}

async function github(path) {
  return fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "g-fetch"
    }
  });
}

async function githubError(response) {
  try {
    const body = await response.json();
    return body.message || "GitHub request failed.";
  } catch {
    return "GitHub request failed.";
  }
}