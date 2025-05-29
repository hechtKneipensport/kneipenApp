import { v4 as uuidv4 } from "uuid";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt" });
  }

  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Ungültige E-Mail-Adresse" });
  }

  const API_KEY = process.env.UNIVELOP_API_KEY;
  const BREVO_KEY = process.env.BREVO_API_KEY;
  const BASE_URL = "https://app.univelop.de/api/v2/72pH5fw0FKMO4HwR8t0S";

  const headers = {
    "Content-Type": "application/json",
    "X-API-KEY": API_KEY
  };



  try {
    // Verifizierungstoken generieren
    const token = uuidv4();

    // Nutzer in Univelop suchen
    const filter = {
      filters: JSON.stringify([
        {
          brickName: "nutzer_email",
          operator: "==",
          value: email
        }
      ])
    };

    const checkRes = await fetch(`${BASE_URL}/records/nutzer?${new URLSearchParams(filter)}`, {
      method: "GET",
      headers
    });

    const nutzer = await checkRes.json();
    let nutzerId;

    if (nutzer.length === 0) {
    // Nutzer anlegen
    const createRes = await fetch(`${BASE_URL}/records/nutzer`, {
        method: "POST",
        headers,
        body: JSON.stringify({
        nutzer_email: email,
        verifiziert: false,
        verifizierung_token: token
        })
    });

    const created = await createRes.json();
    nutzerId = created.id;
    } else {
    const bestehenderNutzer = nutzer[0];
    nutzerId = bestehenderNutzer.id;

    if (bestehenderNutzer.verifiziert) {
        // ✅ Nutzer ist bereits verifiziert – keine neue Mail senden
        return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: "Diese E-Mail ist bereits verifiziert. Du kannst den Service nutzen."
        });
    }

    // 🔄 Noch nicht verifiziert → neuen Token setzen
    await fetch(`${BASE_URL}/records/nutzer/${nutzerId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
        verifizierung_token: token
        })
    });
    }

    // Temporär speichern (in Univelop oder DB – hier: als "verifizierung_token")
    await fetch(`${BASE_URL}/records/nutzer/${nutzerId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        verifizierung_token: token
      })
    });

    // Verifizierungslink
    const link = `https://app.kneipensportofficial.com/verifizieren.html?token=${token}`;

    // E-Mail versenden via Brevo
    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sender: { name: "Kneipensport", email: "noreply@kneipensportofficial.com" },
        to: [{ email }],
        subject: "Bitte bestätige deine E-Mail-Adresse",
        htmlContent: `<p>Hi!</p><p>Klicke auf den folgenden Link, um deine E-Mail zu bestätigen:</p><p><a href="${link}">${link}</a></p>`
      })
    });

    if (!brevoRes.ok) {
      throw new Error("E-Mail-Versand fehlgeschlagen");
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Fehler beim Registrieren" });
  }
}
