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

                  <ContactButtons
                    name={a.participant.name}
                    email={a.participant.email}
                    phone={a.participant.phone ?? null}
                    vacancyTitle={a.vacancy.title}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function toIntlPhone(phone: string): string {
  const clean = phone.replace(/[\s\-().]/g, "");
  if (clean.startsWith("+")) return clean.slice(1);
  if (clean.startsWith("00")) return clean.slice(2);
  if (clean.startsWith("0")) return "31" + clean.slice(1);
  return clean;
}

function openDeepLink(appUrl: string, webUrl: string) {
  let appOpened = false;
  const onHide = () => { appOpened = true; };
  document.addEventListener("visibilitychange", onHide);
  window.location.href = appUrl;
  setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    if (!appOpened) window.open(webUrl, "_blank");
  }, 1500);
}

function ContactButtons({ name, email, phone, vacancyTitle }: {
  name: string; email: string; phone: string | null; vacancyTitle: string;
}) {
  const msg = `Hallo ${name},\n\nJe hebt je aangemeld voor "${vacancyTitle}". Graag neem ik contact met je op.\n\nMet vriendelijke groet`;
  const intl = phone ? toIntlPhone(phone) : null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {/* E-mail — opent lokale mailclient */}
      <a href={`mailto:${email}?subject=Aanmelding ${vacancyTitle}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        E-mail
      </a>

      {/* WhatsApp — met nummer: app-eerst, web fallback. Zonder nummer: web contact-picker */}
      <button
        onClick={() => intl
          ? openDeepLink(
              `whatsapp://send?phone=${intl}&text=${encodeURIComponent(msg)}`,
              `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`
            )
          : openDeepLink(
              `whatsapp://send?text=${encodeURIComponent(msg)}`,
              `https://wa.me/?text=${encodeURIComponent(msg)}`
            )
        }
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
        <svg className="w-3.5 h-3.5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.555 4.104 1.523 5.83L0 24l6.336-1.495A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.028-1.382l-.36-.214-3.732.88.937-3.636-.236-.374A9.818 9.818 0 1112 21.818z"/></svg>
        WhatsApp
      </button>

      {/* SMS — altijd tonen, zonder nummer opent app zonder ontvanger */}
      <a href={phone ? `sms:${phone}?body=${encodeURIComponent(msg)}` : `sms:?body=${encodeURIComponent(msg)}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        SMS
      </a>

      {/* Bellen — alleen als telefoonnummer bekend */}
      {phone && (
        <a href={`tel:${phone}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          Bellen
        </a>
      )}
    </div>
  );
}
