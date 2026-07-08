// Seed-script: maakt alle vacatures aan voor NGK Middelharnis
// Gebruik: node scripts/seed-vacancies.mjs

const BASE = "http://localhost:3000";
const ORG_ID = "cmqwsfpam00015gq1re0l6z85";

const VACANCIES = [
  {
    title: "PPT-maker zondagsdienst",
    category: "Muziek & eredienst",
    shortDescription: "Jij verzorgt de presentatie tijdens de zondagsdienst — liedteksten, schriftlezingen en aankondigingen op het scherm.",
    whyValuable: "Een goede presentatie helpt de gemeente om mee te zingen en mee te lezen. Jij zorgt dat de dienst soepel verloopt en mensen niet worden afgeleid door fouten op het scherm.",
    concreteTasks: "Liedteksten en Bijbelgedeelten voorbereiden in PowerPoint of ProPresenter. Op zondagochtend op tijd aanwezig zijn om alles te testen. Tijdens de dienst de slides bedienen op het juiste moment.",
    firstStep: "Een keer meekijken hoe een huidige PPT-maker het doet.",
    contactPersonName: "Coördinator eredienst",
    contactPersonEmail: "eredienst@ngkmiddelharnis.nl",
  },
  {
    title: "Mentor tieners",
    category: "Jeugd",
    shortDescription: "Jij begeleidt een kleine groep tieners in hun geloofsgroei — als mentor, gespreksleider en vertrouwenspersoon.",
    whyValuable: "Tieners hebben volwassenen nodig die écht luisteren en hen serieus nemen in hun vragen over geloof en leven. Een mentor kan een blijvend verschil maken in deze fase.",
    concreteTasks: "Wekelijks of tweewekelijks bijeenkomen met een groepje tieners (4-6 personen). Bijbelstudie begeleiden, vragen bespreken, contact houden ook buiten de groep.",
    firstStep: "Een gesprek met de jeugdcoördinator over de aanpak en de groep.",
    contactPersonName: "Jeugdcoördinator",
    contactPersonEmail: "jeugd@ngkmiddelharnis.nl",
  },
  {
    title: "Leider kinderclub tijdens dienst",
    category: "Jeugd",
    shortDescription: "Jij begeleidt kinderen (4–12 jaar) tijdens de zondagsdienst met een eigen programma passend bij het thema van de preek.",
    whyValuable: "Kinderen leren op hun eigen niveau over God. Jij maakt kerk voor hen leuk, begrijpelijk en herkenbaar — dat legt een fundament voor de rest van hun leven.",
    concreteTasks: "Kinderprogramma voorbereiden en uitvoeren. Creatieve werkvormen, verhalen en activiteiten aanbieden. Kinderen ophalen uit de dienst en na afloop terugbrengen.",
    firstStep: "Een keer meedraaien als assistent bij de bestaande kinderclub.",
    contactPersonName: "Coördinator kinderwerk",
    contactPersonEmail: "kinderen@ngkmiddelharnis.nl",
  },
  {
    title: "Geluidscoördinator",
    category: "Techniek",
    shortDescription: "Jij coördineert het geluidsteam — roosters, training van vrijwilligers en het bewaken van de geluidskwaliteit tijdens diensten.",
    whyValuable: "Goed geluid is onzichtbaar als het klopt, en enorm storend als het niet klopt. Als coördinator zorg jij dat het team op orde is en dat de kwaliteit constant blijft.",
    concreteTasks: "Vrijwilligers inroosteren en trainen. Aanwezig bij bijzondere diensten. Overleggen met de predikant en muziekteam over wensen. Beheer van apparatuur.",
    firstStep: "Een gesprek met de huidige coördinator over overname van taken.",
    contactPersonName: "Technisch beheer",
    contactPersonEmail: "techniek@ngkmiddelharnis.nl",
  },
  {
    title: "Geluidstechnicus",
    category: "Techniek",
    shortDescription: "Jij bedient de mengtafel tijdens de zondagsdienst en zorgt voor helder, gebalanceerd geluid voor gemeente en muzikanten.",
    whyValuable: "De gemeente moet de predikant en de muziek goed kunnen horen. Jij zorgt in de achtergrond dat alles klopt — onmisbaar voor elke dienst.",
    concreteTasks: "Op tijd aanwezig voor soundcheck. Microfoons instellen voor predikant, lezers en muzikanten. Tijdens de dienst het geluidsniveau bewaken en bijsturen.",
    firstStep: "Een keer meekijken naast een ervaren geluidstechnicus.",
    contactPersonName: "Geluidscoördinator",
    contactPersonEmail: "techniek@ngkmiddelharnis.nl",
  },
  {
    title: "Muzikant worship team",
    category: "Muziek & eredienst",
    shortDescription: "Jij speelt of zingt mee in het worship team tijdens de zondagsdienst en helpt de gemeente om God te loven.",
    whyValuable: "Muziek raakt mensen op een manier die woorden alleen niet kunnen. Als muzikant of zanger draag jij bij aan een dienst waar mensen God écht ontmoeten.",
    concreteTasks: "Wekelijks of om de week meespelen of meezingen. Aanwezig bij de repetitie op zaterdagavond of zondagochtend. Liedkeuze afstemmen met de dirigent of worship leader.",
    firstStep: "Een informeel gesprek met de muziekleider en één keer meerepetitie bijwonen.",
    contactPersonName: "Muziekleider",
    contactPersonEmail: "muziek@ngkmiddelharnis.nl",
  },
  {
    title: "Koffie schenken na de dienst",
    category: "Praktisch",
    shortDescription: "Jij zorgt na de dienst voor koffie, thee en een warm welkom — het moment waarop de gemeente echt gemeenschap beleeft.",
    whyValuable: "Het kopje koffie na de dienst is voor veel mensen het moment van verbinding. Jij maakt dat moment mogelijk en geeft mensen het gevoel dat ze welkom zijn.",
    concreteTasks: "Vóór de dienst koffie zetten en klaarleggen. Na de dienst uitschenken en zorgen dat iedereen iets krijgt. Opruimen na afloop. Eens in de zoveel weken, in een rooster.",
    firstStep: "Een keer meelopen met iemand die het al doet.",
    contactPersonName: "Gastvrouwcoördinator",
    contactPersonEmail: "gastvrijheid@ngkmiddelharnis.nl",
  },
  {
    title: "Verwelkoming bij de ingang",
    category: "Praktisch",
    shortDescription: "Jij staat bij de deur, begroet mensen bij binnenkomst en zorgt dat iedereen — ook nieuwe bezoekers — zich gezien en welkom voelt.",
    whyValuable: "De eerste indruk van de kerk begint bij de deur. Een warme begroeting kan het verschil maken voor iemand die voor het eerst komt of al een tijd wegbleef.",
    concreteTasks: "Op tijd aanwezig bij de ingang. Mensen begroeten met een glimlach. Nieuwe bezoekers actief opvangen en eventueel doorverwijzen. Liturgieblaadjes uitdelen.",
    firstStep: "Een keer samen staan met een ervaren verwelkomer.",
    contactPersonName: "Gastvrouwcoördinator",
    contactPersonEmail: "gastvrijheid@ngkmiddelharnis.nl",
  },
  {
    title: "Voorlezer in de dienst",
    category: "Muziek & eredienst",
    shortDescription: "Jij leest de Bijbeltekst voor tijdens de zondagsdienst — duidelijk, rustig en met aandacht voor de inhoud.",
    whyValuable: "De Bijbellezing is het hart van de dienst. Een goede voorlezer geeft de tekst de ruimte die hij verdient en helpt de gemeente om echt te luisteren.",
    concreteTasks: "De lezing vooraf ontvangen en voorbereiden. Op zondag de tekst voorlezen vanuit de kansel of lezenaar. Eventueel deelnemen aan een korte training voorlezen.",
    firstStep: "Een gesprek met de ouderling van dienst en één keer oefenen in de kerkzaal.",
    contactPersonName: "Ouderling van dienst",
    contactPersonEmail: "eredienst@ngkmiddelharnis.nl",
  },
  {
    title: "Missionair denker",
    category: "Bestuur",
    shortDescription: "Jij denkt mee over hoe de kerk zichtbaar en bereikbaar kan zijn voor mensen buiten de gemeente — en zet dat om in concrete ideeën en initiatieven.",
    whyValuable: "De kerk bestaat niet alleen voor zichzelf. Jij helpt nadenken over hoe we als gemeente present kunnen zijn in Middelharnis — met liefde en zonder agenda.",
    concreteTasks: "Deelnemen aan het missionair beraad of werkgroep. Ideeën aandragen en uitwerken. Contact leggen met mensen en initiatieven buiten de kerk. Trends signaleren.",
    firstStep: "Een gesprek met de predikant over de missionaire visie van de gemeente.",
    contactPersonName: "Predikant",
    contactPersonEmail: "predikant@ngkmiddelharnis.nl",
  },
  {
    title: "Gavencoördinator",
    category: "Bestuur",
    shortDescription: "Jij helpt gemeenteleden hun gaven en talenten te ontdekken en te verbinden aan vrijwilligersplekken binnen de gemeente.",
    whyValuable: "Veel mensen willen bijdragen maar weten niet hoe of waar. Als gavencoördinator ben jij de verbindingspersoon die mensen en taken bij elkaar brengt.",
    concreteTasks: "Gesprekken voeren met gemeenteleden over hun gaven. Overzicht bijhouden van openstaande vrijwilligersplekken. Samenwerken met ouderlingen en taakcoördinatoren. Dit programma beheren.",
    firstStep: "Een gesprek met de kerkenraad over de rol en wat er al is.",
    contactPersonName: "Ouderling gemeenteopbouw",
    contactPersonEmail: "opbouw@ngkmiddelharnis.nl",
  },
  {
    title: "Hulpkoster",
    category: "Praktisch",
    shortDescription: "Jij ondersteunt de koster bij de praktische voorbereiding en afwikkeling van kerkdiensten en andere activiteiten.",
    whyValuable: "Zonder goede voorbereiding achter de schermen loopt een dienst niet soepel. Jij zorgt dat alles op zijn plek staat zodat anderen zich kunnen richten op inhoud en ontmoeting.",
    concreteTasks: "Kerkzaal klaarzetten voor de dienst — stoelen, microfoons, avondmaalstafel. Na afloop opruimen. Sleutelbeheer en afsluiting van het gebouw.",
    firstStep: "Een keer meedraaien met de huidige koster.",
    contactPersonName: "Koster",
    contactPersonEmail: "koster@ngkmiddelharnis.nl",
  },
  {
    title: "Klusjesman/vrouw",
    category: "Praktisch",
    shortDescription: "Jij voert kleine onderhoudsklusjes uit aan het kerkgebouw — van een lekkende kraan tot het ophangen van een whiteboard.",
    whyValuable: "Een goed onderhouden gebouw is een teken van rentmeesterschap en zorgt dat iedereen er prettig en veilig kan zijn. Jij houdt het allemaal draaiende.",
    concreteTasks: "Kleine reparaties en onderhoudswerkzaamheden uitvoeren. Signaleren wat er moet gebeuren. Afstemmen met de koster en het gebouwbeheer.",
    firstStep: "Een rondleiding door het gebouw met de koster om te zien wat er speelt.",
    contactPersonName: "Koster",
    contactPersonEmail: "koster@ngkmiddelharnis.nl",
  },
  {
    title: "Bezoekbroeder/zuster",
    category: "Pastoraat",
    shortDescription: "Jij bezoekt gemeenteleden thuis — luistert, bemoedigt en bent present namens de gemeente. Je werkt met circa 10 adressen in een pastoraal team.",
    whyValuable: "Veel mensen in de gemeente voelen zich eenzaam of hebben behoefte aan een luisterend oor. Jij brengt de gemeente naar mensen toe — dat is kerk in de meest concrete zin.",
    concreteTasks: "Regelmatig huisbezoeken afleggen bij jouw adressen (eens per kwartaal of vaker indien nodig). Deelnemen aan het pastorale team. Terugkoppelen aan de wijkouderling.",
    firstStep: "Een gesprek met de wijkouderling en indien gewenst één gezamenlijk bezoek als kennismaking.",
    contactPersonName: "Wijkouderling",
    contactPersonEmail: "pastoraat@ngkmiddelharnis.nl",
  },
];

