export enum PartOfSpeech {
  Noun = "Noun",
  Verb = "Verb",
  Adjective = "Adjective",
  Adverb = "Adverb",
  Other = "Other"
}
export interface Conjugation { form: string; context: string; }
export interface Example { german: string; chinese: string; }
export interface WordDetail {
  id: string;
  lemma: string;
  chineseMeaning: string;
  partOfSpeech: string;
  gender?: string;
  plural?: string;
  examples: Example[];
  conjugations: Conjugation[];
  phrases: string[];
  grammarTips?: string;
  distractors: { chinese: string; imageUrlSeed: string; }[];
  correctImageSeed: string;
  userNotes?: string;
}
export enum AppState { Home, Scanning, Learning, Dictation, Review }
export enum QuizPhase { Question, Result }
