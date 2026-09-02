"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface Org {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
}

const SITUATIES: { id: string; label: string; vraag: string; placeholder: string }[] = [
  { id: "school", label: "Ik zit op school", vraag: "Wat vind je op school leuk om te doen?", placeholder: "bijv. techniek, sport, tekenen, met mensen omgaan…" },
  { id: "studie", label: "Ik studeer", vraag: "Wat studeer je?", placeholder: "bijv. pedagogiek, werktuigbouwkunde, verpleegkunde…" },
  { id: "werk", label: "Ik werk", vraag: "Wat voor werk doe je?", placeholder: "bijv. ik ben verpleegkundige / timmerman / boekhouder…" },
  { id: "pensioen", label: "Ik ben gepensioneerd", vraag: "Wat heb je gedaan, en wat doe je nu graag?", placeholder: "bijv. jaren leraar geweest, nu graag in de tuin en met kleinkinderen…" },
  { id: "anders", label: "Anders", vraag: "Vertel kort wat je doet", placeholder: "bijv. ik zorg thuis voor de kinderen…" },
];

export default function StartPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [situatie, setSituatie] = useState("");
  const [situatieDetail, setSituatieDetail] = useState("");
  const [interesses, setInteresses] = useState("");
  const [alDoet, setAlDoet] = useState("");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/org/${slug}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setOrg(d));
  }, [slug]);

  const gekozen = SITUATIES.find((s) => s.id === situatie);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!org) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/public/participants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: org.id, name, email, phone, birthYear: birthYear ? Number(birthYear) : null }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Er ging iets mis");
      setLoading(false);
      return;
    }

    // Werk/studie/situatie -> workbio (voor de werk-afleiding)
    const workbio = gekozen
      ? `${gekozen.label}${situatieDetail.trim() ? ": " + situatieDetail.trim() : ""}`
      : situatieDetail.trim();
    // Interesses + wat iemand al doet + overige info -> bio (voor de bio-afleiding)
    const bioParts = [
      interesses.trim() && `Wat ik leuk vind: ${interesses.trim()}`,
      alDoet.trim() && `Wat ik al doe: ${alDoet.trim()}`,
      extra.trim() && extra.trim(),
    ].filter(Boolean);
    const bio = bioParts.join(". ");

    sessionStorage.setItem(`participant_${slug}`, data.participantId);
    sessionStorage.setItem(`bio_${slug}`, bio);
    sessionStorage.setItem(`workbio_${slug}`, workbio);
    sessionStorage.setItem(`name_${slug}`, name);
    router.push(`/g/${slug}/profile/qualities`);
  }

  if (!org) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Laden…</p>
    </div>
  );

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <main className="min-h-screen flex flex-col items-center py-8 px-6 bg-gray-50">
      <div className="max-w-sm w-full">
        <p className="text-xs font-medium uppercase tracking-wide mb-1 text-center" style={{ color: org.primaryColor }}>
          {org.name}
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">Vertel iets over jezelf</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Hoe meer je invult, hoe beter we passende taken vinden.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Naam <span className="text-red-500">*</span></label>
            <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jouw naam" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mailadres <span className="text-red-500">*</span></label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="naam@voorbeeld.nl" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefoon <span className="text-gray-400">(optie)</span></label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06 - …" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geboortejaar <span className="text-gray-400">(optie)</span></label>
              <input type="number" inputMode="numeric" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} min={1900} max={new Date().getFullYear()} placeholder="1998" className={inputCls} />
            </div>
          </div>

          {/* Situatie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Wat is je situatie?</label>
            <div className="grid grid-cols-2 gap-2">
              {SITUATIES.map((s) => (
                <button type="button" key={s.id} onClick={() => setSituatie(s.id)}
                  className={`text-left text-sm px-3 py-2 rounded-lg border transition-colors ${situatie === s.id ? "border-blue-600 bg-blue-50 text-blue-700 font-medium" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {gekozen && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{gekozen.vraag}</label>
              <input type="text" value={situatieDetail} onChange={(e) => setSituatieDetail(e.target.value)} placeholder={gekozen.placeholder} spellCheck lang="nl" className={inputCls} />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wat lijkt je leuk om te doen?</label>
            <textarea rows={2} value={interesses} onChange={(e) => setInteresses(e.target.value)} spellCheck lang="nl"
              placeholder="bijv. praktisch helpen, met kinderen, organiseren, muziek, mensen ontvangen…" className={inputCls + " resize-none"} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wat doe je al? <span className="text-gray-400">(optioneel)</span></label>
            <input type="text" value={alDoet} onChange={(e) => setAlDoet(e.target.value)} spellCheck lang="nl"
              placeholder="bijv. ik help al bij de koffie / niets in de kerk" className={inputCls} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nog iets dat we moeten weten? <span className="text-gray-400">(optioneel)</span></label>
            <input type="text" value={extra} onChange={(e) => setExtra(e.target.value)} spellCheck lang="nl"
              placeholder="bijv. ik ben alleen op zondag beschikbaar" className={inputCls} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: org.primaryColor }}>
            {loading ? "Even geduld…" : "Verder"}
          </button>
        </form>
      </div>
    </main>
  );
}
