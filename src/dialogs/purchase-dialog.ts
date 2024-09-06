import { StatePropertyAccessor, TurnContext, UserState } from "botbuilder";
import {
  ComponentDialog,
  ConfirmPrompt,
  DialogSet,
  DialogTurnStatus,
  TextPrompt,
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
const PROCEDURE_SEARCH_PROMPT = "PROCEDURE_SEARCH_PROMPT";
const IMAGE_PROMPT = "IMAGE_PROMPT";
const WATERFALL_DIALOG = "WATERFALL_DIALOG";

export class PurchaseDialog extends ComponentDialog {
  private userProfile: StatePropertyAccessor<UserProfile>;
  private previousUserProfile?: UserProfile;

  constructor(userState: UserState) {
    super("purchaseDialog");

    this.userProfile = userState.createProperty(USER_PROFILE);

    this.addDialog(new TextPrompt(PROCEDURE_SEARCH_PROMPT));
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
        // this.procedureSearchStep.bind(this),
        this.requestLocationStep.bind(this),
        this.proceduresStep.bind(this),
        this.summaryStep.bind(this),
      ])
    );

    this.initialDialogId = WATERFALL_DIALOG;
  }

  public async run(context: TurnContext, accessor: StatePropertyAccessor) {
    const dialogSet = new DialogSet(accessor);
    dialogSet.add(this);

    this.previousUserProfile = await this.userProfile.get(
      context,
      new UserProfile()
    );

    const dialogContext = await dialogSet.createContext(context);
    const results = await dialogContext.continueDialog();
    if (results.status === DialogTurnStatus.empty) {
      await dialogContext.beginDialog(this.id);
    }
  }

  private async procedureSearchStep(
    stepContext: WaterfallStepContext<UserProfile>
  ) {
    await stepContext.context.sendActivity(
      phrases.welcome(stepContext.context.activity.from.name)
    );

    return await stepContext.prompt(
      PROCEDURE_SEARCH_PROMPT,
      phrases.whatDoYouNeed()
    );
  }

  private async sendFacilityLocationStep(
    stepContext: WaterfallStepContext<UserProfile>
  ) {
    await stepContext.context.sendActivity({
      type: "location",
      value: {
        latitude: "-25.426439",
        longitude: "-49.2766337",
        name: "Instituto de Saúde",
        address: "R. Treze de Maio, 825 - Centro, Curitiba - PR, 80510-030",
      },
    });
  }

  private async requestLocationStep(
    stepContext: WaterfallStepContext<UserProfile>
  ) {
    return await stepContext.prompt(PROCEDURE_SEARCH_PROMPT, {
      type: "locationRequest",
      text: phrases.locationRequest(),
    });
  }

  private async proceduresStep(stepContext: WaterfallStepContext<UserProfile>) {
    const query = stepContext.result;

    console.log("query", query, stepContext.context.activity);

    // const response = await axios.get(
    //   `https://rest.medprev.app/search/search-by-type?limit=20&search=${query}`
    // );

    // console.log("response", response.data);

    return await stepContext.prompt(CONFIRM_PROMPT, {
      prompt: phrases.confirmHandoff(),
    });
  }

  private async summaryStep(stepContext: WaterfallStepContext<UserProfile>) {
    if (stepContext.result) {
      const userProfile = await this.userProfile.get(
        stepContext.context,
        new UserProfile()
      );
      const stepContextOptions = stepContext.options;
      userProfile.name = stepContextOptions.name;

      await stepContext.context.sendActivity(phrases.handoff(userProfile.name));
      await stepContext.context.sendActivity({ type: "handoff" });
    } else {
      await stepContext.context.sendActivity(phrases.endConversation());
    }

    return await stepContext.endDialog();
  }
}
