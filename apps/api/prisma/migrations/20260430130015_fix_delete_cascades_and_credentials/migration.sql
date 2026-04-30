-- P-23: Remove plaintext credential fields from ImportExpediente
-- These fields were never written to by any code; credentials live in UserCredentials (AES-256 encrypted)
ALTER TABLE "ImportExpediente" DROP COLUMN IF EXISTS "sigieCredUser";
ALTER TABLE "ImportExpediente" DROP COLUMN IF EXISTS "sigieCredPass";

-- P-32: Add explicit onDelete to transport catalog FK constraints in ImportExpediente
-- Drop existing FK constraints (Prisma default names) and recreate with SET NULL
ALTER TABLE "ImportExpediente" DROP CONSTRAINT IF EXISTS "ImportExpediente_transporteEmpresaId_fkey";
ALTER TABLE "ImportExpediente" DROP CONSTRAINT IF EXISTS "ImportExpediente_pilotoId_fkey";
ALTER TABLE "ImportExpediente" DROP CONSTRAINT IF EXISTS "ImportExpediente_cabezalId_fkey";
ALTER TABLE "ImportExpediente" DROP CONSTRAINT IF EXISTS "ImportExpediente_cajaId_fkey";

ALTER TABLE "ImportExpediente"
  ADD CONSTRAINT "ImportExpediente_transporteEmpresaId_fkey"
  FOREIGN KEY ("transporteEmpresaId") REFERENCES "TransportEmpresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ImportExpediente"
  ADD CONSTRAINT "ImportExpediente_pilotoId_fkey"
  FOREIGN KEY ("pilotoId") REFERENCES "Piloto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ImportExpediente"
  ADD CONSTRAINT "ImportExpediente_cabezalId_fkey"
  FOREIGN KEY ("cabezalId") REFERENCES "Cabezal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ImportExpediente"
  ADD CONSTRAINT "ImportExpediente_cajaId_fkey"
  FOREIGN KEY ("cajaId") REFERENCES "Caja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- P-32: Explicit RESTRICT on TransportEmpresa FK in Piloto, Cabezal, Caja
-- (PostgreSQL default for required FKs is already RESTRICT, but we make it explicit)
ALTER TABLE "Piloto" DROP CONSTRAINT IF EXISTS "Piloto_empresaId_fkey";
ALTER TABLE "Piloto"
  ADD CONSTRAINT "Piloto_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "TransportEmpresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Cabezal" DROP CONSTRAINT IF EXISTS "Cabezal_empresaId_fkey";
ALTER TABLE "Cabezal"
  ADD CONSTRAINT "Cabezal_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "TransportEmpresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Caja" DROP CONSTRAINT IF EXISTS "Caja_empresaId_fkey";
ALTER TABLE "Caja"
  ADD CONSTRAINT "Caja_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "TransportEmpresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
