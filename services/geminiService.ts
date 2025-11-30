import { GoogleGenAI, Type, Schema } from "@google/genai";
import { WordDetail } from "../types";

// Schema for Extracting words from image
const extractionSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.STRING
  },
  description: "A list of distinct German vocabulary words found in the image."
};

// Schema for Enriching a single word
const enrichmentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    lemma: { type: Type.STRING, description: "The German word (base form)." },
    chineseMeaning: { type: Type.STRING, description: "Primary Chinese meaning." },
    partOfSpeech: { type: Type.STRING, description: "Noun, Verb, Adjective, etc." },
    gender: { type: Type.STRING, description: "Article (der/die/das) if noun, else empty." },
    plural: { type: Type.STRING, description: "Plural form if noun." },
    examples: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          german: { type: Type.STRING },
          chinese: { type: Type.STRING }
        }
      },
      description: "2-3 varied example sentences."
    },
    conjugations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          form: { type: Type.STRING, description: "The conjugated/declined form." },
          context: { type: Type.STRING, description: "Short sentence using this form." }
        }
      },
      description: "Key conjugations. IF VERB: Must be [Präsens(3.sg), Präteritum(3.sg), Perfekt, Konjunktiv II]. IF NOUN: [Genitiv Sg, Dativ Pl] etc."
    },
    phrases: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Common short phrases or collocations."
    },
    grammarTips: { type: Type.STRING, description: "Warnings about irregularities, case governance, etc." },
    distractors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          chinese: { type: Type.STRING, description: "Incorrect Chinese meaning." },
          imageUrlSeed: { type: Type.STRING, description: "English keyword for an image representing this wrong meaning." }
        }
      },
      description: "3 incorrect options for a multiple choice quiz."
    },
    correctImageSeed: { type: Type.STRING, description: "English keyword for an image representing the correct meaning." }
  },
  required: ["lemma", "chineseMeaning", "partOfSpeech", "examples", "distractors", "correctImageSeed"]
};

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  /**
   * Scans an image (textbook page) and returns a list of German lemmas.
   */
  async extractWordsFromImage(base64Image: string): Promise<string[]> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            {
              text: "Analyze this image of a German learning resource. Extract the vocabulary list intended for study. Ignore instructions, full example sentences (unless they contain the target word clearly marked), and page numbers. Convert all words to their base form (Lemma) (e.g., verbs in infinitive, nouns in singular nominative). Return ONLY a JSON array of strings."
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: extractionSchema,
          systemInstruction: "You are a helpful assistant that extracts vocabulary from textbook photos.",
          temperature: 0.1
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as string[];
      }
      return [];
    } catch (error) {
      console.error("Extraction error:", error);
      throw error;
    }
  }

  /**
   * Extracts words from a PDF or Text file.
   */
  async extractWordsFromFile(base64Data: string, mimeType: string): Promise<string[]> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            },
            {
              text: "Analyze this document. Identify and extract a list of German vocabulary words intended for learning. If it is a dictionary or list, extract the headwords. If it is a text, extract key B1/B2 level vocabulary words. Convert all words to their base form (Lemma). Return ONLY a JSON array of strings. Limit to the top 50 most relevant words if the document is large."
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: extractionSchema,
          systemInstruction: "You are a helpful assistant that extracts vocabulary from documents.",
          temperature: 0.1
        }
      });

      if (response.text) {
        return JSON.parse(response.text) as string[];
      }
      return [];
    } catch (error) {
      console.error("File Extraction error:", error);
      throw error;
    }
  }

  /**
   * Takes a German word and generates full study details (Baicizhan style).
   */
  async enrichWord(word: string): Promise<WordDetail> {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate a comprehensive study card for the German word: "${word}". 
        
        CRITICAL INSTRUCTION FOR VERBS:
        If the word is a VERB, the 'conjugations' array MUST contain exactly these 4 forms in this specific order:
        1. Present Tense (3rd Person Singular, e.g., 'er läuft')
        2. Präteritum (3rd Person Singular, e.g., 'er lief')
        3. Perfekt (with auxiliary, e.g., 'er ist gelaufen')
        4. Konjunktiv II (e.g., 'er liefe')
        
        For each conjugation, provide a very short context sentence in 'context'.
        
        If it is NOT a verb, provide relevant forms (e.g., Plural for nouns) in 'conjugations'.
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: enrichmentSchema,
          systemInstruction: "You are an expert German teacher creating content for a flashcard app. Ensure distractors are plausible but clearly incorrect. Ensure example sentences are natural.",
          temperature: 0.3
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        // Add a random ID
        return {
            ...data,
            id: crypto.randomUUID()
        } as WordDetail;
      }
      throw new Error("No data returned");
    } catch (error) {
      console.error("Enrichment error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
