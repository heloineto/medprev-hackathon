import { Rekognition } from "aws-sdk";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  Message,
} from "@aws-sdk/client-bedrock-runtime";
import axios from "axios";
import { phrases } from "./phrases";
import { addProceduresToCart } from "./add-procedures-to-cart";

const rekognition = new Rekognition({ region: "us-east-1" });
const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });

export async function extractProceduresFromImageUrl(url: string) {
  const imageBytes = await getImageFromUrl(url);
  return await detectText(imageBytes);
}

async function getImageFromUrl(url: string) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
  });

  const imageBytes = Buffer.from(response.data, "binary");

  return imageBytes;
}

async function detectText(imageBytes: Buffer) {
  const params = { Image: { Bytes: imageBytes } };

  const result = await rekognition.detectText(params).promise();
  const mappedResults = mapResultsToArray(result);
  const filteredProcedures = await filterOutProceduresOnBedrock(mappedResults);
  const proceduresToCartUrl = await getProceduresToCartUrl(mappedResults);

  return { text: filteredProcedures, cartUrl: proceduresToCartUrl };
}

function mapResultsToArray(results: any) {
  return results.TextDetections.map(
    (textDetection: any) => textDetection.DetectedText
  );
}

async function filterOutProceduresOnBedrock(textArray: string[]) {
  if (textArray.length === 0) {
    return phrases.imageNotFound();
  }

  const modelId = "amazon.titan-text-premier-v1:0";
  const userMessage = `Baseado no seguinte texto, organize em uma lista apenas os exames médicos.
Caso não haja exames, retorne uma mensagem informando que não foi possível encontrar exames na imagem.
Em caso de "Hemograma Com Contagem de Plaquetas ou Frações (Eritrograma Leucograma, Plaquetas)",
mostre apenas Hemograma em caso de "Potássio-Pesquisa E/ou Dosagem" mostre apenas "Potássio", etc...

Exemplo 1 - Leitura do pedido médico:
TopSaúde®
ESPECIALIDADES
Solicitação de exames
Priscila Ingrid Kachel
Idade: 47 anos, 5 meses, 20 dias
Convênio: MedPrev Online
Exames
40.30.43.61 - Hemograma Com Contagem de Plaquetas ou Frações (Eritrograma
Leucograma, Plaquetas)
40.30.23.18-Potassio-Pesquisa E/ou Dosagem
40.30.25.80-Ureia-Pesquisa E/ou Dosagem
40.30.16.30 - Creatinina - Pesquisa E/ou Dosagem
40.31.65.21 - Tireoestimulante, Hormônio (Tsh)-Pesquisa E/ou Dosagem
40.31.64.91 - T4 Livre - Pesquisa E/ou Dosagem
Indicação clínica
HAS
Dr. Gregor Baccni Elvira
andrologista
389/ ROE 34479
LRM.PR
Dr. Gregor Bacchi Elvira
CRM-PR 23989
Médico cardiologista
TopSaúde®
ESPECIALIDADES
Solicitação
de
exames
Priscila
Ingrid
Kachel
Idade:
47
anos,
5
meses,
20
dias
Convênio:
MedPrev
Online
Exames
40.30.43.61 - Hemograma
Com
Contagem
de
Plaquetas
ou
Frações
(Eritrograma
Leucograma,
Plaquetas)
40.30.23.18-Potassio-Pesquisa
E/ou
Dosagem
40.30.25.80-Ureia-Pesquisa
E/ou
Dosagem
40.30.16.30 - Creatinina - Pesquisa
E/ou
Dosagem
40.31.65.21 - Tireoestimulante,
Hormônio
(Tsh)-Pesquisa
E/ou
Dosagem
40.31.64.91
- T4
Livre - Pesquisa
E/ou
Dosagem
Indicação
clínica
HAS
Dr.
Gregor
Baccni

Exemplo 1 - Lista de exames:
- *Hemograma* _(TUSS 40.30.43.61)_
- *Potássio* _(TUSS 40.30.23.18)_
- *Ureia* _(TUSS 40.30.25.80)_
- *Creatinina* _(TUSS 40.30.16.30)_
- *Tireoestimulante, Hormônio (Tsh)* (T) _(TUSS 40.31.65.21)_
- *T4 Livre* _(TUSS 40.31.64.91)_

Exemplo 2 - Leitura do pedido médico:
Odonto Select-Campo Largo
Rua Oswaldo Cruz, 360, centro, Campo Largo - PR
Fones: 41 3032-2350 . 41 9 9195-5431
Solicitação de Exames
Hemograma
Coagulograma
Perfil Lipidico
Creatinina
Glicose
HIV
06/09/2024
Sandra Maria Benato CRO PR-20704
Odonto
Select-Campo
Largo
Rua
Oswaldo
Cruz,
360,
centro,
Campo
Largo - PR
Fones:
41
3032-2350
.
41
9
9195-5431
Solicitação
de
Exames
Hemograma
Coagulograma
Perfil
Lipidico
Creatinina
Glicose
HIV
06/09/2024
Sandra
Maria
Benato
CRO
PR-20704

Exemplo 2 - Lista de exames:
- *Hemograma*
- *Coagulograma*
- *Perfil Lipídico*
- *Creatinina*
- *Glicose*
- *HIV*

Exemplo 3 - Leitura do pedido médico:
Lorem ipsum nossa plataforma seja um ecossistema saudável
que promova nossos valores e ofereça uma ótima experiência
para as pessoas
e um ótimo desempenho para as empresas. Para refletir esse
compromisso, vamos atualizar
as taxas de
marketing e serviços da nossa plataforma a partir de 1º de agosto.

Exemplo 3 - Lista de exames:
${phrases.imageNotFound()}

Leitura do pedido médico:
${textArray.join("\n")}

Lista de exames:
`;

  try {
    const conversation: Message[] = [
      {
        role: "user",
        content: [{ text: userMessage }],
      },
    ];

    const apiResponse = await bedrock.send(
      new ConverseCommand({
        modelId,
        messages: conversation,
        inferenceConfig: { maxTokens: 1024, temperature: 0, topP: 0.9 },
      })
    );

    return apiResponse.output?.message?.content?.[0].text;
  } catch (error) {
    console.log(error);

    return phrases.imageNotFound();
  }
}

