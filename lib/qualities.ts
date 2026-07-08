export const WORK_EXPERIENCE = [
  { id: "bestuur", label: "Bestuur / management" },
  { id: "onderwijs", label: "Onderwijs" },
  { id: "zorg", label: "Zorg" },
  { id: "administratie", label: "Administratie" },
  { id: "financien", label: "Financiën" },
  { id: "communicatie", label: "Communicatie" },
  { id: "ict", label: "ICT / techniek" },
  { id: "bouw", label: "Bouw / onderhoud" },
  { id: "creatief", label: "Creatief" },
  { id: "horeca", label: "Horeca / gastvrijheid" },
  { id: "logistiek", label: "Logistiek / planning" },
  { id: "ondernemerschap", label: "Ondernemerschap" },
  { id: "student", label: "Student / scholier" },
  { id: "thuis", label: "Thuis / gezin / mantelzorg" },
  { id: "anders", label: "Anders" },
];

export const QUALITY_CATEGORIES = [
  {
    id: "mensen",
    label: "Mensen & aandacht",
    qualities: [
      { id: "luisteren", label: "Goed kunnen luisteren" },
      { id: "empathie", label: "Empathie tonen" },
      { id: "bezoeken", label: "Mensen bezoeken" },
      { id: "bemoedigen", label: "Bemoedigen" },
      { id: "verbinden", label: "Mensen met elkaar verbinden" },
    ],
  },
  {
    id: "kinderen",
    label: "Kinderen & jongeren",
    qualities: [
      { id: "kinderopvang", label: "Werken met jonge kinderen" },
      { id: "tieners", label: "Werken met tieners" },
      { id: "jeugdactiviteiten", label: "Jeugdactiviteiten organiseren" },
      { id: "mentorschap", label: "Mentorschap" },
    ],
  },
  {
    id: "praktisch",
    label: "Praktisch helpen",
    qualities: [
      { id: "klussen", label: "Klussen en onderhoud" },
      { id: "rijden", label: "Mensen vervoeren" },
      { id: "koken", label: "Koken en maaltijden verzorgen" },
      { id: "opruimen", label: "Opruimen en organiseren" },
      { id: "helpen", label: "Spontaan helpen waar nodig" },
    ],
  },
  {
    id: "organiseren",
    label: "Organiseren & overzicht",
    qualities: [
      { id: "plannen", label: "Plannen en roosters maken" },
      { id: "coordineren", label: "Coördineren" },
      { id: "projecten", label: "Projecten leiden" },
      { id: "administratie2", label: "Administratieve taken" },
      { id: "overzicht", label: "Overzicht bewaken" },
    ],
  },
  {
    id: "communicatie2",
    label: "Communicatie & vormgeving",
    qualities: [
      { id: "schrijven", label: "Schrijven en redigeren" },
      { id: "socialmedia", label: "Social media beheren" },
      { id: "ontwerpen", label: "Ontwerpen en vormgeven" },
      { id: "fotografie", label: "Fotografie of video" },
      { id: "website", label: "Website bijhouden" },
    ],
  },
  {
    id: "techniek",
    label: "Techniek & media",
    qualities: [
      { id: "geluid", label: "Geluid en belichting" },
      { id: "livestream", label: "Livestream en opname" },
      { id: "ict2", label: "ICT en computers" },
      { id: "appen", label: "Apps en digitale tools" },
    ],
  },
  {
    id: "muziek",
    label: "Muziek & spreken",
    qualities: [
      { id: "muziekspelen", label: "Muziek spelen" },
      { id: "zingen", label: "Zingen" },
      { id: "dirigeren", label: "Dirigeren of leiden" },
      { id: "spreken", label: "Spreken voor een groep" },
    ],
  },
  {
    id: "geloof",
    label: "Geloof, gebed & Bijbel",
    qualities: [
      { id: "bijbelstudie", label: "Bijbelstudie begeleiden" },
      { id: "gebed", label: "Voorgaan in gebed" },
      { id: "pastoraat", label: "Pastoraal gesprek voeren" },
      { id: "geloofsopvoeding", label: "Geloofsopvoeding" },
    ],
  },
  {
    id: "geld",
    label: "Geld & administratie",
    qualities: [
      { id: "boekhouding", label: "Boekhouding" },
      { id: "begroting", label: "Begroting beheren" },
      { id: "fondsenwerving", label: "Fondsenwerving" },
      { id: "beleid", label: "Financieel beleid" },
    ],
  },
  {
    id: "strategie",
    label: "Strategie & beleid",
    qualities: [
      { id: "visie", label: "Visie ontwikkelen" },
      { id: "beleid2", label: "Beleid schrijven" },
      { id: "evalueren", label: "Evalueren en adviseren" },
      { id: "netwerken", label: "Netwerken" },
    ],
  },
];

export const NEGATIVE_PREFERENCES = [
  { id: "vooreenpgroep", label: "Voor een groep staan" },
  { id: "kinderen", label: "Werken met kinderen" },
  { id: "admin", label: "Administratie" },
  { id: "techniek", label: "Techniek" },
  { id: "overleg", label: "Veel overleg" },
  { id: "zwaregesprekken", label: "Zware gesprekken" },
  { id: "lastminute", label: "Last-minute taken" },
  { id: "podium", label: "Zichtbaar op podium" },
  { id: "regelmatig", label: "Regelmatig plannen" },
];

export const ALL_QUALITY_IDS: string[] = QUALITY_CATEGORIES.flatMap((c) =>
  c.qualities.map((q) => q.id)
);

export const WORK_TO_QUALITY_MAP: Record<string, string[]> = {
  bestuur: ["coordineren", "projecten", "overzicht", "visie", "beleid2"],
  onderwijs: ["kinderopvang", "tieners", "bijbelstudie", "spreken"],
  zorg: ["luisteren", "empathie", "bezoeken", "bemoedigen", "pastoraat"],
  administratie: ["administratie2", "plannen", "overzicht", "boekhouding"],
  financien: ["boekhouding", "begroting", "fondsenwerving", "beleid"],
  communicatie: ["schrijven", "socialmedia", "ontwerpen", "spreken"],
  ict: ["ict2", "appen", "website", "geluid", "livestream"],
  bouw: ["klussen", "helpen"],
  creatief: ["ontwerpen", "fotografie", "muziekspelen", "zingen"],
  horeca: ["koken", "helpen", "verbinden"],
  logistiek: ["plannen", "coordineren", "rijden", "overzicht"],
  ondernemerschap: ["netwerken", "fondsenwerving", "visie", "evalueren"],
  student: ["tieners", "jeugdactiviteiten", "ict2", "appen"],
  thuis: ["koken", "klussen", "empathie", "helpen"],
  anders: [],
};
