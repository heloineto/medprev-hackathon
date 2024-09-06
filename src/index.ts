import * as restify from "restify";
import {
  ConversationState,
  MemoryStorage,
  TurnContext,
  UserState,
} from "botbuilder";
import { Bot } from "./bot";
import { ChatwootAdapter } from "./adapters/chatwoot-adapter";
import "./env";
import { phrases } from "./phrases";
import { ImageToTextDialog } from "./dialogs/image-to-text-dialog";

const server = restify.createServer();
server.use(restify.plugins.bodyParser());

server.listen(process.env.port || process.env.PORT || 4000, () => {
  console.log(`\n${server.name} listening to ${server.url}`);
});

// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const chatwootAdapter = new ChatwootAdapter({
  accessToken: process.env.CHATWOOT_BOT_ACCESS_TOKEN,
  accountId: process.env.CHATWOOT_BOT_ACCOUNT_ID,
  host: process.env.CHATWOOT_HOST,
  apiVersion: process.env.CHATWOOT_API_VERSION,
  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    apiVersion: process.env.WHATSAPP_API_VERSION,
  },
});

// Catch-all for errors.
const onTurnErrorHandler = async (context: TurnContext, error: Error) => {
  // Send a trace activity, which will be displayed in Bot Framework Emulator
  await context.sendTraceActivity(
    "OnTurnError Trace",
    `${error}`,
    "https://www.botframework.com/schemas/error",
    "TurnError"
  );

  // Send a message to the user
  await context.sendActivity(phrases.error());
};

// Set the onTurnError for the singleton CloudAdapter.
chatwootAdapter.onTurnError = onTurnErrorHandler;

// Define the state store for your bot.
// See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state storage system to persist the dialog and user state between messages.
const memoryStorage = new MemoryStorage();

// Create conversation state with in-memory storage provider.
const conversationState = new ConversationState(memoryStorage);
const userState = new UserState(memoryStorage);

// Create the main dialog.
const dialog = new ImageToTextDialog(userState);
const bot = new Bot(conversationState, userState, dialog);

server.post("/api/messages", async (req, res) => {
  await chatwootAdapter.process(req, res, (context) => bot.run(context));
});