async function getProceduresToCartUrl(textArray: string[]) {
  let exams: string | undefined;

  if (textArray.length === 0) {
    return undefined;
  }

  const modelId = "amazon.titan-text-premier-v1:0";
  const userMessage = `Baseado no seguinte texto, organize em uma lista apenas os exames médicos.
Caso não haja exames, retorne uma mensagem informando que não foi possível encontrar exames na imagem.
Em caso de "Hemograma Com Contagem de Plaquetas ou Frações (Eritrograma Leucograma, Plaquetas)",
mostre apenas Hemograma em caso de "Potássio-Pesquisa E/ou Dosagem" mostre apenas "Potássio", etc...

Exemplo 1 - Leitura do pedido médico:
TopSaúde®
ESPECIALIDADES
Solicitação de exames
Priscila Ingrid Kachel
Idade: 47 anos, 5 meses, 20 dias
Convênio: MedPrev Online
Exames
40.30.43.61 - Hemograma Com Contagem de Plaquetas ou Frações (Eritrograma
Leucograma, Plaquetas)
40.30.23.18-Potassio-Pesquisa E/ou Dosagem
40.30.25.80-Ureia-Pesquisa E/ou Dosagem
40.30.16.30 - Creatinina - Pesquisa E/ou Dosagem
40.31.65.21 - Tireoestimulante, Hormônio (Tsh)-Pesquisa E/ou Dosagem
40.31.64.91 - T4 Livre - Pesquisa E/ou Dosagem
Indicação clínica
HAS
Dr. Gregor Baccni Elvira
andrologista
389/ ROE 34479
LRM.PR
Dr. Gregor Bacchi Elvira
CRM-PR 23989
Médico cardiologista
TopSaúde®
ESPECIALIDADES
Solicitação
de
exames
Priscila
Ingrid
Kachel
Idade:
47
anos,
5
meses,
20
dias
Convênio:
MedPrev
Online
Exames
40.30.43.61 - Hemograma
Com
Contagem
de
Plaquetas
ou
Frações
(Eritrograma
Leucograma,
Plaquetas)
40.30.23.18-Potassio-Pesquisa
E/ou
Dosagem
40.30.25.80-Ureia-Pesquisa
E/ou
Dosagem
40.30.16.30 - Creatinina - Pesquisa
E/ou
Dosagem
40.31.65.21 - Tireoestimulante,
Hormônio
(Tsh)-Pesquisa
E/ou
Dosagem
40.31.64.91
- T4
Livre - Pesquisa
E/ou
Dosagem
Indicação
clínica
HAS
Dr.
Gregor
Baccni

Exemplo 1 - Lista de exames:
- Hemograma
- Potássio
- Ureia
- Creatinina
- Tireoestimulante
- T4 Livre

Exemplo 2 - Leitura do pedido médico:
Odonto Select-Campo Largo
Rua Oswaldo Cruz, 360, centro, Campo Largo - PR
Fones: 41 3032-2350 . 41 9 9195-5431
Solicitação de Exames
Hemograma
Coagulograma
Perfil Lipidico
Creatinina
Glicose
HIV
06/09/2024
Sandra Maria Benato CRO PR-20704
Odonto
Select-Campo
Largo
Rua
Oswaldo
Cruz,
360,
centro,
Campo
Largo - PR
Fones:
41
3032-2350
.
41
9
9195-5431
Solicitação
de
Exames
Hemograma
Coagulograma
Perfil
Lipidico
Creatinina
Glicose
HIV
06/09/2024
Sandra
Maria
Benato
CRO
PR-20704

Exemplo 2 - Lista de exames:
- Hemograma
- Coagulograma
- Perfil Lipídico
- Creatinina
- Glicose
- HIV

Exemplo 3 - Leitura do pedido médico:
Lorem ipsum nossa plataforma seja um ecossistema saudável
que promova nossos valores e ofereça uma ótima experiência
para as pessoas
e um ótimo desempenho para as empresas. Para refletir esse
compromisso, vamos atualizar
as taxas de
marketing e serviços da nossa plataforma a partir de 1º de agosto.

Exemplo 3 - Lista de exames:
${phrases.imageNotFound()}

Leitura do pedido médico:
${textArray.join("\n")}

Lista de exames:
`;

  try {
    const conversation: Message[] = [
      {
        role: "user",
        content: [{ text: userMessage }],
      },
    ];

    const apiResponse = await bedrock.send(
      new ConverseCommand({
        modelId,
        messages: conversation,
        inferenceConfig: { maxTokens: 1024, temperature: 0, topP: 0.9 },
      })
    );

    exams = apiResponse.output?.message?.content?.[0].text;
  } catch (error) {
    console.log(error);
    return undefined;
  }

  if (!exams || exams === phrases.imageNotFound()) {
    return undefined;
  }

  return await addProceduresToCart(exams);
}
