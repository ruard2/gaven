"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Participant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  _count: { applications: number };
  profile: { completedAt: string | null } | null;
}

export default function ParticipantsPage() {
  const { id: orgId } = useParams<{ id: string }>();
  const router = useRouter();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/organizations/${orgId}/participants`)
      .then((r) => {
        if (r.status === 401) { router.push("/admin/login"); return null; }
        return r.json();
      })
      .then((d) => { if (d) setParticipants(d); })
      .finally(() => setLoading(false));
  }, [orgId, router]);

  function startEdit(p: Participant) {
    setEditingId(p.id);
    setEditForm({ name: p.name, email: p.email, phone: p.phone || "" });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    const res = await fetch(`/api/admin/organizations/${orgId}/participants`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: editingId, ...editForm }),
    });
    const updated = await res.json();
    if (updated.id) {
      setParticipants((prev) => prev.map((p) => p.id === updated.id ? updated : p));
      setEditingId(null);
    }
    setSaving(false);
  }

  async function deleteParticipant(participantId: string) {
    if (!confirm("Deelnemer definitief verwijderen? Dit verwijdert ook alle reacties.")) return;
    setDeletingId(participantId);
    await fetch(`/api/admin/organizations/${orgId}/participants?participantId=${participantId}`, { method: "DELETE" });
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
    setDeletingId(null);
  }

  const filtered = participants.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Laden…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href={`/admin/orgs/${orgId}`} className="text-sm text-gray-500 hover:text-gray-700">← Terug</Link>
        <h1 className="text-lg font-bold text-gray-900">Deelnemers ({participants.length})</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <input
          type="search"
          placeholder="Zoek op naam of e-mail…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">Geen deelnemers gevonden.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Naam</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Profiel</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Reacties</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Ingevuld</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <>
                    <tr key={p.id} className={`hover:bg-gray-50 ${editingId === p.id ? "bg-blue-50" : ""}`}>
                      <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-5 py-3 text-gray-500">
                        <a href={`mailto:${p.email}`} className="hover:underline text-blue-600">{p.email}</a>
                        {p.phone && <div className="text-xs text-gray-400">{p.phone}</div>}
                      </td>
                      <td className="px-5 py-3">
                        {p.profile?.completedAt
                          ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Compleet</span>
                          : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Onvolledig</span>
                        }
                      </td>
                      <td className="px-5 py-3 text-gray-600">{p._count.applications}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {new Date(p.createdAt).toLocaleDateString("nl-NL")}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => editingId === p.id ? setEditingId(null) : startEdit(p)}
                          className="text-xs text-blue-500 hover:text-blue-700 mr-3"
                        >
                          {editingId === p.id ? "Sluiten" : "Bewerken"}
                        </button>
                        <button
                          onClick={() => deleteParticipant(p.id)}
                          disabled={deletingId === p.id}
                          className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
                        >
                          {deletingId === p.id ? "…" : "Verwijderen"}
                        </button>
                      </td>
                    </tr>
                    {editingId === p.id && (
                      <tr key={`edit-${p.id}`} className="bg-blue-50 border-b border-blue-100">
                        <td colSpan={6} className="px-5 py-4">
                          <div className="flex flex-wrap gap-3 items-end">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Naam</label>
                              <input
                                value={editForm.name}
                                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                              <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Telefoon</label>
                              <input
                                value={editForm.phone}
                                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                                placeholder="optioneel"
                                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
                              />
                            </div>
                            <button
                              onClick={saveEdit}
                              disabled={saving || !editForm.name.trim() || !editForm.email.trim()}
                              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              {saving ? "Opslaan…" : "Opslaan"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-white"
                            >
                              Annuleren
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
