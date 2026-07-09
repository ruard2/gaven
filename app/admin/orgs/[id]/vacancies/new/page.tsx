"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { QUALITY_CATEGORIES } from "@/lib/qualities";
import { CATEGORIES } from "@/lib/categories";

const allQualities = QUALITY_CATEGORIES.flatMap((c) => c.qualities);

export default function NewVacancy() {
  const { id: orgId } = useParams<{ id: string }>();
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    category: "Overig",
    shortDescription: "",
    whyValuable: "",
    concreteTasks: "",
    firstStep: "",
    contactPersonName: "",
    contactPersonEmail: "",
  });

  const [qualityWeights, setQualityWeights] = useState<Record<string, number>>({});
  const [sortedIds, setSortedIds] = useState<string[]>([]);
  const [generatingWeights, setGeneratingWeights] = useState(false);
  const [weightsGenerated, setWeightsGenerated] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    // Reset gegenereerde weights als omschrijving verandert
    if (["title", "shortDescription", "whyValuable", "concreteTasks"].includes(field)) {
      setWeightsGenerated(false);
    }
  }

  async function generateWeights() {
    if (!form.title || !form.shortDescription) {
      setError("Vul minimaal de taaknaam en korte omschrijving in.");
      return;
    }
    setGeneratingWeights(true);
    setError("");
    const res = await fetch("/api/admin/vacancies/generate-weights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setQualityWeights(data.weights);
      setSortedIds(Object.entries(data.weights as Record<string,number>).filter(([,w])=>w>0).sort(([,a],[,b])=>b-a).map(([id])=>id));
      setWeightsGenerated(true);
    } else {
      setError("Kwaliteiten genereren mislukt. Probeer opnieuw.");
    }
    setGeneratingWeights(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Genereer weights automatisch als dat nog niet is gedaan
    let weights = qualityWeights;
    if (!weightsGenerated) {
      setGeneratingWeights(true);
      const res = await fetch("/api/admin/vacancies/generate-weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        weights = data.weights;
        setQualityWeights(weights);
        setWeightsGenerated(true);
      }
      setGeneratingWeights(false);
    }

    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/vacancies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, organizationId: orgId, qualityWeights: weights }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push(`/admin/orgs/${orgId}`);
    } else {
      setError(data.error || "Opslaan mislukt");
      setLoading(false);
    }
  }

  const activeQualities = sortedIds.map(id => [id, qualityWeights[id]] as [string, number]).filter(([, w]) => (w as number) > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href={`/admin/orgs/${orgId}`} className="text-sm text-gray-500 hover:text-gray-700">← Terug</Link>
        <h1 className="text-lg font-bold text-gray-900">Nieuwe taak</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Taakinformatie */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Taakinformatie</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taaknaam <span className="text-red-500">*</span>
              </label>
              <input
                required
                spellCheck="true"
                lang="nl"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="bijv. Gastvrouw/gastheer zondagsdienst"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Korte omschrijving <span className="text-red-500">*</span>
              </label>
              <input
                required
                spellCheck="true"
                lang="nl"
                value={form.shortDescription}
                onChange={(e) => update("shortDescription", e.target.value)}
                placeholder="1 zin die de taak samenvat"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Waarom is dit waardevol?</label>
              <textarea
                rows={2}
                spellCheck="true"
                lang="nl"
                value={form.whyValuable}
                onChange={(e) => update("whyValuable", e.target.value)}
                placeholder="bijv. Jij zorgt ervoor dat mensen zich welkom voelen…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Wat doe je concreet?</label>
              <textarea
                rows={2}
                spellCheck="true"
                lang="nl"
                value={form.concreteTasks}
                onChange={(e) => update("concreteTasks", e.target.value)}
                placeholder="bijv. Mensen begroeten bij de ingang, koffie rondbrengen…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Goede eerste stap</label>
              <input
                spellCheck="true"
                lang="nl"
                value={form.firstStep}
                onChange={(e) => update("firstStep", e.target.value)}
                placeholder="bijv. Één keer meedraaien met een ervaren vrijwilliger"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Aanspreekpunt */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Aanspreekpunt / coördinator</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Naam <span className="text-red-500">*</span>
              </label>
              <input
                required
                spellCheck="true"
                lang="nl"
                value={form.contactPersonName}
                onChange={(e) => update("contactPersonName", e.target.value)}
                placeholder="Naam coördinator"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mailadres <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={form.contactPersonEmail}
                onChange={(e) => update("contactPersonEmail", e.target.value)}
                placeholder="coordinator@organisatie.nl"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* AI kwaliteiten */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="font-semibold text-gray-900">Passende kwaliteiten</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  De app berekent automatisch welke kwaliteiten bij deze taak passen.
                </p>
              </div>
              <button
                type="button"
                onClick={generateWeights}
                disabled={generatingWeights || !form.title || !form.shortDescription}
                className="flex-shrink-0 px-4 py-2 text-sm font-medium border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {generatingWeights ? "Berekenen…" : "✦ Genereer"}
              </button>
            </div>

            {weightsGenerated && activeQualities.length > 0 ? (
              <div className="space-y-3">
                {activeQualities.map(([id, weight]) => {
                    const label = allQualities.find((q) => q.id === id)?.label || id;
                    return (
                      <div key={id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{label}</span>
                          <span className="text-xs font-medium text-blue-600 w-8 text-right">{weight}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={weight}
                          onChange={(e) => setQualityWeights((prev) => ({ ...prev, [id]: Number(e.target.value) }))}
                          className="w-full accent-blue-600"
                        />
                      </div>
                    );
                  })}
                <p className="text-xs text-gray-400 pt-1">Sleep de schuivers om te fijnstemmen.</p>
              </div>
            ) : (
              <div className="rounded-xl bg-gray-50 border border-dashed border-gray-300 p-6 text-center">
                <p className="text-sm text-gray-400">
                  {!form.title || !form.shortDescription
                    ? "Vul eerst de taaknaam en omschrijving in."
                    : "Klik op 'Genereer' om kwaliteiten te berekenen — of sla direct op."}
                </p>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading || generatingWeights}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Opslaan…" : generatingWeights ? "Kwaliteiten berekenen…" : "Taak opslaan"}
            </button>
            <Link
              href={`/admin/orgs/${orgId}`}
              className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Annuleren
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
