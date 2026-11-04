const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// JWT Verification Middleware (Placeholder - implement based on your secret)
const verifyToken = (req, res, next) => {
    // const token = req.headers.authorization?.split(' ')[1];
    // if(!token) return res.status(401).send({message: 'unauthorized access'});
    // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //     if(err) return res.status(401).send({message: 'unauthorized access'});
    //     req.decoded = decoded;
    //     next();
    // });
    next(); // Remove this next() once JWT is fully implemented
};

const uri = process.env.DB_URI;
const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function run() {
    try {
        await client.connect();
        const db = client.db("bookNookDB");
        const booksCollection = db.collection("books");
        const borrowsCollection = db.collection("borrows");

        // 1. GET /books - get all books
        app.get('/books', async (req, res) => {
            const result = await booksCollection.find().sort({ _id: -1 }).toArray();
            res.send(result);
        });

        // 2. GET /books/:id - get one book
        app.get('/books/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await booksCollection.findOne(query);
            res.send(result);
        });

        // 3. POST /books - add a book (Private)
        app.post('/books', verifyToken, async (req, res) => {
            const newBook = req.body;
            newBook.addedDate = new Date();
            const result = await booksCollection.insertOne(newBook);
            res.send(result);
        });

        // 4. PATCH /books/:id - update a book (Private)
        app.patch('/books/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const updateData = req.body;
            const query = { _id: new ObjectId(id) };
            const updateDoc = { $set: updateData };
            const result = await booksCollection.updateOne(query, updateDoc);
            res.send(result);
        });

        // 5. DELETE /books/:id - delete a book (Private)
        app.delete('/books/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await booksCollection.deleteOne(query);
            res.send(result);
        });

        // 6. POST /borrows - borrow a book
        app.post('/borrows', verifyToken, async (req, res) => {
            const borrowData = req.body;
            
            // Check for double borrow
            const alreadyBorrowed = await borrowsCollection.findOne({ 
                userEmail: borrowData.userEmail, 
                bookId: borrowData.bookId 
            });
            if (alreadyBorrowed) {
                return res.status(400).send({ message: 'You have already borrowed this book!' });
            }

            // Check if copies are available
            const book = await booksCollection.findOne({ _id: new ObjectId(borrowData.bookId) });
            if (book.totalCopies <= 0) {
                return res.status(400).send({ message: 'Not Available' });
            }

            // Insert borrow record & decrease copy count
            const insertResult = await borrowsCollection.insertOne(borrowData);
            const updateCopies = await booksCollection.updateOne(
                { _id: new ObjectId(borrowData.bookId) },
                { $inc: { totalCopies: -1 } }
            );

            res.send({ insertResult, updateCopies });
        });

        // 7. GET /borrows - get borrows for logged in user
        app.get('/borrows', verifyToken, async (req, res) => {
            const email = req.query.email;
            // if (req.decoded.email !== email) return res.status(403).send({message: 'forbidden access'})
            const query = { userEmail: email };
            const result = await borrowsCollection.find(query).toArray();
            res.send(result);
        });

        // 8. DELETE /borrows/:id - return a book
        app.delete('/borrows/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const { bookId } = req.body; // Pass bookId from frontend when returning

            const deleteQuery = { _id: new ObjectId(id) };
            const deleteResult = await borrowsCollection.deleteOne(deleteQuery);

            // Increase copy count
            const updateCopies = await booksCollection.updateOne(
                { _id: new ObjectId(bookId) },
                { $inc: { totalCopies: 1 } }
            );

            res.send({ deleteResult, updateCopies });
        });

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('BookNook Server is Running');
});

app.listen(port, () => {
    console.log(`BookNook server is running on port ${port}`);
});