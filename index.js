import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { auth } from './auth.js';
import { toNodeHandler } from "better-auth/node";
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();

// অনুমোদিত ডোমেইনগুলোর লিস্ট (undefined ভ্যালু ফিল্টার করা হয়েছে)
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://client-booknook-repo1.vercel.app',
    'https://client-booknook-repo1-nu.vercel.app',
    process.env.CLIENT_URL
].filter(Boolean);

// CORS Settings for Vercel and Local
const corsOptions = {
    origin: function (origin, callback) {
        // ব্রাউজার ছাড়া অন্য রিকোয়েস্ট (যেমন Postman/Mobile) অথবা অনুমোদিত ডোমেইন হলে অনুমতি দেবে
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

// সব রুটের আগে CORS এবং Preflight (OPTIONS) হ্যান্ডলার যুক্ত করা হলো
app.use(cors(corsOptions));

app.use(express.json());

// Better Auth API Route Handler (MUST for better-auth) - Changed to app.all
app.all("/api/auth/*", toNodeHandler(auth));

// MongoDB Connection Setup
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let bookCollection;
let borrowCollection;

async function connectDB() {
    if (!bookCollection) {
        await client.connect();
        const db = client.db("bookNookDB");
        bookCollection = db.collection("books");
        borrowCollection = db.collection("borrows");
        console.log("Successfully connected to MongoDB!");
    }
}
connectDB().catch(console.dir);


// --- Standard Routes ---
app.get('/', (req, res) => {
    res.send('BookNook Server is running perfectly on Vercel!');
});

// JWT Route
app.post('/api/jwt', async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
    res.send({ success: true, token });
});

const verifyToken = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).json({ success: false, message: 'Unauthorized access!' });
    }
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Forbidden access!' });
        }
        req.decoded = decoded;
        next();
    });
};

// Books API
app.get('/api/books', async (req, res) => {
    try {
        await connectDB();
        let query = {};
        if (req.query?.email) {
            query = { adderEmail: req.query.email };
        }
        const books = await bookCollection.find(query).toArray();
        res.status(200).json({ success: true, books });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching books!" });
    }
});

// POST Books - Removed verifyToken for Better Auth integration
app.post('/api/books', async (req, res) => {
    try {
        await connectDB();
        const newBook = req.body;
        const result = await bookCollection.insertOne(newBook);
        res.status(201).json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error adding book!" });
    }
});

app.get('/api/books/:id', async (req, res) => {
    try {
        await connectDB();
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const book = await bookCollection.findOne(query);
        res.status(200).json({ success: true, book });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching book details" });
    }
});

// Borrows API
app.get('/api/borrows', async (req, res) => {
    try {
        await connectDB();
        let query = {};
        if (req.query?.email) {
            query = { userEmail: req.query.email };
        }
        const borrows = await borrowCollection.find(query).toArray();
        res.status(200).json({ success: true, borrows });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching borrows!" });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Support both Local Run and Vercel Export
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running locally on port ${PORT}`);
    });
}

export default app;