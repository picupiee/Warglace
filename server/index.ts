import express from 'express';
import prisma from './src/prisma';
import twilio from 'twilio';
import bodyParser from "body-parser"

const app = express()
const PORT = process.env.PORT || 5000

app.use(express.json())

// API Routes
app.get('/api/products', async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: {isAvailable: true},
            include: {seller: true}
        });
        res.json(products)
    } catch (error) {
        res.status(500).json({error: "Failed to fetch products."})
    }
});

app.use(bodyParser.urlencoded({extended: false}));

// webhook endpoint
app.post('/api/whatsapp', async (req, res) => {
    const incomingMessage = req.body.Body; // Body of the message
    const from = req.body.From.replace('whatsapp:','');

    let seller = await prisma.sellers.findUnique({
        where: {whatsapp_number: from},
    });

    console.log(`Received a message from ${from}: ${incomingMessage}`);
    // Bot's Logic, for starter we use simple response
    const twiml = new twilio.twiml.MessagingResponse();

    if(!seller) {
        // If number is not found on database
        // This is a new seller.
        seller = await prisma.sellers.create({
            data: {
                whatsapp_number: from,
                store_name: `Toko Warga`,
                state: 'awaiting_store_name',
            }
        });
        twiml.message(`Halo! Selamat datang di Warglace. Apa nama tokomu ?`)
        console.log(`New seller registered: ${from}`);

    } else if(seller.state === 'awaiting_store_name') {
        // Logic to handle setting the store name
        await prisma.sellers.update({
            where: {
                whatsapp_number: from,
            },
            data: {
                store_name: incomingMessage,
                state: 'idle',
            },
        });

        twiml.message(`🎊🎊 Selamat! Tokomu yang bernama *_${incomingMessage}_* telah selesai dibuat 🎊🎊\nSekarang kamu bisa menambah produk ke tokomu. Kirimkan nama produk, foto produk, harga produk dan deskripsi produk secara berurutan.\n\nUntuk selanjutnya, kirim pesan "Menu" untuk mengelola tokomu.`)
        console.log(`Store name updated for ${from}: ${incomingMessage}`)
    } else {
        twiml.message(`Selamat datang! Ada yang bisa saya bantu ?\n\nUntuk melanjutkan, ketik dan kirim angka sesuai menu yang ingin diakses:\n\n🔽 Silahkan pilih menu dibawah ini 🔽\n1️⃣ Daftar Produk\n2️⃣ Ubah Produk\n3️⃣ Ubah Stok Produk\n4 Butuh Bantuan ?`)
    }

    res.writeHead(200, { 'content-type': 'text/xml'});
    res.end(twiml.toString())

    // twiml.message(`Hello! I have received your message: "${incomingMessage}"`);

})

app.listen(PORT, ()=>{
    console.log(`Server listening on port ${PORT}`)
})