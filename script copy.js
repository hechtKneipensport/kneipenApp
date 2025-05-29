// script.js
document.getElementById("submitBtn").addEventListener("click", async () => {
    const email = document.getElementById("emailInput").value.trim();
    const message = document.getElementById("message");
    const params = new URLSearchParams(window.location.search);
    const kneipenId = params.get("kneipe");
  
    if (!email || !kneipenId) {
      message.textContent = "Fehlende Daten.";
      message.classList.remove("hidden");
      return;
    }

    // Const for API-Request
    const headers = {
      "Content-Type": "application/JSON",
      "X-API-KEY": "yyw33lz69rhrd5bo1bs4"
    }
  
    // 🧪 1. Prüfen, ob Nutzer bereits existiert
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
      "https://app.univelop.de/api/v2/72pH5fw0FKMO4HwR8t0S/records/nutzer?" +
        new URLSearchParams(nutzerFilter).toString(),
      { method: "GET", headers }
    );

    const nutzerData = await nutzerResponse.json();
    let nutzerId;

    if (nutzerData.length === 0) {
      // 🆕 Nutzer anlegen
      const createNutzer = await fetch(
        "https://app.univelop.de/api/v2/72pH5fw0FKMO4HwR8t0S/records/nutzer",
        {
          method: "POST",
          headers,
          body: JSON.stringify({ nutzer_email: email })
        }
      );

      const createdNutzer = await createNutzer.json();
      nutzerId = createdNutzer.id;
    } else {
      // ✅ Nutzer bereits vorhanden
      nutzerId = nutzerData[0].id;
    }

    // Schritt 1: GET an Univelop
    const parameters = {
        filters: JSON.stringify( [
            {
                brickName: 'nutzer_email',
                operator: '==',
                value: email
            },
            {
                brickName: 'kneipe_title',
                operator: '==',
                value: kneipenId
            },
            {
                brickName: 'status',
                operator: '==',
                value: 'Erfolgreich'
            }
        ]),
    }

  const alreadyExistsResponse = await fetch(
    "https://app.univelop.de/api/v2/72pH5fw0FKMO4HwR8t0S/records/scanvorgaenge?" +
      new URLSearchParams(parameters).toString(),
    { method: "GET", headers }
  );

  const items = await alreadyExistsResponse.json();

  if (items.length === 0) {
    // 🟢 Neuen Scanvorgang anlegen
    await fetch(
      "https://app.univelop.de/api/v2/72pH5fw0FKMO4HwR8t0S/records/scanvorgaenge",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: email, // nur zu Info, wird evtl. später entfernt
          kneipe: kneipenId,
          nutzer: nutzerId,
          status: "Erfolgreich"
        })
      }
    );
          message.classList.remove("hidden");

          message.textContent = "🎉 Zeige diese Seite dem Wirt. Gültig für 30 Sekunden!";
          setTimeout(() => {
            message.textContent = "❌ Zeit abgelaufen. Bitte scanne erneut.";
          }, 30000);

    } else {
        message.classList.remove("hidden");

        message.textContent = "⚠️ Du hast dein Freigetränk bereits eingelöst.";

    }

    
  

  
    // if (response.status === "success") {
     
    // } else {
    // }
  });
  