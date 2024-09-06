import { StatePropertyAccessor, TurnContext, UserState } from "botbuilder";
import {
  ComponentDialog,
  ConfirmPrompt,
  DialogSet,
  DialogTurnStatus,
  ActivityPrompt,
  WaterfallDialog,
  WaterfallStepContext,
} from "botbuilder-dialogs";
import { phrases } from "../phrases";

export class UserProfile {
  public name?: string;
}

const USER_PROFILE = "USER_PROFILE";
const CONFIRM_PROMPT = "CONFIRM_PROMPT";
const IMAGE_PROMPT = "IMAGE_PROMPT";
const WATERFALL_DIALOG = "WATERFALL_DIALOG";

export class ImageToTextDialog extends ComponentDialog {
  private userProfile: StatePropertyAccessor<UserProfile>;

  constructor(userState: UserState) {
    super("imageToTextDialog");

    this.userProfile = userState.createProperty(USER_PROFILE);

    this.addDialog(
      new ActivityPrompt(IMAGE_PROMPT, async (prompt) => {
        return (
          prompt.context.activity.attachments?.some((attachment) =>
            attachment.contentType.startsWith("image")
          ) || false
        );
      })
    );
    this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT, undefined, "pt-br"));

    this.addDialog(
      new WaterfallDialog(WATERFALL_DIALOG, [
        this.welcome.bind(this),
        this.processImage.bind(this),
        this.getAnotherImage.bind(this),
        this.processImage.bind(this),
      ])
    );

    this.initialDialogId = WATERFALL_DIALOG;
  }

  public async run(context: TurnContext, accessor: StatePropertyAccessor) {
    const dialogSet = new DialogSet(accessor);
    dialogSet.add(this);

    const dialogContext = await dialogSet.createContext(context);
    const results = await dialogContext.continueDialog();
    if (results.status === DialogTurnStatus.empty) {
      await dialogContext.beginDialog(this.id);
    }
  }

  private async welcome(stepContext: WaterfallStepContext<UserProfile>) {
    await stepContext.context.sendActivity(
      phrases.welcomeImage(stepContext.context.activity.from.name)
    );

    return await stepContext.prompt(IMAGE_PROMPT, phrases.imagePrompt());
  }

  private async processImage(stepContext: WaterfallStepContext<UserProfile>) {
    const image = stepContext.context.activity.attachments?.find((attachment) =>
      attachment.contentType.startsWith("image")
    );

    await stepContext.context.sendActivity(
      `Aqui estão os exames da imagem que você enviou:`
    );

    return await stepContext.prompt(
      CONFIRM_PROMPT,
      phrases.askForAnotherImage()
    );
  }

  private async getAnotherImage(
    stepContext: WaterfallStepContext<UserProfile>
  ) {
    return await stepContext.prompt(IMAGE_PROMPT, phrases.imagePrompt());
  }
}
