import { Rekognition } from "aws-sdk";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  Message,
} from "@aws-sdk/client-bedrock-runtime";
import axios from "axios";

const rekognition = new Rekognition({ region: "us-east-1" });
const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });

export async function extractProceduresFromImageUrl(url: string) {
  const imageBytes = await getImageFromUrl(url);
  const text = await detectText(imageBytes);

  return text;
}

async function getImageFromUrl(url: string) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
  });

  const imageBytes = Buffer.from(response.data, "binary");

  return imageBytes;
}

async function detectText(imageBytes: Buffer) {
  const params = {
    Image: {
      Bytes: imageBytes,
    },
  };

  const result = await rekognition.detectText(params).promise();
  const mappedResults = mapResultsToArray(result);
  const filteredProcedures = await filterOutProceduresOnBedrock(mappedResults);

  return filteredProcedures;
}

function mapResultsToArray(results: any) {
  return results.TextDetections.map(
    (textDetection: any) => textDetection.DetectedText
  );
}

async function filterOutProceduresOnBedrock(textArray: string[]) {
  const modelId = "amazon.titan-tg1-large";
  const userMessage = `Baseado no seguinte texto, organize em uma lista apenas os exames médicos. Não fale nada além dessa lista
     Exemplo:
      - Glicose
      - Hemoglobina
      - Tomografia articulações
      - Raio X da face

    Leitura do pedido médico:
    ${textArray.join("\n")}
    `;

  try {
    const conversation: Message[] = [
      {
        role: "user",
        content: [
          {
            text: userMessage,
          },
        ],
      },
    ];

    const apiResponse = await bedrock.send(
      new ConverseCommand({
        modelId,
        messages: conversation,
        inferenceConfig: { maxTokens: 512, temperature: 0, topP: 0.9 },
      })
    );

    const bedrockResponse = apiResponse.output?.message?.content;

    return bedrockResponse;
  } catch (error) {
    console.log("deu ruim", modelId);
    console.error("Error in Bedrock conversation: ", error);
  }
}
