import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from "drizzle-orm";
import config from './config/config.js';
import { db } from './db/index.js';

import authRouter from './routes/auth.js';
import apiKeysRouter from './routes/api_key.js';
import adminRouter from './routes/admin.js';


import { loadGlossaryCache } from './services/glossary.js';
import { apiKeyMiddleware } from './middleware/api_key.js';
import languagesRouter from './routes/languages.js';
import translateRouter from './routes/translate.js';
import templatesRouter from './routes/templates.js';
import translationLogRouter from './routes/translation_log.js';
import templateGenerationLogRouter from './routes/template_generation_log.js';
import { createRequestId } from './utils/observability.js';
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
app.use(cookieParser());

app.use((req, _res, next) => {
    if (req.originalUrl.startsWith('/api')) {
        req.requestId = createRequestId();
    }
    next();
});

app.use("/api/auth", authRouter);
app.use("/api/keys", apiKeysRouter);
app.use("/api/admin", adminRouter);

app.use('/api', apiKeyMiddleware);
app.use("/api/languages", languagesRouter);
app.use("/api/translate", translateRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/translation-log", translationLogRouter);
app.use("/api/template-generation-log", templateGenerationLogRouter);

if (fs.existsSync(frontendIndexPath)) {
        app.use(express.static(frontendDistPath));

        // Send SPA shell for all non-API routes (e.g. /login, /dashboard).
        app.get(/^(?!\/api).*/, (_req, res) => {
                res.sendFile(frontendIndexPath);
        });
} else {
        app.get(/^(?!\/api).*/, (_req, res) => {
                res.status(503).type('html').send(`
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Frontend Not Built</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 2rem; line-height: 1.5;">
        <h1>Frontend build not found</h1>
        <p>This backend serves the frontend from <code>frontend/dist</code> in production mode.</p>
        <p>Run <code>npm run build:frontend</code> from the project root, then restart the backend.</p>
        <p>For development UI, run <code>npm run dev</code> inside the <code>frontend</code> folder and open <a href="http://localhost:5173">http://localhost:5173</a>.</p>
    </body>
</html>`);
        });
}

async function start() {
    try {
        await Promise.race([
            db.execute(sql`select 1 as ok`),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Startup DB probe timed out after 5000ms')), 5000),
            ),
        ]);
    } catch (error) {
        console.error('Startup DB probe failed:', error);
    }

    const termCount = await loadGlossaryCache();
    console.log(`Glossary cache loaded: ${termCount} terms`);

    if (config.mailFrom.includes("@resend.dev")) {
        console.warn(
            "[mail] MAIL_FROM uses a @resend.dev address: only the Resend account owner email can receive messages until you add and verify a custom domain.",
        );
    }

    app.listen(port, '0.0.0.0', () => {
        console.log(`Server is running on port ${port}`);
    });
}

process.on('SIGTERM', () => {
    console.warn('SIGTERM received');
});

process.on('SIGINT', () => {
    console.warn('SIGINT received');
});

start();

export default app;
