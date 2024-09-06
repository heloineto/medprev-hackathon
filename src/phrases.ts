// prettier-ignore
export const phrases = {
  welcome: (name?:string) => `Olá${name ? ` *${name}*` : ''}! Sou a Medy, a IA da Medprev.\n\nPosso te ajudar a encontrar consultas, exames, entre outros.`,
  welcomeImage: (name?:string) => `Olá${name ? ` *${name}*` : ''}! Sou a Medy, a IA da Medprev.\n\nVou te ajudar a agendar seus exames.`,
  imagePrompt: () => "Por favor, envie uma foto do pedido médico",
  whatDoYouNeed: () => "O que você precisa?",
  welcomeBack: (name: string) => `Oi *${name}*, bom te ver de volta!`,
  confirmHandoff: () => "Você gostaria de conversar com um(a) atendente?",
  handoff: (name?: string) => `${name ? `Obrigado *${name}*. ` : ''}Vou encaminhar você para um(a) atendente`,
  endConversation: () => "Sem problema. Vou finalizar seu atendimento por aqui",
  locationRequest: () => "Vamos buscar procedimentos perto de você!\n\nPor favor, envie sua localização ou escreva seu CEP",
  confirmSearchParameters: (procedure: string, city: string) => `Pra confirmar, você quer de buscar *${procedure}* em *${city}*?`,
  error: () => "O bot encontrou um erro.",
  promptHandoff: () => "Parece que você está encontrando dificuldades. Gostaria de falar com um(a) atendente?",
  userAskedForHandoff: (name?: string) => `Sem problemas${name ? ` *${name}*` : ''}. Para conversar com um(a) atendente, é só pressionar o botão \"Confirmar\" abaixo.`,
};
