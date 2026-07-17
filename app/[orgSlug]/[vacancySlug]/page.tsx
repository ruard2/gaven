"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Section {
  id: string; type: string; title: string; content: string | null; url: string | null; order: number;
}
interface TeamData {
  org: { name: string; primaryColor: string; logoUrl: string | null; slug: string };
  vacancy: { id: string; title: string; category: string; shortDescription: string; slug: string };
  coordinators: { name: string; email: string }[];
  sections: Section[];
}

export default function TeamPage() {
  const { orgSlug, vacancySlug } = useParams<{ orgSlug: string; vacancySlug: string }>();
  const [data, setData] = useState<TeamData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/team?orgSlug=${orgSlug}&vacancySlug=${vacancySlug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Kon pagina niet laden"))
      .finally(() => setLoading(false));
  }, [orgSlug, vacancySlug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400">Laden…</p>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <p className="text-3xl mb-4">🔍</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Pagina niet gevonden</h1>
        <p className="text-sm text-gray-500">{error || "Deze teampagina bestaat niet of is niet actief."}</p>
      </div>
    </div>
  );

  const { org, vacancy, coordinators, sections } = data;
  const color = org.primaryColor || "#2563eb";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={org.name} className="h-8 w-auto object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: color }}>
              {org.name.charAt(0)}
            </div>
          )}
          <span className="font-semibold text-gray-900">{org.name}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Titel kaart */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18` }}>
              <svg className="w-6 h-6" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color }}>{vacancy.category}</p>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{vacancy.title}</h1>
              {vacancy.shortDescription && (
                <p className="text-gray-600 text-sm leading-relaxed">{vacancy.shortDescription}</p>
              )}
            </div>
          </div>

          {/* Coördinatoren */}
          {coordinators.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
                {coordinators.length === 1 ? "Coördinator" : "Coördinatoren"}
              </p>
              <div className="flex flex-col gap-2">
                {coordinators.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: color }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.name}</p>
                      <a href={`mailto:${c.email}`} className="text-xs text-blue-600 hover:underline">{c.email}</a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Secties */}
        {sections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">De coördinator heeft nog geen informatie toegevoegd.</p>
          </div>
        ) : (
          sections.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-3">{s.title}</h2>
              {s.type === "link" && s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
                  style={{ background: color }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {s.content || "Openen"}
                </a>
              ) : (
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{s.content}</p>
              )}
            </div>
          ))
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Teampagina via Gavenmatch &bull; {org.name}
        </p>
      </main>
    </div>
  );
}
