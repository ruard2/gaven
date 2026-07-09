"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { QUALITY_CATEGORIES } from "@/lib/qualities";

interface Match {
  vacancyId: string;
  title: string;
  category: string;
  shortDescription: string;
  whyValuable: string | null;
  score: number;
  stars: 1 | 2 | 3 | 4 | 5;
  matchedQualities: string[];
}

interface Org { name: string; primaryColor: string; }

const allQualities = QUALITY_CATEGORIES.flatMap((c) => c.qualities);

function Stars({ count, color }: { count: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className="w-4 h-4"
          viewBox="0 0 20 20"
          fill={i <= count ? color : "#e5e7eb"}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

const STAR_LABELS: Record<number, { label: string; color: string }> = {
  5: { label: "Sterke match", color: "#16a34a" },
  4: { label: "Goede match", color: "#2563eb" },
  3: { label: "Mogelijke match", color: "#7c3aed" },
  2: { label: "Kan jij doen", color: "#d97706" },
  1: { label: "Minder geschikt", color: "#9ca3af" },
};

export default function MatchesPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const participantId = sessionStorage.getItem(`participant_${slug}`);
    if (!participantId) { router.push(`/g/${slug}/start`); return; }

    const familieBonus = sessionStorage.getItem(`familieBonus_${slug}`) || "";

    Promise.all([
      fetch(`/api/public/org/${slug}`).then((r) => r.json()),
      fetch(`/api/public/matches?participantId=${participantId}&familieBonus=${encodeURIComponent(familieBonus)}`).then((r) => r.json()),
    ]).then(([orgData, matchData]) => {
      setOrg(orgData);
      setMatches(matchData.matches || []);
      setLoading(false);
    });
  }, [slug, router]);

  function qualityLabel(id: string) {
    return allQualities.find((q) => q.id === id)?.label || id;
  }

  if (loading || !org) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div
        className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: "#e5e7eb", borderTopColor: "#6b7280" }}
      />
      <p className="text-gray-400 text-sm">Taken worden geladen…</p>
    </div>
  );

  // Splits in sterke matches en de rest
  const strongMatches = matches.filter((m) => m.stars >= 3);
  const otherMatches = matches.filter((m) => m.stars < 3);

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: org.primaryColor }}>
          {org.name}
        </p>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Taken die bij jou kunnen passen</h1>
        <p className="text-sm text-gray-500 mb-6">
          {strongMatches.length > 0
            ? `${strongMatches.length} goede match${strongMatches.length !== 1 ? "es" : ""} gevonden.`
            : "Bekijk alle taken hieronder."}
        </p>

        {matches.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">We hebben nog geen taken gevonden die bij jou passen.</p>
            <p className="text-sm text-gray-400 mt-2">Neem contact op met {org.name}.</p>
          </div>
        ) : (
          <>
            {/* Sterke matches */}
            {strongMatches.length > 0 && (
              <div className="space-y-3 mb-6">
                {strongMatches.map((m) => (
                  <VacancyCard key={m.vacancyId} m={m} slug={slug} org={org} qualityLabel={qualityLabel} />
                ))}
              </div>
            )}

            {/* Overige matches */}
            {otherMatches.length > 0 && (
              <>
                {strongMatches.length > 0 && (
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                    Misschien ook interessant
                  </p>
                )}
                <div className="space-y-3">
                  {otherMatches.map((m) => (
                    <VacancyCard key={m.vacancyId} m={m} slug={slug} org={org} qualityLabel={qualityLabel} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Already a volunteer? */}
        <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-5 text-center">
          <p className="text-sm font-medium text-gray-700 mb-1">Ben je al actief als vrijwilliger?</p>
          <p className="text-xs text-gray-400 mb-3">Laat het weten zodat de coördinator het weet en je profiel compleet is.</p>
          <Link href={`/g/${slug}/doetal`}
            className="inline-block px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors hover:text-white"
            style={{ borderColor: org.primaryColor, color: org.primaryColor }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = org.primaryColor; (e.currentTarget as HTMLAnchorElement).style.color = "#fff"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = ""; (e.currentTarget as HTMLAnchorElement).style.color = org.primaryColor; }}>
            Ik doe al een taak →
          </Link>
        </div>
      </div>
    </main>
  );
}

function VacancyCard({
  m, slug, org, qualityLabel
}: {
  m: Match;
  slug: string;
  org: Org;
  qualityLabel: (id: string) => string;
}) {
  const starInfo = STAR_LABELS[m.stars];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{m.category}</span>
        <div className="flex flex-col items-end gap-0.5 ml-3 flex-shrink-0">
          <Stars count={m.stars} color={org.primaryColor} />
          <span className="text-xs" style={{ color: starInfo.color }}>{starInfo.label}</span>
        </div>
      </div>

      <h2 className="font-semibold text-gray-900 mt-1 mb-2">{m.title}</h2>
      <p className="text-sm text-gray-600 mb-3">{m.shortDescription}</p>

      {m.matchedQualities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {m.matchedQualities.slice(0, 3).map((qid) => (
            <span
              key={qid}
              className="text-xs px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: org.primaryColor + "cc" }}
            >
              {qualityLabel(qid)}
            </span>
          ))}
        </div>
      )}

      <Link
        href={`/g/${slug}/vacancy/${m.vacancyId}`}
        className="block w-full py-2.5 text-center rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: org.primaryColor }}
      >
        Bekijk taak
      </Link>
    </div>
  );
}
