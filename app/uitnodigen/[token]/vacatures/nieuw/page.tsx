"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QUALITY_CATEGORIES } from "@/lib/qualities";

const QUALITY_LABEL_MAP: Record<string, string> = Object.fromEntries(
  QUALITY_CATEGORIES.flatMap((c) => c.qualities.map((q) => [q.id, q.label]))
);

interface OrgInfo {
  name: string;
  primaryColor: string;
}

interface WeightEntry {
  id: string;
  label: string;
  weight: number;
}

type Step = "form" | "weights" | "done";

// Map quality-id → label (fetched client-side via API)
async function generateWeights(
  title: string, category: string, shortDescription: string,
  whyValuable: string, concreteTasks: string
): Promise<Record<string, number>> {
  const res = await fetch("/api/admin/vacancies/generate-weights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, category, shortDescription, whyValuable, concreteTasks }),
  });
  if (!res.ok) return {};
  const d = await res.json();
  return d.weights || {};
}

function weightColor(w: number) {
  if (w >= 80) return "#16a34a";
  if (w >= 50) return "#2563eb";
  if (w >= 20) return "#d97706";
  return "#9ca3af";
}

function weightLabel(w: number) {
  if (w >= 80) return "Essentieel";
  if (w >= 50) return "Helpend";
  if (w >= 20) return "Handig";
  return "Bijzaak";
}

export default function NewVacancyPage() {
  const { token } = useParams<{ token: string }>();

  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [editorName, setEditorName] = useState("");
  const [form, setForm] = useState({
    title: "",
    category: "",
    shortDescription: "",
    whyValuable: "",
    concreteTasks: "",
    firstStep: "",
  });

  // Step 2: weights
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [generatingWeights, setGeneratingWeights] = useState(false);

  const [loadingOrg, setLoadingOrg] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/editor/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setOrg(d.org);
      })
      .catch(() => setError("Kon gegevens niet laden"))
      .finally(() => setLoadingOrg(false));
  }, [token]);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setGeneratingWeights(true);
    setStep("weights");

    const raw = await generateWeights(
      form.title, form.category, form.shortDescription,
      form.whyValuable, form.concreteTasks
    ).catch(() => ({}));

    const entries: WeightEntry[] = Object.entries(raw)
      .sort(([, a], [, b]) => b - a)
      .map(([id, weight]) => ({
        id,
        label: QUALITY_LABEL_MAP[id] || id,
        weight: Math.round(weight),
      }));

    setWeights(entries);
    setGeneratingWeights(false);
  }

  function updateWeight(id: string, value: number) {
    setWeights((prev) => prev.map((w) => w.id === id ? { ...w, weight: value } : w));
  }

  function removeWeight(id: string) {
    setWeights((prev) => prev.filter((w) => w.id !== id));
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");

    const qualityWeights: Record<string, number> = {};
    for (const w of weights) qualityWeights[w.id] = w.weight;

    const res = await fetch(`/api/editor/${token}/vacatures/nieuw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, editorName, qualityWeights }),
    });
    if (res.ok) {
      setStep("done");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Indienen mislukt");
    }
    setSaving(false);
  }

  if (loadingOrg) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400">Laden…</p>
    </div>
  );

  if (error && !org) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-red-500">{error}</p>
    </div>
  );

  if (step === "done") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Voorstel ingediend!</h2>
        <p className="text-gray-500 text-sm mb-6">
          De beheerder beoordeelt jouw nieuwe taak. Na goedkeuring wordt deze zichtbaar voor gemeenteleden.
        </p>
        <Link href={`/uitnodigen/${token}`} className="text-blue-600 text-sm hover:underline">
          ← Terug naar taakoverzicht
        </Link>
      </div>
    </div>
  );

  // Step 2: weights review
  if (step === "weights") return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => { setStep("form"); setError(""); }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Terug
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Gaven controleren</h1>
          <p className="text-xs text-gray-400">Stap 2 van 2 — pas aan indien nodig</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {generatingWeights ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 text-sm">AI analyseert de taak en bepaalt welke gaven belangrijk zijn…</p>
          </div>
        ) : (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 mb-6 text-sm text-blue-800">
              De AI heeft bepaald welke gaven bij <strong>{form.title}</strong> passen. Controleer en pas aan waar nodig.
            </div>

            {weights.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center text-gray-500 text-sm mb-6">
                Geen gaven gegenereerd. Je kunt de taak toch indienen.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 mb-6">
                {weights.map((w) => (
                  <div key={w.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{w.label}</span>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full"
                          style={{ color: weightColor(w.weight), backgroundColor: weightColor(w.weight) + "18" }}
                        >
                          {weightLabel(w.weight)} — {w.weight}
                        </span>
                        <button
                          onClick={() => removeWeight(w.id)}
                          className="text-gray-300 hover:text-red-400 text-lg leading-none transition-colors"
                          title="Verwijder"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-8">0</span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={w.weight}
                        onChange={(e) => updateWeight(w.id, Number(e.target.value))}
                        className="flex-1 h-1.5 rounded-full accent-blue-600"
                      />
                      <span className="text-xs text-gray-400 w-8 text-right">100</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Indienen…" : "Taak voorstellen"}
            </button>
          </>
        )}
      </main>
    </div>
  );

  // Step 1: form
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href={`/uitnodigen/${token}`} className="text-sm text-gray-500 hover:text-gray-700">← Terug</Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Nieuwe taak voorstellen</h1>
          <p className="text-xs text-gray-400">Stap 1 van 2 — omschrijf de taak</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6 text-sm text-amber-800">
          Jouw voorstel wordt ter goedkeuring ingediend bij de beheerder van {org?.name}.
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jouw naam</label>
              <input
                required
                spellCheck="true"
                lang="nl"
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                placeholder="Wie stelt deze taak voor?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Over de taak</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taaknaam <span className="text-red-500">*</span>
              </label>
              <input
                required
                spellCheck="true"
                lang="nl"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="bijv. Kinderoppas, Muzikant, Bloemengroep"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categorie</label>
              <input
                spellCheck="true"
                lang="nl"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="bijv. Eredienst, Zorg, Jeugd, Techniek"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
                onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
                placeholder="Één zin die de taak samenvat"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {[
              { key: "whyValuable", label: "Waarom is dit waardevol?", placeholder: "Wat betekent deze taak voor de gemeente?" },
              { key: "concreteTasks", label: "Wat doe je concreet?", placeholder: "Beschrijf de activiteiten stap voor stap" },
              { key: "firstStep", label: "Goede eerste stap", placeholder: "Hoe kan iemand kennismaken met deze taak?" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <textarea
                  rows={3}
                  spellCheck="true"
                  lang="nl"
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            Volgende: gaven controleren →
          </button>
        </form>
      </main>
    </div>
  );
}
