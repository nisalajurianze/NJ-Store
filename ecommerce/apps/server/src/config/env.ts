import { bool, cleanEnv, num, port, str, url } from 'envalid';
import dotenv from 'dotenv';

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
  LOG_LEVEL: str({ choices: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'], default: 'info' }),
  LOG_FILE_ENABLED: bool({ default: false }),
  LOG_FILE_DIR: str({ default: '.logs' }),
  LOG_FILE_MAX_SIZE: str({ default: '10m' }),
  LOG_FILE_MAX_FILES: num({ default: 5 }),
  PORT: port({ default: 5000 }),
  CLIENT_URL: url({ default: 'http://localhost:5173' }),
  ADMIN_URL: url({ default: 'http://localhost:5174' }),
  MONGO_URI: str({ devDefault: 'mongodb://njstore:njstore-dev-mongo-password@127.0.0.1:27017/njstore?authSource=admin&replicaSet=rs0' }),
  JWT_ACCESS_SECRET: str({ devDefault: 'njstore-dev-access-secret' }),
  JWT_REFRESH_SECRET: str({ devDefault: 'njstore-dev-refresh-secret' }),
  JWT_EMAIL_SECRET: str({ default: 'replace-with-email-secret', devDefault: 'njstore-dev-email-secret' }),
  JWT_ACCESS_EXPIRES: str({ default: '15m' }),
  JWT_REFRESH_EXPIRES: str({ default: '7d' }),
  GOOGLE_CLIENT_ID: str({ default: '' }),
  GOOGLE_CLIENT_SECRET: str({ default: '' }),
  CLOUDINARY_CLOUD_NAME: str({ default: '' }),
  CLOUDINARY_API_KEY: str({ default: '' }),
  CLOUDINARY_API_SECRET: str({ default: '' }),
  SMTP_HOST: str({ default: 'smtp.resend.com' }),
  SMTP_PORT: num({ default: 465 }),
  SMTP_USER: str({ default: 'resend' }),
  SMTP_PASS: str({ default: '' }),
  RESEND_API_KEY: str({ default: '' }),
  TWILIO_ACCOUNT_SID: str({ default: '' }),
  TWILIO_AUTH_TOKEN: str({ default: '' }),
  TWILIO_FROM_NUMBER: str({ default: '' }),
  EMAIL_FROM: str({ default: '' }),
  EMAIL_FROM_NAME: str({ default: 'NJ Store' }),
  SUPPORT_EMAIL: str({ default: '' }),
  APP_NAME: str({ default: 'NJ Store' }),
  FREE_SHIPPING_THRESHOLD: num({ default: 15000 }),
  LOW_STOCK_THRESHOLD: num({ default: 5 }),
  COOKIE_DOMAIN: str({ default: 'localhost' }),
  REDIS_URL: str({ default: '' })
});

export const isProduction = env.NODE_ENV === 'production';
const blockedProductionPrefixes = ['njstore-dev-', 'replace-with-'] as const;
const usesBlockedProductionValue = (value: string): boolean =>
  blockedProductionPrefixes.some((prefix) => value.startsWith(prefix));

if (isProduction) {
  const blockedProductionKeys = Object.entries(env)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    .filter(([, value]) => usesBlockedProductionValue(value))
    .map(([key]) => key);

  if (blockedProductionKeys.length > 0) {
    throw new Error(
      `Production environment variables must not use development or placeholder values: ${blockedProductionKeys.join(', ')}.`
    );
  }
}
