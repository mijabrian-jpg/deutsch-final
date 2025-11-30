import { GoogleGenAI, Type, Schema } from "@google/genai";
import { WordDetail } from "../types";

const extractionSchema: Schema = {
  type: Type.ARRAY,
  items: { type: Type.STRING },
  description: "A list of distinct German vocabulary words found in the image."
};

const enrichmentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    lemma: { type: Type.STRING },
    chineseMeaning: { type: Type.STRING },
    partOfSpeech: { type: Type.STRING },
    gender: { type: Type.STRING },
    plural: { type: Type.STRING },
    examples: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { german: { type: Type.STRING }, chinese: { type: Type.STRING } } } },
    conjugations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { form: { type: Type.STRING }, context: { type: Type.STRING } } } },
    phrases: { type: Type.ARRAY, items: { type: Type.STRING } },
    grammarTips: { type: Type.STRING },
    distractors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { chinese: { type: Type.STRING }, imageUrlSeed: { type: Type.STRING } } } },
    correctImageSeed: { type: Type.STRING }
  },
  required: ["lemma", "chineseMeaning", "partOfSpeech", "examples", "distractors", "correctImageSeed"]
};

export class GeminiService {
  private ai: GoogleGenAI;
  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async extractWordsFromImage(base64Image: string): Promise<string[]> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ inlineData: { mimeType: "image/jpeg", data: base64Image } }, { text: "Analyze this image. Extract German vocabulary. Return ONLY a JSON array of strings." }] },
        config: { responseMimeType: "application/json", responseSchema: extractionSchema, temperature: 0.1 }
      });
      if (response.text) return JSON.parse(response.text) as string[];
      return [];
    } catch (error) { console.error(error); throw error; }
  }

  async extractWordsFromFile(base64Data: string, mimeType: string): Promise<string[]> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [{ inlineData: { mimeType: mimeType, data: base64Data } }, { text: "Extract German vocabulary words. Return ONLY a JSON array of strings." }] },
        config: { responseMimeType: "application/json", responseSchema: extractionSchema, temperature: 0.1 }
      });
      if (response.text) return JSON.parse(response.text) as string[];
      return [];
    } catch (error) { console.error(error); throw error; }
  }

  async enrichWord(word: string): Promise<WordDetail> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate a study card for: "${word}". If VERB, provide 4 forms: Präsens(3.sg), Präteritum(3.sg), Perfekt, Konjunktiv II.`,
        config: { responseMimeType: "application/json", responseSchema: enrichmentSchema, temperature: 0.3 }
      });
      if (response.text) {
        const data = JSON.parse(response.text);
        return { ...data, id: crypto.randomUUID() } as WordDetail;
      }
      throw new Error("No data");
    } catch (error) { console.error(error); throw error; }
  }
}
export const geminiService = new GeminiService();
