"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { NEGATIVE_PREFERENCES } from "@/lib/qualities";

interface Org { id: string; name: string; primaryColor: string; }

export default function NegativesPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/public/org/${slug}`).then((r) => r.ok ? r.json() : null).then(setOrg);
  }, [slug]);

  function toggle(id: string) {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  async function finish() {
    const participantId = sessionStorage.getItem(`participant_${slug}`);
    if (!participantId) { router.push(`/g/${slug}/start`); return; }

    setLoading(true);

    const bio = sessionStorage.getItem(`bio_${slug}`) || "";
    const manualQualities: string[] = JSON.parse(sessionStorage.getItem(`qualities_${slug}`) || "[]");

    // Bio → AI → extra kwaliteiten + familie
    let bioQualities: string[] = [];
    let familieBonus: string | null = null;
    if (bio.trim().length > 5) {
      try {
        const bioRes = await fetch("/api/public/bio-to-qualities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bio }),
        });
        if (bioRes.ok) {
          const bioData = await bioRes.json();
          bioQualities = bioData.qualityIds || [];
          familieBonus = bioData.familieBonus || null;
        }
      } catch (e) {
        console.error("Bio-to-qualities mislukt:", e);
      }
    }

    // Samenvoegen — handmatige selectie + bio-afgeleid, geen duplicaten
    const allQualities = [...new Set([...manualQualities, ...bioQualities])];

    // Opslaan voor summary-pagina en matches
    sessionStorage.setItem(`negatives_${slug}`, JSON.stringify(selected));
    sessionStorage.setItem(`allQualities_${slug}`, JSON.stringify(allQualities));
    sessionStorage.setItem(`familieBonus_${slug}`, familieBonus || "");

    // Profiel opslaan in database
    await fetch("/api/public/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId,
        workExperience: [],
        qualities: allQualities,
        negatives: selected,
      }),
    });

    router.push(`/g/${slug}/summary`);
  }

  if (!org) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Laden…</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: org.primaryColor }} />
          ))}
          <div className="h-1.5 flex-1 rounded-full bg-gray-200" />
        </div>

        <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: org.primaryColor }}>
          Stap 3 van 3
        </p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Wat past minder bij jou?</h1>
        <p className="text-sm text-gray-500 mb-5">
          Dit is geen harde blokkade — het helpt ons om beter te matchen.
        </p>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 space-y-1">
          {NEGATIVE_PREFERENCES.map((n) => {
            const sel = selected.includes(n.id);
            return (
              <button
                key={n.id}
                onClick={() => toggle(n.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2 ${
                  sel ? "font-medium" : "text-gray-700 hover:bg-gray-50"
                }`}
                style={sel ? { color: org.primaryColor } : {}}
              >
                <span
                  className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs"
                  style={sel
                    ? { backgroundColor: org.primaryColor, borderColor: org.primaryColor, color: "white" }
                    : { borderColor: "#d1d5db" }
                  }
                >
                  {sel ? "✓" : ""}
                </span>
                {n.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={finish}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ backgroundColor: org.primaryColor }}
        >
          {loading ? "Even geduld — profiel wordt samengesteld…" : "Bekijk mijn profiel"}
        </button>

        <p className="text-xs text-center text-gray-400 mt-3">
          Daarna zie je welke taken bij jou kunnen passen
        </p>
      </div>
    </main>
  );
}
