export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt" });
  }

  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "Token fehlt" });
  }

  const API_KEY = process.env.UNIVELOP_API_KEY;
  const BASE_URL = "https://app.univelop.de/api/v2/72pH5fw0FKMO4HwR8t0S";

  const headers = {
    "Content-Type": "application/json",
    "X-API-KEY": API_KEY
  };

  try {
    // Nutzer mit Token suchen
    const filter = {
      filters: JSON.stringify([
        {
          brickName: "verifizierung_token",
          operator: "==",
          value: token
        }
      ])
    };

    const resNutzer = await fetch(`${BASE_URL}/records/nutzer?${new URLSearchParams(filter)}`, {
      method: "GET",
      headers
    });

    const nutzer = await resNutzer.json();

    if (nutzer.length === 0) {
      return res.status(404).json({ error: "Kein Nutzer mit diesem Token gefunden" });
    }

    const nutzerId = nutzer[0].id;

    // Nutzer als verifiziert markieren und Token löschen
    await fetch(`${BASE_URL}/records/nutzer/${nutzerId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        verifiziert: true,
        verifizierung_token: null
      })
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Fehler beim Verifizieren" });
  }
}