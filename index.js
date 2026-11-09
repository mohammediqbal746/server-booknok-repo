import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { auth } from './auth.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: [process.env.CLIENT_URL || 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// MongoDB Connection
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Database variables
let bookCollection;
let borrowCollection;

// Connect to MongoDB once
async function connectDB() {
    if (!bookCollection) {
        await client.connect();
        const db = client.db("bookNookDB");
        bookCollection = db.collection("books");
        borrowCollection = db.collection("borrows");
        console.log("Successfully connected to MongoDB!");
    }
}
// Initialize connection
connectDB().catch(console.dir);


// --- Routes (Outside of run function) ---

app.get('/', (req, res) => {
    res.send('BookNook Server is running perfectly on Vercel!');
});

// JWT Token Route
app.post('/api/jwt', async (req, res) => {
    const user = req.body;
    const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
    res.send({ success: true, token });
});

// Verify Token Middleware
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

app.post('/api/books', verifyToken, async (req, res) => {
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

// Export for Vercel Serverless
export default app;