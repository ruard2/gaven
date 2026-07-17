"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface DocumentMeta { id: string; filename: string; mimeType: string; size: number; }
interface Section { id: string; type: string; title: string; content: string | null; url: string | null; document: DocumentMeta | null; }

function fileIcon(mime: string): string {
  if (mime.includes("pdf")) return "📕";
  if (mime.includes("word") || mime.includes("wordprocessing")) return "📘";
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return "📗";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "📙";
  if (mime.startsWith("image/")) return "🖼️";
  return "📄";
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// PDF en afbeeldingen tonen browsers zelf; Office-bestanden via de Office-viewer.
function viewerUrl(doc: DocumentMeta): string | null {
  const src = `${window.location.origin}/api/public/document/${doc.id}`;
  if (doc.mimeType === "application/pdf" || doc.mimeType.startsWith("image/") || doc.mimeType.startsWith("text/")) {
    return src;
  }
  const officeTypes = ["word", "wordprocessing", "sheet", "excel", "presentation", "powerpoint", "ms-"];
  if (officeTypes.some((t) => doc.mimeType.includes(t))) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(src)}`;
  }
  return null;
}
interface RosterEntry { id: string; name: string; date: string | null; role: string | null; notes: string | null; }
interface Roster { id: string; title: string; entries: RosterEntry[]; }
interface PageData {
  org: { name: string; slug: string; primaryColor: string; logoUrl: string | null };
  coordinator: { id: string; name: string; email: string; roleTitle: string | null; pageIntro: string | null; pageSections: Section[] };
  rosters: Roster[];
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}


export default function CoordinatorPage() {
  const { orgSlug, coordSlug } = useParams<{ orgSlug: string; coordSlug: string }>();
  const [data, setData] = useState<PageData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<DocumentMeta | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetch(`/api/public/coordinator?orgSlug=${orgSlug}&coordSlug=${coordSlug}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
        // Terugknop alleen voor de ingelogde eigenaar van deze pagina
        fetch("/api/coordinator/me")
          .then((r) => (r.ok ? r.json() : null))
          .then((me) => { if (me?.id && me.id === d.coordinator.id) setIsOwner(true); })
          .catch(() => {});
      })
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

  const { org, coordinator, rosters } = data;
  const color = org.primaryColor || "#2563eb";
  const activeRosters = (rosters || []).filter((r) => r.entries.length > 0);

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
          {isOwner && (
            <a href="/coordinator/dashboard"
              className="ml-auto flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Naar dashboard
            </a>
          )}
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
          {coordinator.pageIntro && (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mt-4 pt-4 border-t border-gray-100">
              {coordinator.pageIntro}
            </p>
          )}
        </div>

        {/* Roosters */}
        {activeRosters.map((r) => (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5" style={{ color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="font-semibold text-gray-900">{r.title}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                    <th className="pb-2 pr-4 font-medium">Datum</th>
                    <th className="pb-2 pr-4 font-medium">Naam</th>
                    <th className="pb-2 font-medium">Taak</th>
                  </tr>
                </thead>
                <tbody>
                  {r.entries.map((e) => (
                    <tr key={e.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">{formatDate(e.date) || "—"}</td>
                      <td className="py-2.5 pr-4 font-medium text-gray-800">{e.name}</td>
                      <td className="py-2.5 text-gray-500">{e.role || e.notes || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Secties */}
        {coordinator.pageSections.length === 0 && activeRosters.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
            <p className="text-gray-400 text-sm">De coördinator heeft nog geen informatie toegevoegd.</p>
          </div>
        ) : (
          coordinator.pageSections.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-3">{s.title}</h2>
              {s.type === "file" && s.document ? (
                <div className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl flex-shrink-0">{fileIcon(s.document.mimeType)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.document.filename}</p>
                      <p className="text-xs text-gray-400">{fileSize(s.document.size)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setViewing(s.document!)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ background: color }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      Bekijken
                    </button>
                    <a href={`/api/public/document/${s.document.id}?download=1`}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                  </div>
                </div>
              ) : s.type === "link" && s.url ? (
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

      {/* Document viewer */}
      {viewing && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col" onClick={() => setViewing(null)}>
          <div className="flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0 flex items-center gap-2">
              <span className="text-lg flex-shrink-0">{fileIcon(viewing.mimeType)}</span>
              <p className="text-sm font-medium text-gray-900 truncate">{viewing.filename}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a href={`/api/public/document/${viewing.id}?download=1`}
                className="text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                Download
              </a>
              <button onClick={() => setViewing(null)} className="text-gray-500 hover:text-gray-800 p-1.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0" onClick={(e) => e.stopPropagation()}>
            {viewerUrl(viewing) ? (
              <iframe src={viewerUrl(viewing)!} className="w-full h-full border-0 bg-white" title={viewing.filename} />
            ) : (
              <div className="h-full flex items-center justify-center text-center px-6">
                <div className="bg-white rounded-2xl p-8 max-w-sm">
                  <p className="text-4xl mb-3">{fileIcon(viewing.mimeType)}</p>
                  <p className="text-sm text-gray-600 mb-4">Dit bestandstype kan niet online worden getoond.</p>
                  <a href={`/api/public/document/${viewing.id}?download=1`}
                    className="inline-block px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: color }}>
                    Download bestand
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
