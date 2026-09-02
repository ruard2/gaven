"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { QUALITY_CATEGORIES } from "@/lib/qualities";

const allQualities = QUALITY_CATEGORIES.flatMap((c) => c.qualities);

export default function CoordinatorVacancyNew() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", category: CATEGORIES[0], shortDescription: "", whyValuable: "", concreteTasks: "", longDescription: "", firstStep: "" });
  const [customCategory, setCustomCategory] = useState("");
  const [minAge, setMinAge] = useState("");
  const [taskLevel, setTaskLevel] = useState("regulier");
  const [specificRequirements, setSpecificRequirements] = useState<string[]>([]);
  const [reqInput, setReqInput] = useState("");
  const [qualityWeights, setQualityWeights] = useState<Record<string, number>>({});
  const [sortedIds, setSortedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const effectiveCategory = form.category === "Anders…" ? customCategory.trim() : form.category;

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function regenerate() {
    if (!form.title.trim()) { setError("Vul eerst een taaknaam en omschrijving in."); return; }
    setError("");
    setGenerating(true);
    const res = await fetch("/api/coordinator/vacancies/generate-weights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title, category: effectiveCategory,
        shortDescription: form.shortDescription, whyValuable: form.whyValuable, concreteTasks: form.concreteTasks,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setQualityWeights(data.weights);
      setSortedIds(Object.entries(data.weights as Record<string, number>).filter(([, w]) => w > 0).sort(([, a], [, b]) => b - a).map(([id]) => id));
      if (Array.isArray(data.specificRequirements)) setSpecificRequirements(data.specificRequirements);
      if (data.taskLevel) setTaskLevel(data.taskLevel);
    }
    setGenerating(false);
  }

  async function create() {
    if (!form.title.trim() || !effectiveCategory || !form.shortDescription.trim()) {
      setError("Naam, categorie en korte omschrijving zijn verplicht.");
      return;
    }
    setSaving(true); setError("");
    const res = await fetch("/api/coordinator/vacancies", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, category: effectiveCategory, qualityWeights, minAge: minAge ? Number(minAge) : null, specificRequirements, taskLevel }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Aanmaken mislukt");
      setSaving(false);
      return;
    }
    router.push("/coordinator/dashboard");
  }

  const activeQualities = sortedIds.map((id) => [id, qualityWeights[id] ?? 0] as [string, number]);

  const FIELD_ROWS: { field: string; label: string; required?: boolean; textarea?: boolean; placeholder?: string }[] = [
    { field: "title", label: "Taaknaam", required: true, placeholder: "bijv. Koster op zondag" },
    { field: "shortDescription", label: "Korte omschrijving", required: true, placeholder: "In één zin: wat houdt de taak in?" },
    { field: "whyValuable", label: "Waarom is dit waardevol?", textarea: true },
    { field: "concreteTasks", label: "Wat doe je concreet?", textarea: true },
    { field: "longDescription", label: "Extra informatie", textarea: true, placeholder: "Optioneel — aanvullende details" },
    { field: "firstStep", label: "Goede eerste stap", placeholder: "Hoe begin je als nieuwe vrijwilliger?" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/coordinator/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Terug</Link>
        <h1 className="text-lg font-bold text-gray-900">Nieuwe vacature</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Taakinformatie */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Vacature-informatie</h2>
          {FIELD_ROWS.map(({ field, label, required, textarea, placeholder }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              {textarea ? (
                <textarea rows={2} spellCheck lang="nl" placeholder={placeholder}
                  value={(form as unknown as Record<string, string>)[field]}
                  onChange={(e) => update(field, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ) : (
                <input spellCheck lang="nl" placeholder={placeholder}
                  value={(form as unknown as Record<string, string>)[field]}
                  onChange={(e) => update(field, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categorie <span className="text-red-500">*</span></label>
            <select value={form.category} onChange={(e) => { update("category", e.target.value); if (e.target.value !== "Anders…") setCustomCategory(""); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              <option>Anders…</option>
            </select>
            {form.category === "Anders…" && (
              <input value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Eigen categorie"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimumleeftijd <span className="text-gray-400">(optioneel)</span></label>
            <input type="number" inputMode="numeric" min={1} max={120} value={minAge}
              onChange={(e) => setMinAge(e.target.value)} placeholder="bijv. 18 voor bardienst of autorijden"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">Jongere vrijwilligers zien de taak dan met de melding “vanaf X jaar”.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verantwoordelijkheidsniveau</label>
            <select value={taskLevel} onChange={(e) => setTaskLevel(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="instap">Instap — dienend, laagdrempelig (koffie, schoonmaak, welkom)</option>
              <option value="regulier">Regulier — meedraaien in een team</option>
              <option value="verantwoordelijk">Verantwoordelijk — commitment/overzicht/vertrouwen</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">AI vult dit in bij ‘Bereken’. Bepaalt hoe breed de taak matcht; jongeren krijgen dienende taken hoger, verantwoordelijke lager.</p>
          </div>
        </div>

        {/* Kwaliteiten */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Passende kwaliteiten</h2>
              <p className="text-sm text-gray-500 mt-0.5">Laat AI de kwaliteiten bepalen op basis van je omschrijving.</p>
            </div>
            <button type="button" onClick={regenerate} disabled={generating}
              className="flex-shrink-0 px-4 py-2 text-sm font-medium border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-40 transition-colors">
              {generating ? "Berekenen…" : "✦ Bereken"}
            </button>
          </div>

          {activeQualities.length > 0 ? (
            <div className="space-y-3">
              {activeQualities.map(([qid, weight]) => {
                const label = allQualities.find((q) => q.id === qid)?.label || qid;
                return (
                  <div key={qid} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{label}</span>
                      <span className="text-xs font-medium text-blue-600 w-8 text-right">{weight}</span>
                    </div>
                    <input type="range" min={0} max={100} value={weight}
                      onChange={(e) => setQualityWeights((prev) => ({ ...prev, [qid]: Number(e.target.value) }))}
                      className="w-full accent-blue-600" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 border border-dashed border-gray-300 p-6 text-center">
              <p className="text-sm text-gray-400">Vul de omschrijving in en klik op 'Bereken'. Je kunt daarna handmatig bijstellen.</p>
            </div>
          )}

          {/* Specifieke eisen: harde filter op een concreet specialisme */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Vereist specialisme</h3>
            <p className="text-xs text-gray-500 mt-0.5 mb-2">
              Alleen vrijwilligers die dit met zoveel woorden noemen worden gekoppeld (bijv. <em>orgel</em> voor een organist). Meestal leeg laten — alleen voor écht specialistische taken.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {specificRequirements.map((r) => (
                <span key={r} className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                  {r}
                  <button type="button" onClick={() => setSpecificRequirements((s) => s.filter((x) => x !== r))}
                    className="text-amber-500 hover:text-amber-700" aria-label={`Verwijder ${r}`}>×</button>
                </span>
              ))}
              {specificRequirements.length === 0 && (
                <span className="text-xs text-gray-400">Geen — deze taak is voor iedereen toegankelijk.</span>
              )}
            </div>
            <div className="flex gap-2">
              <input value={reqInput} onChange={(e) => setReqInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const v = reqInput.trim().toLowerCase();
                    if (v && !specificRequirements.includes(v)) setSpecificRequirements((s) => [...s, v].slice(0, 5));
                    setReqInput("");
                  }
                }}
                placeholder="bijv. orgel, mengtafel…"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button"
                onClick={() => { const v = reqInput.trim().toLowerCase(); if (v && !specificRequirements.includes(v)) setSpecificRequirements((s) => [...s, v].slice(0, 5)); setReqInput(""); }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Toevoegen</button>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button onClick={create} disabled={saving || !form.title.trim() || !effectiveCategory || !form.shortDescription.trim()}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "Aanmaken…" : "Vacature aanmaken"}
          </button>
          <Link href="/coordinator/dashboard" className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Annuleren
          </Link>
        </div>
      </main>
    </div>
  );
}
