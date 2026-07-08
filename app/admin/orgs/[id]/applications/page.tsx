"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Application {
  id: string;
  createdAt: string;
  responseType: string;
  message: string | null;
  firstStepChoice: string | null;
  availabilityNote: string | null;
  status: string;
  participant: { name: string; email: string; phone: string | null };
  vacancy: { title: string; category: string; contactPersonName: string };
}

const RESPONSE_LABELS: Record<string, string> = {
  meedoen: "Wil meedoen",
  meekijken: "Wil meekijken",
  contact: "Wil contact",
  vraag: "Heeft een vraag",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "Nieuw", color: "bg-blue-100 text-blue-700" },
  contacted: { label: "Contact gehad", color: "bg-yellow-100 text-yellow-700" },
  done: { label: "Afgerond", color: "bg-green-100 text-green-700" },
};

export default function ApplicationsPage() {
  const { id: orgId } = useParams<{ id: string }>();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch(`/api/admin/organizations/${orgId}/applications`)
      .then((r) => {
        if (r.status === 401) { router.push("/admin/login"); return null; }
        return r.json();
      })
      .then((d) => { if (d) setApplications(d); })
      .finally(() => setLoading(false));
  }, [orgId, router]);

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setApplications((prev) =>
      prev.map((a) => a.id === id ? { ...a, status } : a)
    );
  }

  const filtered = filter === "all"
    ? applications
    : applications.filter((a) => a.status === filter);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Laden…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href={`/admin/orgs/${orgId}`} className="text-sm text-gray-500 hover:text-gray-700">← Terug</Link>
        <h1 className="text-lg font-bold text-gray-900">Reacties</h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { value: "all", label: `Alle (${applications.length})` },
            { value: "new", label: `Nieuw (${applications.filter(a => a.status === "new").length})` },
            { value: "contacted", label: "Contact gehad" },
            { value: "done", label: "Afgerond" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? "bg-blue-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">Geen reacties gevonden.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => {
              const statusInfo = STATUS_LABELS[a.status] || STATUS_LABELS.new;
              return (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(a.createdAt).toLocaleDateString("nl-NL", {
                            day: "numeric", month: "long", year: "numeric"
                          })}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{a.participant.name}</h3>
                      <p className="text-sm text-gray-500">{a.participant.email}
                        {a.participant.phone && ` · ${a.participant.phone}`}
                      </p>
                    </div>

                    {/* Status wijzigen */}
                    <select
                      value={a.status}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="new">Nieuw</option>
                      <option value="contacted">Contact gehad</option>
                      <option value="done">Afgerond</option>
                    </select>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-28 flex-shrink-0">Taak</span>
                      <span className="text-gray-900 font-medium">{a.vacancy.title}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-28 flex-shrink-0">Reactie</span>
                      <span className="text-gray-900">{RESPONSE_LABELS[a.responseType] || a.responseType}</span>
                    </div>
                    {a.firstStepChoice && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 w-28 flex-shrink-0">Eerste stap</span>
                        <span className="text-gray-900">{a.firstStepChoice}</span>
                      </div>
                    )}
                    {a.availabilityNote && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 w-28 flex-shrink-0">Beschikbaarheid</span>
                        <span className="text-gray-900">{a.availabilityNote}</span>
                      </div>
                    )}
                    {a.message && (
                      <div className="flex gap-2">
                        <span className="text-gray-400 w-28 flex-shrink-0">Opmerking</span>
                        <span className="text-gray-900">{a.message}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-28 flex-shrink-0">Aanspreekpunt</span>
                      <span className="text-gray-900">{a.vacancy.contactPersonName}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <a
                      href={`mailto:${a.participant.email}`}
                      className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
                    >
                      E-mail sturen
                    </a>
                    {a.participant.phone && (
                      <a
                        href={`tel:${a.participant.phone}`}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
                      >
                        Bellen
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
