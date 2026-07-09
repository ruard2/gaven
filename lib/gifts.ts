export interface BiblicalGift {
  id: string;
  name: string;
  description: string;
  scripture: string;
}

export interface BiblicalFamily {
  familie: string; // matches gave-familie label in app
  label: "Koninklijk" | "Priesterlijk" | "Profetisch";
  gifts: BiblicalGift[];
}

export const BIBLICAL_FAMILIES: BiblicalFamily[] = [
  {
    familie: "Richting & structuur",
    label: "Koninklijk",
    gifts: [
      {
        id: "apostelschap",
        name: "Apostelschap / pionieren",
        description: "Nieuw terrein openen, funderen, zenden, bouwen.",
        scripture: "1 Kor. 12:28–29; Ef. 4:11",
      },
      {
        id: "leidinggeven",
        name: "Leidinggeven",
        description: "Mensen met ijver meenemen in richting, verantwoordelijkheid en visie.",
        scripture: "Rom. 12:8",
      },
      {
        id: "besturen",
        name: "Besturen / administratie",
        description: "Organiseren, sturen, ordenen en zorgen dat taken gedaan worden.",
        scripture: "1 Kor. 12:28",
      },
      {
        id: "woord-wijsheid",
        name: "Woord van wijsheid",
        description: "Geestelijk en praktisch inzicht voor keuzes, beleid en richting.",
        scripture: "1 Kor. 12:8",
      },
      {
        id: "bijzonder-geloof",
        name: "Bijzonder geloof",
        description: "Geestgegeven vertrouwen om Gods weg te zien en te gaan.",
        scripture: "1 Kor. 12:9; 1 Kor. 13:2",
      },
      {
        id: "werkingen-krachten",
        name: "Werkingen van krachten",
        description: "Tekenen van Gods koninklijke macht over gebrokenheid en machten.",
        scripture: "1 Kor. 12:10, 28–29; Hebr. 2:4",
      },
      {
        id: "vakmanschap",
        name: "Vakmanschap / creatieve bekwaamheid",
        description: "Door Gods Geest gegeven kunde om iets moois, goeds en bruikbaars te maken.",
        scripture: "Ex. 31:1–11; Ex. 35:30–36:2",
      },
      {
        id: "strategisch-bouwen",
        name: "Strategisch bouwen",
        description: "Mensen, middelen en mogelijkheden samenbrengen voor Christus' Koninkrijk.",
        scripture: "Ef. 4:11–16; 1 Kor. 12:4–7",
      },
    ],
  },
  {
    familie: "Zorg & aanwezigheid",
    label: "Priesterlijk",
    gifts: [
      {
        id: "bemoedigen",
        name: "Bemoedigen / vertroosten",
        description: "Mensen aansporen, optillen, corrigeren en moed geven.",
        scripture: "Rom. 12:8; 1 Kor. 14:3",
      },
      {
        id: "hulpbetoon",
        name: "Hulpbetoon / helpen",
        description: "Echte bijstand geven zonder jezelf centraal te zetten of de ander over te nemen.",
        scripture: "1 Kor. 12:28",
      },
      {
        id: "dienen",
        name: "Dienen / praktische dienst",
        description: "Concrete noden zien en praktisch aanpakken.",
        scripture: "Rom. 12:7; 1 Petr. 4:10–11",
      },
      {
        id: "genezingen",
        name: "Gaven van genezingen",
        description: "Instrument zijn in herstel: lichamelijk, emotioneel of geestelijk.",
        scripture: "1 Kor. 12:9, 28, 30; Jak. 5:14–16",
      },
      {
        id: "herderschap",
        name: "Herderschap / pastoraat",
        description: "Mensen kennen, verzorgen en helpen groeien in Christus.",
        scripture: "Ef. 4:11; Hand. 20:28; 1 Petr. 5:2–4",
      },
      {
        id: "uitdelen",
        name: "Uitdelen / geven",
        description: "Geld, middelen, tijd of aandacht ruimhartig beschikbaar stellen.",
        scripture: "Rom. 12:8",
      },
      {
        id: "barmhartigheid",
        name: "Barmhartigheid",
        description: "Met diepe bewogenheid en vreugde dichtbij mensen in nood zijn.",
        scripture: "Rom. 12:8",
      },
      {
        id: "voorbede",
        name: "Voorbede",
        description: "Mensen, noden en gemeente krachtig voor Gods aangezicht dragen.",
        scripture: "Ef. 6:18; Kol. 4:12; Jak. 5:15–16",
      },
      {
        id: "gastvrijheid",
        name: "Gastvrijheid",
        description: "Ruimte maken voor de ander: huis, tafel, tijd en leven openen.",
        scripture: "Rom. 12:13; Hebr. 13:2; 1 Petr. 4:9",
      },
    ],
  },
  {
    familie: "Woord & waarheid",
    label: "Profetisch",
    gifts: [
      {
        id: "profetie",
        name: "Profetie",
        description: "Gods waarheid krachtig, toegepast en opbouwend spreken.",
        scripture: "Rom. 12:6; 1 Kor. 12:10, 28–29; Ef. 4:11",
      },
      {
        id: "evangelisatie",
        name: "Evangelisatie",
        description: "Mensen helpen het evangelie te horen, begrijpen en geloven.",
        scripture: "Ef. 4:11",
      },
      {
        id: "onderwijs",
        name: "Onderwijs / leraarschap",
        description: "Mensen helpen leren, begrijpen en groeien in de waarheid.",
        scripture: "Rom. 12:7; 1 Kor. 12:28–29; Ef. 4:11",
      },
      {
        id: "spreken",
        name: "Spreken / verkondigen",
        description: "De gave om Gods woorden helder, krachtig en overtuigend te spreken.",
        scripture: "1 Petr. 4:10–11",
      },
      {
        id: "woord-kennis",
        name: "Woord van kennis",
        description: "Geestelijk inzicht in waarheid, situatie of werkelijkheid.",
        scripture: "1 Kor. 12:8",
      },
      {
        id: "onderscheiden",
        name: "Onderscheiden van geesten",
        description: "Onderscheiden wat echt of vals is, gezond of ongezond, Geest of vlees.",
        scripture: "1 Kor. 12:10; 1 Joh. 4:1; 1 Thess. 5:19–21",
      },
      {
        id: "openbarend-spreken",
        name: "Openbarend spreken",
        description: "Een bijdrage waardoor de gemeente iets van Gods waarheid scherper ziet.",
        scripture: "1 Kor. 14:26, 29–31",
      },
    ],
  },
];

export function getGiftsForFamilie(familie: string): BiblicalFamily | null {
  return BIBLICAL_FAMILIES.find((f) => f.familie === familie) ?? null;
}
