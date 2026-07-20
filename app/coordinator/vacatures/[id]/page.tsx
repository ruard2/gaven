"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { QUALITY_CATEGORIES } from "@/lib/qualities";

const allQualities = QUALITY_CATEGORIES.flatMap((c) => c.qualities);

interface Vacancy {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  whyValuable: string | null;
  concreteTasks: string | null;
  longDescription: string | null;
  firstStep: string | null;
  status: string;
  qualityWeights: { qualityId: string; weight: number }[];
}

export default function CoordinatorVacancyEdit() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [qualityWeights, setQualityWeights] = useState<Record<string, number>>({});
  const [sortedIds, setSortedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/coordinator/vacancies/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setVacancy(data);
        const weights: Record<string, number> = {};
        for (const qw of data.qualityWeights || []) weights[qw.qualityId] = qw.weight;
        setQualityWeights(weights);
        setSortedIds(Object.entries(weights).filter(([, w]) => w > 0).sort(([, a], [, b]) => b - a).map(([id]) => id));
      })
      .finally(() => setLoading(false));
  }, [id]);

  function update(field: string, value: string) {
    setVacancy((v) => v ? { ...v, [field]: value } : v);
  }

  async function regenerate() {
    if (!vacancy) return;
    setGenerating(true);
    const res = await fetch("/api/coordinator/vacancies/generate-weights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: vacancy.title,
        category: vacancy.category,
        shortDescription: vacancy.shortDescription,
        whyValuable: vacancy.whyValuable,
        concreteTasks: vacancy.concreteTasks,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setQualityWeights(data.weights);
      setSortedIds(Object.entries(data.weights as Record<string, number>).filter(([, w]) => w > 0).sort(([, a], [, b]) => b - a).map(([id]) => id));
    }
    setGenerating(false);
  }

  async function save() {
    if (!vacancy) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/coordinator/vacancies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: vacancy.title,
        category: vacancy.category,
        shortDescription: vacancy.shortDescription,
        whyValuable: vacancy.whyValuable,
        concreteTasks: vacancy.concreteTasks,
        longDescription: vacancy.longDescription,
        firstStep: vacancy.firstStep,
        status: vacancy.status,
        qualityWeights,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Opslaan mislukt");
    } else {
      router.push("/coordinator/dashboard");
    }
    setSaving(false);
  }

  async function deleteVacancy() {
    if (!confirm("Wil je deze vacature verwijderen?")) return;
    setDeleting(true);
    await fetch(`/api/coordinator/vacancies/${id}`, { method: "DELETE" });
    router.push("/coordinator/dashboard");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Laden…</p></div>;
  if (!vacancy) return <div className="p-8 text-red-500">{error || "Niet gevonden"}</div>;

  const activeQualities = sortedIds.map((id) => [id, qualityWeights[id]] as [string, number]).filter(([, w]) => (w as number) > 0);

  const FIELD_ROWS: { field: string; label: string; required?: boolean; textarea?: boolean }[] = [
    { field: "title", label: "Taaknaam", required: true },
    { field: "shortDescription", label: "Korte omschrijving", required: true },
    { field: "whyValuable", label: "Waarom is dit waardevol?", textarea: true },
    { field: "concreteTasks", label: "Wat doe je concreet?", textarea: true },
    { field: "longDescription", label: "Extra informatie", textarea: true },
    { field: "firstStep", label: "Goede eerste stap" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/coordinator/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Terug</Link>
          <h1 className="text-lg font-bold text-gray-900">Vacature bewerken</h1>
        </div>
        <button onClick={deleteVacancy} disabled={deleting} className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">
          {deleting ? "Verwijderen…" : "Verwijder vacature"}
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Taakinformatie */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Vacature-informatie</h2>
          {FIELD_ROWS.map(({ field, label, required, textarea }) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              {textarea ? (
                <textarea rows={2} spellCheck lang="nl"
                  value={(vacancy as unknown as Record<string, string>)[field] || ""}
                  onChange={(e) => update(field, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              ) : (
                <input spellCheck lang="nl"
                  value={(vacancy as unknown as Record<string, string>)[field] || ""}
                  onChange={(e) => update(field, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categorie <span className="text-red-500">*</span></label>
            <input spellCheck lang="nl" value={vacancy.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={vacancy.status} onChange={(e) => update("status", e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="active">Actief</option>
              <option value="inactive">Non-actief</option>
              <option value="filled">Ingevuld</option>
            </select>
          </div>
        </div>

        {/* Kwaliteiten */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">Passende kwaliteiten</h2>
              <p className="text-sm text-gray-500 mt-0.5">Bepaalt hoe vrijwilligers aan deze vacature worden gematcht.</p>
            </div>
            <button type="button" onClick={regenerate} disabled={generating}
              className="flex-shrink-0 px-4 py-2 text-sm font-medium border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-40 transition-colors">
              {generating ? "Berekenen…" : "✦ Herbereken"}
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
              <p className="text-sm text-gray-400">Klik op 'Herbereken' om kwaliteiten te genereren op basis van je omschrijving.</p>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button onClick={save} disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "Opslaan…" : "Wijzigingen opslaan"}
          </button>
          <Link href="/coordinator/dashboard" className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Annuleren
          </Link>
        </div>
      </main>
    </div>
  );
}
