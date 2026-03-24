import express from 'express';
import cors from 'cors';
import config from './config/config.js';
import { db } from './db/index.js';
import { users } from './db/schema.js';
import { chat, translateToFrench, translateContent } from './services/cohere.js';
import { loadGlossaryCache } from './services/glossary.js';
import authRouter from './routes/auth.js';
import apiKeysRouter from './routes/api_key.js';
import uploadRouter from './routes/upload.js';
import { apiKeyMiddleware } from './middleware/api_key.js';
import languagesRouter from './routes/languages.js';
import translateRouter from './routes/translate.js';
import type { TranslationResponse } from './types/translation.js';
import type { CohereResponse, ErrorResponse } from './types/response.js';
const { port, nodeEnv, frontendUrl } = config;

const allowedOrigins = [frontendUrl];
if (nodeEnv === 'development') {
    allowedOrigins.push('http://localhost:5173');
}

const app = express();

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origin '${origin}' not allowed`));
        }
    },
    credentials: true,
}));
app.use(express.json());

app.use("/upload", uploadRouter);

app.get("/translation", async (req, res) => {
    try {
        const text = req.query.text as string;
        const targetLanguage = (req.query.lang as string) || "French";
        
        console.log("Received translation request for text:", text, "to:", targetLanguage);


        console.log("Received translation request for text:", text);
        if (!text) {
            return res.status(400).json({ error: "Text parameter is required" } as ErrorResponse);
        }

        
        const translatedContent = await translateContent(text, targetLanguage);
        
        console.log("Original (English):", text);
        console.log(`Translated (${targetLanguage}):`, translatedContent);
        
        const response: TranslationResponse = {
            originalLanguage: "English",
            targetLanguage,
            originalText: text,
            translatedText: translatedContent || ""
        };
        res.status(200).json(response);
    } catch (err) {
        console.error("Translation error:", err);
        res.status(500).json({ error: "Failed to translate content" } as ErrorResponse);
    }
});

app.use(apiKeyMiddleware);

app.use("/api/auth", authRouter);
app.use("/api/keys", apiKeysRouter);
app.use("/api/languages", languagesRouter);
app.use("/api/translate", translateRouter);

app.get("/cohere/:message", async (req, res) => {
    try {
        const message = (req.params.message as string) || "Hello, how are you?";
        const response = await translateToFrench(message);
        const cohereResponse: CohereResponse = {
            message: message,
            response: response || ""
        };
        res.status(200).json(cohereResponse);

    } catch (err) {
        console.error("Cohere API error:", err);
        res.status(500).json({ error: "Failed to get response from Cohere" } as ErrorResponse);
    }
});

async function start() {
    const termCount = await loadGlossaryCache();
    console.log(`Glossary cache loaded: ${termCount} terms`);

    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

start();

export default app;

