-- CreateTable
CREATE TABLE "memberships" (
    "mid" SERIAL NOT NULL,
    "mname" VARCHAR(50) NOT NULL,
    "min_score" INTEGER NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("mid")
);

-- CreateTable
CREATE TABLE "customers" (
    "uid" INTEGER NOT NULL,
    "fullname" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "mid" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("uid")
);

-- CreateTable
CREATE TABLE "score_adjustments" (
    "id" SERIAL NOT NULL,
    "uid" INTEGER NOT NULL,
    "score_delta" INTEGER NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "reference_id" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "memberships_mname_key" ON "memberships"("mname");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_min_score_key" ON "memberships"("min_score");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_mid_idx" ON "customers"("mid");

-- CreateIndex
CREATE INDEX "score_adjustments_uid_idx" ON "score_adjustments"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "score_adjustments_uid_reference_id_key" ON "score_adjustments"("uid", "reference_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_mid_fkey" FOREIGN KEY ("mid") REFERENCES "memberships"("mid") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_adjustments" ADD CONSTRAINT "score_adjustments_uid_fkey" FOREIGN KEY ("uid") REFERENCES "customers"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
