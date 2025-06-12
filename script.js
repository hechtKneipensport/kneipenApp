document.getElementById("submitBtn").addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value.trim();
  const message = document.getElementById("message");
  const btn = document.getElementById("submitBtn");
  const params = new URLSearchParams(window.location.search);
  const kneipenCode = params.get("kneipe");

  // E-Mail validieren
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email) || !kneipenCode) {
    message.textContent = "Bitte gib eine gültige E-Mail-Adresse ein.";
    message.classList.remove("hidden");
    message.style.color = "#ef4444";
    return;
  }

  btn.disabled = true;
  message.classList.add("hidden");

  try {
    const response = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, kneipenCode })
    });
    const data = await response.json();
    message.classList.remove("hidden");
    if (response.ok) {
      message.textContent = data.message;
      message.style.color = "#22c55e"; // grün für Erfolg
      if (data.message && data.message.includes("30 Sekunden")) {
        setTimeout(() => {
          message.textContent = "❌ Zeit abgelaufen. Bitte scanne erneut.";
          message.style.color = "#ef4444";
        }, 30000);
      }
    } else {
      message.textContent = data.error || data.message || "Unbekannter Fehler.";
      message.style.color = "#ef4444"; // rot für Fehler
    }
  } catch (error) {
    message.classList.remove("hidden");
    message.textContent = "Unerwarteter Fehler. Bitte versuche es erneut.";
    message.style.color = "#ef4444";
  } finally {
    btn.disabled = false;
  }
});
