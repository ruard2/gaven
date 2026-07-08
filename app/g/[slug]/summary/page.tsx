"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Org { name: string; primaryColor: string; }

interface Summary {
  openingszin: string;
  schets: string;
  familie: string;
  familieToelichting: string;
  bijbelvers: string;
  bijbelbron: string;
}

const FAMILIE_ICON: Record<string, string> = {
  "Woord & waarheid": "📖",
  "Zorg & aanwezigheid": "🤝",
  "Richting & structuur": "🧭",
};

export default function SummaryPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const participantId = sessionStorage.getItem(`participant_${slug}`);
    if (!participantId) { router.push(`/g/${slug}/start`); return; }

    const bio = sessionStorage.getItem(`bio_${slug}`) || "";
    const qualities = JSON.parse(sessionStorage.getItem(`qualities_${slug}`) || "[]");
    const negatives = JSON.parse(sessionStorage.getItem(`negatives_${slug}`) || "[]");
    const name = sessionStorage.getItem(`name_${slug}`) || "";

    Promise.all([
      fetch(`/api/public/org/${slug}`).then((r) => r.json()),
      fetch("/api/public/profile-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, qualities, negatives, name }),
      }).then((r) => r.json()),
    ]).then(([orgData, summaryData]) => {
      setOrg(orgData);
      setSummary(summaryData);
      // Kleine vertraging voor de animatie
      setTimeout(() => setVisible(true), 100);
    });
  }, [slug, router]);

  function goToMatches() {
    router.push(`/g/${slug}/matches`);
  }

  if (!org || !summary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div
          className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#94a3b8", borderTopColor: "transparent" }}
        />
        <p className="text-gray-400 text-sm">We lezen je profiel…</p>
      </div>
    );
  }

  const icon = FAMILIE_ICON[summary.familie] || "✨";

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
      <div
        className={`max-w-sm w-full transition-all duration-700 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        {/* Org label */}
        <p
          className="text-xs font-medium uppercase tracking-widest text-center mb-10"
          style={{ color: org.primaryColor }}
        >
          {org.name}
        </p>

        {/* Opening */}
        <p className="text-sm text-gray-400 text-center mb-2 tracking-wide">Wij zien in jou iemand die</p>
        <h1 className="text-3xl font-bold text-gray-900 text-center leading-tight mb-8">
          {summary.openingszin}
        </h1>

        {/* Schets */}
        <div
          className="rounded-2xl p-6 mb-6 text-center"
          style={{ backgroundColor: org.primaryColor + "12" }}
        >
          <p className="text-gray-700 leading-relaxed text-[15px]">{summary.schets}</p>
        </div>

        {/* Familie */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Gave-familie</p>
              <p className="font-semibold text-gray-900">{summary.familie}</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 leading-relaxed">{summary.familieToelichting}</p>
        </div>

        {/* Bijbelvers */}
        <div className="text-center mb-10 px-4">
          <p className="text-gray-600 italic text-base leading-relaxed mb-1">
            &ldquo;{summary.bijbelvers}&rdquo;
          </p>
          <p className="text-xs text-gray-400">{summary.bijbelbron}</p>
        </div>

        {/* CTA */}
        <button
          onClick={goToMatches}
          className="w-full py-4 rounded-2xl font-bold text-white text-base transition-opacity hover:opacity-90 shadow-md"
          style={{ backgroundColor: org.primaryColor }}
        >
          Bekijk taken die bij mij passen
        </button>

        <p className="text-xs text-center text-gray-400 mt-4">
          De app heeft taken gezocht die aansluiten bij wie jij bent.
        </p>
      </div>
    </main>
  );
}
