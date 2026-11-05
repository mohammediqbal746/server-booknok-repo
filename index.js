import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import { auth } from './auth.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
    origin: ['http://localhost:3000'],
    credentials: true
}));

app.use(express.json());

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
    await client.connect();
    
    const bookCollection = client.db("bookNookDB").collection("books");
    const borrowCollection = client.db("bookNookDB").collection("borrows");
    console.log("Successfully connected to MongoDB!");

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

    app.post('/api/books', verifyToken, async (req, res) => {
        try {
            const newBook = req.body;
            const result = await bookCollection.insertOne(newBook);
            res.status(201).json({ success: true, result });
        } catch (error) {
            res.status(500).json({ success: false, message: "Error adding book!" });
        }
    });

    app.get('/api/books', async (req, res) => {
        try {
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

    app.patch('/api/books/:id', verifyToken, async (req, res) => {
        try {
            const id = req.params.id;
            const updatedData = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = { $set: updatedData };
            
            const result = await bookCollection.updateOne(filter, updateDoc);
            res.status(200).json({ success: true, result });
        } catch (error) {
            res.status(500).json({ success: false, message: "Error updating book" });
        }
    });

    app.delete('/api/books/:id', verifyToken, async (req, res) => {
        try {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            
            const result = await bookCollection.deleteOne(filter);
            res.status(200).json({ success: true, result });
        } catch (error) {
            res.status(500).json({ success: false, message: "Error deleting book" });
        }
    });

    app.post('/api/borrows', verifyToken, async (req, res) => {
        try {
            const borrowData = req.body;
            const { bookId, userEmail } = borrowData;

            const alreadyBorrowed = await borrowCollection.findOne({ bookId, userEmail });
            if (alreadyBorrowed) {
                return res.status(400).json({ success: false, message: "You have already borrowed this book!" });
            }

            await borrowCollection.insertOne(borrowData);

            const filter = { _id: new ObjectId(bookId) };
            const updateDoc = { $inc: { quantity: -1 } };
            await bookCollection.updateOne(filter, updateDoc);

            res.status(201).json({ success: true, message: "Book borrowed successfully!" });
        } catch (error) {
            res.status(500).json({ success: false, message: "Error borrowing book!" });
        }
    });

  } finally {
    // Keep connection alive
  }
}
run().catch(console.dir);

app.get('/api/verify-user', async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ message: "Not logged in!" });
        }
        res.json({ message: "Verified successfully!", user: session.user });
    } catch (error) {
        res.status(500).json({ error: "Server error" });
    }
});

app.get('/', (req, res) => {
    res.send('BookNook Server is running...');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});