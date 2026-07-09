"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Wachtwoorden komen niet overeen"); return; }
    if (password.length < 8) { setError("Minimaal 8 tekens"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/coordinator/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const d = await res.json();
    if (d.ok) { router.push("/coordinator/dashboard"); }
    else { setError(d.error || "Er ging iets mis"); setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Nieuw wachtwoord</h1>
        <p className="text-sm text-gray-500 mb-6">Kies een nieuw wachtwoord voor je coördinatoraccount.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Nieuw wachtwoord (min. 8 tekens)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
            placeholder="Bevestig wachtwoord"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? "Opslaan…" : "Wachtwoord opslaan"}
          </button>
        </form>
      </div>
    </div>
  );
}
