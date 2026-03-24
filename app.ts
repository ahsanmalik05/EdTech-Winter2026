import express from 'express';
import cors from 'cors';
import config from './config/config.js';
import { db } from './db/index.js';
import { users } from './db/schema.js';
import { translateToFrench } from './services/cohere.js';
import authRouter from './routes/auth.js';
import apiKeysRouter from './routes/api_key.js';
import uploadRouter from './routes/upload.js';
import { apiKeyMiddleware } from './middleware/api_key.js';
import languagesRouter from './routes/languages.js';
import type { TranslationResponse } from './types/translation.js';
import type { CohereResponse, ErrorResponse } from './types/response.js';
const { port, nodeEnv } = config;

import translateRouter from './routes/translate.js';

console.log(config);

const app = express();

app.use(cors());
app.use(express.json());

app.use("/upload", uploadRouter);

app.get("/translation", async (req, res) => {
    try {
        const text = req.query.text as string;

        console.log("Received translation request for text:", text);
        if (!text) {
            return res.status(400).json({ error: "Text parameter is required" } as ErrorResponse);
        }

        const translatedContent = await translateToFrench(text);

        console.log("Original (English):", text);
        console.log("Translated (French):", translatedContent);

        const response: TranslationResponse = {
            originalLanguage: "English",
            targetLanguage: "French",
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

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(config);
});

export default app;

