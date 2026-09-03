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

  const steps: { t: string; d: string; icon: string }[] = [
    { t: "Vertel kort over jezelf", d: "Een paar vragen — geen account nodig.", icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" },
    { t: "Zie taken die bij je passen", d: "De app zoekt op jouw gaven en talenten.", icon: "M12 2l2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z" },
    { t: "Reageer op wat je aanspreekt", d: "Jij houdt de regie — nergens toe verplicht.", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
  ];

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: `radial-gradient(120% 55% at 50% -8%, ${org.primaryColor}22 0%, transparent 60%), #faf9f7` }}
    >
      <div className="max-w-sm w-full text-center">
        <div
          className="w-[60px] h-[60px] rounded-[18px] mx-auto mb-5 flex items-center justify-center text-white text-2xl font-bold"
          style={{ backgroundColor: org.primaryColor, boxShadow: `0 10px 24px -8px ${org.primaryColor}b3` }}
        >
          {org.name[0]}
        </div>

        <p className="text-[11.5px] font-semibold uppercase tracking-[0.13em] mb-1.5" style={{ color: org.primaryColor }}>
          GavenMatch
        </p>
        <h1 className="text-[26px] font-bold text-gray-900 tracking-tight text-balance">{org.name}</h1>
        {org.place && <p className="text-sm text-gray-400 mt-0.5">{org.place}</p>}

        <p className="text-[15px] text-gray-600 leading-relaxed mt-4 mb-6 mx-auto max-w-[33ch]">{welcomeText}</p>

        <div className="bg-white border border-gray-200/80 rounded-[18px] shadow-sm text-left mb-5 divide-y divide-gray-100">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3.5 px-4 py-3 relative">
              <div className="w-[38px] h-[38px] rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${org.primaryColor}14`, color: org.primaryColor }}>
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
              <span className="absolute left-[38px] top-2 w-[17px] h-[17px] rounded-full text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
                style={{ backgroundColor: org.primaryColor }}>{i + 1}</span>
              <div>
                <div className="font-semibold text-[14.5px] text-gray-900 tracking-tight">{s.t}</div>
                <div className="text-[12.5px] text-gray-400">{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        <Link
          href={`/g/${org.slug}/start`}
          className="block w-full py-4 rounded-2xl font-semibold text-white text-base transition-transform hover:-translate-y-0.5"
          style={{ backgroundColor: org.primaryColor, boxShadow: `0 12px 30px -12px ${org.primaryColor}` }}
        >
          Beginnen
        </Link>

        <div className="mt-3.5 text-[12.5px] text-gray-400 flex items-center justify-center gap-2 flex-wrap">
          <span>± 5 minuten</span>
          <span className="w-[3px] h-[3px] rounded-full bg-gray-300" />
          <span>geen account nodig</span>
          <span className="w-[3px] h-[3px] rounded-full bg-gray-300" />
          <span>vrijblijvend</span>
        </div>
      </div>
    </main>
  );
}
