"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Vacancy {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
}

interface OrgInfo {
  id: string;
  name: string;
  primaryColor: string;
}

export default function InviteLanding() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/editor/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setOrg(d.org);
        setVacancies(d.vacancies);
        // Sla token op in sessionStorage voor de edit-pagina
        sessionStorage.setItem("editor_token", token);
      })
      .catch(() => setError("Kon gegevens niet laden"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400">Laden…</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-2xl mb-2">🔗</p>
        <p className="text-gray-700 font-medium">{error}</p>
        <p className="text-sm text-gray-400 mt-2">Vraag de beheerder om een nieuwe link te sturen.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: org?.primaryColor }} />
          <div>
            <h1 className="text-lg font-bold text-gray-900">{org?.name}</h1>
            <p className="text-sm text-gray-500">Taken bewerken — wijzigingen worden ter goedkeuring ingediend</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6 text-sm text-amber-800">
          <strong>Let op:</strong> Jouw wijzigingen worden <em>niet direct</em> zichtbaar. De beheerder keurt elke aanpassing eerst goed.
        </div>

        <div className="space-y-2">
          {vacancies.map((v) => (
            <Link
              key={v.id}
              href={`/uitnodigen/${token}/vacatures/${v.id}`}
              className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-gray-900">{v.title}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{v.category}</span>
                </div>
                <p className="text-sm text-gray-500">{v.shortDescription}</p>
              </div>
              <span className="text-xs text-blue-500 mt-1 flex-shrink-0">Bewerken →</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
