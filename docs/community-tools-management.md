# Community Tools management API

GavenMatch blijft zelfstandig werken. De aanvullende beheer-API staat standaard
uit en verandert geen bestaande login-, uitnodigings- of frontendroute.

Railway-variabelen:

```env
COMMUNITY_TOOLS_MANAGEMENT_ENABLED=true
COMMUNITY_TOOLS_MANAGEMENT_SECRET=<apart lang geheim, gelijk aan de GavenMatch-waarde in Community Tools>
```

De read-only route
`GET /api/community-tools/v1/organizations/{organizationId}/users` toont alleen
gekoppelde organisatiebeheerders en coördinatoren. Deelnemers, talentprofielen,
vacatures, matches en sollicitaties worden niet uitgelezen.
