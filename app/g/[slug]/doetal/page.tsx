"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORY_ICONS } from "@/lib/categories";

interface Vacancy { id: string; title: string; category: string; shortDescription: string; }
interface Org { id: string; name: string; primaryColor: string; }

export default function DoetalPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const participantId = sessionStorage.getItem(`participant_${slug}`);
    if (!participantId) { router.push(`/g/${slug}/start`); return; }

    fetch(`/api/public/org/${slug}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        setOrg(data);
        return fetch(`/api/public/org/${slug}/vacancies`).then((r) => r.ok ? r.json() : []);
      })
      .then((list) => { if (Array.isArray(list)) setVacancies(list); })
      .finally(() => setLoading(false));
  }, [slug, router]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function submit() {
    const participantId = sessionStorage.getItem(`participant_${slug}`);
    if (!participantId || selected.size === 0) {
      router.push(`/g/${slug}/matches`);
      return;
    }
    setSaving(true);
    await fetch("/api/public/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, vacancyIds: Array.from(selected) }),
    });
    setDone(true);
    setSaving(false);
  }

  const grouped = vacancies.reduce<Record<string, Vacancy[]>>((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {});

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400">Laden…</p></div>;

  if (done) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: org?.primaryColor + "22" }}>
          <span className="text-3xl">🙌</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Bedankt!</h2>
        <p className="text-sm text-gray-500 mb-6">
          Goed om te weten dat je al actief bent. De coördinator ontvangt een seintje.
        </p>
        <Link href={`/g/${slug}/matches`}
          className="inline-block px-6 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: org?.primaryColor }}>
          Bekijk jouw matches →
        </Link>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-md mx-auto px-4 pt-8">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4 block">← Terug</button>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Wat doe je al?</h1>
        <p className="text-sm text-gray-500 mb-6">
          Ben je al actief als vrijwilliger bij {org?.name}? Vink de taken aan die je al doet.
          De coördinator hoort het graag!
        </p>

        {vacancies.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">Nog geen taken beschikbaar.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{CATEGORY_ICONS[category] || "📌"}</span>
                  <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{category}</h2>
                </div>
                <div className="space-y-2">
                  {items.map((v) => {
                    const isSelected = selected.has(v.id);
                    return (
                      <button key={v.id} onClick={() => toggle(v.id)}
                        className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                          isSelected
                            ? "border-transparent shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                        style={isSelected ? { backgroundColor: (org?.primaryColor || "#2563eb") + "15", borderColor: org?.primaryColor } : {}}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm ${isSelected ? "text-gray-900" : "text-gray-800"}`}>{v.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{v.shortDescription}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                            isSelected ? "border-transparent" : "border-gray-300"
                          }`} style={isSelected ? { backgroundColor: org?.primaryColor } : {}}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-md mx-auto flex gap-3">
          <button onClick={() => router.push(`/g/${slug}/matches`)}
            className="px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Overslaan
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 text-sm"
            style={{ backgroundColor: org?.primaryColor }}>
            {saving ? "Opslaan…" : selected.size > 0 ? `${selected.size} taak${selected.size === 1 ? "" : "en"} bevestigen` : "Geen taken geselecteerd"}
          </button>
        </div>
      </div>
    </main>
  );
}
