import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("bookNookDB");

export const auth = betterAuth({
    database: mongodbAdapter(db),
    emailAndPassword: {
        enabled: true,
    },
   trustedOrigins: [
    "http://localhost:3000",
    "https://client-booknook-repo1.vercel.app", // Notun link
    "https://client-booknook-repo1-nu.vercel.app",
    process.env.CLIENT_URL
]
});