async function login() {
  const res = await fetch(`${BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@example.com", password: "admin123" }),
  });
  const setCookie = res.headers.get("set-cookie");
  const match = setCookie?.match(/admin_token=([^;]+)/);
  if (!match) throw new Error("Login mislukt");
  return match[1];
}

async function generateWeights(token, vacancy) {
  const res = await fetch(`${BASE}/api/admin/vacancies/generate-weights`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `admin_token=${token}`,
    },
    body: JSON.stringify(vacancy),
  });
  if (!res.ok) return {};
  const data = await res.json();
  return data.weights || {};
}

async function createVacancy(token, vacancy, qualityWeights) {
  const res = await fetch(`${BASE}/api/admin/vacancies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `admin_token=${token}`,
    },
    body: JSON.stringify({ ...vacancy, organizationId: ORG_ID, qualityWeights }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Aanmaken mislukt");
  }
  return res.json();
}

async function main() {
  console.log("Inloggen…");
  const token = await login();
  console.log("✓ Ingelogd\n");

  for (const vacancy of VACANCIES) {
    process.stdout.write(`→ ${vacancy.title} … `);

    // Stap 1: genereer kwaliteiten via AI
    const weights = await generateWeights(token, vacancy);
    const topWeights = Object.entries(weights)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 5)
      .map(([id, w]) => `${id}(${w})`)
      .join(", ");

    // Stap 2: sla op
    const created = await createVacancy(token, vacancy, weights);
    console.log(`✓ aangemaakt`);
    console.log(`   Kwaliteiten: ${topWeights || "geen"}`);
    console.log(`   ID: ${created.id}\n`);

    // Kleine pauze zodat we OpenAI rate limits niet raken
    await new Promise(r => setTimeout(r, 800));
  }

  console.log("✅ Alle taken aangemaakt!");
}

main().catch((e) => { console.error("❌ Fout:", e.message); process.exit(1); });
