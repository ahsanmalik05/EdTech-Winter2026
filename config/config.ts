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
};

export default config;
