import express from 'express';
import cors from 'cors';
import config from './config/config.js';
import { db } from './db/index.js';
import { users } from './db/schema.js';
import { chat, translateToFrench } from './services/cohere.js';
import authRouter from './routes/auth.js';
import apiKeysRouter from './routes/api_key.js';
import classroomsRouter from './routes/classrooms.js';
import worksheetsRouter from './routes/worksheets.js';
import { apiKeyMiddleware } from './middleware/api_key.js';
import languagesRouter from './routes/languages.js';
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
        
        console.log("Original (English):", text);
        console.log("Translated (French):", translatedContent);
        
        res.status(200).json({
            originalLanguage: "English",
            targetLanguage: "French",
            originalText: text,
            translatedText: translatedContent
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
app.use("/api/classrooms", classroomsRouter);
app.use("/api/worksheets", worksheetsRouter);
app.use("/api/languages", languagesRouter);

app.get("/test", (req, res) => {
    console.log(req.apiKey);
    res.send("Test");
})

// Sample Cohere API endpoint
app.get("/cohere/:message", async (req, res) => {
    try {
        const message = ( await req.params.message as string) || "Hello, how are you?";
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

