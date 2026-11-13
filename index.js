import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { auth } from './auth.js';
import { toNodeHandler } from "better-auth/node";
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();

// CORS Settings for Vercel and Local
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://client-booknook-repo1.vercel.app',
        'https://client-booknook-repo1-nu.vercel.app',
        process.env.CLIENT_URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Preflight Fix
app.use(express.json());

// Better Auth API Route Handler
app.use("/api/auth", (req, res) => {
    req.url = req.originalUrl;
    return toNodeHandler(auth)(req, res);
});

// MongoDB Connection Setup
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Vercel Serverless-এর জন্য অপ্টিমাইজ করা কানেকশন
let dbInstance = null;

async function getDB() {
    if (dbInstance) return dbInstance;
    await client.connect();
    dbInstance = client.db("bookNookDB");
    console.log("Successfully connected to MongoDB!");
    return dbInstance;
}

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

// Books API
app.get('/api/books', async (req, res) => {
    try {
        const db = await getDB();
        const bookCollection = db.collection("books");
        let query = {};
        if (req.query?.email) {
            query = { adderEmail: req.query.email };
        }
        const books = await bookCollection.find(query).toArray();
        res.status(200).json({ success: true, books });
    } catch (error) {
        console.error("Books GET Error:", error);
        res.status(500).json({ success: false, message: "Error fetching books!" });
    }
});

app.post('/api/books', async (req, res) => {
    try {
        const db = await getDB();
        const bookCollection = db.collection("books");
        const newBook = req.body;
        const result = await bookCollection.insertOne(newBook);
        res.status(201).json({ success: true, result });
    } catch (error) {
        console.error("Books POST Error:", error);
        res.status(500).json({ success: false, message: "Error adding book!" });
    }
});

app.get('/api/books/:id', async (req, res) => {
    try {
        const db = await getDB();
        const bookCollection = db.collection("books");
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const book = await bookCollection.findOne(query);
        res.status(200).json({ success: true, book });
    } catch (error) {
        console.error("Book Details Error:", error);
        res.status(500).json({ success: false, message: "Error fetching book details" });
    }
});

// Borrows API
app.get('/api/borrows', async (req, res) => {
    try {
        const db = await getDB();
        const borrowCollection = db.collection("borrows");
        let query = {};
        if (req.query?.email) {
            query = { userEmail: req.query.email };
        }
        const borrows = await borrowCollection.find(query).toArray();
        res.status(200).json({ success: true, borrows });
    } catch (error) {
        console.error("Borrows Error:", error);
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