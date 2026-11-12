const corsOptions = {
    origin: [
        "http://localhost:3000",
        "https://client-booknook-repo1.vercel.app", // Notun link
        "https://client-booknook-repo1-nu.vercel.app", // Purono link (nirapottar jonno rekhe dilam)
        process.env.CLIENT_URL
    ],
    credentials: true, // Login/Token er jonno eti oboshhoi lagbe
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

// সব রাউটের আগে CORS এবং Preflight (OPTIONS) হ্যান্ডলার যুক্ত করা হলো
app.use(cors(corsOptions));
app.use(express.json());

// Better Auth API Route Handler (The Master Stroke)
app.use("/api/auth", (req, res) => {
    req.url = req.originalUrl;
    return toNodeHandler(auth)(req, res);
});