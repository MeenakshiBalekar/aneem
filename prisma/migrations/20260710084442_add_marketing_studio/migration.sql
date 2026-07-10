-- CreateEnum
CREATE TYPE "MarketingAssetKind" AS ENUM ('SOURCE_FRONT', 'SOURCE_BACK', 'SOURCE_LIFESTYLE', 'SOURCE_FABRIC', 'ENHANCED', 'MOCKUP', 'HERO', 'THUMBNAIL', 'REEL_VIDEO', 'REEL_COVER');

-- CreateEnum
CREATE TYPE "MarketingContentType" AS ENUM ('CAPTION', 'HASHTAGS', 'CAROUSEL', 'STORY', 'PRODUCT_DESCRIPTION', 'META_AD', 'WHATSAPP_CAMPAIGN', 'EMAIL_CAMPAIGN', 'OFFER_SUGGESTION', 'BUNDLE_CREATIVE', 'THUMBNAIL_CONCEPT');

-- CreateEnum
CREATE TYPE "ReelVoiceOption" AS ENUM ('NONE', 'MALE', 'FEMALE', 'LUXURY', 'STREETWEAR', 'MOTIVATIONAL');

-- CreateEnum
CREATE TYPE "ReelStatus" AS ENUM ('DRAFT', 'SCRIPT_READY', 'RENDERING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "MarketingAsset" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "kind" "MarketingAssetKind" NOT NULL,
    "url" TEXT NOT NULL,
    "provider" TEXT,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMarketingProfile" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "collection" TEXT,
    "gsm" INTEGER,
    "fit" TEXT,
    "colorName" TEXT,
    "fabric" TEXT,
    "typographyStyle" TEXT,
    "mood" TEXT,
    "aesthetic" TEXT,
    "positioning" TEXT,
    "targetAudience" TEXT,
    "colorPalette" JSONB,
    "designLanguage" TEXT,
    "rawAnalysis" JSONB,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMarketingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingContent" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "MarketingContentType" NOT NULL,
    "variant" TEXT,
    "content" JSONB NOT NULL,
    "score" JSONB,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReelBrief" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "ReelStatus" NOT NULL DEFAULT 'DRAFT',
    "scenes" JSONB NOT NULL,
    "voiceOption" "ReelVoiceOption" NOT NULL DEFAULT 'NONE',
    "voiceoverScript" TEXT,
    "musicSuggestion" JSONB,
    "renderProvider" TEXT,
    "externalRenderId" TEXT,
    "videoUrl" TEXT,
    "isMock" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReelBrief_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketingAsset_productId_idx" ON "MarketingAsset"("productId");

-- CreateIndex
CREATE INDEX "MarketingAsset_kind_idx" ON "MarketingAsset"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMarketingProfile_productId_key" ON "ProductMarketingProfile"("productId");

-- CreateIndex
CREATE INDEX "MarketingContent_productId_idx" ON "MarketingContent"("productId");

-- CreateIndex
CREATE INDEX "MarketingContent_type_idx" ON "MarketingContent"("type");

-- CreateIndex
CREATE INDEX "ReelBrief_productId_idx" ON "ReelBrief"("productId");

-- AddForeignKey
ALTER TABLE "MarketingAsset" ADD CONSTRAINT "MarketingAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMarketingProfile" ADD CONSTRAINT "ProductMarketingProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingContent" ADD CONSTRAINT "MarketingContent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReelBrief" ADD CONSTRAINT "ReelBrief_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
