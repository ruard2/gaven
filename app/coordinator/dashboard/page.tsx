"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

interface Participant { name: string; email: string; phone?: string | null; }
interface Application { id: string; responseType: string; status: string; createdAt: string; participant: Participant; }
interface Member { id: string; description?: string | null; createdAt: string; participant: { name: string; email: string }; }
interface Vacancy {
  id: string; title: string; category: string; shortDescription: string;
  status: string; whyValuable?: string | null; concreteTasks?: string | null; firstStep?: string | null;
  applications: Application[]; memberships: Member[];
}
interface Coordinator { id: string; name: string; email: string; organization: { name: string; slug: string; primaryColor: string }; }
interface OrgVacancy { id: string; title: string; category: string; assigned: boolean; taken: boolean; }

const RESPONSE_LABELS: Record<string, string> = {
  meedoen: "Wil meedoen", meekijken: "Wil meekijken", contact: "Wil contact", vraag: "Heeft een vraag",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Actief", color: "#16a34a" },
  inactive: { label: "Non-actief", color: "#d97706" },
  pending: { label: "In afwachting", color: "#7c3aed" },
};

const DEFAULT_INVITE_BODY = (coordName: string, orgName: string, vacancy?: Vacancy) =>
  vacancy
    ? `Hallo,\n\nIk nodig je graag uit om mee te doen met de taak "${vacancy.title}" bij ${orgName}.\n\n${vacancy.shortDescription ? vacancy.shortDescription + "\n\n" : ""}${vacancy.whyValuable ? "Waarom is dit waardevol?\n" + vacancy.whyValuable + "\n\n" : ""}Heb je interesse of wil je meer weten? Klik dan op de knop hieronder.\n\nMet vriendelijke groet,\n${coordName}`
    : `Hallo,\n\nIk nodig je graag uit om vrijwilliger te worden bij ${orgName}. Klik op de knop hieronder voor meer informatie over de beschikbare taken.\n\nMet vriendelijke groet,\n${coordName}`;

