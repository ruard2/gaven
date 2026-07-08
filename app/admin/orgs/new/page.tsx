"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ORG_TYPES = [
  { value: "kerk", label: "Kerk" },
  { value: "vereniging", label: "Vereniging" },
  { value: "stichting", label: "Stichting" },
  { value: "school", label: "School" },
  { value: "anders", label: "Anders" },
];

export default function NewOrg() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    organizationType: "kerk",
    place: "",
    primaryColor: "#2563eb",
    welcomeText: "",
    contactEmail: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/admin/orgs/${data.id}`);
    } else {
      setError(data.error || "Opslaan mislukt");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Terug</Link>
        <h1 className="text-lg font-bold text-gray-900">Nieuwe organisatie</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Maak je organisatie aan</h2>
          <p className="text-sm text-gray-500 mb-6">
            Na het aanmaken genereren we automatisch een unieke link en QR-code.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Naam organisatie / groep <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="bijv. NGK Middelharnis"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type organisatie <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ORG_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => update("organizationType", t.value)}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                      form.organizationType === t.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plaats (optioneel)</label>
              <input
                type="text"
                value={form.place}
                onChange={(e) => update("place", e.target.value)}
                placeholder="bijv. Middelharnis"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contactmail <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={form.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
                placeholder="info@mijnorganisatie.nl"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Welkomsttekst (optioneel)</label>
              <textarea
                rows={3}
                value={form.welcomeText}
                onChange={(e) => update("welcomeText", e.target.value)}
                placeholder="bijv. Welkom! Vul hier in een paar minuten in wat bij jou past."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Basiskleur (optioneel)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => update("primaryColor", e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-300"
                />
                <span className="text-sm text-gray-500">{form.primaryColor}</span>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Aanmaken…" : "Organisatie aanmaken"}
              </button>
              <Link
                href="/admin/dashboard"
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Annuleren
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
