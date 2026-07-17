export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 60);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function ensureVacancySlug(
  prisma: any,
  vacancyId: string,
  title: string,
  organizationId: string
): Promise<string> {
  const base = generateSlug(title) || "functie";
  const siblings = await prisma.vacancy.findMany({
    where: { organizationId, id: { not: vacancyId } },
    select: { slug: true },
  });
  const taken = new Set(siblings.map((v: { slug: string | null }) => v.slug).filter(Boolean));
  let slug = base;
  let n = 2;
  while (taken.has(slug)) { slug = `${base}-${n++}`; }
  await prisma.vacancy.update({ where: { id: vacancyId }, data: { slug } });
  return slug;
}

export function generatePublicCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}
