// api/search.js
export default async function handler(req, res) {
  const apiKey = process.env.SPOONACULAR_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing SPOONACULAR_KEY" });
  }

  try {
    // If a `path` parameter exists, use it (e.g., path=recipes/123/information)
    const { path, ...rest } = req.query;

    // Build query params (filters like cuisine, diet, etc.)
    const queryParams = new URLSearchParams(rest).toString();

    // Default to complexSearch if no path is given
    const targetPath = path || "recipes/complexSearch";

    // Build Spoonacular URL
    let url = `https://api.spoonacular.com/${targetPath}?apiKey=${apiKey}`;
    if (queryParams) url += `&${queryParams}`;

    // Fetch from Spoonacular
    const r = await fetch(url);
    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: text });
    }

    const data = await r.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
