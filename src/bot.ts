import {
  ActivityHandler,
  BotState,
  StatePropertyAccessor,
  UserState,
} from "botbuilder";
import { DialogState } from "botbuilder-dialogs";
import { ImageToTextDialog } from "./dialogs/image-to-text-dialog";
import { PurchaseDialog } from "./dialogs/purchase-dialog";

export class Bot extends ActivityHandler {
  private conversationState: BotState;
  private userState: BotState;
  private dialog: ImageToTextDialog;
  private dialogState: StatePropertyAccessor<DialogState>;
  private dialogState2: StatePropertyAccessor<DialogState>;
  private purchaseDialog: PurchaseDialog;

  constructor(
    conversationState: BotState,
    userState: UserState,
    dialog: ImageToTextDialog,
    purchaseDialog: PurchaseDialog
  ) {
    super();

    this.conversationState = conversationState;
    this.userState = userState;
    this.dialog = dialog;
    this.purchaseDialog = purchaseDialog;
    this.dialogState = this.conversationState.createProperty("DialogState");
    this.dialogState2 = this.conversationState.createProperty("DialogState2");

    // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
    this.onMessage(async (context, next) => {
      await this.dialog.run(context, this.dialogState);
      await this.purchaseDialog.run(context, this.dialogState2);

      // By calling next() you ensure that the next BotHandler is run.
      await next();
    });

    this.onDialog(async (context, next) => {
      // Save any state changes. The load happened during the execution of the Dialog.
      await this.conversationState.saveChanges(context, false);
      await this.userState.saveChanges(context, false);

      await next();
    });
  }
}
