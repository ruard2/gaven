type CommunityToolsContext = {
  user: { id: string; email: string; name: string };
  organization: { id: string; name: string; role: string };
  product: { code: string; name: string; role: string };
};

export async function exchangeCommunityToolsTicket(ticket: string) {
  const baseUrl = requiredEnvironment("COMMUNITY_TOOLS_URL").replace(/\/$/, "");
  const clientId = requiredEnvironment("COMMUNITY_TOOLS_CLIENT_ID");
  const clientSecret = requiredEnvironment("COMMUNITY_TOOLS_CLIENT_SECRET");

  if (!ticket.startsWith("ctt_") || ticket.length > 200) {
    throw new Error("Ongeldig toegangsticket.");
  }

  const response = await fetch(`${baseUrl}/api/integrations/exchange`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${clientSecret}`,
      "content-type": "application/json",
      "x-community-tools-client": clientId,
    },
    body: JSON.stringify({ ticket }),
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("Community Tools heeft toegang geweigerd.");

  const context = (await response.json()) as CommunityToolsContext;
  if (
    context.product?.code !== "gifts_matching" ||
    !context.user?.id ||
    !context.organization?.id ||
    !context.user?.email ||
    !context.organization?.name ||
    !["owner", "admin"].includes(context.organization?.role)
  ) {
    throw new Error("Onvolledige Community Tools-context.");
  }
  return context;
}

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} ontbreekt.`);
  return value;
}
