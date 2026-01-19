
import { GoogleGenAI, Type } from "@google/genai";

export async function getRodadaPicks(): Promise<string[]> {
  const options = ["CASA", "EMPATE", "FORA"];
  
  // Directly use process.env.API_KEY as per guidelines
  if (!process.env.API_KEY) {
    // Fallback aleatório puro se a chave não estiver disponível
    return Array.from({ length: 12 }, () => options[Math.floor(Math.random() * 3)]);
  }

  // Always create a new GoogleGenAI instance right before making an API call to ensure current credentials
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Gere uma sequência de 12 palpites de futebol de forma TOTALMENTE ALEATÓRIA.
  Para cada jogo, escolha entre: "CASA", "EMPATE" ou "FORA".
  Não siga padrões. Use estocasticidade máxima.
  Retorne um array JSON com exatamente 12 strings.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 1.0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    // Access .text property directly (it's a getter property, not a method)
    const resultText = response.text;
    if (!resultText) throw new Error("Resposta da IA vazia");

    const result = JSON.parse(resultText.trim()) as string[];
    if (result.length === 12) return result;
    throw new Error("Formato inválido: esperado 12 palpites.");
    
  } catch (error) {
    console.error("AI Random Error:", error);
    // Fallback em caso de erro na API
    return Array.from({ length: 12 }, () => options[Math.floor(Math.random() * 3)]);
  }
}
