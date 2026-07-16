"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface CoordinatorVacancy { id: string; title: string; }
interface Coordinator {
  id: string; name: string; email: string; status: string;
  vacancies: CoordinatorVacancy[];
}

interface Org {
  id: string;
  name: string;
  slug: string;
  publicCode: string;
  organizationType: string;
  place: string | null;
  primaryColor: string;
  welcomeText: string | null;
  contactEmail: string;
  vacancies: { id: string; title: string }[];
  _count: { participants: number; applications: number };
}

export default function OrgDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrUrl, setQrUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [msgCopied, setMsgCopied] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [pendingProposals, setPendingProposals] = useState(0);
  const [inviteError, setInviteError] = useState("");
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [showCoordModal, setShowCoordModal] = useState(false);
  const [coordForm, setCoordForm] = useState({ name: "", email: "", vacancyIds: [] as string[] });
  const [coordSaving, setCoordSaving] = useState(false);
  const [coordMsg, setCoordMsg] = useState("");
  const [coordInviteLink, setCoordInviteLink] = useState<string | null>(null);
  const [coordLinkCopied, setCoordLinkCopied] = useState(false);
  const [coordInviteId, setCoordInviteId] = useState<string | null>(null);
  const [coordEmailError, setCoordEmailError] = useState("");
  const [coordVacancyTitles, setCoordVacancyTitles] = useState<string[]>([]);
  const [editingCoord, setEditingCoord] = useState<Coordinator | null>(null);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = org ? `${appUrl}/g/${org.slug}` : "";

  useEffect(() => {
    fetch(`/api/admin/organizations/${id}`)
      .then((r) => {
        if (r.status === 401) { router.push("/admin/login"); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setOrg(data);
          setQrUrl(`/api/admin/organizations/${data.id}/qr`);
          fetch(`/api/admin/organizations/${data.id}/proposals`)
            .then((r) => r.ok ? r.json() : [])
            .then((proposals) => { if (Array.isArray(proposals)) setPendingProposals(proposals.length); })
            .catch(() => {});
          fetch(`/api/admin/organizations/${data.id}/coordinators`)
            .then((r) => r.ok ? r.json() : [])
            .then((list) => { if (Array.isArray(list)) setCoordinators(list); })
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function generateInvite() {
    if (!org) return;
    setGeneratingInvite(true);
    setInviteError("");
    try {
      const res = await fetch(`/api/admin/organizations/${org.id}/invite`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.token) {
        setInviteError(data.error || "Genereren mislukt, probeer opnieuw.");
        return;
      }
      const url = `${appUrl}/uitnodigen/${data.token}`;
      setInviteUrl(url);
      const takenLijst = org.vacancies.slice(0, 5).map((v) => `• ${v.title}`).join("\n");
      const meer = org.vacancies.length > 5 ? `\n• … en ${org.vacancies.length - 5} andere taken` : "";
      setInviteMsg(
        `Hoi!\n\nIk nodig je uit om de vacatures in de ${org.name} te bewerken of in te voegen.\n\nVia deze link kun je de taken bekijken en aanpassen:\n${url}\n\nDenk hierbij aan taken zoals:\n${takenLijst}${meer}\n\nJe wijzigingen worden eerst door mij goedgekeurd voor ze live gaan — geen zorgen dus als je iets aanpast.\n\nBedankt!`
      );
      setShowInviteModal(true);
    } catch {
      setInviteError("Netwerkfout, probeer opnieuw.");
    } finally {
      setGeneratingInvite(false);
    }
  }

  async function copyMsg() {
    await navigator.clipboard.writeText(inviteMsg);
    setMsgCopied(true);
    setTimeout(() => setMsgCopied(false), 2000);
  }

  async function shareViaApp() {
    if (navigator.share) {
      await navigator.share({ title: `Uitnodiging ${org?.name}`, text: inviteMsg });
    }
  }

  function shareViaMail() {
    const subject = encodeURIComponent(`Uitnodiging: taken bewerken voor ${org?.name}`);
    const body = encodeURIComponent(inviteMsg);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  async function addCoordinator() {
    if (!org) return;
    const email = coordForm.email.trim();
    if (!email) { setCoordEmailError("E-mailadres is verplicht"); return; }
    if (!email.includes("@") || !email.includes(".")) { setCoordEmailError("Voer een geldig e-mailadres in"); return; }
    setCoordEmailError("");
    setCoordSaving(true);
    const res = await fetch(`/api/admin/organizations/${org.id}/coordinators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coordForm),
    });
    const d = await res.json();
    if (d.id) {
      setCoordinators((prev) => [...prev, { ...d, vacancies: d.vacancies || [] }]);
      setCoordInviteLink(d.activateUrl || null);
      setCoordInviteId(d.id);
      setCoordVacancyTitles(d.vacancyTitles || []);
      setCoordLinkCopied(false);
    }
    setCoordSaving(false);
  }

  async function deleteCoordinator(coordId: string) {
    if (!confirm("Coördinator verwijderen?")) return;
    await fetch(`/api/admin/coordinators/${coordId}`, { method: "DELETE" });
    setCoordinators((prev) => prev.filter((c) => c.id !== coordId));
  }

  async function resendInvite(coordId: string) {
    await fetch(`/api/admin/coordinators/${coordId}`, { method: "POST" });
    setCoordMsg("Nieuwe uitnodigingslink verstuurd!");
    setTimeout(() => setCoordMsg(""), 3000);
  }

  function toggleVacancy(vacancyId: string) {
    setCoordForm((f) => ({
      ...f,
      vacancyIds: f.vacancyIds.includes(vacancyId)
        ? f.vacancyIds.filter((id) => id !== vacancyId)
        : [...f.vacancyIds, vacancyId],
    }));
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Laden…</p></div>;
  if (!org) return <div className="min-h-screen flex items-center justify-center"><p className="text-red-500">Niet gevonden</p></div>;

  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Uitnodigings-modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInviteModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: "90vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Uitnodigingsbericht</h2>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <p className="text-sm text-gray-500 mb-3">
                Pas het bericht aan en deel het via mail of een app. De ontvanger kan direct taken bewerken — zonder account.
              </p>
              <textarea
                value={inviteMsg}
                onChange={(e) => setInviteMsg(e.target.value)}
                rows={10}
                className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 text-gray-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              {inviteUrl && (
                <div className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
                  <span className="text-xs text-blue-500 flex-shrink-0">🔗</span>
                  <a
                    href={inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-700 underline truncate flex-1 hover:text-blue-900"
                  >
                    {inviteUrl}
                  </a>
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteUrl); }}
                    className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 font-medium"
                  >
                    Kopieer
                  </button>
                </div>
              )}
            </div>

            {/* Footer — acties */}
            <div className="px-6 py-4 border-t border-gray-100 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={shareViaMail}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700"
                >
                  <span>✉</span> Deel via mail
                </button>
                {canShare ? (
                  <button
                    onClick={shareViaApp}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700"
                  >
                    <span>↑</span> Deel via app
                  </button>
                ) : (
                  <button
                    onClick={copyMsg}
                    className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50"
                  >
                    {msgCopied ? "✓ Gekopieerd!" : "Kopieer bericht"}
                  </button>
                )}
              </div>
              {canShare && (
                <button
                  onClick={copyMsg}
                  className="w-full px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50"
                >
                  {msgCopied ? "✓ Gekopieerd!" : "Alleen link kopiëren"}
                </button>
              )}
              <button
                onClick={() => { setShowInviteModal(false); generateInvite(); }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
              >
                Nieuwe link genereren
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/admin/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: org.primaryColor }} />
          <h1 className="text-lg font-bold text-gray-900">{org.name}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Link href={`/admin/orgs/${org.id}/vacancies`} className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-blue-300 transition-colors">
            <div className="text-2xl font-bold text-gray-900">{org.vacancies.length}</div>
            <div className="text-sm text-blue-600 font-medium">Taken →</div>
          </Link>
          <Link href={`/admin/orgs/${org.id}/participants`} className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-blue-300 transition-colors">
            <div className="text-2xl font-bold text-gray-900">{org._count.participants}</div>
            <div className="text-sm text-blue-600 font-medium">Deelnemers →</div>
          </Link>
          <Link href={`/admin/orgs/${org.id}/applications`} className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:border-blue-300 transition-colors">
            <div className="text-2xl font-bold text-gray-900">{org._count.applications}</div>
            <div className="text-sm text-blue-600 font-medium">Reacties →</div>
          </Link>
        </div>

        {/* Hoe werkt het */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hoe werkt Gavenroute?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { stap: "1", titel: "Coördinatoren uitnodigen", tekst: "Voeg coördinatoren toe die hun eigen taken beheren via een persoonlijk dashboard. Zij houden vrijwilligers bij en sturen het rooster.", color: "#2563eb" },
              { stap: "2", titel: "QR-code delen", tekst: "Deel de QR-code of link tijdens een dienst of bijeenkomst. Mensen scannen en vullen een korte vragenlijst in.", color: "#7c3aed" },
              { stap: "3", titel: "Matches & reacties", tekst: "De app koppelt mensen aan passende taken op basis van gaven en talenten. Coördinatoren zien hun eigen reacties en nemen contact op.", color: "#059669" },
            ].map(({ stap, titel, tekst, color }) => (
              <div key={stap} className="flex gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: color }}>{stap}</div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{titel}</p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{tekst}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap gap-3 text-sm">
            <span className="text-gray-500">Snel naar:</span>
            <Link href={`/admin/orgs/${org.id}/vacancies/new`} className="text-blue-600 hover:underline">+ Taak toevoegen</Link>
            <span className="text-gray-300">·</span>
            <Link href={`/admin/orgs/${org.id}/applications`} className="text-blue-600 hover:underline">Reacties bekijken</Link>
            <span className="text-gray-300">·</span>
            <a href={`/g/${org.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Gebruikersroute testen →</a>
          </div>
        </div>

        {/* Coordinators — staat nu vóór redacteuren */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Coördinatoren</h2>
              <p className="text-sm text-gray-500 mt-0.5">Geef iemand toegang tot hun eigen taken via een eigen dashboard.</p>
            </div>
            <button onClick={() => { setCoordForm({ name: "", email: "", vacancyIds: [] }); setShowCoordModal(true); }}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              + Toevoegen
            </button>
          </div>

          {coordMsg && <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700">{coordMsg}</div>}

          {coordinators.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">Nog geen coördinatoren toegevoegd.</p>
          ) : (
            <div className="space-y-3">
              {coordinators.map((c) => (
                <div key={c.id} className="border border-gray-200 rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 text-sm">{c.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.status === "active" ? "bg-green-100 text-green-700" :
                          c.status === "invited" ? "bg-amber-100 text-amber-700" :
                          c.status === "pending" ? "bg-gray-100 text-gray-500" :
                          "bg-gray-100 text-gray-400"
                        }`}>{
                          c.status === "active" ? "Actief" :
                          c.status === "invited" ? "Uitgenodigd" :
                          c.status === "pending" ? "Aangemaakt" : "Inactief"
                        }</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{c.email}</p>
                      {c.vacancies.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">{c.vacancies.map((v) => v.title).join(", ")}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {c.status === "invited" && (
                        <button onClick={() => resendInvite(c.id)} className="text-xs text-blue-500 hover:underline">Opnieuw sturen</button>
                      )}
                      <button onClick={() => deleteCoordinator(c.id)} className="text-xs text-red-400 hover:text-red-600">Verwijderen</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Redacteuren uitnodigen (vroeger: Medewerkers) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Redacteuren uitnodigen</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Stuur een link naar iemand die taken mag bewerken — zonder account nodig.
                Jij keurt elke wijziging goed voor die live gaat.
              </p>
            </div>
            {pendingProposals > 0 && (
              <Link
                href={`/admin/orgs/${org.id}/voorstellen`}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-200"
              >
                <span className="bg-amber-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{pendingProposals}</span>
                Bekijk wijzigingen
              </Link>
            )}
          </div>

          <div className="flex gap-3 items-center">
            <button
              onClick={generateInvite}
              disabled={generatingInvite}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {generatingInvite ? "Genereren…" : inviteUrl ? "Nieuwe link genereren" : "Genereer uitnodigingsbericht"}
            </button>
            {inviteUrl && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-5 py-2.5 border border-blue-300 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50"
              >
                Bekijk bericht
              </button>
            )}
          </div>
          {inviteError && <p className="text-sm text-red-500 mt-2">{inviteError}</p>}
        </div>

        {/* QR / Deel route */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Vrijwilligers werven — deel jouw route</h2>
          <p className="text-sm text-gray-500 mb-5">
            Hang deze QR-code op of deel de link. Mensen scannen, vullen een korte vragenlijst in en worden
            automatisch gekoppeld aan een passende taak bij <strong>{org.name}</strong>.
          </p>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {qrUrl && (
              <div className="flex-shrink-0">
                <Image src={qrUrl} alt="QR-code" width={160} height={160} className="border border-gray-200 rounded-xl" unoptimized />
              </div>
            )}
            <div className="flex-1 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Publieke link</label>
                <div className="flex gap-2">
                  <input readOnly value={publicUrl} className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 bg-gray-50" />
                  <button onClick={copyLink} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                    {copied ? "✓ Gekopieerd" : "Kopieer"}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={`/api/admin/organizations/${org.id}/qr?format=png`} download={`qr-${org.slug}.png`} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Download QR (PNG)
                </a>
                <a href={`/api/admin/organizations/${org.id}/qr?format=svg`} download={`qr-${org.slug}.svg`} className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  Download QR (SVG)
                </a>
                <a href={`/g/${org.slug}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  Test gebruikersroute →
                </a>
              </div>
              <p className="text-xs text-gray-400">Code: {org.publicCode}</p>
            </div>
          </div>
        </div>

      </main>

      {/* Coordinator modal */}
      {showCoordModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowCoordModal(false); setCoordInviteLink(null); } }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">

            {!coordInviteLink ? (
              /* ── Stap 1: formulier ── */
              <>
                <h2 className="font-bold text-gray-900 mb-1">Coördinator toevoegen</h2>
                <p className="text-sm text-gray-500 mb-4">Vul de gegevens in — daarna krijg je een uitnodigingslink die je zelf kunt versturen.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Naam coördinator <span className="text-gray-400 font-normal">(optioneel)</span></label>
                    <input value={coordForm.name} onChange={(e) => setCoordForm((f) => ({ ...f, name: e.target.value }))} placeholder="bijv. Jan de Vries"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-xs text-gray-400 mt-1">Laat leeg — de coördinator vult dit zelf in bij registratie.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">E-mailadres *</label>
                    <input type="email" value={coordForm.email}
                      onChange={(e) => { setCoordForm((f) => ({ ...f, email: e.target.value })); setCoordEmailError(""); }}
                      placeholder="naam@kerk.nl"
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${coordEmailError ? "border-red-400" : "border-gray-300"}`} />
                    {coordEmailError
                      ? <p className="text-xs text-red-500 mt-1">{coordEmailError}</p>
                      : <p className="text-xs text-gray-400 mt-1">Nodig om in te loggen — je kiest zelf via welk kanaal je de link deelt.</p>}
                  </div>
                  {org.vacancies.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Koppel taken (optioneel):</p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {org.vacancies.map((v) => (
                          <label key={v.id} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={coordForm.vacancyIds.includes(v.id)} onChange={() => toggleVacancy(v.id)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span className="text-sm text-gray-700">{v.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={addCoordinator} disabled={coordSaving || !coordForm.email.trim()}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {coordSaving ? "Aanmaken…" : "Uitnodigingslink genereren"}
                  </button>
                  <button onClick={() => setShowCoordModal(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                    Annuleren
                  </button>
                </div>
              </>
            ) : (
              /* ── Stap 2: deel de link ── */
              <CoordShareStep
                link={coordInviteLink}
                name={coordForm.name}
                email={coordForm.email}
                orgName={org.name}
                orgId={org.id}
                coordId={coordInviteId!}
                vacancyTitles={coordVacancyTitles}
                onInviteSent={(coordId) => setCoordinators((prev) => prev.map((c) => c.id === coordId ? { ...c, status: "invited" } : c))}
                onClose={() => { setShowCoordModal(false); setCoordInviteLink(null); setCoordInviteId(null); setCoordVacancyTitles([]); setCoordForm({ name: "", email: "", vacancyIds: [] }); }}
              />
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ── Deel-scherm na aanmaken coördinator ─────────────────────────────
function CoordShareStep({ link, name, email, orgName, orgId, coordId, vacancyTitles, onInviteSent, onClose }: {
  link: string; name: string; email: string; orgName: string;
  orgId: string; coordId: string; vacancyTitles: string[];
  onInviteSent: (coordId: string) => void; onClose: () => void;
}) {
  const greeting = name ? `Hoi ${name},` : "Hoi,";
  const vacancyLine = vacancyTitles.length > 0
    ? `\nJe bent gevraagd als coördinator van: ${vacancyTitles.join(", ")}.\n`
    : "";
  const defaultMsg = `${greeting}\n\nJe bent uitgenodigd als coördinator bij ${orgName} via Gavenroute.${vacancyLine}\n\nVia deze rol beheer je vrijwilligers en vacatures in jouw eigen dashboard. Activeer je account via de link hieronder en stel een wachtwoord in.\n\nActiveer je account:\n${link}\n\nDe link is 30 dagen geldig.\n\nHartelijke groeten,\n${orgName}`;
  const [msg, setMsg] = useState(defaultMsg);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sent" | "error">("idle");

  function copyText() {
    navigator.clipboard.writeText(msg);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  function copyLink() {
    navigator.clipboard.writeText(link);
    setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000);
  }

  async function sendViaBrevo() {
    setEmailSending(true); setEmailStatus("idle");
    const res = await fetch(`/api/admin/organizations/${orgId}/coordinators/send-invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coordId,
        subject: `Uitnodiging coördinator — ${orgName}`,
        body: msg,
      }),
    });
    setEmailSending(false);
    setEmailStatus(res.ok ? "sent" : "error");
    if (res.ok) { onInviteSent(coordId); setTimeout(() => setEmailStatus("idle"), 4000); }
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const smsUrl = `sms:${email ? encodeURIComponent(email) : ""}?body=${encodeURIComponent(msg)}`;

  return (
    <>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-base">✓</div>
        <h2 className="font-bold text-gray-900">Coördinator aangemaakt</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">Pas de tekst aan en verstuur de uitnodiging via het kanaal naar keuze.</p>

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">Berichttekst — pas aan naar wens</label>
        <textarea rows={8} value={msg} onChange={(e) => setMsg(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono" />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* WhatsApp */}
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-[#25D366] text-white hover:bg-[#1ebe5d]">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.555 4.104 1.523 5.83L0 24l6.336-1.495A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.028-1.382l-.36-.214-3.732.88.937-3.636-.236-.374A9.818 9.818 0 1112 21.818z"/></svg>
          WhatsApp
        </a>

        {/* E-mail via Brevo */}
        <button onClick={sendViaBrevo} disabled={emailSending}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60 ${
            emailStatus === "sent" ? "bg-green-600 text-white" :
            emailStatus === "error" ? "bg-red-500 text-white" :
            "bg-blue-600 text-white hover:bg-blue-700"
          }`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          {emailSending ? "Versturen…" : emailStatus === "sent" ? "Verzonden!" : emailStatus === "error" ? "Mislukt" : "E-mail versturen"}
        </button>

        {/* SMS */}
        <a href={smsUrl}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-gray-700 text-white hover:bg-gray-800">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          Sms / iMessage
        </a>

        {/* Kopieer tekst */}
        <button onClick={copyText}
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-gray-500"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
          {copied ? "Gekopieerd!" : "Tekst kopiëren"}
        </button>
      </div>

      {emailStatus === "error" && (
        <p className="text-xs text-red-500 mb-3">E-mail versturen mislukt. Probeer WhatsApp of kopieer de tekst.</p>
      )}

      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
        <span className="text-xs text-gray-500 truncate flex-1">{link}</span>
        <button onClick={copyLink} className="text-xs font-medium text-blue-600 hover:text-blue-800 flex-shrink-0">
          {linkCopied ? "Gekopieerd!" : "Kopieer link"}
        </button>
      </div>

      <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
        Sluiten
      </button>
    </>
  );
}
