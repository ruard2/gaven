"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface OrgVacancy { id: string; title: string; category: string; assigned: boolean; taken: boolean; }

export default function ActivatePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<{ name: string; email: string } | null>(null);
  const [orgVacancies, setOrgVacancies] = useState<OrgVacancy[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [ownName, setOwnName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/coordinator/activate?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        if (d.alreadyActive) { router.replace("/coordinator/login"); return; }
        setInfo(d);
        setOwnName(d.name || "");
        setOrgVacancies(d.orgVacancies || []);
        setSelectedIds((d.orgVacancies || []).filter((v: OrgVacancy) => v.assigned).map((v: OrgVacancy) => v.id));
      })
      .catch(() => setError("Kon gegevens niet laden"))
      .finally(() => setLoading(false));
  }, [token, router]);

  function toggleVacancy(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Wachtwoorden komen niet overeen"); return; }
    if (password.length < 8) { setError("Wachtwoord moet minimaal 8 tekens zijn"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/coordinator/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password, name: ownName.trim() || undefined, vacancyIds: selectedIds }),
    });
    const d = await res.json();
    if (d.ok) { router.push("/coordinator/dashboard"); }
    else { setError(d.error || "Er ging iets mis"); setSaving(false); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400">Laden…</p></div>;

  if (error && !info) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <p className="text-2xl mb-3">🔗</p>
        <p className="font-medium text-gray-800">{error}</p>
        <p className="text-sm text-gray-400 mt-2">Vraag de beheerder om een nieuwe uitnodigingslink.</p>
      </div>
    </div>
  );

  const availableVacancies = orgVacancies.filter((v) => !v.taken);
  const takenVacancies = orgVacancies.filter((v) => v.taken);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm mx-auto">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-5">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Account activeren</h1>
        <p className="text-sm text-gray-500 mb-6">Vul je naam in en stel een wachtwoord in om te beginnen.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jouw naam</label>
            <input required value={ownName} onChange={(e) => setOwnName(e.target.value)}
              placeholder="Voornaam Achternaam"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input value={info?.email || ""} disabled className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
            <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimaal 8 tekens"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bevestig wachtwoord</label>
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)}
              placeholder="Herhaal wachtwoord"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {availableVacancies.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Welke functies coördineer jij?
              </label>
              <p className="text-xs text-gray-400 mb-2">Selecteer wat van toepassing is. Je kunt dit later aanpassen en nieuwe vacatures aanmaken in je dashboard.</p>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {availableVacancies.map((v) => (
                  <label key={v.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selectedIds.includes(v.id)} onChange={() => toggleVacancy(v.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <div className="min-w-0">
                      <span className="text-sm text-gray-800 block truncate">{v.title}</span>
                      <span className="text-xs text-gray-400">{v.category}</span>
                    </div>
                  </label>
                ))}
                {takenVacancies.map((v) => (
                  <label key={v.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 cursor-pointer">
                    <input type="checkbox" checked={selectedIds.includes(v.id)} onChange={() => toggleVacancy(v.id)}
                      className="rounded border-gray-300 text-amber-500 focus:ring-amber-400" />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-gray-700 block truncate">{v.title}</span>
                      <span className="text-xs text-amber-500">Al gekoppeld — aanvraag gaat naar huidige coördinator</span>
                    </div>
                  </label>
                ))}
              </div>
              {takenVacancies.length > 0 && selectedIds.some((id) => takenVacancies.find((v) => v.id === id)) && (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2">
                  De huidige coördinator ontvangt een e-mail om jouw deelname te bevestigen.
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? "Activeren…" : "Account activeren"}
          </button>
        </form>
      </div>
    </div>
  );
}
