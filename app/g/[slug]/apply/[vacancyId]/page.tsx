"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Org { name: string; primaryColor: string; }
interface Vacancy { title: string; firstStep: string | null; }

const RESPONSE_OPTIONS = [
  { value: "meedoen", label: "Ik wil meedoen" },
  { value: "meekijken", label: "Ik wil eerst meekijken" },
  { value: "contact", label: "Ik wil hierover contact" },
  { value: "vraag", label: "Ik heb een vraag" },
];

const FIRST_STEP_OPTIONS = [
  "Een keer meekijken",
  "Een keer meedraaien",
  "Gesprek met coördinator",
  "Proefperiode",
  "Direct op rooster",
  "Anders",
];

const AVAILABILITY_OPTIONS = [
  "Dat bespreek ik liever even",
  "Incidenteel",
  "Af en toe",
  "Ongeveer 1 keer per maand",
  "Ongeveer 1 keer per 6 weken",
  "Projectmatig",
];

export default function ApplyPage() {
  const { slug, vacancyId } = useParams<{ slug: string; vacancyId: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [responseType, setResponseType] = useState("meedoen");
  const [message, setMessage] = useState("");
  const [firstStepChoice, setFirstStepChoice] = useState("");
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/public/org/${slug}`).then((r) => r.json()),
      fetch(`/api/public/vacancies/${vacancyId}`).then((r) => r.json()),
    ]).then(([orgData, vacancyData]) => {
      setOrg(orgData);
      setVacancy(vacancyData);
    });
  }, [slug, vacancyId]);

  async function submit() {
    const participantId = sessionStorage.getItem(`participant_${slug}`);
    if (!participantId) { router.push(`/g/${slug}/start`); return; }

    setLoading(true);
    const qualities = JSON.parse(sessionStorage.getItem(`allQualities_${slug}`) || sessionStorage.getItem(`qualities_${slug}`) || "[]");

    const res = await fetch("/api/public/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId, vacancyId, responseType, message, firstStepChoice, availabilityNote,
        matchedQualities: qualities,
      }),
    });

    if (res.ok) {
      setDone(true);
    } else {
      setLoading(false);
      alert("Er ging iets mis. Probeer het opnieuw.");
    }
  }

  if (done && org && vacancy) {
    const name = typeof window !== "undefined" ? sessionStorage.getItem(`name_${slug}`) || "" : "";
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50">
        <div className="max-w-sm w-full">
          {/* Checkmark animatie */}
          <div className="flex justify-center mb-6">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg"
              style={{ backgroundColor: org.primaryColor }}
            >
              ✓
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">
            {name ? `Top, ${name.split(" ")[0]}!` : "Gelukt!"}
          </h1>
          <p className="text-gray-500 text-center text-sm mb-6">Je reactie is verstuurd.</p>

          {/* Samenvatting */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4 space-y-3">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Taak</p>
              <p className="font-semibold text-gray-900">{vacancy.title}</p>
            </div>
            {firstStepChoice && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Eerste stap</p>
                <p className="text-sm text-gray-700">{firstStepChoice}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Wat nu?</p>
              <p className="text-sm text-gray-700">
                {org.name} neemt contact met je op. Je ontvangt ook een bevestiging per e-mail.
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push(`/g/${slug}/matches`)}
            className="w-full py-3 rounded-xl text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
          >
            Andere taken bekijken
          </button>
        </div>
      </main>
    );
  }

  if (!org || !vacancy) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Laden…</p></div>;

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <button onClick={() => router.back()} className="text-sm text-gray-500 mb-4 hover:text-gray-700">← Terug</button>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: org.primaryColor }}>{vacancy.title}</p>
          <h1 className="text-xl font-bold text-gray-900">Mooi. Hoe wil je verder?</h1>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Mijn reactie</h2>
          <div className="space-y-2">
            {RESPONSE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setResponseType(o.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  responseType === o.value ? "border-2 text-white" : "border-gray-200 text-gray-700 hover:border-gray-400"
                }`}
                style={responseType === o.value ? { backgroundColor: org.primaryColor, borderColor: org.primaryColor } : {}}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Wat lijkt haalbaar als eerste stap?</h2>
          <div className="grid grid-cols-2 gap-2">
            {FIRST_STEP_OPTIONS.map((o) => (
              <button
                key={o}
                onClick={() => setFirstStepChoice(o)}
                className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  firstStepChoice === o ? "border-2 text-white" : "border-gray-200 text-gray-700 hover:border-gray-400"
                }`}
                style={firstStepChoice === o ? { backgroundColor: org.primaryColor, borderColor: org.primaryColor } : {}}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Hoeveel ruimte lijkt haalbaar?</h2>
          <div className="space-y-1">
            {AVAILABILITY_OPTIONS.map((o) => (
              <button
                key={o}
                onClick={() => setAvailabilityNote(o)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  availabilityNote === o ? "font-medium text-white" : "text-gray-700 hover:bg-gray-50"
                }`}
                style={availabilityNote === o ? { backgroundColor: org.primaryColor } : {}}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Eventuele opmerking of vraag</label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Stel een vraag of voeg een opmerking toe…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={submit} disabled={loading}
          className="w-full py-3.5 rounded-xl font-bold text-white text-base shadow-lg disabled:opacity-50 transition-opacity hover:opacity-90"
          style={{ backgroundColor: org.primaryColor }}
        >
          {loading ? "Versturen…" : "Verstuur mijn reactie"}
        </button>
      </div>
    </main>
  );
}
