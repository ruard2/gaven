import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await prisma.organization.findFirst({
    where: { OR: [{ slug }, { publicCode: slug }], isActive: true },
    select: { name: true, place: true, welcomeText: true, organizationType: true },
  });
  if (!org) return { title: "Gavenmatch" };

  const description = org.welcomeText || "Ontdek waar jouw gaven kunnen dienen. Vul in enkele minuten je profiel in.";

  return {
    title: `${org.name} — Gavenmatch`,
    description,
    openGraph: {
      title: `${org.name} — Gavenmatch`,
      description,
      siteName: "Gavenmatch",
      locale: "nl_NL",
      type: "website",
    },
  };
}

export default async function GroupPage({ params }: Props) {
  const { slug } = await params;

  const org = await prisma.organization.findFirst({
    where: { OR: [{ slug }, { publicCode: slug }], isActive: true },
    select: { id: true, name: true, slug: true, organizationType: true, place: true, primaryColor: true, welcomeText: true },
  });

  if (!org) notFound();

  const ORG_WELCOME: Record<string, string> = {
    kerk: "Ontdek waar jouw gaven de gemeente kunnen dienen. Vul in enkele minuten je profiel in.",
    vereniging: "Ontdek welke vrijwilligersrol bij jou past. Kijk waar jouw talenten kunnen helpen.",
    stichting: "Ontdek waar jij kunt bijdragen. Scan, vul kort je profiel in en zie welke taken bij jou passen.",
    school: "Ontdek welke rol bij jou past als vrijwilliger. Vul kort je profiel in.",
    anders: "Ontdek waar jij kunt meebouwen. Vul kort je profiel in en zie welke taken bij jou kunnen passen.",
  };

  const welcomeText = org.welcomeText || ORG_WELCOME[org.organizationType] || ORG_WELCOME.anders;

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: `linear-gradient(135deg, ${org.primaryColor}15 0%, white 60%)` }}
    >
      <div className="max-w-sm w-full text-center">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
          style={{ backgroundColor: org.primaryColor }}
        >
          {org.name[0]}
        </div>

        <p className="text-sm font-medium uppercase tracking-wide mb-1" style={{ color: org.primaryColor }}>
          Gavenmatch
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{org.name}</h1>
        {org.place && <p className="text-sm text-gray-500 mb-4">{org.place}</p>}

        <p className="text-gray-600 mb-8 leading-relaxed">{welcomeText}</p>

        <Link
          href={`/g/${org.slug}/start`}
          className="block w-full py-3.5 rounded-xl font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: org.primaryColor }}
        >
          Start
        </Link>

        <p className="mt-4 text-xs text-gray-400">Duurt ongeveer 5 minuten</p>
      </div>
    </main>
  );
}
