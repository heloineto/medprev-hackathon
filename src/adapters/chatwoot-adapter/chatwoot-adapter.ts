import { writeFileSync } from "node:fs";
import axios, { AxiosInstance } from "axios";
import {
  Activity,
  ActivityTypes,
  Attachment,
  BotAdapter,
  Channels,
  ConversationReference,
  ResourceResponse,
  TurnContext,
  WebRequest,
  WebResponse,
} from "botbuilder";
import { z } from "zod";

export interface ChatwootAdapterOptions {
  accessToken: string;
  host: string;
  apiVersion: string;
  accountId: string;
  whatsapp: {
    apiVersion: string;
    accessToken: string;
  };
}

// TODO: Mark messages as read
export class ChatwootAdapter extends BotAdapter {
  private options: ChatwootAdapterOptions;
  private api: AxiosInstance;
  private whatsappApi: AxiosInstance;

  /**
   * Create a Chatwoot adapter.
   */
  public constructor(options: ChatwootAdapterOptions) {
    super();

    this.options = options;
    this.api = axios.create({
      baseURL: `${options.host}/api/${options.apiVersion}/`,
      headers: { api_access_token: options.accessToken },
    });

    this.whatsappApi = axios.create({
      baseURL: `https://graph.facebook.com/${options.whatsapp.apiVersion}/`,
      headers: { Authorization: `Bearer ${options.whatsapp.accessToken}` },
    });
  }

  public async sendActivities(
    context: TurnContext,
    activities: Partial<Activity>[]
  ): Promise<ResourceResponse[]> {
    const responses: ResourceResponse[] = [];

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      const phoneNumber = context.activity.conversation.properties?.phoneNumber;

      switch (activity.type) {
        case "locationRequest": {
          if (!phoneNumber) {
            // TODO: Handle
            break;
          }

          this.whatsappApi.post(
            `/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: phoneNumber,
              type: "interactive",
              interactive: {
                type: "location_request_message",
                body: { text: activity.text },
                action: { name: "send_location" },
              },
            }
          );

          break;
        }
        case "location": {
          if (!phoneNumber) {
            // TODO: Handle
            break;
          }

          const schema = z.object({
            latitude: z.number(),
            longitude: z.number(),
            name: z.string(),
            address: z.string(),
          });

          const value = schema.parse(activity.value);

          this.whatsappApi.post(
            `/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: phoneNumber,
              type: "location",
              location,
            }
          );

          break;
        }
        case ActivityTypes.Message:
          if (!activity.conversation || !activity.conversation.id) {
            throw new Error(
              `ChatwootAdapter.sendActivities(): Activity doesn't contain a conversation id.`
            );
          }

          let body: Record<string, unknown>;

          if (activity.suggestedActions) {
            body = {
              content: activity.text,
              content_type: "input_select",
              content_attributes: {
                items: activity.suggestedActions.actions.map((action) => ({
                  title: action.title,
                  value: action.value,
                })),
              },
            };
          } else {
            body = {
              content: activity.text,
            };
          }

          try {
            const response = await this.api.post(
              `/accounts/${this.options.accountId}/conversations/${activity.conversation.id}/messages`,
              body
            );

            const schema = z.object({ id: z.number() });
            const { id } = schema.parse(response.data);
            responses.push({ id: id.toString() });
          } catch (error) {
            console.error(error);
            throw new Error(
              `ChatwootAdapter.sendActivities(): Failed to send message.`
            );
          }

          break;
        case ActivityTypes.Handoff:
          if (!activity.conversation || !activity.conversation.id) {
            throw new Error(
              `ChatwootAdapter.sendActivities(): Activity doesn't contain a conversation id.`
            );
          }

          try {
            this.api.post(
              `/accounts/${this.options.accountId}/conversations/${activity.conversation.id}/toggle_status`,
              { status: "open" }
            );
          } catch (error) {
            console.error(error);
            throw new Error(
              `ChatwootAdapter.sendActivities(): Failed to handoff message.`
            );
          }
          break;
        default:
          responses.push({} as ResourceResponse);
          console.warn(
            `ChatwootAdapter.sendActivities(): Activities of type '${activity.type}' aren't supported.`
          );
      }
    }

    return responses;
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
    // if (req.body.event === "message_created") {
    //   console.log(req.body);
    // }

    if (
      req.body.event === "message_created" &&
      req.body.message_type === "incoming" &&
      // NOTE: "pending" means the conversation is not visible to attendants yet
      req.body.conversation?.status === "pending"
    ) {
      // console.log(req.body.conversation.meta);

      const schema = z.object({
        event: z.literal("message_created"),
        conversation: z.object({
          id: z.number(),
          channel: z.string(),
          messages: z.array(
            z.object({
              id: z.number(),
              content: z.string().nullable(),
              inbox_id: z.number(),
              account_id: z.number(),
              attachments: z.array(z.record(z.unknown())).optional(),
              sender: z.object({
                id: z.number(),
                name: z.string(),
              }),
            })
          ),
        }),
        sender: z
          .object({
            email: z.string().nullable(),
            name: z.string().nullable(),
            phone_number: z.string().nullable(),
            additional_attributes: z.record(z.unknown()),
            custom_attributes: z.record(z.unknown()),
          })
          .optional(),
      });

      const parsed = schema.safeParse(req.body);

      if (!parsed.success) {
        console.log(req.body);
        // write body to a dump.json file
        writeFileSync("dump.json", JSON.stringify(req.body, null, 2));
        console.error(parsed.error);
        throw new Error("Invalid event payload.");
      }

      const body = parsed.data;
      const message = body.conversation.messages[0];

      if (!message) {
        throw new Error("Message not found in event.");
      }

      const activity: Partial<Activity> = {
        id: message.id.toString(),
        type: ActivityTypes.Message,
        timestamp: new Date(),
        channelId: Channels.Facebook,
        text: message.content ?? "",
        channelData: body,
        // localTimezone: null,
        // callerId: null,
        // serviceUrl: null,
        // listenFor: null,
        attachments: message.attachments?.map((attachment) => {
          if (attachment.file_type === "image") {
            return {
              contentType: `image/${attachment.extension}`,
              contentUrl: attachment.data_url,
              thumbnailUrl: attachment.thumb_url,
              content: attachment,
            } as Attachment;
          }

          return {
            contentType: "unknown",
          };
        }),
        label: message.id.toString(),
        valueType: body.event,
        value: body,
        conversation: {
          id: body.conversation.id.toString(),
          isGroup: false,
          conversationType: "message",
          tenantId: message.account_id.toString(),
          name: "",
          properties: {
            phoneNumber: body.sender?.phone_number,
            name: body.sender?.name,
          },
        },
        from: {
          id: message.sender.id.toString(),
          name: message.sender.name,
          properties: message.sender,
        },
        recipient: {
          id: message.inbox_id.toString(),
          name: "",
        },
      };

      const context = new TurnContext(this, activity);

      context.turnState.set("httpStatus", 200);
      await this.runMiddleware(context, logic);

      res.status(context.turnState.get("httpStatus"));
      if (context.turnState.get("httpBody")) {
        res.send(context.turnState.get("httpBody"));
      } else {
        res.end();
      }
    }
  }
}
