import dotenv from "dotenv";

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  console.error("FATAL: JWT_SECRET environment variable is required");
  process.exit(1);
}
if (jwtSecret.length < 32) {
  console.error("FATAL: JWT_SECRET must be at least 32 characters long");
  process.exit(1);
}

interface Config {
  port: number;
  nodeEnv: string;
  databaseUrl: string;
  cohereApiKey: string;
  frontendUrl: string;
  openaiApiKey: string;
  jwtSecret: string;
  models: {
    translation: string;
    validation: string;
    generation: string;
  };
  appBaseUrl: string;
  resendApiKey: string;
  mailFrom: string;
  bucket: {
    name: string;
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "",
  cohereApiKey: process.env.COHERE_API_KEY || "",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  jwtSecret,
  models: {
    translation: "command-a-translate-08-2025",
    validation: "gpt-5-nano",
    generation: "gpt-5-nano",
  },
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  resendApiKey: process.env.RESEND_API_KEY || "",
  mailFrom:
    process.env.MAIL_FROM?.trim() ||
    "METY <onboarding@resend.dev>",

  bucket: {
    name: process.env.BUCKET || "",
    endpoint: process.env.ENDPOINT || "",
    region: process.env.REGION || "auto",
    accessKeyId: process.env.ACCESS_KEY_ID || "",
    secretAccessKey: process.env.SECRET_ACCESS_KEY || "",
  },
};

export default config;
