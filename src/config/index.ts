import { config } from 'dotenv';
config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

export const CREDENTIALS = process.env.CREDENTIALS === 'true';
export const {
  NODE_ENV,
  PORT,
  DB_HOST,
  DB_PORT,
  DB_DATABASE,
  SECRET_KEY,
  LOG_FORMAT,
  LOG_DIR,
  ORIGIN,
  BOT_TOKEN,
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL,
  COOKIE_DOMAIN,
  DB_PASSWORD,
  DB_USER,
  FRONT_REDIRECT_URL,
  MESSAGE_API_KEY,
  MESSAGE_API_SECRET_KEY,
  MESSAGE_API_FROM,
  MESSAGE_API_PFID,
  PAYMENTS_TOSS_SECRET_KEY,
  PAYMENTS_TOSSPAYMENTS_SECRET_KEY
} = process.env;
