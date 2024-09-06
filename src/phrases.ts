// prettier-ignore
export const phrases = {
  welcome: (name?:string) => `Olá${name ? ` *${name}*` : ''}! Sou a Medy, a IA da Medprev.\n\nPosso te ajudar a encontrar consultas, exames, entre outros. Do que você precisa?`,
  welcomeBack: (name: string) => `Oi *${name}*, bom te ver de volta!`,
  confirmHandoff: () => "Você gostaria de conversar com um(a) atendente?",
  handoff: (name?: string) => `${name ? `Obrigado *${name}*. ` : ''}Vou encaminhar você para um(a) atendente`,
  endConversation: () => "Sem problema. Vou finalizar seu atendimento por aqui",
  locationRequest: () => "Vamos buscar procedimentos perto de você! Poderia me informar sua localização, por favor?\n\nVocê pode enviar a localização ou escrever seu CEP",
  confirmSearchParameters: (procedure: string, city: string) => `Pra confirmar, você quer de buscar *${procedure}* em *${city}*?`,
  error: () => "O bot encontrou um erro.",
  promptHandoff: () => "Parece que você está encontrando dificuldades. Gostaria de falar com um(a) atendente?",
  userAskedForHandoff: (name?: string) => `Sem problemas${name ? ` *${name}*` : ''}. Para conversar com um(a) atendente, é só pressionar o botão \"Confirmar\" abaixo.`,
};
