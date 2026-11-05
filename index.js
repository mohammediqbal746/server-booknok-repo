import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { auth } from './auth.js';

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
    console.log("Successfully connected to MongoDB!");

    // ==========================================
    //       নতুন বই ডেটাবেজে সেভ করার API
    // ==========================================
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