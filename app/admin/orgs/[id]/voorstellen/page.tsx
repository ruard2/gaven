"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Proposal {
  id: string;
  vacancyId: string;
  proposedData: string;
  editorName: string | null;
  createdAt: string;
  vacancy: { title: string };
}

const FIELD_LABELS: Record<string, string> = {
  title: "Taaknaam",
  shortDescription: "Korte omschrijving",
  whyValuable: "Waarom waardevol",
  concreteTasks: "Concreet",
  firstStep: "Eerste stap",
};

export default function ProposalsPage() {
  const { id: orgId } = useParams<{ id: string }>();
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/organizations/${orgId}/proposals`)
      .then((r) => {
        if (r.status === 401) { router.push("/admin/login"); return null; }
        return r.json();
      })
      .then((d) => { if (d) setProposals(d); })
      .finally(() => setLoading(false));
  }, [orgId, router]);

  async function act(id: string, action: "approve" | "reject") {
    setActing(id);
    await fetch(`/api/admin/proposals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setProposals((prev) => prev.filter((p) => p.id !== id));
    setActing(null);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">Laden…</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href={`/admin/orgs/${orgId}`} className="text-sm text-gray-500 hover:text-gray-700">← Terug</Link>
        <h1 className="text-lg font-bold text-gray-900">Ingediende wijzigingen ({proposals.length})</h1>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {proposals.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">Geen openstaande wijzigingen.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {proposals.map((p) => {
              const data = JSON.parse(p.proposedData) as Record<string, string>;
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{p.vacancy.title}</h3>
                      <p className="text-sm text-gray-500">
                        Ingediend door <strong>{p.editorName || "onbekend"}</strong> op{" "}
                        {new Date(p.createdAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => act(p.id, "reject")}
                        disabled={acting === p.id}
                        className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        Afwijzen
                      </button>
                      <button
                        onClick={() => act(p.id, "approve")}
                        disabled={acting === p.id}
                        className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {acting === p.id ? "…" : "Goedkeuren"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 bg-gray-50 rounded-xl p-4 text-sm">
                    {Object.entries(data).map(([key, value]) => (
                      <div key={key} className="flex gap-3">
                        <span className="text-gray-400 w-40 flex-shrink-0">{FIELD_LABELS[key] || key}</span>
                        <span className="text-gray-900">{value || <em className="text-gray-300">leeg</em>}</span>
                      </div>
                    ))}
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
