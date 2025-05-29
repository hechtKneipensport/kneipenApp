document.getElementById("submitBtn").addEventListener("click", async () => {
  const email = document.getElementById("emailInput").value.trim();
  const message = document.getElementById("message");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    message.textContent = "Bitte gib eine gültige E-Mail-Adresse ein.";
    message.classList.remove("hidden");
    return;
  }

  try {
    const res = await fetch("/api/registrieren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (data.alreadyVerified) {
    message.textContent = "✅ Du bist bereits verifiziert. Viel Spaß! 🍻";
    } else if (res.ok && data.success) {
    message.textContent = "✅ Prüfe deine E-Mails für den Bestätigungslink.";
    } else {
    message.textContent = data.error || "Ein Fehler ist aufgetreten.";
    }
  } catch (err) {
    console.error(err);
    message.textContent = "Ein Fehler ist aufgetreten. Bitte versuche es erneut.";
  }

  message.classList.remove("hidden");
});
