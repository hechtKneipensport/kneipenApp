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
    // 1. Kneipe anhand QR-Code prüfen
    const kneipeFilter = {
      filters: JSON.stringify([
        {
          brickName: "id_kneipe",
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

    // 2. Prüfen, ob Nutzer existiert
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
      // Nutzer existiert nicht → Registrierung starten
      await fetch("/api/registrieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      message.classList.remove("hidden");
      message.textContent = "📧 Du bist noch nicht registriert. Prüfe deine E-Mails für den Verifizierungslink.";
      btn.disabled = false;
      return;
    }

    const nutzer = nutzerData[0];
    nutzerId = nutzer.id;

    if (!nutzer.verifiziert) {
      // Nutzer vorhanden, aber nicht verifiziert → Mail erneut senden
      await fetch("/api/registrieren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      message.classList.remove("hidden");
      message.textContent = "📧 Bitte bestätige deine E-Mail. Wir haben dir den Link erneut geschickt.";
      btn.disabled = false;
      return;
    }

    // 3. Prüfen, ob bereits eingelöst
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
      // Noch nicht eingelöst → anlegen
      const createScan = await fetch(`${BASE_URL}/records/scanvorgaenge`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: email,
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
      // Bereits eingelöst
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
