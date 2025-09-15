export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (!body) {
    try {
      const raw = await new Promise((resolve, reject) => {
        let data = "";
        req.on("data", chunk => data += chunk);
        req.on("end", () => resolve(data));
        req.on("error", err => reject(err));
      });
      body = raw ? JSON.parse(raw) : {};
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }

  const { name, email, message } = body || {};
  if (!name || !email || !message) return res.status(400).json({ error: "Missing fields" });

  console.log("Contact form submission:", { name, email, message });

  return res.status(200).json({ ok: true, message: "Received (demo)" });
}
