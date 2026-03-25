import express from 'express';
import cors from 'cors';
import config from './config/config.js';
import { db } from './db/index.js';
import { users } from './db/schema.js';
import { chat } from './services/cohere.js';
import { loadGlossaryCache } from './services/glossary.js';
import authRouter from './routes/auth.js';
import apiKeysRouter from './routes/api_key.js';
import { apiKeyMiddleware } from './middleware/api_key.js';
import languagesRouter from './routes/languages.js';
import translateRouter from './routes/translate.js';
import type { TranslationResponse } from './types/translation.js';
import templatesRouter from './routes/templates.js';
import translationLogRouter from './routes/translation_log.js';
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

app.use(apiKeyMiddleware);

app.use("/api/auth", authRouter);
app.use("/api/keys", apiKeysRouter);
app.use("/api/languages", languagesRouter);
app.use("/api/translate", translateRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/translation-log", translationLogRouter);

async function start() {
    const termCount = await loadGlossaryCache();
    console.log(`Glossary cache loaded: ${termCount} terms`);

    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

start();

export default app;

