"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Vacancy {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  whyValuable: string | null;
  concreteTasks: string | null;
  firstStep: string | null;
  contactPersonName: string;
}

export default function EditorVacancyPage() {
  const { token, vacancyId } = useParams<{ token: string; vacancyId: string }>();
  const router = useRouter();

  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [form, setForm] = useState({ title: "", shortDescription: "", whyValuable: "", concreteTasks: "", firstStep: "" });
  const [editorName, setEditorName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/editor/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        const v = d.vacancies.find((x: Vacancy) => x.id === vacancyId);
        if (!v) { setError("Taak niet gevonden"); return; }
        setVacancy(v);
        setForm({
          title: v.title,
          shortDescription: v.shortDescription,
          whyValuable: v.whyValuable || "",
          concreteTasks: v.concreteTasks || "",
          firstStep: v.firstStep || "",
        });
      })
      .finally(() => setLoading(false));
  }, [token, vacancyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/editor/${token}/vacancies/${vacancyId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, editorName }),
    });
    if (res.ok) {
      setDone(true);
    } else {
      const d = await res.json();
      setError(d.error || "Indienen mislukt");
    }
    setSaving(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Laden…</p></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center"><p className="text-red-500">{error}</p></div>;

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Ingediend!</h2>
        <p className="text-gray-500 text-sm mb-6">
          Jouw wijzigingen zijn verstuurd naar de beheerder. Na goedkeuring worden ze zichtbaar.
        </p>
        <Link href={`/uitnodigen/${token}`} className="text-blue-600 text-sm hover:underline">
          ← Terug naar taakoverzicht
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href={`/uitnodigen/${token}`} className="text-sm text-gray-500 hover:text-gray-700">← Terug</Link>
        <h1 className="text-lg font-bold text-gray-900">{vacancy?.title}</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6 text-sm text-amber-800">
          Wijzigingen worden ter goedkeuring ingediend bij de beheerder.
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jouw naam</label>
              <input
                required
                spellCheck="true"
                lang="nl"
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                placeholder="Wie doet deze aanpassing?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Taakinhoud aanpassen</h2>

            {[
              { key: "title", label: "Taaknaam" },
              { key: "shortDescription", label: "Korte omschrijving" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  spellCheck="true"
                  lang="nl"
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}

            {[
              { key: "whyValuable", label: "Waarom is dit waardevol?" },
              { key: "concreteTasks", label: "Wat doe je concreet?" },
              { key: "firstStep", label: "Goede eerste stap" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <textarea
                  rows={3}
                  spellCheck="true"
                  lang="nl"
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Indienen…" : "Wijzigingen indienen"}
          </button>
        </form>
      </main>
    </div>
  );
}
