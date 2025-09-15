export default async function handler(req, res) {
  const { q = "", number = "12" } = req.query;
  const apiKey = process.env.SPOONACULAR_KEY;
  if (!apiKey) return res.status(500).json({ error: "Missing SPOONACULAR_KEY" });

  const endpoint = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(q)}&number=${encodeURIComponent(number)}&addRecipeInformation=false`;

  try {
    const r = await fetch(`${endpoint}&apiKey=${apiKey}`);
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
