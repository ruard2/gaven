"use client";
import { useState } from "react";
import Link from "next/link";

export default function WachtwoordVergetenPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/coordinator/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-5">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Wachtwoord vergeten</h1>

        {sent ? (
          <>
            <p className="text-sm text-gray-600 mb-6">
              Als dit e-mailadres bekend is, ontvang je binnen enkele minuten een herstelmail. Controleer ook je spammap.
            </p>
            <Link href="/coordinator/login" className="block text-center text-sm text-blue-600 hover:underline">
              Terug naar inloggen
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">
              Vul je e-mailadres in. Je ontvangt een link om een nieuw wachtwoord in te stellen.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jouw@email.nl"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Versturen…" : "Herstelmail versturen"}
              </button>
            </form>
            <Link href="/coordinator/login" className="block text-center text-xs text-gray-400 hover:text-gray-600 mt-4">
              Terug naar inloggen
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
