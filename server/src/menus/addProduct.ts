import { PrismaClient } from "@prisma/client";
import twilio from "twilio";
import cloudinary from "cloudinary";
import axios from "axios";

// A temporary data store to hold in-progress product details
const tempProductData: Record<string, any> = {};

// Cloudinary configuration
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function handleAddProduct(
  prisma: PrismaClient,
  from: string,
  incomingMessage: string,
  sellerState: string,
  twiml: twilio.twiml.MessagingResponse,
  reqBody: any // Need full request body for the image url
) {
  switch (sellerState) {
    case "awaiting_product_name": {
      tempProductData[from] = { name: incomingMessage };
      await prisma.sellers.update({
        where: { whatsapp_number: from },
        data: { state: "awaiting_product_photo" },
      });
      twiml.message(
        `Baik, nama produkmu adalah "${incomingMessage}".\n\nSilahkan ambil dan upload foto produkmu📸`
      );
      break;
    }

    case "awaiting_product_photo": {
      const mediaCount = parseInt(reqBody.NumMedia || 0);

      if (mediaCount > 0) {
        const imageUrl = reqBody.MediaUrl0;
        try {
          const twilioAuth = Buffer.from(
            `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
          ).toString("base64");
          const response = await axios.get(imageUrl, {
            responseType: "arraybuffer",
            headers: {
              Authorization: `Basic ${twilioAuth}`,
            },
          });
          const imageBuffer = Buffer.from(response.data);
          const result = await cloudinary.v2.uploader.upload(
            `data:image/jpeg;base64,${imageBuffer.toString("base64")}`
          );

          tempProductData[from].imageUrl = result.secure_url;

          await prisma.sellers.update({
            where: { whatsapp_number: from },
            data: { state: "awaiting_product_price" },
          });
          twiml.message(
            `Foto produk berhasil ditambahkan.\n\nBerapa harga produkmu ?`
          );
          break;
        } catch (error) {
          console.error("Cloudinary upload error :", error);
          twiml.message(
            "Maaf, sepertinya terjadi gangguan pada robot kami. Silahkan coba lagi nanti"
          );
        }
      } else {
        twiml.message(
          "Foto produkmu belum ditambahkan. Silahkan coba tambahkan foto produkmu lagi."
        );
      }
    }

    case "awaiting_product_price": {
      tempProductData[from].price = incomingMessage;
      await prisma.sellers.update({
        where: { whatsapp_number: from },
        data: { state: "awaiting_product_description" },
      });
      twiml.message(
        `Baik, harga sudah dimasukkan. Terakhir, berikan deskripsi terkait produkmu.`
      );
      break;
    }

    case "awaiting_product_description": {
      const productPrice = parseFloat(tempProductData[from].price);
      tempProductData[from].description = incomingMessage;

      if (!tempProductData[from].name || isNaN(productPrice)) {
        twiml.message(
          "Maaf, sepertinya ada kesalahan pada data produk. Silahkan ulangi kembali."
        );
        await prisma.sellers.update({
          where: { whatsapp_number: from },
          data: { state: "idle" },
        });
        delete tempProductData[from];
      } else {
        const newProduct = await prisma.product.create({
          data: {
            product_name: tempProductData[from].name,
            price: productPrice,
            description: tempProductData[from].description,
            isAvailable: true,
            seller: { connect: { whatsapp_number: from } },
            image_url: tempProductData[from].imageUrl,
          },
        });
        twiml.message(
          `🎉 Produk "${newProduct.product_name}" berhasil ditambahkan!\n\nSilahkan pilih menu dibawah ini:\n\n1️⃣ Tambah Produk\n2️⃣ Ubah Produk\n3️⃣ Ubah Stok Produk\n❓ Butuh Bantuan?`
        );
        await prisma.sellers.update({
          where: { whatsapp_number: from },
          data: { state: "idle" },
        });
        delete tempProductData[from];
      }
      break;
    }

    default: {
      twiml.message("Maaf, saya tidak mengerti. Silakan coba menu utama.");
      break;
    }
  }
}
