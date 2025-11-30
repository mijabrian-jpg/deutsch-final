import { GoogleGenAI, Type, Schema } from "@google/genai";
import { WordDetail } from "../types";

// Schema for Extracting words from image
const extractionSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.STRING
  },
  description: "A comprehensive list of ALL German vocabulary words found."
};

// Schema for Enriching a single word
const enrichmentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    lemma: { type: Type.STRING, description: "The German word (base form)." },
    chineseMeaning: { type: Type.STRING, description: "Primary Chinese meaning." },
    partOfSpeech: { type: Type.STRING, description: "Noun, Verb, Adjective, etc." },
    gender: { type: Type.STRING, description: "Definite article (der, die, or das) ONLY. Crucial for nouns." },
    plural: { type: Type.STRING, description: "Plural form if noun." },
    examples: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          german: { type: Type.STRING },
          chinese: { type: Type.STRING },
          grammarAnalysis: { type: Type.STRING, description: "Brief analysis of sentence structure (Subject/Verb/Object) and Cases (Nom/Dat/Akk) in Chinese." }
        }
      },
      description: "2-3 varied example sentences with grammar breakdown."
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
          imageUrlSeed: { type: Type.STRING, description: "A simple, single English keyword for image search (e.g. 'Apple', 'Dog'). Do NOT use sentences." }
        }
      },
      description: "3 incorrect options for a multiple choice quiz."
    },
    correctImageSeed: { type: Type.STRING, description: "A simple, single English keyword for image search representing the CORRECT meaning (e.g. 'Apple', 'House'). Do NOT use sentences." }
  },
  required: ["lemma", "chineseMeaning", "partOfSpeech", "examples", "distractors", "correctImageSeed"]
};

export class GeminiService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    // Do NOT initialize here to avoid crash on startup if ENV is missing
  }

  private getClient(): GoogleGenAI {
    if (this.ai) return this.ai;

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing. Please check your Vercel Environment Variables (VITE_API_KEY).");
    }

    this.ai = new GoogleGenAI({ apiKey });
    return this.ai;
  }

  /**
   * Scans an image (textbook page) and returns a list of German lemmas.
   */
  async extractWordsFromImage(base64Image: string): Promise<string[]> {
    try {
      const client = this.getClient();
      const response = await client.models.generateContent({
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
              text: "You are a strict data extraction engine. Analyze this image. Your task is to extract EVERY SINGLE German vocabulary word found in the image. Do NOT summarize. Do NOT select only 'important' words. List every Noun, Verb, Adjective, and Adverb you can see. Convert all words to their base form (Lemma). Return ONLY a JSON array of strings. If there are 50 words, return 50 strings."
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: extractionSchema,
          systemInstruction: "You are a specialized OCR assistant. You extract full vocabulary lists without skipping items.",
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
      const client = this.getClient();
      const response = await client.models.generateContent({
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
              text: "You are a strict data extraction engine. Analyze this document. Identify and extract a comprehensive list of ALL German vocabulary words intended for learning. Convert all words to their base form (Lemma). Return ONLY a JSON array of strings. Do NOT summarize. Do NOT limit the number of words. If the document contains 200 words, you must return a list of 200 strings."
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: extractionSchema,
          systemInstruction: "You are a specialized data extraction assistant. You extract full vocabulary lists without skipping items or summarizing.",
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
   * Recognizes handwritten text from an image.
   */
  async recognizeHandwriting(base64Image: string): Promise<string> {
    try {
      const client = this.getClient();
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Image
              }
            },
            {
              text: "Read the handwritten German word in this image. Return ONLY the word text as a string. Ignore whitespace/noise. Do not include punctuation."
            }
          ]
        },
        config: {
          temperature: 0.1
        }
      });

      return response.text?.trim() || "";
    } catch (error) {
      console.error("Handwriting recognition error:", error);
      return "";
    }
  }

  /**
   * Takes a German word and generates full study details (Baicizhan style).
   */
  async enrichWord(word: string): Promise<WordDetail> {
    try {
      const client = this.getClient();
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Generate a comprehensive study card for the German word: "${word}". 
        
        CRITICAL INSTRUCTION FOR NOUNS (Gender):
        If the word is a NOUN, you MUST provide the correct definite article (der, die, or das) in the 'gender' field.
        Rule for Compound Nouns: The gender is determined by the LAST element (e.g., "Sauerstoffflasche" -> "die" because of "Flasche").
        
        CRITICAL INSTRUCTION FOR VERBS:
        If the word is a VERB, the 'conjugations' array MUST contain exactly these 4 forms in this specific order:
        1. Present Tense (3rd Person Singular, e.g., 'er läuft')
        2. Präteritum (3rd Person Singular, e.g., 'er lief')
        3. Perfekt (with auxiliary, e.g., 'er ist gelaufen')
        4. Konjunktiv II (e.g., 'er liefe')
        
        For each conjugation, provide a very short context sentence in 'context'.
        
        CRITICAL INSTRUCTION FOR EXAMPLES:
        For each example sentence, provide a 'grammarAnalysis' field. This should briefly explain the sentence structure (Subject, Verb, Object) and specifically mention the Cases used (Nominativ, Akkusativ, Dativ, Genitiv) in Chinese.
        
        CRITICAL INSTRUCTION FOR IMAGES:
        For 'correctImageSeed' and 'distractors', provide a SIMPLE ENGLISH KEYWORD (e.g., "Apple", "Car", "Running") for image search. Do NOT provide long descriptions.
        
        If it is NOT a verb, provide relevant forms (e.g., Plural for nouns) in 'conjugations'.
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: enrichmentSchema,
          systemInstruction: "You are an expert German teacher creating content for a flashcard app. Ensure distractors are plausible but clearly incorrect. Ensure example sentences are natural. Be extremely strict with Noun Genders.",
          temperature: 0.1
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
