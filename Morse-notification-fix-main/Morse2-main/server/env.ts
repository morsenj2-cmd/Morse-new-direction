const requiredEnvVars = [
  "NODE_ENV",
  "PORT",
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "CLERK_PUBLISHABLE_KEY",
  "RESEND_API_KEY",
  "EMAIL_FROM",
] as const;

type RequiredEnvKey = (typeof requiredEnvVars)[number];

function getRequiredEnv(name: RequiredEnvKey): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePort(rawPort: string): number {
  const port = Number.parseInt(rawPort, 10);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }
  return port;
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: getRequiredEnv("NODE_ENV"),
  port: parsePort(getRequiredEnv("PORT")),
  databaseUrl: getRequiredEnv("DATABASE_URL"),
  clerkSecretKey: getRequiredEnv("CLERK_SECRET_KEY"),
  clerkPublishableKey: getRequiredEnv("CLERK_PUBLISHABLE_KEY"),
  resendApiKey: getRequiredEnv("RESEND_API_KEY"),
  emailFrom: getRequiredEnv("EMAIL_FROM"),
  corsAllowedOrigins: parseOrigins(process.env.CORS_ALLOWED_ORIGINS),
};
