"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface OrgVacancy { id: string; title: string; category: string; assigned: boolean; taken: boolean; }
interface NewFunction { title: string; category: string; }

const CATEGORIES = [
  "Muziek & eredienst", "Praktisch", "Pastoraat", "Jeugd & gezin",
  "Communicatie", "Techniek", "Administratie", "Onderwijs", "Anders",
];

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
  const [newFunctions, setNewFunctions] = useState<NewFunction[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addCategory, setAddCategory] = useState(CATEGORIES[0]);
  const [addCustomCategory, setAddCustomCategory] = useState("");

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

  function addFunction() {
    const title = addTitle.trim();
    const category = addCategory === "Anders" ? addCustomCategory.trim() || "Anders" : addCategory;
    if (!title) return;
    setNewFunctions((prev) => [...prev, { title, category }]);
    setAddTitle("");
    setAddCategory(CATEGORIES[0]);
    setAddCustomCategory("");
    setShowAdd(false);
  }

  function removeFunction(i: number) {
    setNewFunctions((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Wachtwoorden komen niet overeen"); return; }
    if (password.length < 8) { setError("Wachtwoord moet minimaal 8 tekens zijn"); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/coordinator/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password,
        name: ownName.trim() || undefined,
        vacancyIds: selectedIds,
        newFunctions,
      }),
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Welke functies coördineer jij?
            </label>
            <p className="text-xs text-gray-400 mb-2">Selecteer uit de lijst of voeg een eigen functie toe.</p>

            {/* Bestaande vacatures */}
            {availableVacancies.length > 0 && (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-44 overflow-y-auto mb-2">
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
              </div>
            )}

            {/* Eigen functies toegevoegd */}
            {newFunctions.length > 0 && (
              <div className="border border-blue-100 bg-blue-50 rounded-lg divide-y divide-blue-100 mb-2">
                {newFunctions.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5">
                    <div className="min-w-0">
                      <span className="text-sm text-gray-800 block truncate">{f.title}</span>
                      <span className="text-xs text-gray-400">{f.category}</span>
                    </div>
                    <button type="button" onClick={() => removeFunction(i)}
                      className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Toevoegen-formulier */}
            {showAdd ? (
              <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                <input
                  autoFocus
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="Naam van de functie"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <select
                  value={addCategory}
                  onChange={(e) => setAddCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                {addCategory === "Anders" && (
                  <input
                    value={addCustomCategory}
                    onChange={(e) => setAddCustomCategory(e.target.value)}
                    placeholder="Vul categorie in"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                )}
                <div className="flex gap-2">
                  <button type="button" onClick={addFunction}
                    disabled={!addTitle.trim()}
                    className="flex-1 bg-blue-600 text-white rounded-lg py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
                    Toevoegen
                  </button>
                  <button type="button" onClick={() => { setShowAdd(false); setAddTitle(""); }}
                    className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-1.5 text-sm hover:bg-gray-200">
                    Annuleren
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Eigen functie toevoegen
              </button>
            )}

            {takenVacancies.length > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                {takenVacancies.length} functie{takenVacancies.length > 1 ? "s zijn" : " is"} al aan een andere coördinator gekoppeld.
              </p>
            )}
          </div>

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