export default function CoordinatorDashboard() {
  const router = useRouter();
  const [coord, setCoord] = useState<Coordinator | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Vacancy>>({});
  const [transferEmail, setTransferEmail] = useState("");
  const [transferName, setTransferName] = useState("");
  const [showTransfer, setShowTransfer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showNewVacancy, setShowNewVacancy] = useState(false);
  const [newVacForm, setNewVacForm] = useState({ title: "", category: "", shortDescription: "", whyValuable: "", concreteTasks: "", firstStep: "" });

  // Assignment management
  const [showAssignments, setShowAssignments] = useState(false);
  const [orgVacancies, setOrgVacancies] = useState<OrgVacancy[]>([]);
  const [assignmentSel, setAssignmentSel] = useState<string[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  // Volunteer invite
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ to: "", subject: "", body: "", ctaLabel: "Ja, ik doe mee!", ctaUrl: "" });
  const [inviteSending, setInviteSending] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/coordinator/me").then((r) => r.json()),
      fetch("/api/coordinator/vacancies").then((r) => r.json()),
    ]).then(([c, v]) => {
      if (c.error) { router.push("/coordinator/login"); return; }
      setCoord(c);
      setVacancies(Array.isArray(v) ? v : []);
    }).finally(() => setLoading(false));
  }, [router]);

  function openInvite(vacancy?: Vacancy) {
    if (!coord) return;
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    setInviteForm({
      to: "",
      subject: vacancy
        ? `Uitnodiging: ${vacancy.title} bij ${coord.organization.name}`
        : `Uitnodiging: vrijwilligerswerk bij ${coord.organization.name}`,
      body: DEFAULT_INVITE_BODY(coord.name, coord.organization.name, vacancy),
      ctaLabel: "Ja, ik doe mee!",
      ctaUrl: `${baseUrl}/g/${coord.organization.slug}/matches`,
    });
    setShowInvite(true);
  }

  async function sendInvite() {
    if (!inviteForm.to.trim()) return;
    setInviteSending(true);
    const res = await fetch("/api/coordinator/invite-volunteer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteForm),
    });
    const d = await res.json();
    setInviteSending(false);
    if (d.ok) {
      setShowInvite(false);
      setMsg(`Uitnodiging verstuurd naar ${inviteForm.to}`);
      setTimeout(() => setMsg(""), 4000);
    } else {
      setMsg(d.error || "Versturen mislukt");
    }
  }

  async function openAssignments() {
    setShowAssignments(true);
    setLoadingAssignments(true);
    const data = await fetch("/api/coordinator/assignments").then((r) => r.json());
    setOrgVacancies(Array.isArray(data) ? data : []);
    setAssignmentSel((Array.isArray(data) ? data : []).filter((v: OrgVacancy) => v.assigned).map((v: OrgVacancy) => v.id));
    setLoadingAssignments(false);
  }

  function toggleAssignment(id: string) {
    setAssignmentSel((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function saveAssignments() {
    setSaving(true);
    const prevAssigned = orgVacancies.filter((v) => v.assigned).map((v) => v.id);
    const add = assignmentSel.filter((id) => !prevAssigned.includes(id));
    const remove = prevAssigned.filter((id) => !assignmentSel.includes(id));
    await fetch("/api/coordinator/assignments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ add, remove }),
    });
    const v = await fetch("/api/coordinator/vacancies").then((r) => r.json());
    setVacancies(Array.isArray(v) ? v : []);
    setShowAssignments(false);
    setSaving(false);
    setMsg("Coördinaties bijgewerkt");
    setTimeout(() => setMsg(""), 3000);
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/coordinator/vacancies/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setVacancies((prev) => prev.map((v) => v.id === id ? { ...v, status } : v));
  }

  async function deleteVacancy(id: string) {
    if (!confirm("Taak definitief verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    await fetch(`/api/coordinator/vacancies/${id}`, { method: "DELETE" });
    setVacancies((prev) => prev.filter((v) => v.id !== id));
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch(`/api/coordinator/vacancies/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setVacancies((prev) => prev.map((v) => v.id === id ? { ...v, ...editForm } : v));
    setEditingId(null); setSaving(false);
    setMsg("Wijzigingen opgeslagen");
    setTimeout(() => setMsg(""), 3000);
  }

  async function removeMember(vacancyId: string, participantEmail: string) {
    await fetch(`/api/coordinator/vacancies/${vacancyId}/members?participantId=${participantEmail}`, { method: "DELETE" });
    setVacancies((prev) => prev.map((v) =>
      v.id === vacancyId ? { ...v, memberships: v.memberships.filter((m) => m.participant.email !== participantEmail) } : v
    ));
  }

  async function handleTransfer() {
    if (!transferEmail.trim()) return;
    setSaving(true);
    await fetch("/api/coordinator/transfer", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail: transferEmail, newName: transferName }),
    });
    setShowTransfer(false);
    setMsg("Overdracht verstuurd! De nieuwe coördinator ontvangt een uitnodigingslink.");
    setTimeout(() => setMsg(""), 5000);
    setSaving(false);
  }

  async function createVacancy() {
    if (!newVacForm.title.trim() || !newVacForm.category || !newVacForm.shortDescription.trim()) return;
    setSaving(true);
    const res = await fetch("/api/coordinator/vacancies", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newVacForm),
    });
    const v = await res.json();
    if (v.id) {
      setVacancies((prev) => [v, ...prev]);
      setShowNewVacancy(false);
      setNewVacForm({ title: "", category: "", shortDescription: "", whyValuable: "", concreteTasks: "", firstStep: "" });
      setMsg("Taak aangemaakt!");
      setTimeout(() => setMsg(""), 3000);
    }
    setSaving(false);
  }

  async function logout() {
    await fetch("/api/coordinator/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400">Laden…</p></div>;

  const activeVacancies = vacancies.filter((v) => v.status === "active");
  const inactiveVacancies = vacancies.filter((v) => v.status !== "active");
  const availableForAssignment = orgVacancies.filter((v) => !v.taken);
  const takenByOther = orgVacancies.filter((v) => v.taken);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: coord?.organization.primaryColor }} />
              <span className="text-sm font-semibold text-gray-700">{coord?.organization.name}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Coördinator: {coord?.name}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button onClick={() => setShowNewVacancy(true)} className="text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg">
              + Nieuwe taak
            </button>
            <button onClick={() => openInvite()} className="text-xs text-gray-600 hover:text-gray-800 px-3 py-1.5 border border-gray-200 rounded-lg">
              ✉ Uitnodigen
            </button>
            <button onClick={openAssignments} className="text-xs text-gray-600 hover:text-gray-800 px-3 py-1.5 border border-gray-200 rounded-lg">
              Mijn coördinaties
            </button>
            <Link href="/coordinator/rooster" className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg">
              📋 Roosters
            </Link>
            <button onClick={() => setShowTransfer(true)} className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg">
              Overdragen
            </button>
            <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">Uitloggen</button>
          </div>
        </div>
      </header>

      {msg && (
        <div className="bg-green-50 border-b border-green-200 px-6 py-2 text-center text-sm text-green-700">{msg}</div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Actieve taken", value: activeVacancies.length },
            { label: "Aanmeldingen", value: vacancies.reduce((s, v) => s + v.applications.length, 0) },
            { label: "Huidige vrijwilligers", value: vacancies.reduce((s, v) => s + v.memberships.length, 0) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {vacancies.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            <p className="mb-1 font-medium text-gray-600">Nog geen taken gekoppeld aan jouw account.</p>
            <p className="mb-4 text-xs">Koppel bestaande taken of maak een nieuwe taak aan.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={openAssignments} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:border-blue-400">
                Taken koppelen
              </button>
              <button onClick={() => setShowNewVacancy(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                + Nieuwe taak aanmaken
              </button>
            </div>
          </div>
        ) : (
          <>
            {[
              { label: "Actieve taken", items: activeVacancies },
              { label: "Inactieve / gearchiveerde taken", items: inactiveVacancies },
            ].filter(({ items }) => items.length > 0).map(({ label, items }) => (
              <section key={label}>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{label}</h2>
                <div className="space-y-3">
                  {items.map((v) => (
                    <div key={v.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="p-4 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">{v.title}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{v.category}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ color: STATUS_LABELS[v.status]?.color || "#374151", backgroundColor: (STATUS_LABELS[v.status]?.color || "#374151") + "18" }}>
                              {STATUS_LABELS[v.status]?.label || v.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{v.shortDescription}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span>{v.applications.length} aanmeld{v.applications.length === 1 ? "ing" : "ingen"}</span>
                            <span>·</span>
                            <span>{v.memberships.length} vrijwilliger{v.memberships.length === 1 ? "" : "s"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => openInvite(v)}
                            className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 hover:border-blue-400 px-2 py-1 rounded-lg">
                            Uitnodigen
                          </button>
                          <button onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                            className="text-xs text-blue-500 hover:underline">
                            {expandedId === v.id ? "Sluiten" : "Openen"}
                          </button>
                        </div>
                      </div>

                      {expandedId === v.id && (
                        <div className="border-t border-gray-100 p-4 space-y-5 bg-gray-50">
                          {editingId === v.id ? (
                            <div className="space-y-3">
                              <h3 className="text-sm font-semibold text-gray-700">Taak bewerken</h3>
                              {[
                                { key: "title", label: "Naam", type: "input" },
                                { key: "shortDescription", label: "Korte omschrijving", type: "input" },
                                { key: "whyValuable", label: "Waarom waardevol?", type: "textarea" },
                                { key: "concreteTasks", label: "Wat doe je concreet?", type: "textarea" },
                                { key: "firstStep", label: "Eerste stap", type: "textarea" },
                              ].map(({ key, label, type }) => (
                                <div key={key}>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                                  {type === "input" ? (
                                    <input value={(editForm as Record<string, string>)[key] ?? ""}
                                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                  ) : (
                                    <textarea rows={3} value={(editForm as Record<string, string>)[key] ?? ""}
                                      onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                  )}
                                </div>
                              ))}
                              <div className="flex gap-2">
                                <button onClick={() => saveEdit(v.id)} disabled={saving}
                                  className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                  {saving ? "Opslaan…" : "Opslaan"}
                                </button>
                                <button onClick={() => setEditingId(null)} className="text-sm px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                                  Annuleren
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 flex-wrap">
                              <button onClick={() => { setEditingId(v.id); setEditForm({ title: v.title, shortDescription: v.shortDescription, whyValuable: v.whyValuable || "", concreteTasks: v.concreteTasks || "", firstStep: v.firstStep || "" }); }}
                                className="text-sm px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-blue-300 text-gray-700">
                                Bewerken
                              </button>
                              {v.status === "active" ? (
                                <button onClick={() => updateStatus(v.id, "inactive")}
                                  className="text-sm px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-amber-300 text-amber-600">
                                  Non-actief zetten
                                </button>
                              ) : (
                                <button onClick={() => updateStatus(v.id, "active")}
                                  className="text-sm px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-green-300 text-green-600">
                                  Activeren
                                </button>
                              )}
                              <button onClick={() => deleteVacancy(v.id)}
                                className="text-sm px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-red-300 text-red-500">
                                Verwijderen
                              </button>
                            </div>
                          )}

                          {v.applications.length > 0 && (
                            <div>
                              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Aanmeldingen</h3>
                              <div className="space-y-2">
                                {v.applications.map((a) => (
                                  <div key={a.id} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-gray-900 text-sm">{a.participant.name}</span>
                                      <span className="text-xs text-gray-400">{RESPONSE_LABELS[a.responseType] || a.responseType}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 mt-0.5">
                                      <a href={`mailto:${a.participant.email}`} className="text-blue-500 hover:underline">{a.participant.email}</a>
                                      {a.participant.phone && <span> · {a.participant.phone}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {v.memberships.length > 0 && (
                            <div>
                              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Huidige vrijwilligers</h3>
                              <div className="space-y-2">
                                {v.memberships.map((m) => (
                                  <div key={m.id} className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between">
                                    <div>
                                      <span className="font-medium text-gray-900 text-sm">{m.participant.name}</span>
                                      <div className="text-xs text-gray-400">
                                        <a href={`mailto:${m.participant.email}`} className="text-blue-500 hover:underline">{m.participant.email}</a>
                                      </div>
                                      {m.description && <p className="text-xs text-gray-500 mt-0.5 italic">"{m.description}"</p>}
                                    </div>
                                    <button onClick={() => removeMember(v.id, m.participant.email)}
                                      className="text-xs text-red-400 hover:text-red-600 ml-4">Verwijderen</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </main>

      {/* Uitnodiging modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowInvite(false); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h2 className="font-bold text-gray-900 mb-1">Iemand uitnodigen</h2>
            <p className="text-sm text-gray-500 mb-5">Stuur een persoonlijke uitnodiging. Pas de tekst aan naar wens.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Aan (e-mailadres) *</label>
                <input type="email" value={inviteForm.to} onChange={(e) => setInviteForm((f) => ({ ...f, to: e.target.value }))}
                  placeholder="naam@kerk.nl"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Onderwerp</label>
                <input value={inviteForm.subject} onChange={(e) => setInviteForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Berichttekst</label>
                <textarea rows={8} value={inviteForm.body} onChange={(e) => setInviteForm((f) => ({ ...f, body: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Knoptekst in mail</label>
                  <input value={inviteForm.ctaLabel} onChange={(e) => setInviteForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                    placeholder="Ja, ik doe mee!"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Knop verwijst naar</label>
                  <input value={inviteForm.ctaUrl} onChange={(e) => setInviteForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              {inviteForm.ctaLabel && inviteForm.ctaUrl && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <span className="text-xs text-gray-400 block mb-2">Voorbeeld knop in e-mail:</span>
                  <span className="inline-block bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg">
                    {inviteForm.ctaLabel}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={sendInvite} disabled={inviteSending || !inviteForm.to.trim()}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {inviteSending ? "Versturen…" : "Uitnodiging versturen"}
              </button>
              <button onClick={() => setShowInvite(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mijn coördinaties modal */}
      {showAssignments && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAssignments(false); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
            <h2 className="font-bold text-gray-900 mb-1">Mijn coördinaties beheren</h2>
            <p className="text-sm text-gray-500 mb-4">Vink aan welke taken jij coördineert.</p>
            {loadingAssignments ? (
              <p className="text-sm text-gray-400 py-4 text-center">Laden…</p>
            ) : availableForAssignment.length === 0 && takenByOther.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Er zijn nog geen taken in deze organisatie.</p>
            ) : (
              <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {availableForAssignment.map((v) => (
                  <label key={v.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={assignmentSel.includes(v.id)} onChange={() => toggleAssignment(v.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-800 block">{v.title}</span>
                      <span className="text-xs text-gray-400">{v.category}</span>
                    </div>
                  </label>
                ))}
                {takenByOther.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 px-4 py-3 opacity-40">
                    <input type="checkbox" disabled checked={false} className="rounded border-gray-300" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-500 block">{v.title}</span>
                      <span className="text-xs text-gray-400">{v.category} · al gekoppeld aan andere coördinator</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
              <button onClick={saveAssignments} disabled={saving || loadingAssignments}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Opslaan…" : "Opslaan"}
              </button>
              <button onClick={() => setShowAssignments(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overdragen modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-gray-900 mb-1">Coördinatorrol overdragen</h2>
            <p className="text-sm text-gray-500 mb-4">De nieuwe coördinator ontvangt een uitnodigingslink per e-mail.</p>
            <div className="space-y-3">
              <input value={transferName} onChange={(e) => setTransferName(e.target.value)} placeholder="Naam nieuwe coördinator"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="email" value={transferEmail} onChange={(e) => setTransferEmail(e.target.value)} placeholder="E-mail nieuwe coördinator"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleTransfer} disabled={saving || !transferEmail.trim()}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Versturen…" : "Overdragen"}
              </button>
              <button onClick={() => setShowTransfer(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nieuwe taak modal */}
      {showNewVacancy && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewVacancy(false); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-bold text-gray-900 mb-4">Nieuwe taak aanmaken</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Naam taak *</label>
                <input value={newVacForm.title} onChange={(e) => setNewVacForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="bijv. Muzikant, Kinderoppas, Koster"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categorie *</label>
                <select value={newVacForm.category} onChange={(e) => setNewVacForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Kies een categorie —</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Korte omschrijving *</label>
                <input value={newVacForm.shortDescription} onChange={(e) => setNewVacForm((f) => ({ ...f, shortDescription: e.target.value }))}
                  placeholder="Wat houdt de taak in?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Waarom waardevol?</label>
                <textarea rows={2} value={newVacForm.whyValuable} onChange={(e) => setNewVacForm((f) => ({ ...f, whyValuable: e.target.value }))}
                  placeholder="Wat maakt deze taak de moeite waard?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Wat doe je concreet?</label>
                <textarea rows={2} value={newVacForm.concreteTasks} onChange={(e) => setNewVacForm((f) => ({ ...f, concreteTasks: e.target.value }))}
                  placeholder="Beschrijf de concrete taken"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Eerste stap</label>
                <input value={newVacForm.firstStep} onChange={(e) => setNewVacForm((f) => ({ ...f, firstStep: e.target.value }))}
                  placeholder="Hoe begin je als nieuwe vrijwilliger?"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={createVacancy}
                disabled={saving || !newVacForm.title.trim() || !newVacForm.category || !newVacForm.shortDescription.trim()}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Aanmaken…" : "Taak aanmaken"}
              </button>
              <button onClick={() => setShowNewVacancy(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
