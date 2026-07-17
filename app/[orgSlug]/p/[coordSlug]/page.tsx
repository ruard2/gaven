"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Section { id: string; type: string; title: string; content: string | null; url: string | null; }
interface PageData {
  org: { name: string; slug: string; primaryColor: string; logoUrl: string | null };
  coordinator: { name: string; email: string; roleTitle: string | null; pageSections: Section[] };
}

function openDeepLink(appUrl: string, fallback: string) {
  const start = Date.now();
  window.location.href = appUrl;
  setTimeout(() => { if (Date.now() - start < 2000) window.open(fallback, "_blank"); }, 1500);
}

export default function CoordinatorPage() {
  const { orgSlug, coordSlug } = useParams<{ orgSlug: string; coordSlug: string }>();
  const [data, setData] = useState<PageData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/coordinator?orgSlug=${orgSlug}&coordSlug=${coordSlug}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError("Kon pagina niet laden"))
      .finally(() => setLoading(false));
  }, [orgSlug, coordSlug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400">Laden…</p></div>;
  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-sm px-6">
        <p className="text-3xl mb-4">🔍</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Pagina niet gevonden</h1>
        <p className="text-sm text-gray-500">{error || "Deze pagina bestaat niet."}</p>
      </div>
    </div>
  );

  const { org, coordinator } = data;
  const color = org.primaryColor || "#2563eb";
  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = `${coordinator.roleTitle || coordinator.name} — ${org.name}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {org.logoUrl ? (
            <img src={org.logoUrl} alt={org.name} className="h-8 w-auto object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: color }}>
              {org.name.charAt(0)}
            </div>
          )}
          <span className="font-semibold text-gray-900">{org.name}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Coordinator kaart */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0" style={{ background: color }}>
              {coordinator.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">{coordinator.roleTitle || coordinator.name}</h1>
              {coordinator.roleTitle && <p className="text-sm text-gray-500 mt-0.5">{coordinator.name}</p>}
              <a href={`mailto:${coordinator.email}`} className="text-sm text-blue-600 hover:underline mt-1 inline-block">{coordinator.email}</a>
            </div>
          </div>

          {/* Deelknoppen */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">Deel deze pagina</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openDeepLink(`whatsapp://send?text=${encodeURIComponent(shareText + "\n" + pageUrl)}`, `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + pageUrl)}`)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium hover:bg-green-100 transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </button>
              <a href={`mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareText + "\n\n" + pageUrl)}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                E-mail
              </a>
              <button
                onClick={() => navigator.clipboard?.writeText(pageUrl)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Link kopiëren
              </button>
            </div>
          </div>
        </div>

        {/* Secties */}
        {coordinator.pageSections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">De coördinator heeft nog geen informatie toegevoegd.</p>
          </div>
        ) : (
          coordinator.pageSections.map((s) => (
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

        <p className="text-center text-xs text-gray-400 pb-4">
          Pagina via Gavenmatch &bull; {org.name}
        </p>
      </main>
    </div>
  );
}
