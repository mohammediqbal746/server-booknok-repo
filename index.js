import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { auth } from './auth.js';
import jwt from 'jsonwebtoken';

// .env ফাইল থেকে গোপন তথ্যগুলো পড়ে নেওয়ার জন্য
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// খুব জরুরি: ফ্রন্টএন্ড থেকে লগইনের কুকি (Cookie) বা সেশন আসার জন্য এটি সেট করতে হয়
app.use(cors({
    origin: ['http://localhost:3000'], // আপনার ফ্রন্টএন্ডের লিংক
    credentials: true // এই লাইনটি ছাড়া BetterAuth কাজ করবে না
}));

app.use(express.json());

// ==========================================
//          MongoDB ডেটাবেজ সেটআপ
// ==========================================
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // ডেটাবেজ কানেক্ট করা হচ্ছে
    await client.connect();
    
    // bookNookDB ডেটাবেজের ভেতর 'books' নামের কালেকশন তৈরি/সিলেক্ট করা হচ্ছে
    const bookCollection = client.db("bookNookDB").collection("books");
    const borrowCollection = client.db("bookNookDB").collection("borrows");
    console.log("Successfully connected to MongoDB!");

    // ==========================================
    //       নতুন বই ডেটাবেজে সেভ করার API
    // ==========================================
    
// ==========================================
    //          JWT Middleware & Route
    // ==========================================
    
    // JWT Token toiri korar API (Frontend theke email asle token dibe)
    app.post('/api/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
        res.send({ success: true, token });
    });

    // API protect korar jonno JWT Verify Middleware
    const verifyToken = (req, res, next) => {
        const authorization = req.headers.authorization;
        if (!authorization) {
            return res.status(401).json({ success: false, message: 'Unauthorized access! Token nai.' });
        }
        
        const token = authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({ success: false, message: 'Forbidden access! Invalid token.' });
            }
            req.decoded = decoded;
            next();
        });
    };

    app.post('/api/books', async (req, res) => {
        try {
            const newBook = req.body;
            // ফ্রন্টএন্ড থেকে আসা বইয়ের ডেটা ডেটাবেজে ইনসার্ট করা হচ্ছে
            const result = await bookCollection.insertOne(newBook);
            res.status(201).json({ success: true, result });
        } catch (error) {
            console.error("Error adding book:", error);
            res.status(500).json({ success: false, message: "বই সেভ করতে সমস্যা হয়েছে!" });
        }
    });
    app.get('/api/books', async (req, res) => {
        try {
            const books = await bookCollection.find().toArray();
            res.status(200).json({ success: true, books });
        } catch (error) {
            console.error("Error fetching books:", error);
            res.status(500).json({ success: false, message: "বই লোড করতে সমস্যা হয়েছে!" });
        }
    });
    app.get('/api/books/:id', async (req, res) => {
        try {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const book = await bookCollection.findOne(query);
            res.status(200).json({ success: true, book });
        } catch (error) {
            res.status(500).json({ success: false, message: "Error fetching book details" });
        }
    });
    // নতুন বই ধার নেওয়ার API
    app.post('/api/borrows', async (req, res) => {
        try {
            const borrowData = req.body;
            const { bookId, userEmail } = borrowData;

            // চেক করা হচ্ছে ইউজার একই বই আগেই ধার নিয়েছে কিনা (No Double Borrow)
            const alreadyBorrowed = await borrowCollection.findOne({ bookId, userEmail });
            if (alreadyBorrowed) {
                return res.status(400).json({ success: false, message: "আপনি ইতিমধ্যে এই বইটি ধার নিয়েছেন!" });
            }

            // নতুন ধার নেওয়া বইয়ের ডাটা 'borrows' কালেকশনে সেভ করা
            await borrowCollection.insertOne(borrowData);

            // বইয়ের মূল কালেকশন থেকে Quantity ১ কমিয়ে দেওয়া ($inc)
            const filter = { _id: new ObjectId(bookId) };
            const updateDoc = {
                $inc: { quantity: -1 }
            };
            await bookCollection.updateOne(filter, updateDoc);

            res.status(201).json({ success: true, message: "বইটি সফলভাবে ধার নেওয়া হয়েছে!" });
        } catch (error) {
            console.error("Error borrowing book:", error);
            res.status(500).json({ success: false, message: "বই ধার নিতে সমস্যা হয়েছে!" });
        }
    });

  } finally {
    // সার্ভার চলাকালীন কানেকশন খোলা থাকবে
  }
}
run().catch(console.dir);

// ==========================================
//             অন্যান্য রাউটসমূহ
// ==========================================

// লগইন করা আছে কিনা চেক করার জন্য একটি টেস্ট রাউট
app.get('/api/verify-user', async (req, res) => {
    try {
        // রিকোয়েস্টের সাথে আসা তথ্য থেকে ইউজারকে খুঁজবে
        const session = await auth.api.getSession({
            headers: req.headers
        });

        // যদি ইউজার না থাকে বা লগইন করা না থাকে
        if (!session) {
            return res.status(401).json({ message: "লগইন করা নেই! দয়া করে লগইন করুন।" });
        }

        // যদি ইউজার লগইন করা থাকে, তার তথ্য পাঠিয়ে দেবে
        res.json({ message: "সফলভাবে ভেরিফাই হয়েছে!", user: session.user });
    } catch (error) {
        res.status(500).json({ error: "সার্ভারে কোনো সমস্যা হয়েছে" });
    }
});

// সার্ভার ঠিকমতো চলছে কিনা চেক করার জন্য
app.get('/', (req, res) => {
    res.send('বুকনুক (BookNook) সার্ভার চলছে...');
});

// সার্ভার চালু করার কোড
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});