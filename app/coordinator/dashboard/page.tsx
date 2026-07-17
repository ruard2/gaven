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
interface TeamSection { id: string; type: string; title: string; content: string | null; url: string | null; order: number; }

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
  const [settingsNewTitle, setSettingsNewTitle] = useState("");
  const [settingsNewCategory, setSettingsNewCategory] = useState("Praktisch");
  const [settingsShowNewForm, setSettingsShowNewForm] = useState(false);
  const SETTING_CATEGORIES = ["Muziek & eredienst", "Praktisch", "Jeugd", "Bestuur", "Techniek", "Communicatie", "Pastoraat", "Overig"];

  // Uitnodiging
  const [showInvite, setShowInvite] = useState(false);
  const [inviteVacancy, setInviteVacancy] = useState<Vacancy | null>(null);
  const [inviteForm, setInviteForm] = useState({ to: "", subject: "", body: "", ctaLabel: "Ja, ik doe mee!" });
  const [inviteSending, setInviteSending] = useState(false);

  // Nieuwe vacature
  const [showNewVacancy, setShowNewVacancy] = useState(false);
  const [newVacForm, setNewVacForm] = useState({ title: "", category: "", shortDescription: "", whyValuable: "", concreteTasks: "", firstStep: "" });
  const [customCategory, setCustomCategory] = useState("");

  // Teampagina (per vacature)
  const [teamPageVacancyId, setTeamPageVacancyId] = useState<string | null>(null);
  const [teamPageData, setTeamPageData] = useState<{ sections: TeamSection[]; slug: string; teamUrl: string } | null>(null);
  const [teamPageLoading, setTeamPageLoading] = useState(false);
  const [teamPageStep, setTeamPageStep] = useState<"info" | "edit">("info");
  const [addSectionForm, setAddSectionForm] = useState({ type: "text", title: "", content: "", url: "" });
  const [addingSec, setAddingSec] = useState(false);
  const [editingSec, setEditingSec] = useState<string | null>(null);
  const [editSecForm, setEditSecForm] = useState({ title: "", content: "", url: "" });

  // Coördinator homepage
  interface HomepageData { roleTitle: string | null; pageUrl: string; pageSections: TeamSection[] }
  const [showHomepage, setShowHomepage] = useState(false);
  const [homepageData, setHomepageData] = useState<HomepageData | null>(null);
  const [homepageLoading, setHomepageLoading] = useState(false);
  const [homepageRoleTitle, setHomepageRoleTitle] = useState("");
  const [homepageAddForm, setHomepageAddForm] = useState({ type: "text", title: "", content: "", url: "" });
  const [homepageAdding, setHomepageAdding] = useState(false);
  const [homepageEditId, setHomepageEditId] = useState<string | null>(null);
  const [homepageEditForm, setHomepageEditForm] = useState({ title: "", content: "", url: "" });

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 4000); }

  async function openHomepage() {
    setShowHomepage(true); setHomepageLoading(true);
    const r = await fetch("/api/coordinator/homepage");
    if (r.ok) {
      const d = await r.json();
      setHomepageData(d);
      setHomepageRoleTitle(d.roleTitle || "");
    }
    setHomepageLoading(false);
  }

  async function saveHomepageTitle() {
    await fetch("/api/coordinator/homepage", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleTitle: homepageRoleTitle }),
    });
    setHomepageData((d) => d ? { ...d, roleTitle: homepageRoleTitle || null } : d);
    flash("Opgeslagen");
  }

  async function addHomepageSection() {
    if (!homepageAddForm.title.trim()) return;
    setHomepageAdding(true);
    const r = await fetch("/api/coordinator/homepage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(homepageAddForm),
    });
    if (r.ok) {
      const sec = await r.json();
      setHomepageData((d) => d ? { ...d, pageSections: [...d.pageSections, sec] } : d);
      setHomepageAddForm({ type: "text", title: "", content: "", url: "" });
    }
    setHomepageAdding(false);
  }

  async function deleteHomepageSection(sectionId: string) {
    await fetch(`/api/coordinator/homepage?sectionId=${sectionId}`, { method: "DELETE" });
    setHomepageData((d) => d ? { ...d, pageSections: d.pageSections.filter((s) => s.id !== sectionId) } : d);
  }

  async function saveHomepageSection(sectionId: string) {
    await fetch("/api/coordinator/homepage", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, type: homepageData?.pageSections.find((s) => s.id === sectionId)?.type, ...homepageEditForm }),
    });
    setHomepageData((d) => d ? { ...d, pageSections: d.pageSections.map((s) => s.id === sectionId ? { ...s, ...homepageEditForm } : s) } : d);
    setHomepageEditId(null);
  }

  async function openTeamPage(vacancyId: string) {
    setTeamPageVacancyId(vacancyId);
    setTeamPageStep("info");
    setTeamPageLoading(true);
    setTeamPageData(null);
    const r = await fetch(`/api/coordinator/vacancies/${vacancyId}/page-sections`);
    if (r.ok) setTeamPageData(await r.json());
    setTeamPageLoading(false);
  }

  async function addSection() {
    if (!teamPageVacancyId || !addSectionForm.title.trim()) return;
    setAddingSec(true);
    const r = await fetch(`/api/coordinator/vacancies/${teamPageVacancyId}/page-sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addSectionForm),
    });
    if (r.ok) {
      const sec = await r.json();
      setTeamPageData((d) => d ? { ...d, sections: [...d.sections, sec] } : d);
      setAddSectionForm({ type: "text", title: "", content: "", url: "" });
    }
    setAddingSec(false);
  }

  async function deleteSection(sectionId: string) {
    if (!teamPageVacancyId) return;
    await fetch(`/api/coordinator/vacancies/${teamPageVacancyId}/page-sections?sectionId=${sectionId}`, { method: "DELETE" });
    setTeamPageData((d) => d ? { ...d, sections: d.sections.filter((s) => s.id !== sectionId) } : d);
  }

  async function saveSection(sectionId: string) {
    if (!teamPageVacancyId) return;
    const r = await fetch(`/api/coordinator/vacancies/${teamPageVacancyId}/page-sections`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, ...editSecForm }),
    });
    if (r.ok) {
      const updated = await r.json();
      setTeamPageData((d) => d ? { ...d, sections: d.sections.map((s) => s.id === sectionId ? updated : s) } : d);
      setEditingSec(null);
    }
  }

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
    const effectiveCategory = newVacForm.category === "Anders…" ? customCategory.trim() : newVacForm.category;
    if (!newVacForm.title.trim() || !effectiveCategory || !newVacForm.shortDescription.trim()) return;
    setSaving(true);
    const res = await fetch("/api/coordinator/vacancies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newVacForm, category: effectiveCategory }) });
    const v = await res.json();
    if (v.id) {
      setVacancies((prev) => [v, ...prev]);
      setShowNewVacancy(false);
      setNewVacForm({ title: "", category: "", shortDescription: "", whyValuable: "", concreteTasks: "", firstStep: "" });
      setCustomCategory("");
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
    if (settingsShowNewForm && settingsNewTitle.trim()) {
      await fetch("/api/coordinator/vacancies", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: settingsNewTitle.trim(), category: settingsNewCategory, shortDescription: "", contactPersonName: "", contactPersonEmail: "" }),
      });
      setSettingsNewTitle(""); setSettingsShowNewForm(false);
    }
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
            <button onClick={openHomepage} className="text-xs text-purple-700 hover:text-purple-900 px-3 py-1.5 border border-purple-200 bg-purple-50 rounded-lg">
              🏠 Homepage
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
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => openTeamPage(v.id)}
                              className="text-xs text-purple-600 hover:text-purple-800 border border-purple-200 hover:border-purple-400 px-2.5 py-1.5 rounded-lg font-medium">
                              🌐 Teampagina
                            </button>
                            <button onClick={() => editingId === v.id ? setEditingId(null) : startEdit(v)}
                              className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-2.5 py-1.5 rounded-lg font-medium">
                              {editingId === v.id ? "Sluiten" : "Bewerken"}
                            </button>
                          </div>
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
                                    <div key={a.id} className="bg-white rounded-lg border border-gray-200 px-4 py-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <span className="font-medium text-gray-900 text-sm">{a.participant.name}</span>
                                          <div className="text-xs text-gray-400">{a.participant.email}{a.participant.phone && ` · ${a.participant.phone}`}</div>
                                        </div>
                                        <span className="text-xs text-gray-400">{RESPONSE_LABELS[a.responseType] || a.responseType}</span>
                                      </div>
                                      <CoordContactButtons
                                        name={a.participant.name}
                                        email={a.participant.email}
                                        phone={a.participant.phone ?? null}
                                        vacancyTitle={v.title}
                                      />
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
                  <button onClick={saveAssignments} disabled={saving || loadingAssignments}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
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

      {/* Homepage modal */}
      {showHomepage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-6 overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) setShowHomepage(false); }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Beheer homepage</h2>
                <p className="text-xs text-gray-400 mt-0.5">Jouw persoonlijke coördinatiepagina voor vrijwilligers</p>
              </div>
              <button onClick={() => setShowHomepage(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {homepageLoading ? (
              <div className="flex-1 flex items-center justify-center p-8"><p className="text-gray-400 text-sm">Laden…</p></div>
            ) : homepageData && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Jouw rol */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jouw rol / titel</label>
                  <p className="text-xs text-gray-400 mb-2">Dit verschijnt als koptitel op jouw homepage (bijv. "Geluidscoördinator").</p>
                  <div className="flex gap-2">
                    <input value={homepageRoleTitle} onChange={(e) => setHomepageRoleTitle(e.target.value)}
                      placeholder="bijv. Geluidscoördinator"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <button onClick={saveHomepageTitle} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">Opslaan</button>
                  </div>
                </div>

                {/* Paginalink */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jouw paginalink</label>
                  <div className="flex gap-2 items-center">
                    <input readOnly value={homepageData.pageUrl} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-500 bg-gray-50" />
                    <button onClick={() => { navigator.clipboard?.writeText(homepageData.pageUrl); flash("Link gekopieerd"); }}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:border-gray-300">Kopieer</button>
                  </div>
                  <a href={homepageData.pageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline mt-1 inline-block">Bekijk pagina →</a>
                </div>

                {/* Secties */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Inhoud op jouw homepage</p>
                  {homepageData.pageSections.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">Nog geen secties. Voeg hieronder toe.</p>
                  ) : (
                    <div className="space-y-2 mb-4">
                      {homepageData.pageSections.map((s) => (
                        <div key={s.id} className="border border-gray-200 rounded-lg p-3">
                          {homepageEditId === s.id ? (
                            <div className="space-y-2">
                              <input value={homepageEditForm.title} onChange={(e) => setHomepageEditForm((f) => ({ ...f, title: e.target.value }))}
                                placeholder="Titel" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                              {s.type === "link" ? (
                                <>
                                  <input value={homepageEditForm.url} onChange={(e) => setHomepageEditForm((f) => ({ ...f, url: e.target.value }))}
                                    placeholder="URL" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                                  <input value={homepageEditForm.content} onChange={(e) => setHomepageEditForm((f) => ({ ...f, content: e.target.value }))}
                                    placeholder="Knoptekst (optioneel)" className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                                </>
                              ) : (
                                <textarea value={homepageEditForm.content} onChange={(e) => setHomepageEditForm((f) => ({ ...f, content: e.target.value }))}
                                  placeholder="Tekst" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm resize-none" />
                              )}
                              <div className="flex gap-2">
                                <button onClick={() => saveHomepageSection(s.id)} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg">Opslaan</button>
                                <button onClick={() => setHomepageEditId(null)} className="px-3 py-1.5 border border-gray-200 text-xs rounded-lg">Annuleren</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800">{s.title}</p>
                                <p className="text-xs text-gray-400">{s.type === "link" ? `🔗 ${s.url}` : s.content?.substring(0, 60)}</p>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={() => { setHomepageEditId(s.id); setHomepageEditForm({ title: s.title, content: s.content || "", url: s.url || "" }); }}
                                  className="text-xs text-blue-600 px-2 py-1 hover:bg-blue-50 rounded">Bewerken</button>
                                <button onClick={() => deleteHomepageSection(s.id)}
                                  className="text-xs text-red-500 px-2 py-1 hover:bg-red-50 rounded">Verwijder</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Toevoegen */}
                  <div className="border border-dashed border-purple-200 bg-purple-50 rounded-lg p-4 space-y-2">
                    <p className="text-xs font-semibold text-purple-700">Sectie toevoegen</p>
                    <div className="flex gap-2">
                      <button onClick={() => setHomepageAddForm((f) => ({ ...f, type: "text" }))}
                        className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${homepageAddForm.type === "text" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200"}`}>
                        Tekst
                      </button>
                      <button onClick={() => setHomepageAddForm((f) => ({ ...f, type: "link" }))}
                        className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${homepageAddForm.type === "link" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200"}`}>
                        Link / Document
                      </button>
                    </div>
                    <input value={homepageAddForm.title} onChange={(e) => setHomepageAddForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Titel (bijv. 'Planning' of 'Handleiding')"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
                    {homepageAddForm.type === "link" ? (
                      <>
                        <input value={homepageAddForm.url} onChange={(e) => setHomepageAddForm((f) => ({ ...f, url: e.target.value }))}
                          placeholder="URL (bijv. link naar document)"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
                        <input value={homepageAddForm.content} onChange={(e) => setHomepageAddForm((f) => ({ ...f, content: e.target.value }))}
                          placeholder="Knoptekst (optioneel)"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
                      </>
                    ) : (
                      <textarea value={homepageAddForm.content} onChange={(e) => setHomepageAddForm((f) => ({ ...f, content: e.target.value }))}
                        placeholder="Tekst / omschrijving"
                        rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white resize-none" />
                    )}
                    <button onClick={addHomepageSection} disabled={homepageAdding || !homepageAddForm.title.trim()}
                      className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                      {homepageAdding ? "Toevoegen…" : "Toevoegen"}
                    </button>
                  </div>
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

      {/* Teampagina modal */}
      {teamPageVacancyId && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 px-0 sm:px-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setTeamPageVacancyId(null); setTeamPageData(null); } }}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
            {teamPageLoading ? (
              <div className="p-10 text-center text-gray-400">Laden…</div>
            ) : teamPageStep === "info" ? (
              /* ── Stap 1: Uitleg ── */
              <div className="p-6">
                <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-5 mx-auto">
                  <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Jouw teampagina</h2>
                <p className="text-sm text-gray-500 text-center mb-6">Een vaste pagina die jij beheert — altijd dezelfde link.</p>

                <div className="space-y-4 mb-6">
                  {[
                    { icon: "🔗", title: "Altijd bereikbaar", text: "De link verandert nooit. Deel hem eenmalig met je vrijwilligers en ze kunnen er altijd op terugkomen." },
                    { icon: "📄", title: "Jij bepaalt de inhoud", text: "Voeg tekst, documenten of links toe. Denk aan een rooster, handleiding, contactinfo of een uitleg van de taak." },
                    { icon: "🔒", title: "Veilig en stabiel", text: "Alles wat je hier plaatst blijft staan. Geen account nodig voor je vrijwilligers om het te lezen." },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3 bg-gray-50 rounded-xl p-4">
                      <span className="text-2xl flex-shrink-0">{item.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {teamPageData?.teamUrl && (
                  <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
                    <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-sm text-purple-700 font-mono truncate flex-1">{teamPageData.teamUrl}</span>
                    <button onClick={() => { navigator.clipboard.writeText(teamPageData!.teamUrl); flash("Link gekopieerd!"); }}
                      className="text-xs text-purple-600 font-medium flex-shrink-0 hover:text-purple-800">Kopieer</button>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setTeamPageStep("edit")}
                    className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl font-medium hover:bg-purple-700">
                    Pagina beheren →
                  </button>
                  <button onClick={() => { setTeamPageVacancyId(null); setTeamPageData(null); }}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 text-sm">
                    Sluiten
                  </button>
                </div>
              </div>
            ) : (
              /* ── Stap 2: Bewerken ── */
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <button onClick={() => setTeamPageStep("info")} className="text-sm text-gray-400 hover:text-gray-600 mb-1">← Terug</button>
                    <h2 className="text-lg font-bold text-gray-900">Teampagina beheren</h2>
                  </div>
                  {teamPageData?.teamUrl && (
                    <a href={teamPageData.teamUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50 font-medium">
                      Bekijk pagina ↗
                    </a>
                  )}
                </div>

                {/* Bestaande secties */}
                <div className="space-y-3 mb-5">
                  {teamPageData?.sections.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-3">Nog geen secties. Voeg er hieronder een toe.</p>
                  )}
                  {teamPageData?.sections.map((s) => (
                    <div key={s.id} className="border border-gray-200 rounded-xl p-4">
                      {editingSec === s.id ? (
                        <div className="space-y-2">
                          <input value={editSecForm.title} onChange={(e) => setEditSecForm((f) => ({ ...f, title: e.target.value }))}
                            placeholder="Titel" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                          {s.type === "link" ? (
                            <>
                              <input value={editSecForm.url} onChange={(e) => setEditSecForm((f) => ({ ...f, url: e.target.value }))}
                                placeholder="URL (https://...)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                              <input value={editSecForm.content} onChange={(e) => setEditSecForm((f) => ({ ...f, content: e.target.value }))}
                                placeholder="Knoptekst (optioneel)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                            </>
                          ) : (
                            <textarea rows={3} value={editSecForm.content} onChange={(e) => setEditSecForm((f) => ({ ...f, content: e.target.value }))}
                              placeholder="Inhoud" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                          )}
                          <div className="flex gap-2">
                            <button onClick={() => saveSection(s.id)} className="flex-1 bg-purple-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700">Opslaan</button>
                            <button onClick={() => setEditingSec(null)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600">Annuleren</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                            {s.type === "link"
                              ? <p className="text-xs text-purple-600 truncate mt-0.5">{s.url}</p>
                              : <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.content}</p>}
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button onClick={() => { setEditingSec(s.id); setEditSecForm({ title: s.title, content: s.content || "", url: s.url || "" }); }}
                              className="text-xs text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-50">Bewerken</button>
                            <button onClick={() => deleteSection(s.id)}
                              className="text-xs text-red-500 border border-red-200 px-2 py-1 rounded hover:bg-red-50">✕</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Nieuwe sectie toevoegen */}
                <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Sectie toevoegen</p>
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => setAddSectionForm((f) => ({ ...f, type: "text" }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${addSectionForm.type === "text" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200"}`}>
                      Tekst
                    </button>
                    <button onClick={() => setAddSectionForm((f) => ({ ...f, type: "link" }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${addSectionForm.type === "link" ? "bg-purple-600 text-white border-purple-600" : "bg-white text-gray-600 border-gray-200"}`}>
                      Link / Document
                    </button>
                  </div>
                  <input value={addSectionForm.title} onChange={(e) => setAddSectionForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Titel van deze sectie"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
                  {addSectionForm.type === "link" ? (
                    <>
                      <input value={addSectionForm.url} onChange={(e) => setAddSectionForm((f) => ({ ...f, url: e.target.value }))}
                        placeholder="URL (https://...)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
                      <input value={addSectionForm.content} onChange={(e) => setAddSectionForm((f) => ({ ...f, content: e.target.value }))}
                        placeholder="Knoptekst (optioneel, bijv. 'Open rooster')"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
                    </>
                  ) : (
                    <textarea rows={3} value={addSectionForm.content} onChange={(e) => setAddSectionForm((f) => ({ ...f, content: e.target.value }))}
                      placeholder="Tekst die vrijwilligers zien…"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white" />
                  )}
                  <button onClick={addSection} disabled={addingSec || !addSectionForm.title.trim()}
                    className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-40">
                    {addingSec ? "Toevoegen…" : "+ Sectie toevoegen"}
                  </button>
                </div>
              </div>
            )}
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
                <select value={newVacForm.category} onChange={(e) => { setNewVacForm((f) => ({ ...f, category: e.target.value })); if (e.target.value !== "Anders…") setCustomCategory(""); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Kies een categorie —</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  <option value="Anders…">Anders…</option>
                </select>
                {newVacForm.category === "Anders…" && (
                  <input
                    autoFocus
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Typ je eigen categorie"
                    className="mt-2 w-full border border-blue-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={createVacancy} disabled={saving || !newVacForm.title.trim() || !newVacForm.category || (newVacForm.category === "Anders…" && !customCategory.trim()) || !newVacForm.shortDescription.trim()}
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

function toIntlPhone(phone: string): string {
  const clean = phone.replace(/[\s\-().]/g, "");
  if (clean.startsWith("+")) return clean.slice(1);
  if (clean.startsWith("00")) return clean.slice(2);
  if (clean.startsWith("0")) return "31" + clean.slice(1);
  return clean;
}

function openDeepLink(appUrl: string, webUrl: string) {
  let appOpened = false;
  const onHide = () => { appOpened = true; };
  document.addEventListener("visibilitychange", onHide);
  window.location.href = appUrl;
  setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    if (!appOpened) window.open(webUrl, "_blank");
  }, 1500);
}

function CoordContactButtons({ name, email, phone, vacancyTitle }: {
  name: string; email: string; phone: string | null; vacancyTitle: string;
}) {
  const msg = `Hallo ${name},\n\nJe hebt je aangemeld voor "${vacancyTitle}". Graag neem ik contact met je op.\n\nMet vriendelijke groet`;
  const intl = phone ? toIntlPhone(phone) : null;

  return (
    <div className="flex flex-wrap gap-1.5">
      <a href={`mailto:${email}?subject=Aanmelding ${vacancyTitle}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        E-mail
      </a>
      <button onClick={() => intl
          ? openDeepLink(
              `whatsapp://send?phone=${intl}&text=${encodeURIComponent(msg)}`,
              `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`
            )
          : openDeepLink(
              `whatsapp://send?text=${encodeURIComponent(msg)}`,
              `https://wa.me/?text=${encodeURIComponent(msg)}`
            )
        }
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
        <svg className="w-3 h-3 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.555 4.104 1.523 5.83L0 24l6.336-1.495A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.028-1.382l-.36-.214-3.732.88.937-3.636-.236-.374A9.818 9.818 0 1112 21.818z"/></svg>
        WhatsApp
      </button>
      <a href={phone ? `sms:${phone}?body=${encodeURIComponent(msg)}` : `sms:?body=${encodeURIComponent(msg)}`}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        SMS
      </a>
      {phone && (
        <a href={`tel:${phone}`}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          Bellen
        </a>
      )}
    </div>
  );
}
