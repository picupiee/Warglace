-- CreateTable
CREATE TABLE "public"."Sellers" (
    "id" TEXT NOT NULL,
    "store_name" VARCHAR(255) NOT NULL,
    "whatsapp_number" VARCHAR(20) NOT NULL,
    "store_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seller_id" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sellers_whatsapp_number_key" ON "public"."Sellers"("whatsapp_number");

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."Sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
