"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Org {
  id: string;
  name: string;
  slug: string;
  organizationType: string;
  place: string | null;
  primaryColor: string;
  isActive: boolean;
  _count: { vacancies: number; participants: number };
}

const TYPE_LABELS: Record<string, string> = {
  kerk: "Kerk",
  vereniging: "Vereniging",
  stichting: "Stichting",
  school: "School",
  anders: "Anders",
};

export default function Dashboard() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/organizations")
      .then((r) => {
        if (r.status === 401) { router.push("/admin/login"); return null; }
        return r.json();
      })
      .then((data) => { if (data) setOrgs(data); })
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Laden…</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Gavenmatch — Beheerpaneel</h1>
        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">Uitloggen</button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Jouw organisaties</h2>
          <Link
            href="/admin/orgs/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Nieuwe organisatie
          </Link>
        </div>

        {orgs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">Je hebt nog geen organisaties aangemaakt.</p>
            <Link href="/admin/orgs/new" className="text-blue-600 font-medium hover:underline">
              Maak je eerste organisatie aan →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orgs.map((org) => (
              <Link
                key={org.id}
                href={`/admin/orgs/${org.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: org.primaryColor }} />
                      <h3 className="font-semibold text-gray-900">{org.name}</h3>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[org.organizationType] || org.organizationType}
                      </span>
                    </div>
                    {org.place && <p className="text-sm text-gray-500">{org.place}</p>}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{org._count.vacancies} taken</p>
                    <p>{org._count.participants} deelnemers</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
