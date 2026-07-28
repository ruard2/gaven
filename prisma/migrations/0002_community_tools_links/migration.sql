ALTER TABLE "Admin"
ADD COLUMN IF NOT EXISTS "communityToolsUserId" TEXT;

ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "communityToolsOrganizationId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Admin_communityToolsUserId_key"
ON "Admin"("communityToolsUserId");

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_communityToolsOrganizationId_key"
ON "Organization"("communityToolsOrganizationId");

CREATE TABLE IF NOT EXISTS "CommunityToolsAccount" (
  "id" TEXT NOT NULL,
  "communityToolsUserId" TEXT NOT NULL,
  "communityToolsOrganizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityToolsAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunityToolsAccount_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunityToolsAccount_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunityToolsAccount_communityToolsUserId_communityToolsOrganizationId_key"
ON "CommunityToolsAccount"("communityToolsUserId", "communityToolsOrganizationId");

CREATE INDEX IF NOT EXISTS "CommunityToolsAccount_organizationId_idx"
ON "CommunityToolsAccount"("organizationId");
