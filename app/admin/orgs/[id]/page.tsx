"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

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
              { stap: "1", titel: "Taken instellen", tekst: "Voeg de vrijwilligerstaken van jouw organisatie toe. De app berekent automatisch welke eigenschappen bij elke taak passen.", color: "#2563eb" },
              { stap: "2", titel: "QR-code delen", tekst: "Deel de QR-code of link tijdens een dienst of bijeenkomst. Mensen scannen en vullen een korte vragenlijst in.", color: "#7c3aed" },
              { stap: "3", titel: "Matches & reacties", tekst: "De app koppelt mensen aan passende taken op basis van gaven en talenten. Jij ziet alle reacties hier en neemt contact op.", color: "#059669" },
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

        {/* Medewerkers uitnodigen */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Medewerkers uitnodigen</h2>
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
    </div>
  );
}
