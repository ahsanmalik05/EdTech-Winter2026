import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
import templateGenerationLogRouter from './routes/template_generation_log.js';
import type { CohereResponse, ErrorResponse } from './types/response.js';
const { port, nodeEnv, frontendUrl } = config;
const allowedOrigins = [frontendUrl, 'http://localhost:3000'];
if (nodeEnv === 'development') {
    allowedOrigins.push('http://localhost:5173');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const frontendIndexPath = path.join(frontendDistPath, 'index.html');


const app = express();

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    },
    credentials: true,
}));
app.use(express.json());

app.use('/api', apiKeyMiddleware);

app.use("/api/auth", authRouter);
app.use("/api/keys", apiKeysRouter);
app.use("/api/languages", languagesRouter);
app.use("/api/translate", translateRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/translation-log", translationLogRouter);
app.use("/api/template-generation-log", templateGenerationLogRouter);

if (fs.existsSync(frontendIndexPath)) {
    app.use(express.static(frontendDistPath));

    app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(frontendIndexPath);
    });
} else {
    app.get('/', (_req, res) => {
        res.status(404).send('Frontend build not found. Run "npm run build" in frontend first.');
    });
}

async function start() {
    const termCount = await loadGlossaryCache();
    console.log(`Glossary cache loaded: ${termCount} terms`);

    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

start();

export default app;

