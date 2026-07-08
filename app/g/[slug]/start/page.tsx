"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface Org {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
}

export default function StartPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/org/${slug}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setOrg(d));
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/public/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: org.id, name, email, phone }),
    });
    const data = await res.json();
    if (res.ok) {
      sessionStorage.setItem(`participant_${slug}`, data.participantId);
      sessionStorage.setItem(`bio_${slug}`, bio);
      sessionStorage.setItem(`name_${slug}`, name);
      router.push(`/g/${slug}/profile/qualities`);
    } else {
      setError(data.error || "Er ging iets mis");
      setLoading(false);
    }
  }

  const bioWords = bio.trim().split(/\s+/).filter(Boolean).length;
  const bioOver = bioWords > 50;

  if (!org) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Laden…</p>
    </div>
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="max-w-sm w-full">
        <p className="text-xs font-medium uppercase tracking-wide mb-1 text-center" style={{ color: org.primaryColor }}>
          {org.name}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Wie ben je?</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Naam <span className="text-red-500">*</span></label>
            <input
              required type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Jouw naam"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres <span className="text-red-500">*</span></label>
            <input
              required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@voorbeeld.nl"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefoonnummer <span className="text-gray-400">(optioneel)</span></label>
            <input
              type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="06 - …"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wat doe je in het dagelijks leven?
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Beschrijf het kort in je eigen woorden — werk, zorg, studie, pensioen.
            </p>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="bijv. Ik werk als verpleegkundige, ga elke dag bij mensen thuis langs en probeer te zien wat ze écht nodig hebben."
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                bioOver ? "border-red-400" : "border-gray-300"
              }`}
            />
            <p className={`text-xs mt-1 text-right ${bioOver ? "text-red-500" : "text-gray-400"}`}>
              {bioWords}/50 woorden
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || bioOver}
            className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: org.primaryColor }}
          >
            {loading ? "Even geduld…" : "Verder"}
          </button>
        </form>
      </div>
    </main>
  );
}
