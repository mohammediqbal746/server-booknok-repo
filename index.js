import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { auth } from './auth.js';

// .env ফাইল থেকে গোপন তথ্যগুলো পড়ে নেওয়ার জন্য
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// খুব জরুরি: ফ্রন্টএন্ড থেকে লগইনের কুকি (Cookie) বা সেশন আসার জন্য এটি সেট করতে হয়
app.use(cors({
    origin: ['http://localhost:3000'], // আপনার ফ্রন্টএন্ডের লিংক
    credentials: true // এই লাইনটি ছাড়া BetterAuth কাজ করবে না
}));

app.use(express.json());

// লগইন করা আছে কিনা চেক করার জন্য একটি টেস্ট রাউট
app.get('/api/verify-user', async (req, res) => {
    try {
        // রিকোয়েস্টের সাথে আসা তথ্য থেকে ইউজারকে খুঁজবে
        const session = await auth.api.getSession({
            headers: req.headers
        });

        // যদি ইউজার না থাকে বা লগইন করা না থাকে
        if (!session) {
            return res.status(401).json({ message: "লগইন করা নেই! দয়া করে লগইন করুন।" });
        }

        // যদি ইউজার লগইন করা থাকে, তার তথ্য পাঠিয়ে দেবে
        res.json({ message: "সফলভাবে ভেরিফাই হয়েছে!", user: session.user });
    } catch (error) {
        res.status(500).json({ error: "সার্ভারে কোনো সমস্যা হয়েছে" });
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