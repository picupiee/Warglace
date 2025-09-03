// src/menus/addProduct.ts

import { PrismaClient } from "@prisma/client";
import twilio from "twilio";

// Temporary data store, keep this in your index.ts file for now
interface TempProductData {
  name?: string;
  price?: string;
  description?: string;
}
const tempProductData: Record<string, TempProductData> = {};

// This is the main function for adding a product
export async function handleAddProduct(
  prisma: PrismaClient,
  from: string,
  incomingMessage: string,
  sellerState: string,
  twiml: twilio.twiml.MessagingResponse
) {
  switch (sellerState) {
    case "awaiting_product_name": {
      tempProductData[from] = { name: incomingMessage };
      await prisma.sellers.update({
        where: { whatsapp_number: from },
        data: { state: "awaiting_product_price" },
      });
      twiml.message(`Baik, nama produkmu adalah "${incomingMessage}".\nBerapa harga produkmu?`);
      break;
    }

    case "awaiting_product_price": {
      tempProductData[from].price = incomingMessage;
      await prisma.sellers.update({
        where: { whatsapp_number: from },
        data: { state: "awaiting_product_description" },
      });
      twiml.message(`Baik, harga sudah dimasukkan. Terakhir, berikan informasi terkait produkmu.`);
      break;
    }

    case "awaiting_product_description": {
      // Your existing logic for handling the description and creating the product
      // ...
      break;
    }

    default: {
      twiml.message("Maaf, sepertinya Anda keluar dari alur tambah produk. Silakan coba lagi.");
      break;
    }
  }
}