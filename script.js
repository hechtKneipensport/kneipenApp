document.getElementById("submitBtn").addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value.trim();
  const message = document.getElementById("message");
  const btn = document.getElementById("submitBtn");
  const params = new URLSearchParams(window.location.search);
  const kneipenCode = params.get("kneipe");

  const headers = {
    "Content-Type": "application/json",
    "X-API-KEY": "yyw33lz69rhrd5bo1bs4"
  };
  const BASE_URL = "https://app.univelop.de/api/v2/72pH5fw0FKMO4HwR8t0S";

  // E-Mail validieren
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || !kneipenCode) {
    message.textContent = "Bitte gib eine gültige E-Mail-Adresse ein.";
    message.classList.remove("hidden");
    return;
  }

  btn.disabled = true;

  try {
    // 🧪 1. Kneipe anhand QR-Code/URL prüfen
    const kneipeFilter = {
      filters: JSON.stringify([
        {
          brickName: "id_kneipe", // Das Feld, das du für den QR-Code verwendest
          operator: "==",
          value: kneipenCode
        }
      ])
    };

    const kneipeResponse = await fetch(
      `${BASE_URL}/records/kneipen?${new URLSearchParams(kneipeFilter)}`,
      { method: "GET", headers }
    );

    if (!kneipeResponse.ok) throw new Error("Fehler beim Kneipen-Check");

    const kneipeData = await kneipeResponse.json();

    if (kneipeData.length === 0) {
      message.textContent = "Ungültiger QR-Code.";
      message.classList.remove("hidden");
      btn.disabled = false;
      return;
    }

    const kneipeId = kneipeData[0].id;

    // 🧪 2. Prüfen, ob Nutzer existiert
    const nutzerFilter = {
      filters: JSON.stringify([
        {
          brickName: "nutzer_email",
          operator: "==",
          value: email
        }
      ])
    };

    const nutzerResponse = await fetch(
      `${BASE_URL}/records/nutzer?${new URLSearchParams(nutzerFilter)}`,
      { method: "GET", headers }
    );

    if (!nutzerResponse.ok) throw new Error("Fehler beim Nutzer-Check");

    const nutzerData = await nutzerResponse.json();
    let nutzerId;

    if (nutzerData.length === 0) {
      // 🆕 Nutzer anlegen
      const createNutzer = await fetch(`${BASE_URL}/records/nutzer`, {
        method: "POST",
        headers,
        body: JSON.stringify({ nutzer_email: email })
      });

      if (!createNutzer.ok) throw new Error("Fehler beim Nutzer-Anlegen");

      const createdNutzer = await createNutzer.json();
      nutzerId = createdNutzer.id;
    } else {
      nutzerId = nutzerData[0].id;
    }

    // 🧪 3. Prüfen, ob bereits eingelöst
    const scanFilter = {
      filters: JSON.stringify([
        {
          brickName: "nutzer",
          operator: "==",
          value: nutzerId
        },
        {
          brickName: "kneipe",
          operator: "==",
          value: kneipeId
        },
        {
          brickName: "status",
          operator: "==",
          value: "Erfolgreich"
        }
      ])
    };

    const alreadyExistsResponse = await fetch(
      `${BASE_URL}/records/scanvorgaenge?${new URLSearchParams(scanFilter)}`,
      { method: "GET", headers }
    );

    if (!alreadyExistsResponse.ok) throw new Error("Fehler beim Scan-Check");

    const existingScans = await alreadyExistsResponse.json();

    if (existingScans.length === 0) {
      // 🟢 Scanvorgang anlegen
      const createScan = await fetch(`${BASE_URL}/records/scanvorgaenge`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: email, // Optional: als Info
          kneipe: kneipeId,
          nutzer: nutzerId,
          status: "Erfolgreich"
        })
      });

      if (!createScan.ok) throw new Error("Fehler beim Scan-Anlegen");

      message.classList.remove("hidden");
      message.textContent = "🎉 Zeige diese Seite dem Wirt. Gültig für 30 Sekunden!";
      setTimeout(() => {
        message.textContent = "❌ Zeit abgelaufen. Bitte scanne erneut.";
      }, 30000);
    } else {
      // 🔴 Bereits eingelöst
      message.classList.remove("hidden");
      message.textContent = "⚠️ Du hast dein Freigetränk bereits eingelöst.";
    }
  } catch (error) {
    console.error(error);
    message.classList.remove("hidden");
    message.textContent = "Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.";
  } finally {
    btn.disabled = false;
  }
});
