# Community Tools management API

GavenMatch blijft zelfstandig werken. De aanvullende beheer-API staat standaard
uit en verandert geen bestaande login-, uitnodigings- of frontendroute.

Railway-variabelen:

```env
COMMUNITY_TOOLS_MANAGEMENT_ENABLED=true
COMMUNITY_TOOLS_MANAGEMENT_SECRET=<apart lang geheim, gelijk aan de GavenMatch-waarde in Community Tools>
```

De gebruikersroute toont gekoppelde organisatiebeheerders, coördinatoren en
deelnemers in afzonderlijke categorieën. Alleen naam, e-mail en status zijn
centraal te beheren. Talentprofielen, vacatures, matches en sollicitaties worden
niet uitgelezen.
