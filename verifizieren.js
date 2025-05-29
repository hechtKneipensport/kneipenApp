window.addEventListener("DOMContentLoaded", async () => {
  const status = document.getElementById("statusMessage");
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  if (!token) {
    status.textContent = "❌ Ungültiger oder fehlender Token.";
    return;
  }

  try {
    const res = await fetch("/api/verifizieren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });

    const data = await res.json();

    if (res.ok) {
      status.textContent = "✅ Deine E-Mail wurde erfolgreich verifiziert!";
    } else {
      status.textContent = `❌ Fehler: ${data.error || "Verifizierung fehlgeschlagen."}`;
    }
  } catch (err) {
    console.error(err);
    status.textContent = "❌ Ein unerwarteter Fehler ist aufgetreten.";
  }
});
