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
  const [addQualityId, setAddQualityId] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const effectiveCategory = form.category === "Anders…" ? customCategory.trim() : form.category;

  function addQuality(id: string) {
    if (!id || sortedIds.includes(id)) return;
    setSortedIds((s) => [...s, id]);
    setQualityWeights((prev) => ({ ...prev, [id]: prev[id] || 50 }));
    setAddQualityId("");
  }
  function removeQuality(id: string) {
    setSortedIds((s) => s.filter((x) => x !== id));
    setQualityWeights((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

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
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/coordinator/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Terug
          </Link>
          <div className="w-px h-5 bg-gray-200" />
          <div>
            <h1 className="text-[15px] font-bold text-gray-900 tracking-tight leading-tight">Nieuwe vacature</h1>
            <p className="text-xs text-gray-400 leading-tight">Beschrijf de taak — de AI bepaalt de passende gaven.</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-7 pb-16 space-y-5">
        <div className="flex items-start gap-3 bg-blue-50/70 border border-blue-100 rounded-xl px-4 py-3">
          <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-sm text-blue-900/80 leading-relaxed">
            Beschrijf de taak in het kort. Op basis daarvan bepaalt de app welke <strong>gaven</strong> belangrijk zijn, en koppelt vrijwilligers wiens profiel daarbij past. Je kunt de gaven daarna zelf bijstellen.
          </p>
        </div>

        {/* Taakinformatie */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 leading-tight">Vacature-informatie</h2>
              <p className="text-xs text-gray-400 leading-tight">Naam, omschrijving en voorwaarden</p>
            </div>
          </div>
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
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.4 6.6L22 12l-6.6 2.4L13 21l-2.4-6.6L4 12l6.6-2.4L13 3z" /></svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900 leading-tight">Passende kwaliteiten</h2>
                <p className="text-xs text-gray-400 leading-tight">AI bepaalt ze uit je omschrijving — bij te stellen</p>
              </div>
            </div>
            <button type="button" onClick={regenerate} disabled={generating}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors">
              {generating ? "Berekenen…" : "✦ Bereken"}
            </button>
          </div>

          {activeQualities.length > 0 && (
            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-4">
              Hoe hoger het gewicht, hoe zwaarder deze gaaf meetelt bij het matchen. Sleep om bij te stellen, verwijder wat niet past, of voeg er zelf één toe.
            </p>
          )}

          {activeQualities.length > 0 ? (
            <div className="space-y-3.5">
              {activeQualities.map(([qid, weight]) => {
                const label = allQualities.find((q) => q.id === qid)?.label || qid;
                const wc = weight >= 80 ? "#16a34a" : weight >= 50 ? "#2563eb" : weight >= 20 ? "#d97706" : "#94a3b8";
                return (
                  <div key={qid} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-700">{label}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded" style={{ color: wc, backgroundColor: wc + "18" }}>{weight}</span>
                        <button type="button" onClick={() => removeQuality(qid)} title="Verwijderen"
                          className="text-gray-300 hover:text-red-500 text-base leading-none transition-colors">×</button>
                      </div>
                    </div>
                    <input type="range" min={0} max={100} value={weight}
                      onChange={(e) => setQualityWeights((prev) => ({ ...prev, [qid]: Number(e.target.value) }))}
                      className="w-full h-1.5 rounded-full accent-violet-600" style={{ accentColor: wc }} />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-gray-50 border border-dashed border-gray-300 p-8 text-center">
              <div className="w-9 h-9 rounded-full bg-violet-50 text-violet-500 flex items-center justify-center mx-auto mb-2.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 3l-2.4 6.6L4 12l6.6 2.4L13 21l2.4-6.6L22 12l-6.6-2.4L13 3z" /></svg>
              </div>
              <p className="text-sm text-gray-500">Vul de omschrijving in en klik op <span className="font-semibold text-violet-600">Bereken</span>.</p>
              <p className="text-xs text-gray-400 mt-1">Daarna kun je alles handmatig bijstellen.</p>
            </div>
          )}

          {/* Zelf een gaaf toevoegen */}
          <div className="mt-4 flex gap-2">
            <select value={addQualityId} onChange={(e) => setAddQualityId(e.target.value)}
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="">+ Zelf een gaaf toevoegen…</option>
              {QUALITY_CATEGORIES.map((cat) => {
                const opts = cat.qualities.filter((q) => !sortedIds.includes(q.id));
                if (opts.length === 0) return null;
                return (
                  <optgroup key={cat.id} label={cat.label}>
                    {opts.map((q) => <option key={q.id} value={q.id}>{q.label}</option>)}
                  </optgroup>
                );
              })}
            </select>
            <button type="button" onClick={() => addQuality(addQualityId)} disabled={!addQualityId}
              className="px-4 py-2 text-sm font-semibold border border-violet-300 text-violet-700 rounded-lg hover:bg-violet-50 disabled:opacity-40 transition-colors whitespace-nowrap">
              Toevoegen
            </button>
          </div>

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

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button onClick={create} disabled={saving || !form.title.trim() || !effectiveCategory || !form.shortDescription.trim()}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "Aanmaken…" : "Vacature aanmaken"}
          </button>
          <Link href="/coordinator/dashboard" className="px-5 py-3 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center">
            Annuleren
          </Link>
        </div>
      </main>
    </div>
  );
}
