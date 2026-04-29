-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPRESA', 'TRANSPORTISTA', 'AGENTE', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "ShipmentType" AS ENUM ('IMPORT', 'EXPORT');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('SEA', 'AIR', 'GROUND');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'IN_TRANSIT', 'AT_CUSTOMS', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BILL_OF_LADING', 'COMMERCIAL_INVOICE', 'PACKING_LIST', 'CUSTOMS_DECLARATION', 'CERTIFICATE_OF_ORIGIN', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CustomsStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'RELEASED');

-- CreateEnum
CREATE TYPE "FoodImportStatus" AS ENUM ('DRAFT', 'DOCUMENTS_PENDING', 'SIGIE_READY', 'SIGIE_SUBMITTED', 'MAGA_REVIEW', 'LAB_PENDING', 'LAB_APPROVED', 'LAB_REJECTED', 'QUARANTINE', 'APPROVED', 'RELEASED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ExpedienteStatus" AS ENUM ('CFDI_PENDIENTE', 'DOCS_GENERADOS', 'SIGIE_SOLICITADO', 'SIGIE_APROBADO', 'DUCA_LISTA', 'DUCA_TRANSMITIDA', 'SEMAFORO_VERDE', 'SEMAFORO_ROJO', 'LIBERADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "country" TEXT NOT NULL DEFAULT 'GT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPRESA',
    "companyId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ShipmentType" NOT NULL,
    "mode" "TransportMode" NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,
    "description" TEXT,
    "carrier" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "transitDays" INTEGER NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "ShipmentType" NOT NULL,
    "mode" "TransportMode" NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "carrier" TEXT,
    "trackingNumber" TEXT,
    "weight" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,
    "description" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "actualDelivery" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "quoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentStatusHistory" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "freightAmount" DOUBLE PRECISION NOT NULL,
    "commissionAmount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "stripeInvoiceUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomsRecord" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "hsCode" TEXT,
    "description" TEXT,
    "value" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "tariffRate" DOUBLE PRECISION,
    "agent" TEXT,
    "status" "CustomsStatus" NOT NULL DEFAULT 'PENDING',
    "observations" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomsRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodImport" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cfdiData" JSONB NOT NULL,
    "cfdiVersion" TEXT NOT NULL DEFAULT '4.0',
    "cfdiFolio" TEXT NOT NULL,
    "cfdiSerie" TEXT,
    "cfdiFecha" TEXT NOT NULL,
    "exporterRFC" TEXT NOT NULL,
    "exporterName" TEXT NOT NULL,
    "importerRFC" TEXT NOT NULL,
    "importerNIT" TEXT NOT NULL,
    "importerName" TEXT NOT NULL,
    "hsCode" TEXT NOT NULL,
    "productDescription" TEXT NOT NULL,
    "commercialValueUSD" DOUBLE PRECISION NOT NULL,
    "incoterm" TEXT NOT NULL DEFAULT 'FOB',
    "freightCostUSD" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "insuranceCostUSD" DOUBLE PRECISION NOT NULL,
    "cifValueUSD" DOUBLE PRECISION NOT NULL,
    "cifValueGTQ" DOUBLE PRECISION NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 7.75,
    "daiRate" DOUBLE PRECISION NOT NULL,
    "daiAmountGTQ" DOUBLE PRECISION NOT NULL,
    "ivaAmountGTQ" DOUBLE PRECISION NOT NULL,
    "totalTributesGTQ" DOUBLE PRECISION NOT NULL,
    "requiresFitosanitario" BOOLEAN NOT NULL DEFAULT false,
    "requiresZoosanitario" BOOLEAN NOT NULL DEFAULT false,
    "requiresLab" BOOLEAN NOT NULL DEFAULT false,
    "requiresQuarantine" BOOLEAN NOT NULL DEFAULT false,
    "quarantineDays" INTEGER,
    "labType" TEXT,
    "estimatedProcessDays" INTEGER NOT NULL DEFAULT 10,
    "pointOfEntry" TEXT NOT NULL,
    "expectedArrivalDate" TIMESTAMP(3),
    "sigieRequestNumber" TEXT,
    "sigieSubmittedAt" TIMESTAMP(3),
    "sigieApproved" BOOLEAN NOT NULL DEFAULT false,
    "sigieApprovedAt" TIMESTAMP(3),
    "labResult" TEXT,
    "labResultDate" TIMESTAMP(3),
    "quarantineStart" TIMESTAMP(3),
    "quarantineEnd" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "observations" TEXT,
    "status" "FoodImportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportExpediente" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cfdiUUID" TEXT,
    "cfdiFolio" TEXT,
    "cfdiXmlUrl" TEXT,
    "cfdiPdfUrl" TEXT,
    "expNombre" TEXT NOT NULL,
    "expRFC" TEXT NOT NULL,
    "expCURP" TEXT,
    "expDireccion" TEXT,
    "impNombre" TEXT NOT NULL,
    "impNIT" TEXT,
    "impIdFiscal" TEXT,
    "impDireccion" TEXT,
    "incoterm" TEXT NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "tipoCambio" DOUBLE PRECISION,
    "totalUSD" DOUBLE PRECISION NOT NULL,
    "mercancias" JSONB NOT NULL,
    "pesoTotalKG" DOUBLE PRECISION NOT NULL,
    "transporteEmpresa" TEXT,
    "transporteCAAT" TEXT,
    "pilotoNombre" TEXT,
    "pilotoLicencia" TEXT,
    "cabezalPlaca" TEXT,
    "cabezalTarjeta" TEXT,
    "furgonPlaca" TEXT,
    "furgonTarjeta" TEXT,
    "numEconomico" TEXT,
    "fleteCosto" DOUBLE PRECISION,
    "aduanaSalidaMX" TEXT NOT NULL DEFAULT 'ADUANA SUCHIATE II',
    "aduanaEntradaGT" TEXT NOT NULL DEFAULT 'ADUANA TECUN UMAN II',
    "fechaCruce" TIMESTAMP(3),
    "cartaPorteNum" TEXT,
    "manifiestoNum" TEXT,
    "packingListNum" TEXT,
    "cartaPorteMXUrl" TEXT,
    "cartaPorteGTUrl" TEXT,
    "packingListUrl" TEXT,
    "fitoMXNumero" TEXT,
    "fitoMXFecha" TIMESTAMP(3),
    "fitoMXUrl" TEXT,
    "fitoMXDeclaracion" TEXT,
    "labRequerido" BOOLEAN NOT NULL DEFAULT false,
    "labNombre" TEXT,
    "labRegistro" TEXT,
    "labPlaga" TEXT,
    "labResultado" TEXT,
    "labUrl" TEXT,
    "sigieCredUser" TEXT,
    "sigieCredPass" TEXT,
    "sigieNumSolicitud" TEXT,
    "sigieStatus" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "sigieAprobadoAt" TIMESTAMP(3),
    "sigiePermitUrl" TEXT,
    "ducaDNumero" TEXT,
    "satOrdenNumero" TEXT,
    "satSemaforo" TEXT,
    "satTransmitidaAt" TIMESTAMP(3),
    "satLiberadaAt" TIMESTAMP(3),
    "cifUSD" DOUBLE PRECISION,
    "daiTotal" DOUBLE PRECISION,
    "ivaTotal" DOUBLE PRECISION,
    "totalTributos" DOUBLE PRECISION,
    "status" "ExpedienteStatus" NOT NULL DEFAULT 'CFDI_PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportExpediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCredentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCredentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "Quote_userId_idx" ON "Quote"("userId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_reference_key" ON "Shipment"("reference");

-- CreateIndex
CREATE INDEX "Shipment_userId_idx" ON "Shipment"("userId");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "Shipment_userId_status_idx" ON "Shipment"("userId", "status");

-- CreateIndex
CREATE INDEX "Shipment_createdAt_idx" ON "Shipment"("createdAt");

-- CreateIndex
CREATE INDEX "ShipmentStatusHistory_shipmentId_idx" ON "ShipmentStatusHistory"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_publicId_key" ON "Document"("publicId");

-- CreateIndex
CREATE INDEX "Document_shipmentId_idx" ON "Document"("shipmentId");

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "Document"("uploadedById");

-- CreateIndex
CREATE INDEX "TrackingEvent_shipmentId_idx" ON "TrackingEvent"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_shipmentId_key" ON "Payment"("shipmentId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomsRecord_shipmentId_key" ON "CustomsRecord"("shipmentId");

-- CreateIndex
CREATE INDEX "CustomsRecord_shipmentId_idx" ON "CustomsRecord"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodImport_shipmentId_key" ON "FoodImport"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodImport_sigieRequestNumber_key" ON "FoodImport"("sigieRequestNumber");

-- CreateIndex
CREATE INDEX "FoodImport_userId_idx" ON "FoodImport"("userId");

-- CreateIndex
CREATE INDEX "FoodImport_status_idx" ON "FoodImport"("status");

-- CreateIndex
CREATE INDEX "FoodImport_shipmentId_idx" ON "FoodImport"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportExpediente_shipmentId_key" ON "ImportExpediente"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportExpediente_sigieNumSolicitud_key" ON "ImportExpediente"("sigieNumSolicitud");

-- CreateIndex
CREATE INDEX "ImportExpediente_userId_idx" ON "ImportExpediente"("userId");

-- CreateIndex
CREATE INDEX "ImportExpediente_status_idx" ON "ImportExpediente"("status");

-- CreateIndex
CREATE INDEX "ImportExpediente_shipmentId_idx" ON "ImportExpediente"("shipmentId");

-- CreateIndex
CREATE INDEX "UserCredentials_userId_idx" ON "UserCredentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCredentials_userId_system_key" ON "UserCredentials"("userId", "system");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentStatusHistory" ADD CONSTRAINT "ShipmentStatusHistory_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingEvent" ADD CONSTRAINT "TrackingEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomsRecord" ADD CONSTRAINT "CustomsRecord_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodImport" ADD CONSTRAINT "FoodImport_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodImport" ADD CONSTRAINT "FoodImport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportExpediente" ADD CONSTRAINT "ImportExpediente_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportExpediente" ADD CONSTRAINT "ImportExpediente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCredentials" ADD CONSTRAINT "UserCredentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
