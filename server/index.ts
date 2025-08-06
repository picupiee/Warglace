import express from 'express';
import prisma from './src/prisma';

const app = express()
const PORT = process.env.PORT || 5000

app.use(express.json())

// API Routes
app.get('/api/products', async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: {status: 'available'},
            include: {seller: true}
        });
        res.json(products)
    } catch (error) {
        res.status(500).json({error: "Failed to fetch products."})
    }
});

app.listen(PORT, ()=>{
    console.log(`Server listening on port ${PORT}`)
})