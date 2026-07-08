"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { WORK_EXPERIENCE } from "@/lib/qualities";

interface Org { id: string; name: string; primaryColor: string; }

export default function WorkPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/public/org/${slug}`).then((r) => r.ok ? r.json() : null).then(setOrg);
    const existing = sessionStorage.getItem(`work_${slug}`);
    if (existing) setSelected(JSON.parse(existing));
  }, [slug]);

  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : s.length < 3 ? [...s, id] : s
    );
  }

  function next() {
    sessionStorage.setItem(`work_${slug}`, JSON.stringify(selected));
    router.push(`/g/${slug}/profile/qualities`);
  }

  if (!org) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Laden…</p></div>;

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i === 1 ? "" : "bg-gray-200"}`}
              style={i === 1 ? { backgroundColor: org.primaryColor } : {}} />
          ))}
        </div>

        <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: org.primaryColor }}>Stap 1 van 3</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Wat voor werk past bij jou?</h1>
        <p className="text-sm text-gray-500 mb-5">Kies maximaal 3 opties die het beste bij jou passen.</p>

        <div className="grid grid-cols-2 gap-2 mb-6">
          {WORK_EXPERIENCE.map((w) => {
            const sel = selected.includes(w.id);
            return (
              <button
                key={w.id}
                onClick={() => toggle(w.id)}
                className={`text-left px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                  sel ? "border-2 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                }`}
                style={sel ? { backgroundColor: org.primaryColor, borderColor: org.primaryColor } : {}}
              >
                {w.label}
              </button>
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
        <p className="text-xs text-center text-gray-400 mt-2">{selected.length}/3 gekozen</p>
      </div>
    </main>
  );
}
