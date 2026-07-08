"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { QUALITY_CATEGORIES } from "@/lib/qualities";

interface Vacancy {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  longDescription: string | null;
  whyValuable: string | null;
  concreteTasks: string | null;
  firstStep: string | null;
  contactPersonName: string;
  qualityWeights: { qualityId: string; weight: number }[];
  organization: { name: string; primaryColor: string };
}

const allQualities = QUALITY_CATEGORIES.flatMap((c) => c.qualities);

export default function VacancyDetail() {
  const { slug, vacancyId } = useParams<{ slug: string; vacancyId: string }>();
  const router = useRouter();
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/vacancies/${vacancyId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setVacancy(d); setLoading(false); });
  }, [vacancyId]);

  function apply() {
    const participantId = sessionStorage.getItem(`participant_${slug}`);
    if (!participantId) { router.push(`/g/${slug}/start`); return; }
    router.push(`/g/${slug}/apply/${vacancyId}`);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Laden…</p></div>;
  if (!vacancy) return <div className="p-8 text-red-500">Taak niet gevonden.</div>;

  const color = vacancy.organization.primaryColor;
  const topQualities = vacancy.qualityWeights
    .filter((qw) => qw.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((qw) => ({ ...qw, label: allQualities.find((q) => q.id === qw.qualityId)?.label || qw.qualityId }));

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <button onClick={() => router.back()} className="text-sm text-gray-500 mb-4 hover:text-gray-700">← Terug</button>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-4">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{vacancy.category}</span>
          <h1 className="text-xl font-bold text-gray-900 mt-2 mb-1">{vacancy.title}</h1>
          <p className="text-gray-600 text-sm">{vacancy.shortDescription}</p>
        </div>

        {vacancy.whyValuable && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-3">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Waarom is dit waardevol?</h2>
            <p className="text-sm text-gray-600">{vacancy.whyValuable}</p>
          </div>
        )}

        {vacancy.concreteTasks && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-3">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Wat doe je concreet?</h2>
            <p className="text-sm text-gray-600">{vacancy.concreteTasks}</p>
          </div>
        )}

        {vacancy.firstStep && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-3">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Goede eerste stap</h2>
            <p className="text-sm text-gray-600">{vacancy.firstStep}</p>
          </div>
        )}

        {topQualities.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Kwaliteiten die passen bij deze taak</h2>
            <div className="flex flex-wrap gap-2">
              {topQualities.map((q) => (
                <div key={q.qualityId} className="flex items-center gap-1.5">
                  <div className="h-1.5 rounded-full w-12 bg-gray-200 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${q.weight}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-xs text-gray-600">{q.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sticky bottom-4 space-y-2">
          <button
            onClick={apply}
            className="w-full py-3.5 rounded-xl font-bold text-white text-lg shadow-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: color }}
          >
            Ja, dit is voor mij
          </button>
          <Link
            href={`/g/${slug}/matches`}
            className="block w-full py-2.5 rounded-xl text-center text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50"
          >
            Andere taken bekijken
          </Link>
        </div>
      </div>
    </main>
  );
}
