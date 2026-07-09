"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Entry {
  id: string; name: string; email: string | null; date: string | null;
  role: string | null; notes: string | null; reminderSent: boolean;
}
interface Roster {
  id: string; title: string; reminderDays: number; senderName: string | null;
  createdAt: string; entries: Entry[];
}

const DAYS_OPTIONS = [1, 2, 3, 5, 7, 10, 14, 21, 30];

function fmt(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function dateInput(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function RoosterPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDays, setNewDays] = useState(3);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState<Partial<Entry>>({});
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<Entry>>({ name: "", email: "", role: "", date: "", notes: "" });

  const active = rosters.find((r) => r.id === activeId) || null;

  useEffect(() => {
    fetch("/api/coordinator/me").then((r) => r.json()).then((c) => {
      if (c.error) { router.push("/coordinator/login"); return; }
    });
    fetch("/api/coordinator/rosters").then((r) => r.json()).then((list) => {
      if (Array.isArray(list)) { setRosters(list); if (list.length > 0) setActiveId(list[0].id); }
    }).finally(() => setLoading(false));
  }, [router]);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 3500); }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", file.name.replace(/\.[^.]+$/, ""));
    fd.append("reminderDays", String(newDays));
    const res = await fetch("/api/coordinator/rosters", { method: "POST", body: fd });
    const roster = await res.json();
    if (roster.id) {
      setRosters((prev) => [roster, ...prev]);
      setActiveId(roster.id);
      flash(`Rooster "${roster.title}" geïmporteerd — ${roster.entries.length} rijen gevonden.`);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function createEmpty() {
    if (!newTitle.trim()) return;
    setSaving(true);
    const res = await fetch("/api/coordinator/rosters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, reminderDays: newDays }),
    });
    const roster = await res.json();
    if (roster.id) {
      setRosters((prev) => [roster, ...prev]);
      setActiveId(roster.id);
      setShowNew(false);
      setNewTitle("");
    }
    setSaving(false);
  }

  async function updateRoster(field: string, value: string | number) {
    if (!active) return;
    const res = await fetch(`/api/coordinator/rosters/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    const updated = await res.json();
    setRosters((prev) => prev.map((r) => r.id === updated.id ? updated : r));
    flash("Opgeslagen");
  }

  async function deleteRoster() {
    if (!active || !confirm(`Rooster "${active.title}" verwijderen?`)) return;
    await fetch(`/api/coordinator/rosters/${active.id}`, { method: "DELETE" });
    const remaining = rosters.filter((r) => r.id !== active.id);
    setRosters(remaining);
    setActiveId(remaining[0]?.id || null);
  }

  async function saveEntry(entryId: string) {
    if (!active) return;
    setSaving(true);
    const res = await fetch(`/api/coordinator/rosters/${active.id}/entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entryForm),
    });
    const updated = await res.json();
    setRosters((prev) => prev.map((r) => r.id === active.id
      ? { ...r, entries: r.entries.map((e) => e.id === entryId ? updated : e) } : r));
    setEditingEntry(null);
    setSaving(false);
  }

  async function deleteEntry(entryId: string) {
    if (!active) return;
    await fetch(`/api/coordinator/rosters/${active.id}/entries/${entryId}`, { method: "DELETE" });
    setRosters((prev) => prev.map((r) => r.id === active.id
      ? { ...r, entries: r.entries.filter((e) => e.id !== entryId) } : r));
  }

  async function addEntry() {
    if (!active || !newEntry.name?.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/coordinator/rosters/${active.id}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEntry),
    });
    const entry = await res.json();
    setRosters((prev) => prev.map((r) => r.id === active.id
      ? { ...r, entries: [...r.entries, entry].sort((a, b) => (a.date || "").localeCompare(b.date || "")) } : r));
    setNewEntry({ name: "", email: "", role: "", date: "", notes: "" });
    setShowAddEntry(false);
    setSaving(false);
  }

  async function sendTestReminder() {
    if (!active) return;
    flash("Herinneringen worden verstuurd bij de volgende dagelijkse run (of via de cron-knop).");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400">Laden…</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/coordinator/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← Dashboard</Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-base font-semibold text-gray-900">Roosters</h1>
          </div>
          <div className="flex gap-2">
            <label className={`px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              {uploading ? "Importeren…" : "Excel / CSV importeren"}
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.ods" className="hidden" onChange={uploadFile} />
            </label>
            <button onClick={() => setShowNew(true)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + Nieuw rooster
            </button>
          </div>
        </div>
      </header>

      {msg && <div className="bg-green-50 border-b border-green-200 px-6 py-2 text-center text-sm text-green-700">{msg}</div>}

      <div className="max-w-5xl mx-auto px-6 py-6 flex gap-6">
        {/* Sidebar — roster list */}
        <aside className="w-56 flex-shrink-0">
          {rosters.length === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-xl p-4 text-center text-sm text-gray-400">
              Nog geen roosters. Importeer een Excel-bestand of maak een nieuw rooster aan.
            </div>
          ) : (
            <div className="space-y-1">
              {rosters.map((r) => (
                <button key={r.id} onClick={() => setActiveId(r.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${activeId === r.id ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:border-blue-300"}`}>
                  <p className="font-medium truncate">{r.title}</p>
                  <p className={`text-xs mt-0.5 ${activeId === r.id ? "text-blue-200" : "text-gray-400"}`}>{r.entries.length} personen</p>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Main — active roster */}
        {active ? (
          <div className="flex-1 min-w-0 space-y-4">
            {/* Roster settings */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Roosternaam</label>
                  <input defaultValue={active.title} key={active.id + "t"}
                    onBlur={(e) => { if (e.target.value !== active.title) updateRoster("title", e.target.value); }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Herinnering versturen</label>
                  <select defaultValue={active.reminderDays} key={active.id + "d"}
                    onChange={(e) => updateRoster("reminderDays", parseInt(e.target.value))}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {DAYS_OPTIONS.map((d) => <option key={d} value={d}>{d} dag{d !== 1 ? "en" : ""} van tevoren</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Afzendernaam in e-mail</label>
                  <input defaultValue={active.senderName || ""} key={active.id + "s"}
                    onBlur={(e) => { if (e.target.value !== active.senderName) updateRoster("senderName", e.target.value); }}
                    placeholder="bijv. Koor NGK Middelharnis"
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end">
                  <button onClick={deleteRoster} className="px-3 py-1.5 text-xs text-red-400 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200">
                    Verwijderen
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Herinneringsmails worden dagelijks automatisch verstuurd. Personen zonder e-mailadres ontvangen geen herinnering.
                Mail met herinneringen al verstuurd worden niet opnieuw verstuurd.
              </p>
            </div>

            {/* Entries table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700">{active.entries.length} personen</p>
                <button onClick={() => setShowAddEntry(true)} className="text-sm text-blue-600 hover:underline">+ Persoon toevoegen</button>
              </div>

              {active.entries.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">
                  Nog geen personen. Voeg ze handmatig toe of importeer een Excel-bestand.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {["Naam", "E-mail", "Datum", "Rol / dienst", "Notitie", "Reminder", ""].map((h) => (
                          <th key={h} className="text-left text-xs font-medium text-gray-500 px-3 py-2">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {active.entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          {editingEntry === entry.id ? (
                            <>
                              {(["name", "email", "date", "role", "notes"] as const).map((f) => (
                                <td key={f} className="px-2 py-1">
                                  <input
                                    type={f === "date" ? "date" : f === "email" ? "email" : "text"}
                                    value={f === "date" ? dateInput(entryForm.date ?? entry.date) : String(entryForm[f] ?? entry[f] ?? "")}
                                    onChange={(e) => setEntryForm((prev) => ({ ...prev, [f]: e.target.value }))}
                                    className="w-full border border-blue-300 rounded px-2 py-1 text-xs focus:outline-none"
                                  />
                                </td>
                              ))}
                              <td className="px-2 py-1 text-xs text-gray-400">{entry.reminderSent ? "✓ Verstuurd" : "—"}</td>
                              <td className="px-2 py-1">
                                <div className="flex gap-1">
                                  <button onClick={() => saveEntry(entry.id)} disabled={saving} className="text-xs text-blue-600 hover:underline">{saving ? "…" : "Sla op"}</button>
                                  <button onClick={() => setEditingEntry(null)} className="text-xs text-gray-400 hover:underline">Annul.</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2.5 font-medium text-gray-900">{entry.name}</td>
                              <td className="px-3 py-2.5 text-gray-500">{entry.email || <span className="text-gray-300">—</span>}</td>
                              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{fmt(entry.date) || <span className="text-gray-300">—</span>}</td>
                              <td className="px-3 py-2.5 text-gray-600">{entry.role || <span className="text-gray-300">—</span>}</td>
                              <td className="px-3 py-2.5 text-gray-400 text-xs max-w-32 truncate">{entry.notes || "—"}</td>
                              <td className="px-3 py-2.5">
                                {entry.reminderSent
                                  ? <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">✓ Verstuurd</span>
                                  : entry.email
                                    ? <span className="text-xs text-gray-400">Gepland</span>
                                    : <span className="text-xs text-gray-300">Geen mail</span>}
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex gap-2">
                                  <button onClick={() => { setEditingEntry(entry.id); setEntryForm({}); }} className="text-xs text-blue-500 hover:underline">Bewerk</button>
                                  <button onClick={() => deleteEntry(entry.id)} className="text-xs text-red-400 hover:underline">×</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Add entry inline */}
              {showAddEntry && (
                <div className="border-t border-gray-100 p-4">
                  <p className="text-xs font-medium text-gray-600 mb-3">Persoon toevoegen</p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                    {[
                      { key: "name", label: "Naam *", type: "text" },
                      { key: "email", label: "E-mail", type: "email" },
                      { key: "date", label: "Datum", type: "date" },
                      { key: "role", label: "Rol / dienst", type: "text" },
                      { key: "notes", label: "Notitie", type: "text" },
                    ].map(({ key, label, type }) => (
                      <div key={key}>
                        <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
                        <input type={type}
                          value={String(newEntry[key as keyof typeof newEntry] ?? "")}
                          onChange={(e) => setNewEntry((p) => ({ ...p, [key]: e.target.value }))}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={addEntry} disabled={saving || !newEntry.name?.trim()}
                      className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {saving ? "Toevoegen…" : "Toevoegen"}
                    </button>
                    <button onClick={() => setShowAddEntry(false)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Annuleren</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Selecteer een rooster of maak een nieuw aan.
          </div>
        )}
      </div>

      {/* New roster modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNew(false); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="font-bold text-gray-900 mb-4">Nieuw rooster aanmaken</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Naam</label>
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="bijv. Muziekrooster september"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Herinnering versturen</label>
                <select value={newDays} onChange={(e) => setNewDays(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {DAYS_OPTIONS.map((d) => <option key={d} value={d}>{d} dag{d !== 1 ? "en" : ""} van tevoren</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={createEmpty} disabled={saving || !newTitle.trim()}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Aanmaken…" : "Aanmaken"}
              </button>
              <button onClick={() => setShowNew(false)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
