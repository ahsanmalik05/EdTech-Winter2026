import express from 'express';
import cors from 'cors';
import config from './config/config.js';
import { db } from './db/index.js';
import { users } from './db/schema.js';
import { chat, translateToFrench, scoreCOMET } from './services/cohere.js';
import authRouter from './routes/auth.js';
import apiKeysRouter from './routes/api_key.js';

import { apiKeyMiddleware } from './middleware/api_key.js';
const { port, nodeEnv } = config;


const app = express();

app.use(cors());
app.use(express.json());

// Translation route (no API key required for demo)
app.get("/translation", async (req, res) => {
    try {
        const text = req.query.text as string;

        console.log("Received translation request for text:", text);
        if (!text) {
            return res.status(400).json({ error: "Text parameter is required" });
        }

        const translatedContent = await translateToFrench(text);

        if (!translatedContent) {
            return res.status(500).json({ error: "Translation returned empty result" });
        }

        console.log("Original (English):", text);
        console.log("Translated (French):", translatedContent);

        // Reference-free COMET quality estimation (0 = worst, 1 = best)
        const confidence = await scoreCOMET(text, translatedContent, "English", "French");
        const LOW_CONFIDENCE_THRESHOLD = 0.75;
        const lowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD;

        console.log(`COMET confidence: ${confidence.toFixed(3)} | lowConfidence: ${lowConfidence}`);

        res.status(200).json({
            originalLanguage: "English",
            targetLanguage: "French",
            originalText: text,
            translatedText: translatedContent,
            confidence,
            lowConfidence
        });
    } catch (err) {
        console.error("Translation error:", err);
        res.status(500).json({ error: "Failed to translate content" });
    }
});

// API key middleware applies to routes below
app.use(apiKeyMiddleware);


app.use("/api/auth", authRouter);
app.use("/api/keys", apiKeysRouter);


app.get("/test", (req, res) => {
    console.log(req.apiKey);
    res.send("Test");
})

// Sample Cohere API endpoint
app.get("/cohere/:message", async (req, res) => {
    try {
        const message = (await req.params.message as string) || "Hello, how are you?";
        const response = await chat(message);
        res.status(200).json({
            message: message,
            response: response
        });
    } catch (err) {
        console.error("Cohere API error:", err);
        res.status(500).json({ error: "Failed to get response from Cohere" });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

export default app;

