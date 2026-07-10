"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
interface RosterEntry { id: string; name: string; email?: string | null; date?: string | null; role?: string | null; notes?: string | null; }
interface Roster { id: string; vacancyId?: string | null; title: string; reminderDays: number; entries: RosterEntry[]; }

const RESPONSE_LABELS: Record<string, string> = {
  meedoen: "Wil meedoen", meekijken: "Wil meekijken", contact: "Wil contact", vraag: "Heeft een vraag",
};
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Actief", color: "#16a34a" },
  inactive: { label: "Non-actief", color: "#d97706" },
  pending: { label: "In afwachting", color: "#7c3aed" },
};

export default function CoordinatorDashboard() {
  const router = useRouter();
  const [coord, setCoord] = useState<Coordinator | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Vacatures blok
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Vacancy>>({});

  // Taken beheren blok
  const [expandedBeheer, setExpandedBeheer] = useState<string | null>(null);
  const [addMemberForm, setAddMemberForm] = useState<Record<string, { name: string; email: string }>>({});
  const [addingMember, setAddingMember] = useState<string | null>(null);
  const [addRosterEntryForm, setAddRosterEntryForm] = useState<Record<string, { name: string; email: string; date: string; role: string }>>({});
  const [addingRosterEntry, setAddingRosterEntry] = useState<string | null>(null);
  const [creatingRoster, setCreatingRoster] = useState<string | null>(null);

  // Instellingen modal
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"coordinaties" | "overdragen">("coordinaties");
  const [orgVacancies, setOrgVacancies] = useState<OrgVacancy[]>([]);
  const [assignmentSel, setAssignmentSel] = useState<string[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");
  const [transferName, setTransferName] = useState("");

  // Uitnodiging
  const [showInvite, setShowInvite] = useState(false);
  const [inviteVacancy, setInviteVacancy] = useState<Vacancy | null>(null);
  const [inviteForm, setInviteForm] = useState({ to: "", subject: "", body: "", ctaLabel: "Ja, ik doe mee!" });
  const [inviteSending, setInviteSending] = useState(false);

  // Nieuwe vacature
  const [showNewVacancy, setShowNewVacancy] = useState(false);
  const [newVacForm, setNewVacForm] = useState({ title: "", category: "", shortDescription: "", whyValuable: "", concreteTasks: "", firstStep: "" });

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 4000); }

  useEffect(() => {
    Promise.all([
      fetch("/api/coordinator/me").then((r) => r.json()),
      fetch("/api/coordinator/vacancies").then((r) => r.json()),
      fetch("/api/coordinator/rosters").then((r) => r.json()),
    ]).then(([c, v, rs]) => {
      if (c.error) { router.push("/"); return; }
      setCoord(c);
      setVacancies(Array.isArray(v) ? v : []);
      setRosters(Array.isArray(rs) ? rs : []);
    }).finally(() => setLoading(false));
  }, [router]);

  // ── Vacatures beheren ────────────────────────────────────────────────
  function startEdit(v: Vacancy) {
    setEditingId(v.id);
    setEditForm({ title: v.title, shortDescription: v.shortDescription, whyValuable: v.whyValuable || "", concreteTasks: v.concreteTasks || "", firstStep: v.firstStep || "" });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    await fetch(`/api/coordinator/vacancies/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    setVacancies((prev) => prev.map((v) => v.id === id ? { ...v, ...editForm } : v));
    setEditingId(null); setSaving(false);
    flash("Vacature opgeslagen");
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/coordinator/vacancies/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    setVacancies((prev) => prev.map((v) => v.id === id ? { ...v, status } : v));
  }

  async function deleteVacancy(id: string) {
    if (!confirm("Vacature definitief verwijderen?")) return;
    await fetch(`/api/coordinator/vacancies/${id}`, { method: "DELETE" });
    setVacancies((prev) => prev.filter((v) => v.id !== id));
  }

  async function createVacancy() {
    if (!newVacForm.title.trim() || !newVacForm.category || !newVacForm.shortDescription.trim()) return;
    setSaving(true);
    const res = await fetch("/api/coordinator/vacancies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newVacForm) });
    const v = await res.json();
    if (v.id) {
      setVacancies((prev) => [v, ...prev]);
      setShowNewVacancy(false);
      setNewVacForm({ title: "", category: "", shortDescription: "", whyValuable: "", concreteTasks: "", firstStep: "" });
      flash("Vacature aangemaakt");
    }
    setSaving(false);
  }

  // ── Vrijwilligers beheren ─────────────────────────────────────────────
  async function addMember(vacancyId: string) {
    const form = addMemberForm[vacancyId];
    if (!form?.name?.trim() || !form?.email?.trim()) return;
    setAddingMember(vacancyId);
    const res = await fetch(`/api/coordinator/vacancies/${vacancyId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const m = await res.json();
    if (m.id) {
      setVacancies((prev) => prev.map((v) => v.id === vacancyId ? { ...v, memberships: [...v.memberships, m] } : v));
      setAddMemberForm((prev) => ({ ...prev, [vacancyId]: { name: "", email: "" } }));
    }
    setAddingMember(null);
  }

  async function removeMember(vacancyId: string, membershipId: string) {
    await fetch(`/api/coordinator/vacancies/${vacancyId}/members?membershipId=${membershipId}`, { method: "DELETE" });
    setVacancies((prev) => prev.map((v) => v.id === vacancyId ? { ...v, memberships: v.memberships.filter((m) => m.id !== membershipId) } : v));
  }

  // ── Roster beheren ────────────────────────────────────────────────────
  async function createRoster(vacancyId: string, title: string) {
    setCreatingRoster(vacancyId);
    const res = await fetch("/api/coordinator/rosters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vacancyId, title }) });
    const r = await res.json();
    if (r.id) setRosters((prev) => [...prev, r]);
    setCreatingRoster(null);
  }

  async function addRosterEntry(rosterId: string, vacancyId: string) {
    const form = addRosterEntryForm[vacancyId];
    if (!form?.name?.trim()) return;
    setAddingRosterEntry(vacancyId);
    const res = await fetch(`/api/coordinator/rosters/${rosterId}/entries`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email || null, date: form.date || null, role: form.role || null }),
    });
    const entry = await res.json();
    if (entry.id) {
      setRosters((prev) => prev.map((r) => r.id === rosterId ? { ...r, entries: [...r.entries, entry] } : r));
      setAddRosterEntryForm((prev) => ({ ...prev, [vacancyId]: { name: "", email: "", date: "", role: "" } }));
    }
    setAddingRosterEntry(null);
  }

  async function deleteRosterEntry(rosterId: string, entryId: string) {
    await fetch(`/api/coordinator/rosters/${rosterId}/entries/${entryId}`, { method: "DELETE" });
    setRosters((prev) => prev.map((r) => r.id === rosterId ? { ...r, entries: r.entries.filter((e) => e.id !== entryId) } : r));
  }

  // ── Instellingen ──────────────────────────────────────────────────────
  async function openSettings() {
    setShowSettings(true); setSettingsTab("coordinaties"); setLoadingAssignments(true);
    const data = await fetch("/api/coordinator/assignments").then((r) => r.json());
    setOrgVacancies(Array.isArray(data) ? data : []);
    setAssignmentSel((Array.isArray(data) ? data : []).filter((v: OrgVacancy) => v.assigned).map((v: OrgVacancy) => v.id));
    setLoadingAssignments(false);
  }

  async function saveAssignments() {
    setSaving(true);
    const prevAssigned = orgVacancies.filter((v) => v.assigned).map((v) => v.id);
    await fetch("/api/coordinator/assignments", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ add: assignmentSel.filter((id) => !prevAssigned.includes(id)), remove: prevAssigned.filter((id) => !assignmentSel.includes(id)) }),
    });
    const v = await fetch("/api/coordinator/vacancies").then((r) => r.json());
    setVacancies(Array.isArray(v) ? v : []);
    setShowSettings(false); setSaving(false);
    flash("Coördinaties bijgewerkt");
  }

  async function handleTransfer() {
    if (!transferEmail.trim()) return;
    setSaving(true);
    await fetch("/api/coordinator/transfer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newEmail: transferEmail, newName: transferName }) });
    setShowSettings(false); setSaving(false);
    flash("Overdracht verstuurd. Nieuwe coördinator ontvangt een uitnodigingslink.");
  }

  // ── Uitnodiging ───────────────────────────────────────────────────────
  function openInvite(v: Vacancy) {
    if (!coord) return;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    setInviteVacancy(v);
    setInviteForm({
      to: "", subject: `Uitnodiging: ${v.title} bij ${coord.organization.name}`,
      body: `Hallo,\n\nIk nodig je graag uit om mee te doen met de taak "${v.title}" bij ${coord.organization.name}.\n\n${v.shortDescription}\n\n${v.whyValuable ? "Waarom waardevol?\n" + v.whyValuable + "\n\n" : ""}Met vriendelijke groet,\n${coord.name}`,
      ctaLabel: "Ja, ik doe mee!",
    });
    setShowInvite(true);
  }

  async function sendInvite() {
    if (!coord || !inviteForm.to.trim()) return;
    setInviteSending(true);
    const ctaUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/g/${coord.organization.slug}/matches`;
    const d = await fetch("/api/coordinator/invite-volunteer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...inviteForm, ctaUrl }) }).then((r) => r.json());
    setInviteSending(false);
    if (d.ok) { setShowInvite(false); flash(`Uitnodiging verstuurd naar ${inviteForm.to}`); }
    else flash(d.error || "Versturen mislukt");
  }

  async function logout() {
    await fetch("/api/coordinator/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400">Laden…</p></div>;

  const activeVacancies = vacancies.filter((v) => v.status === "active");
  const inactiveVacancies = vacancies.filter((v) => v.status !== "active");
  const vacancyTitles = vacancies.map((v) => v.title);
  const availableForAssignment = orgVacancies.filter((v) => !v.taken);
  const takenByOther = orgVacancies.filter((v) => v.taken);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: coord?.organization.primaryColor }} />
              <span className="text-sm font-semibold text-gray-700">{coord?.organization.name}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0">Coördinator: {coord?.name}</p>
            {vacancyTitles.length > 0 && (
              <p className="text-xs text-gray-400">Coördinator van: {vacancyTitles.join(", ")}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNewVacancy(true)} className="text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg">
              + Nieuwe vacature
            </button>
            <button onClick={openSettings} className="text-xs text-gray-600 hover:text-gray-800 px-3 py-1.5 border border-gray-200 rounded-lg">
              Instellingen
            </button>
            <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-600">Uitloggen</button>
          </div>
        </div>
      </header>

      {msg && <div className="bg-green-50 border-b border-green-200 px-6 py-2 text-center text-sm text-green-700">{msg}</div>}

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-10">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Actieve vacatures", value: activeVacancies.length },
            { label: "Aanmeldingen", value: vacancies.reduce((s, v) => s + v.applications.length, 0) },
            { label: "Huidige vrijwilligers", value: vacancies.reduce((s, v) => s + v.memberships.length, 0) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Blok 1: Vacatures ── */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-4">Vacatures</h2>
          {vacancies.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
              <p className="mb-4">Nog geen vacatures. Koppel bestaande via Instellingen of maak een nieuwe aan.</p>
              <div className="flex gap-3 justify-center">
                <button onClick={openSettings} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:border-blue-400">Vacatures koppelen</button>
                <button onClick={() => setShowNewVacancy(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">+ Nieuwe vacature</button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {[
                { label: "Actieve vacatures", items: activeVacancies },
                { label: "Non-actieve vacatures", items: inactiveVacancies },
              ].filter(({ items }) => items.length > 0).map(({ label, items }) => (
                <div key={label}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{label}</h3>
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
                          </div>
                          <button onClick={() => editingId === v.id ? setEditingId(null) : startEdit(v)}
                            className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2.5 py-1.5 rounded-lg font-medium flex-shrink-0">
                            {editingId === v.id ? "Sluiten" : "Bewerken"}
                          </button>
                        </div>

                        {editingId === v.id && (
                          <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                            {[
                              { key: "title", label: "Naam", type: "input" },
                              { key: "shortDescription", label: "Korte omschrijving", type: "input" },
                              { key: "whyValuable", label: "Waarom waardevol?", type: "textarea" },
                              { key: "concreteTasks", label: "Wat doe je concreet?", type: "textarea" },
                              { key: "firstStep", label: "Eerste stap", type: "textarea" },
                            ].map(({ key, label, type }) => (
                              <div key={key}>
                                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                                {type === "input"
                                  ? <input value={(editForm as Record<string, string>)[key] ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                  : <textarea rows={3} value={(editForm as Record<string, string>)[key] ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />}
                              </div>
                            ))}
                            <div className="flex gap-2 flex-wrap pt-1">
                              <button onClick={() => saveEdit(v.id)} disabled={saving}
                                className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                                {saving ? "Opslaan…" : "Opslaan"}
                              </button>
                              {v.status === "active"
                                ? <button onClick={() => updateStatus(v.id, "inactive")} className="text-sm px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-amber-300 text-amber-600">Non-actief</button>
                                : <button onClick={() => updateStatus(v.id, "active")} className="text-sm px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-green-300 text-green-600">Activeren</button>}
                              <button onClick={() => deleteVacancy(v.id)} className="text-sm px-3 py-2 rounded-lg bg-white border border-gray-200 hover:border-red-300 text-red-500">Verwijderen</button>
                              <button onClick={() => setEditingId(null)} className="text-sm px-3 py-2 rounded-lg border border-gray-200 text-gray-500 ml-auto">Annuleren</button>
                            </div>

                            {/* Aanmeldingen inline */}
                            {v.applications.length > 0 && (
                              <div className="pt-3 border-t border-gray-200">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Aanmeldingen</p>
                                <div className="space-y-2">
                                  {v.applications.map((a) => (
                                    <div key={a.id} className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center justify-between">
                                      <div>
                                        <span className="font-medium text-gray-900 text-sm">{a.participant.name}</span>
                                        <div className="text-xs text-gray-400">
                                          <a href={`mailto:${a.participant.email}`} className="text-blue-500 hover:underline">{a.participant.email}</a>
                                          {a.participant.phone && <span> · {a.participant.phone}</span>}
                                        </div>
                                      </div>
                                      <span className="text-xs text-gray-400">{RESPONSE_LABELS[a.responseType] || a.responseType}</span>
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
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Blok 2: Taken beheren ── */}
        {vacancies.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-gray-800 mb-4">Taken beheren</h2>
            <div className="space-y-3">
              {vacancies.map((v) => {
                const isOpen = expandedBeheer === v.id;
                const roster = rosters.find((r) => r.vacancyId === v.id) || null;
                const memberForm = addMemberForm[v.id] || { name: "", email: "" };
                const entryForm = addRosterEntryForm[v.id] || { name: "", email: "", date: "", role: "" };

                return (
                  <div key={v.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {/* Card header */}
                    <button onClick={() => setExpandedBeheer(isOpen ? null : v.id)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-blue-600">{v.memberships.length}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 text-sm">{v.title}</span>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {v.memberships.length} vrijwilliger{v.memberships.length !== 1 ? "s" : ""}
                            {v.applications.length > 0 && ` · ${v.applications.length} aanmelding${v.applications.length !== 1 ? "en" : ""}`}
                            {roster && ` · rooster: ${roster.entries.length} personen`}
                          </p>
                        </div>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-100 divide-y divide-gray-100">

                        {/* Vrijwilligers */}
                        <div className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Huidige vrijwilligers</h3>
                            <button onClick={() => openInvite(v)} className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 px-2 py-1 rounded-lg">
                              + Uitnodigen
                            </button>
                          </div>

                          {v.memberships.length === 0 && (
                            <p className="text-sm text-gray-400">Nog geen vrijwilligers.</p>
                          )}
                          {v.memberships.map((m) => (
                            <div key={m.id} className="flex items-center justify-between py-1">
                              <div>
                                <span className="text-sm font-medium text-gray-800">{m.participant.name}</span>
                                <a href={`mailto:${m.participant.email}`} className="block text-xs text-blue-500 hover:underline">{m.participant.email}</a>
                              </div>
                              <button onClick={() => removeMember(v.id, m.id)} className="text-xs text-red-400 hover:text-red-600 ml-4">Verwijderen</button>
                            </div>
                          ))}

                          {/* Vrijwilliger toevoegen */}
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-600 mb-2">Vrijwilliger handmatig toevoegen</p>
                            <div className="flex gap-2">
                              <input value={memberForm.name} placeholder="Naam"
                                onChange={(e) => setAddMemberForm((prev) => ({ ...prev, [v.id]: { ...memberForm, name: e.target.value } }))}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              <input value={memberForm.email} placeholder="E-mail" type="email"
                                onChange={(e) => setAddMemberForm((prev) => ({ ...prev, [v.id]: { ...memberForm, email: e.target.value } }))}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              <button onClick={() => addMember(v.id)} disabled={addingMember === v.id || !memberForm.name || !memberForm.email}
                                className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
                                {addingMember === v.id ? "…" : "Toevoegen"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Rooster */}
                        <div className="p-4 space-y-3">
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rooster</h3>

                          {!roster ? (
                            <div className="text-center py-3">
                              <p className="text-sm text-gray-400 mb-3">Nog geen rooster voor deze vacature.</p>
                              <button onClick={() => createRoster(v.id, `Rooster ${v.title}`)} disabled={creatingRoster === v.id}
                                className="text-sm px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-blue-400 disabled:opacity-50">
                                {creatingRoster === v.id ? "Aanmaken…" : "Rooster aanmaken"}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {roster.entries.length === 0 && <p className="text-sm text-gray-400">Nog geen personen in het rooster.</p>}
                              {roster.entries.map((e) => (
                                <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                                  <div className="flex items-center gap-3 min-w-0">
                                    {e.date && (
                                      <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded flex-shrink-0">
                                        {new Date(e.date).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                                      </span>
                                    )}
                                    <div className="min-w-0">
                                      <span className="text-sm text-gray-800">{e.name}</span>
                                      {e.role && <span className="text-xs text-gray-400 ml-2">{e.role}</span>}
                                      {e.email && <a href={`mailto:${e.email}`} className="block text-xs text-blue-400 hover:underline">{e.email}</a>}
                                    </div>
                                  </div>
                                  <button onClick={() => deleteRosterEntry(roster.id, e.id)} className="text-xs text-red-400 hover:text-red-600 ml-4 flex-shrink-0">×</button>
                                </div>
                              ))}

                              {/* Rij toevoegen */}
                              <div className="pt-2 grid grid-cols-2 gap-2">
                                <input value={entryForm.name} placeholder="Naam *"
                                  onChange={(e) => setAddRosterEntryForm((prev) => ({ ...prev, [v.id]: { ...entryForm, name: e.target.value } }))}
                                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <input value={entryForm.role} placeholder="Rol / dienst"
                                  onChange={(e) => setAddRosterEntryForm((prev) => ({ ...prev, [v.id]: { ...entryForm, role: e.target.value } }))}
                                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <input type="date" value={entryForm.date}
                                  onChange={(e) => setAddRosterEntryForm((prev) => ({ ...prev, [v.id]: { ...entryForm, date: e.target.value } }))}
                                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <input value={entryForm.email} placeholder="E-mail (optioneel)" type="email"
                                  onChange={(e) => setAddRosterEntryForm((prev) => ({ ...prev, [v.id]: { ...entryForm, email: e.target.value } }))}
                                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                              </div>
                              <button onClick={() => addRosterEntry(roster.id, v.id)} disabled={addingRosterEntry === v.id || !entryForm.name}
                                className="w-full text-sm py-2 border border-gray-300 rounded-lg text-gray-700 hover:border-blue-400 disabled:opacity-50">
                                {addingRosterEntry === v.id ? "Toevoegen…" : "+ Rij toevoegen"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Instellingen modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={(e) => { if (e.target === e.currentTarget) setShowSettings(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-6 pb-0">
              <h2 className="font-bold text-gray-900 mb-4">Instellingen</h2>
              <div className="flex border-b border-gray-200 gap-4">
                {(["coordinaties", "overdragen"] as const).map((tab) => (
                  <button key={tab} onClick={() => setSettingsTab(tab)}
                    className={`text-sm pb-2.5 font-medium border-b-2 transition-colors capitalize ${settingsTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    {tab === "coordinaties" ? "Mijn vacatures" : "Rol overdragen"}
                  </button>
                ))}
              </div>
            </div>

            {settingsTab === "coordinaties" && (
              <div className="flex-1 overflow-y-auto p-6 pt-4 flex flex-col gap-4">
                <p className="text-sm text-gray-500">Vink aan welke vacatures jij coördineert.</p>
                {loadingAssignments ? <p className="text-sm text-gray-400 text-center py-4">Laden…</p> : (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {availableForAssignment.map((v) => (
                      <label key={v.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={assignmentSel.includes(v.id)}
                          onChange={() => setAssignmentSel((prev) => prev.includes(v.id) ? prev.filter((x) => x !== v.id) : [...prev, v.id])}
                          className="rounded border-gray-300 text-blue-600" />
                        <div>
                          <span className="text-sm text-gray-800 block">{v.title}</span>
                          <span className="text-xs text-gray-400">{v.category}</span>
                        </div>
                      </label>
                    ))}
                    {takenByOther.map((v) => (
                      <div key={v.id} className="flex items-center gap-3 px-4 py-3 opacity-40">
                        <input type="checkbox" disabled checked={false} className="rounded border-gray-300" />
                        <div>
                          <span className="text-sm text-gray-500 block">{v.title}</span>
                          <span className="text-xs text-gray-400">{v.category} · andere coördinator</span>
                        </div>
                      </div>
                    ))}
                    {availableForAssignment.length === 0 && takenByOther.length === 0 && (
                      <p className="text-sm text-gray-400 p-4 text-center">Geen vacatures in deze organisatie.</p>
                    )}
                  </div>
                )}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button onClick={saveAssignments} disabled={saving || loadingAssignments} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {saving ? "Opslaan…" : "Opslaan"}
                  </button>
                  <button onClick={() => setShowSettings(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">Annuleren</button>
                </div>
              </div>
            )}

            {settingsTab === "overdragen" && (
              <div className="p-6 pt-4 space-y-4">
                <p className="text-sm text-gray-500">Draag jouw rol over aan iemand anders. Die persoon ontvangt een uitnodigingslink.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Naam nieuwe coördinator</label>
                    <input value={transferName} onChange={(e) => setTransferName(e.target.value)} placeholder="Voornaam Achternaam"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">E-mail *</label>
                    <input type="email" value={transferEmail} onChange={(e) => setTransferEmail(e.target.value)} placeholder="naam@kerk.nl"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <button onClick={handleTransfer} disabled={saving || !transferEmail.trim()} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {saving ? "Versturen…" : "Overdragen"}
                  </button>
                  <button onClick={() => setShowSettings(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">Annuleren</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Uitnodiging modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setShowInvite(false); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h2 className="font-bold text-gray-900 mb-1">Iemand uitnodigen</h2>
            <p className="text-sm text-gray-500 mb-5">Persoonlijke uitnodiging voor <span className="font-medium text-gray-700">{inviteVacancy?.title}</span>.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Aan *</label>
                <input type="email" value={inviteForm.to} onChange={(e) => setInviteForm((f) => ({ ...f, to: e.target.value }))} placeholder="naam@kerk.nl"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Onderwerp</label>
                <input value={inviteForm.subject} onChange={(e) => setInviteForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Berichttekst</label>
                <textarea rows={7} value={inviteForm.body} onChange={(e) => setInviteForm((f) => ({ ...f, body: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Knoptekst in e-mail</label>
                <input value={inviteForm.ctaLabel} onChange={(e) => setInviteForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {inviteForm.ctaLabel && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <span className="text-xs text-gray-400 block mb-2">Voorbeeld:</span>
                  <span className="inline-block bg-blue-600 text-white text-sm font-semibold px-5 py-2 rounded-lg">{inviteForm.ctaLabel}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={sendInvite} disabled={inviteSending || !inviteForm.to.trim()} className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {inviteSending ? "Versturen…" : "Uitnodiging versturen"}
              </button>
              <button onClick={() => setShowInvite(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">Annuleren</button>
            </div>
          </div>
        </div>
      )}

      {/* Nieuwe vacature modal */}
      {showNewVacancy && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setShowNewVacancy(false); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="font-bold text-gray-900 mb-4">Nieuwe vacature aanmaken</h2>
            <div className="space-y-3">
              {[
                { key: "title", label: "Naam *", placeholder: "bijv. Muzikant, Kinderoppas, Koster", type: "input" },
                { key: "shortDescription", label: "Korte omschrijving *", placeholder: "Wat houdt de taak in?", type: "input" },
                { key: "whyValuable", label: "Waarom waardevol?", placeholder: "", type: "textarea" },
                { key: "concreteTasks", label: "Wat doe je concreet?", placeholder: "", type: "textarea" },
                { key: "firstStep", label: "Eerste stap", placeholder: "Hoe begin je als nieuwe vrijwilliger?", type: "input" },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  {type === "input"
                    ? <input value={(newVacForm as Record<string, string>)[key]} placeholder={placeholder}
                        onChange={(e) => setNewVacForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    : <textarea rows={2} value={(newVacForm as Record<string, string>)[key]}
                        onChange={(e) => setNewVacForm((f) => ({ ...f, [key]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />}
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categorie *</label>
                <select value={newVacForm.category} onChange={(e) => setNewVacForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Kies een categorie —</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={createVacancy} disabled={saving || !newVacForm.title.trim() || !newVacForm.category || !newVacForm.shortDescription.trim()}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Aanmaken…" : "Vacature aanmaken"}
              </button>
              <button onClick={() => setShowNewVacancy(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">Annuleren</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
