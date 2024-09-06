import * as path from "path";
import { config } from "dotenv";
import { z } from "zod";

const ENV_FILE = path.join(__dirname, "..", ".env");
config({ path: ENV_FILE });

const envSchema = z.object({
  WHATSAPP_ACCESS_TOKEN: z.string(),
  WHATSAPP_API_VERSION: z.string(),
  WHATSAPP_VERIFY_TOKEN: z.string(),
  WHATSAPP_PHONE_NUMBER_ID: z.string(),
  CHATWOOT_BOT_ACCESS_TOKEN: z.string(),
  CHATWOOT_BOT_ACCOUNT_ID: z.string(),
  CHATWOOT_HOST: z.string(),
  CHATWOOT_API_VERSION: z.string(),
});

envSchema.parse(process.env);

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CHATWOOT_BOT_ACCESS_TOKEN: string;
      CHATWOOT_BOT_ACCOUNT_ID: string;
      CHATWOOT_HOST: string;
      CHATWOOT_API_VERSION: string;
      WHATSAPP_ACCESS_TOKEN: string;
      WHATSAPP_API_VERSION: string;
      WHATSAPP_VERIFY_TOKEN: string;
      WHATSAPP_PHONE_NUMBER_ID: string;
    }
  }
}
