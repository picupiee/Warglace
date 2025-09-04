import express from "express";
import prisma from "./src/prisma";
import twilio from "twilio";
import bodyParser from "body-parser";
import { handleAddProduct } from "./src/menus/addProduct";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

// API Routes
app.get("/api/products", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: "product_id" },
  });

  if (product && product.image_url) {
    const transformedUrl = product.image_url.replace(
      "/upload/",
      "/upload/q_auto,f_auto/"
    );
    transformedUrl;
  }

  try {
    const products = await prisma.product.findMany({
      where: { isAvailable: true },
      include: { seller: true },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products." });
  }
});

// webhook endpoint
app.post("/api/whatsapp", async (req, res) => {
  try {
    const incomingMessage = req.body.Body;
    const from = req.body.From.replace("whatsapp:", "");

    let seller = await prisma.sellers.findUnique({
      where: { whatsapp_number: from },
    });

    const twiml = new twilio.twiml.MessagingResponse();
    const randomNumber = Math.floor(1000 + Math.random() * 9000);

    if (!seller) {
      seller = await prisma.sellers.create({
        data: {
          whatsapp_number: from,
          store_name: `Toko Warga ${randomNumber}`,
          state: "awaiting_store_name",
        },
      });
      twiml.message(
        `Halo! Selamat Datang di WarGlace. Nama tokomu adalah ${seller.store_name}.\n\nUntuk mengganti, balas dengan mengirim nama tokomu.`
      );
    } else if (seller.state === "awaiting_store_name") {
      await prisma.sellers.update({
        where: { whatsapp_number: from },
        data: { store_name: incomingMessage, state: "idle" },
      });
      twiml.message(
        `🎉 Selamat Datang ${incomingMessage} 🎉\n\nUntuk selanjutnya, balas dengan nomor menu dibawah ini:\n\n1️⃣ Tambah Produk\n2️⃣ Daftar Produk\n3️⃣ Ubah Produk\n4️⃣ Butuh Bantuan?`
      );
    } else if (seller.state === "idle") {
      if (incomingMessage.trim() === "1") {
        await prisma.sellers.update({
          where: { whatsapp_number: from },
          data: { state: "awaiting_product_name" },
        });
        twiml.message("Apa nama produkmu ?");
      } else {
        twiml.message(
          `Halo ${seller.store_name} ! Selamat Datang di WarGlace.\n\nBalas dan kirim nomor menu dibawah ini:\n\n1️⃣ Tambah Produk\n2️⃣ Ubah Produk\n3️⃣ Ubah Stok Produk\n4️⃣ Butuh Bantuan?`
        );
      }
    } else if (seller.state.startsWith("awaiting_product")) {
      await handleAddProduct(
        prisma,
        from,
        incomingMessage,
        seller.state,
        twiml,
        req.body
      );
    } else {
      twiml.message(
        `Halo ${seller.store_name}, Selamat Datang di WarGlace. Untuk melanjutkan, balas dan kirim nomor menu dibawah ini\n\n1️⃣ Tambah Produk\n2️⃣ Ubah Produk\n3️⃣ Ubah Stok Produk\n4️⃣ Butuh Bantuan?`
      );
    }
    res.writeHead(200, { "content-type": "text/xml" });
    res.end(twiml.toString());
  } catch (error) {
    console.error("An error occured in the webhooks:", error);
    res.status(500).send("Internal server error");
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
