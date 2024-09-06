import {
  Activity,
  BotAdapter,
  ConversationReference,
  ResourceResponse,
  TurnContext,
  WebRequest,
  WebResponse,
} from "botbuilder";

export interface WhatsAppAdapterOptions {
  /**
   * Authentication Data for the connection to the WhatsApp Client
   */
  auth?: string;

  /**
   * A string that that we grab from the Verify Token field in your app's App Dashboard.
   * You will set this string when you complete the [Webhooks configuration settings steps](https://developers.facebook.com/docs/graph-api/webhooks/getting-started#configure-webhooks-product).
   */
  verifyToken: string;
}

interface SubscribeQueryParams {
  "hub.mode": string;
  "hub.challenge": string;
  "hub.verify_token": string;
}

export class WhatsAppAdapter extends BotAdapter {
  private options: WhatsAppAdapterOptions;

  /**
   * Create a WhatsApp adapter.
   */
  public constructor(options: WhatsAppAdapterOptions) {
    super();

    this.options = options;
  }

  public sendActivities(
    context: TurnContext,
    activities: Partial<Activity>[]
  ): Promise<ResourceResponse[]> {
    return Promise.resolve([]);
  }

  public updateActivity(
    context: TurnContext,
    activity: Partial<Activity>
  ): Promise<ResourceResponse | void> {
    return Promise.resolve(undefined);
  }

  public deleteActivity(
    context: TurnContext,
    reference: Partial<ConversationReference>
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  public continueConversation(
    reference: Partial<ConversationReference>,
    logic: (revocableContext: TurnContext) => Promise<void>
  ): Promise<void> {
    return Promise.resolve(undefined);
  }

  public async process(
    req: WebRequest,
    res: WebResponse,
    logic: (context: TurnContext) => Promise<void>
  ): Promise<void> {
    if (req.method === "GET") {
      const { query } = req as unknown as { query: SubscribeQueryParams };

      const mode = query["hub.mode"];

      if (mode !== "subscribe") {
        return;
      }

      const challenge = query["hub.challenge"];
      const verifyToken = query["hub.verify_token"];

      if (verifyToken === this.options.verifyToken) {
        res.send(Number(challenge));
      } else {
        res.status(403);
        res.end();
      }
    }
  }
}
