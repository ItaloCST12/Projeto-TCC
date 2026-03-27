-- CreateTable
CREATE TABLE "public"."PushSubscription"
(
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "destinoRole" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "expirationTime" BIGINT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "public"."PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_usuarioId_ativa_idx" ON "public"."PushSubscription"("usuarioId", "ativa");

-- CreateIndex
CREATE INDEX "PushSubscription_destinoRole_ativa_idx" ON "public"."PushSubscription"("destinoRole", "ativa");

-- AddForeignKey
ALTER TABLE "public"."PushSubscription" ADD CONSTRAINT "PushSubscription_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
