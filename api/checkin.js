export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt" });
  }

  const { email, kneipenCode } = req.body;

  if (!email || !kneipenCode || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Ungültige Eingaben" });
  }

  const API_KEY = process.env.UNIVELOP_API_KEY;
  const BASE_URL = "https://app.univelop.de/api/v2/72pH5fw0FKMO4HwR8t0S";

  const headers = {
    "Content-Type": "application/json",
    "X-API-KEY": API_KEY
  };

  try {
    // 1. Kneipe finden
    const kneipeFilter = {
      filters: JSON.stringify([{ brickName: "id_kneipe", operator: "==", value: kneipenCode }])
    };

    const kneipeRes = await fetch(`${BASE_URL}/records/kneipen?${new URLSearchParams(kneipeFilter)}`, {
      method: "GET",
      headers
    });

    const kneipenData = await kneipeRes.json();
    if (kneipenData.length === 0) {
      return res.status(400).json({ error: "Ungültiger Kneipencode" });
    }

    const kneipeId = kneipenData[0].id;

    // 2. Nutzer finden
    const nutzerFilter = {
      filters: JSON.stringify([{ brickName: "nutzer_email", operator: "==", value: email }])
    };

    const nutzerRes = await fetch(`${BASE_URL}/records/nutzer?${new URLSearchParams(nutzerFilter)}`, {
      method: "GET",
      headers
    });

    const nutzerData = await nutzerRes.json();

    // 3a. Nutzer nicht vorhanden → Registrierung starten
    if (nutzerData.length === 0) {
      await fetch(`${req.headers.origin}/api/registrieren`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      return res.status(202).json({ message: "E-Mail nicht gefunden. Verifizierungslink wurde gesendet." });
    }

    const nutzer = nutzerData[0];
    const nutzerId = nutzer.id;

    // 3b. Nutzer vorhanden aber nicht verifiziert → erneut Registrierung triggern
    if (!nutzer.verifiziert) {
      await fetch(`${req.headers.origin}/api/registrieren`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      return res.status(202).json({ message: "E-Mail nicht verifiziert. Neuer Verifizierungslink wurde gesendet." });
    }

    // 4. Prüfen ob schon eingelöst
    const scanFilter = {
      filters: JSON.stringify([
        { brickName: "nutzer", operator: "==", value: nutzerId },
        { brickName: "kneipe", operator: "==", value: kneipeId },
        { brickName: "status", operator: "==", value: "Erfolgreich" }
      ])
    };

    const scanCheck = await fetch(`${BASE_URL}/records/scanvorgaenge?${new URLSearchParams(scanFilter)}`, {
      method: "GET",
      headers
    });

    const scans = await scanCheck.json();
    if (scans.length > 0) {
      return res.status(200).json({ message: "Du hast dein Freigetränk hier schon eingelöst." });
    }

    // 5. Scanvorgang speichern
    await fetch(`${BASE_URL}/records/scanvorgaenge`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        nutzer: nutzerId,
        kneipe: kneipeId,
        status: "Erfolgreich"
      })
    });

    return res.status(200).json({ message: "🎉 Zeige diese Seite dem Wirt. Gültig für 30 Sekunden!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Unerwarteter Fehler beim Check-In" });
  }
}
