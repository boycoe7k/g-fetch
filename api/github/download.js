export default async function handler(req, res) {
  const target = req.query.url;
  if (!target) return res.status(400).json({ error: "url is required." });

  let url;
  try { url = new URL(target); } catch {
    return res.status(400).json({ error: "Invalid URL." });
  }

  if (url.protocol !== "https:" || url.hostname !== "github.com" && !url.hostname.endsWith(".github.com")) {
    return res.status(400).json({ error: "Only GitHub download URLs are allowed." });
  }

  res.redirect(302, url.toString());
}