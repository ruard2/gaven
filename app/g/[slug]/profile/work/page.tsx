"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface Org { id: string; name: string; primaryColor: string; }

export default function WorkPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/public/org/${slug}`).then((r) => r.ok ? r.json() : null).then(setOrg);
    const existing = sessionStorage.getItem(`workbio_${slug}`);
    if (existing) setBio(existing);
  }, [slug]);

  async function next() {
    if (!bio.trim()) {
      router.push(`/g/${slug}/profile/qualities`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/public/bio-to-qualities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      const data = res.ok ? await res.json() : {};
      // Store raw bio for display + AI-derived quality IDs for matching
      sessionStorage.setItem(`workbio_${slug}`, bio);
      sessionStorage.setItem(`workQualities_${slug}`, JSON.stringify(data.qualityIds || []));
      if (data.familieBonus) {
        sessionStorage.setItem(`familiebonus_${slug}`, data.familieBonus);
      }
    } catch {
      // On error, continue without work qualities
      sessionStorage.setItem(`workQualities_${slug}`, "[]");
    } finally {
      setLoading(false);
      router.push(`/g/${slug}/profile/qualities`);
    }
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
        <h1 className="text-xl font-bold text-gray-900 mb-2">Wat doe je voor werk of studie?</h1>
        <p className="text-sm text-gray-500 mb-5">
          Beschrijf kort je beroep, studie of dagelijkse bezigheid. Dit helpt ons de beste taken voor jou te vinden.
        </p>

        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Bijv: ik ben verpleegkundige, ik studeer pedagogiek, ik werk als timmerman, ik ben gepensioneerd leraar..."
          rows={4}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 resize-none mb-2"
          style={{ "--tw-ring-color": org.primaryColor } as React.CSSProperties}
        />
        <p className="text-xs text-gray-400 mb-6">Je hoeft niet uitgebreid te zijn — een paar woorden is genoeg.</p>

        <button
          onClick={next}
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: org.primaryColor }}
        >
          {loading ? "Even denken…" : "Verder"}
        </button>
        {!bio.trim() && (
          <p className="text-xs text-center text-gray-400 mt-2">Laat leeg om over te slaan</p>
        )}
      </div>
    </main>
  );
}
