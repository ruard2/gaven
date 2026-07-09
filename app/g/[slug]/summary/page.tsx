"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getGiftsForFamilie } from "@/lib/gifts";

interface Org { name: string; primaryColor: string; }

interface Summary {
  openingszin: string;
  schets: string;
  highlights: string[];
  familie: string;
  familieToelichting: string;
  bijbelvers: string;
  bijbelbron: string;
  qualityLabels: string[];
  workbio: string | null;
}

const FAMILIE_ICON: Record<string, string> = {
  "Woord & waarheid":     "📖",
  "Zorg & aanwezigheid":  "🤝",
  "Richting & structuur": "🧭",
};

const FAMILIE_COLOR: Record<string, string> = {
  "Woord & waarheid":     "#7c3aed",
  "Zorg & aanwezigheid":  "#0369a1",
  "Richting & structuur": "#065f46",
};

export default function SummaryPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [visible, setVisible] = useState(false);
  const [showAllGifts, setShowAllGifts] = useState(false);

  useEffect(() => {
    const participantId = sessionStorage.getItem(`participant_${slug}`);
    if (!participantId) { router.push(`/g/${slug}/start`); return; }

    const bio         = sessionStorage.getItem(`bio_${slug}`) || "";
    const workbio     = sessionStorage.getItem(`workbio_${slug}`) || "";
    const qualities   = JSON.parse(sessionStorage.getItem(`qualities_${slug}`) || "[]");
    const allQualityIds = JSON.parse(sessionStorage.getItem(`allQualities_${slug}`) || "[]");
    const negatives   = JSON.parse(sessionStorage.getItem(`negatives_${slug}`) || "[]");
    const name        = sessionStorage.getItem(`name_${slug}`) || "";
    const familieBonus = sessionStorage.getItem(`familieBonus_${slug}`) || "";

    Promise.all([
      fetch(`/api/public/org/${slug}`).then((r) => r.json()),
      fetch("/api/public/profile-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, workbio, qualities, allQualityIds, negatives, name, familieBonus }),
      }).then((r) => r.json()),
    ]).then(([orgData, summaryData]) => {
      setOrg(orgData);
      setSummary(summaryData);
      setTimeout(() => setVisible(true), 80);
    });
  }, [slug, router]);

  if (!org || !summary) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#cbd5e1", borderTopColor: "#64748b" }} />
        <p className="text-gray-400 text-sm">Jouw profiel wordt samengesteld…</p>
      </div>
    );
  }

  const familieIcon    = FAMILIE_ICON[summary.familie]  || "✨";
  const familieColor   = FAMILIE_COLOR[summary.familie] || "#374151";
  const highlights     = summary.highlights?.length ? summary.highlights : [];
  const chips          = summary.qualityLabels?.slice(0, 12) ?? [];
  const biblicalFamily = getGiftsForFamilie(summary.familie);
  const giftsToShow    = showAllGifts
    ? (biblicalFamily?.gifts ?? [])
    : (biblicalFamily?.gifts.slice(0, 3) ?? []);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-5">
      <div
        className={`max-w-sm mx-auto transition-all duration-700 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        }`}
      >
        {/* Org label */}
        <p className="text-xs font-semibold uppercase tracking-widest text-center mb-8"
          style={{ color: org.primaryColor }}>
          {org.name}
        </p>

        {/* Gave-familie — bovenaan als eyecatcher */}
        <div
          className="rounded-2xl p-5 mb-6 flex items-start gap-4"
          style={{ backgroundColor: familieColor + "12", border: `1px solid ${familieColor}22` }}
        >
          <span className="text-3xl leading-none mt-0.5">{familieIcon}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5"
              style={{ color: familieColor }}>
              Gave-familie
            </p>
            <p className="font-bold text-gray-900 text-base">{summary.familie}</p>
            <p className="text-sm text-gray-500 mt-1 leading-snug">{summary.familieToelichting}</p>
          </div>
        </div>

        {/* Opening */}
        <p className="text-xs text-gray-400 text-center mb-1 tracking-wide uppercase">Wij zien in jou</p>
        <h1 className="text-2xl font-bold text-gray-900 text-center leading-tight mb-2">
          {summary.openingszin}
        </h1>

        {/* Werkachtergrond als subtekst */}
        {summary.workbio && (
          <p className="text-center text-sm text-gray-400 mb-6 italic">{summary.workbio}</p>
        )}

        {/* Highlights chips */}
        {highlights.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {highlights.map((h, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: org.primaryColor }}
              >
                {h}
              </span>
            ))}
          </div>
        )}

        {/* Karakterschets */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{ backgroundColor: org.primaryColor + "0e" }}
        >
          <p className="text-gray-700 leading-relaxed text-[15px]">{summary.schets}</p>
        </div>

        {/* Bijbelse gaven */}
        {biblicalFamily && (
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-center mb-3"
              style={{ color: familieColor }}>
              {biblicalFamily.label}e gaven — herken je dit?
            </p>
            <div className="space-y-2">
              {giftsToShow.map((gift) => (
                <div
                  key={gift.id}
                  className="rounded-xl px-4 py-3"
                  style={{ backgroundColor: familieColor + "0d", border: `1px solid ${familieColor}1a` }}
                >
                  <p className="font-semibold text-gray-900 text-sm">{gift.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-snug">{gift.description}</p>
                  <p className="text-[11px] mt-1 font-medium" style={{ color: familieColor + "bb" }}>
                    {gift.scripture}
                  </p>
                </div>
              ))}
            </div>
            {(biblicalFamily.gifts.length > 3) && (
              <button
                onClick={() => setShowAllGifts((v) => !v)}
                className="mt-2 w-full text-xs py-2 rounded-xl transition-colors"
                style={{ color: familieColor, backgroundColor: familieColor + "0a" }}
              >
                {showAllGifts
                  ? "Toon minder"
                  : `Toon alle ${biblicalFamily.gifts.length} ${biblicalFamily.label.toLowerCase()}e gaven`}
              </button>
            )}
          </div>
        )}

        {/* Alle gaven als kleine chips */}
        {chips.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 text-center">
              Jouw gaven
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {chips.map((label, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full text-xs border"
                  style={{ color: org.primaryColor, borderColor: org.primaryColor + "55", backgroundColor: org.primaryColor + "0a" }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bijbelvers */}
        <div className="text-center mb-8 px-4">
          <p className="text-gray-600 italic text-base leading-relaxed mb-1">
            &ldquo;{summary.bijbelvers}&rdquo;
          </p>
          <p className="text-xs text-gray-400">{summary.bijbelbron}</p>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push(`/g/${slug}/matches`)}
          className="w-full py-4 rounded-2xl font-bold text-white text-base transition-opacity hover:opacity-90 shadow-sm"
          style={{ backgroundColor: org.primaryColor }}
        >
          Bekijk taken die bij mij passen →
        </button>

        <p className="text-xs text-center text-gray-400 mt-3">
          We hebben taken gevonden die aansluiten bij wie jij bent.
        </p>
      </div>
    </main>
  );
}
