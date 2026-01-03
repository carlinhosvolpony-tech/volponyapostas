
import { GoogleGenAI, Type } from "@google/genai";
import { Match } from "./types";

const getApiKey = () => {
  try {
    return (window as any).process?.env?.API_KEY || '';
  } catch {
    return '';
  }
};

export async function getVolponyPicks(matches: Match[]): Promise<('C' | 'E' | 'A')[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("API_KEY não configurada. Usando palpites aleatórios.");
    const options: ('C' | 'E' | 'A')[] = ['C', 'E', 'A'];
    return matches.map(() => options[Math.floor(Math.random() * options.length)]);
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Você é um analista estatístico de apostas esportivas de elite. 
  Analise estes 12 jogos e forneça o resultado mais provável para cada um.
  Use exclusivamente estes códigos:
  C: Vitória do Time da Casa
  E: Empate
  A: Vitória do Time de Fora (Visitante)
  
  Jogos para análise:
  ${matches.map((m, i) => `${i + 1}. ${m.home} vs ${m.away}`).join('\n')}
  
  Retorne um array JSON com exatamente 12 strings, cada uma sendo 'C', 'E' ou 'A'.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { 
            type: Type.STRING,
            description: "Resultado do jogo: 'C', 'E' ou 'A'"
          },
          minItems: 12,
          maxItems: 12
        },
      },
    });

    const result = JSON.parse(response.text || '[]') as ('C' | 'E' | 'A')[];
    if (result.length === 12) return result;
    throw new Error("Resposta incompleta da IA");
    
  } catch (error) {
    console.error("AI Error:", error);
    const options: ('C' | 'E' | 'A')[] = ['C', 'E', 'A'];
    return matches.map(() => options[Math.floor(Math.random() * options.length)]);
  }
}
