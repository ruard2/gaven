"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { QUALITY_CATEGORIES } from "@/lib/qualities";

interface Org { id: string; name: string; primaryColor: string; }

export default function QualitiesPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/org/${slug}`).then((r) => r.ok ? r.json() : null).then(setOrg);
    const existing = sessionStorage.getItem(`qualities_${slug}`);
    if (existing) setSelected(JSON.parse(existing));
  }, [slug]);

  function toggle(id: string) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  function next() {
    sessionStorage.setItem(`qualities_${slug}`, JSON.stringify(selected));
    router.push(`/g/${slug}/profile/negatives`);
  }

  if (!org) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Laden…</p></div>;

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full"
              style={{ backgroundColor: i <= 2 ? org.primaryColor : "#e5e7eb" }} />
          ))}
        </div>

        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-4 block">← Terug</button>
        <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: org.primaryColor }}>Stap 2 van 3</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Welke kwaliteiten herken jij in jezelf?</h1>
        <p className="text-sm text-gray-500 mb-5">Klik een categorie open en vink aan wat bij jou past.</p>

        <div className="space-y-2 mb-6">
          {QUALITY_CATEGORIES.map((cat) => {
            const isOpen = expanded === cat.id;
            const activeCount = cat.qualities.filter((q) => selected.includes(q.id)).length;

            return (
              <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : cat.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="font-medium text-gray-800 text-sm">{cat.label}</span>
                  <div className="flex items-center gap-2">
                    {activeCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: org.primaryColor }}>
                        {activeCount}
                      </span>
                    )}
                    <span className="text-gray-400 text-sm">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-3 pt-1 border-t border-gray-100 grid grid-cols-1 gap-1">
                    {cat.qualities.map((q) => {
                      const sel = selected.includes(q.id);
                      return (
                        <button
                          key={q.id}
                          onClick={() => toggle(q.id)}
                          className={`text-left px-3 py-2 rounded-lg text-sm transition-all ${
                            sel ? "font-medium text-white" : "text-gray-700 hover:bg-gray-50"
                          }`}
                          style={sel ? { backgroundColor: org.primaryColor } : {}}
                        >
                          {sel ? "✓ " : ""}{q.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={next}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: org.primaryColor }}
        >
          Verder
        </button>
        <p className="text-xs text-center text-gray-400 mt-2">{selected.length} kwaliteiten gekozen</p>
      </div>
    </main>
  );
}
