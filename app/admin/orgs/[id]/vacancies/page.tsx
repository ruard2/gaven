"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Vacancy {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  status: string;
  contactPersonName: string;
}

interface Org {
  id: string;
  name: string;
  primaryColor: string;
  vacancies: Vacancy[];
}

export default function VacanciesPage() {
  const { id: orgId } = useParams<{ id: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/organizations/${orgId}`)
      .then((r) => {
        if (r.status === 401) { router.push("/admin/login"); return null; }
        return r.json();
      })
      .then((d) => { if (d) setOrg(d); })
      .finally(() => setLoading(false));
  }, [orgId, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Laden…</p></div>;
  if (!org) return <div className="min-h-screen flex items-center justify-center"><p className="text-red-500">Niet gevonden</p></div>;

  const active = org.vacancies.filter((v) => v.status === "active");
  const other = org.vacancies.filter((v) => v.status !== "active");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/orgs/${orgId}`} className="text-sm text-gray-500 hover:text-gray-700">← Terug</Link>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: org.primaryColor }} />
            <h1 className="text-lg font-bold text-gray-900">Taken — {org.name}</h1>
          </div>
        </div>
        <Link
          href={`/admin/orgs/${orgId}/vacancies/new`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Taak toevoegen
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {org.vacancies.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 mb-4">Nog geen taken aangemaakt.</p>
            <Link
              href={`/admin/orgs/${orgId}/vacancies/new`}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Eerste taak toevoegen
            </Link>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Actief ({active.length})</h2>
                <div className="space-y-2">
                  {active.map((v) => (
                    <Link
                      key={v.id}
                      href={`/admin/orgs/${orgId}/vacancies/${v.id}`}
                      className="flex items-start justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{v.title}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0">{v.category}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{v.shortDescription}</p>
                      </div>
                      <span className="text-xs text-gray-400 mt-1 ml-4 flex-shrink-0">{v.contactPersonName}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {other.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h2 className="font-semibold text-gray-500 mb-4 text-sm uppercase tracking-wide">Gepauzeerd / ingevuld ({other.length})</h2>
                <div className="space-y-2">
                  {other.map((v) => (
                    <Link
                      key={v.id}
                      href={`/admin/orgs/${orgId}/vacancies/${v.id}`}
                      className="flex items-start justify-between p-4 border border-gray-200 rounded-xl hover:border-blue-300 transition-colors opacity-60"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{v.title}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0">{v.category}</span>
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full flex-shrink-0">{v.status}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{v.shortDescription}</p>
                      </div>
                      <span className="text-xs text-gray-400 mt-1 ml-4 flex-shrink-0">{v.contactPersonName}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
