export type PipelineStage = {
  stage: string;
  detail: string;
};

export type TokenTag = {
  token: string;
  script: string;
};

export type NamedEntityItem = {
  text: string;
  category: string;
  start: number;
  end: number;
  confidence: number;
  is_ambiguous: boolean;
  explanation: string;
  target_transliterations?: Record<string, string>;
};

export type SentenceBreakdownItem = {
  sentence: string;
  positive_cues: string[];
  negative_cues: string[];
  polarity: string;
};

export type Analysis = {
  text: string;
  normalized_text?: string;
  cleaned_text: string;
  tokens: string[];
  sentences?: string[];
  named_entities?: NamedEntityItem[];
  pipeline_stages?: PipelineStage[];
  language: {
    language: string;
    base_language?: string;
    form?: string;
    confidence: number | null;
    confidence_is_genuine?: boolean;
    method: string;
    detected_cues?: string[];
    explanation?: string;
  };
  script: { primary: string; scripts: string[]; counts: Record<string, number> };
  romanized: boolean;
  code_mixing: {
    is_code_mixed: boolean;
    scripts: string[];
    cmi?: number;
    switch_points?: number;
    token_tags?: TokenTag[];
    formula?: string;
    script_counts?: Record<string, number>;
    sentence_count?: number;
    note: string;
    explanation?: string;
  };
  sentiment: {
    label: string;
    confidence: number | null;
    confidence_is_genuine?: boolean;
    positive_cues?: string[];
    negative_cues?: string[];
    polarity_score?: number;
    explanation?: string;
    method: string;
    sentence_breakdown?: SentenceBreakdownItem[];
  };
  intent: {
    label: string;
    confidence: number | null;
    confidence_is_genuine?: boolean;
    matched_cues?: string[];
    scores?: Record<string, number>;
    explanation?: string;
    method: string;
  };
  ngram_lm?: {
    log_likelihood: number;
    perplexity: number;
    token_count: number;
    smoothing: string;
  };
  translation?: TranslationResult;
  model: string;
  disclaimer: string;
};

export type TransliterationInfo = {
  native_script: string;
  romanized_phonetic: string;
  note: string;
};

export type TranslationLangItem = {
  language: string;
  code: string;
  status: 'success' | 'unavailable' | 'error' | 'same_language' | 'unsupported_language';
  translated_meaning: string | null;
  translation_method: string;
  error_detail: string | null;
  is_source?: boolean;
  text?: string;
  romanized?: string;
};

export type TranslationResult = {
  status: 'success' | 'unavailable' | 'error' | 'same_language' | 'unsupported_language' | 'uncertain';
  source_text?: string;
  source_language?: string;
  source_lang_code?: string;
  target_language: string;
  target_lang_code: string;
  translated_meaning: string | null;
  translation_method: string;
  error_detail?: string | null;
  transliteration?: TransliterationInfo;
  multilingual?: Record<string, TranslationLangItem>;
  translated_text?: string;
  native_script?: string;
  romanized_text?: string;
  method?: string;
  is_uncertain?: boolean;
  needs_confirmation?: boolean;
  suggested_languages?: string[];
};

export type VoiceAssistantResponse = {
  query: string;
  user_sentence?: string;
  text_to_translate?: string;
  last_user_sentence?: string;
  source_language?: string;
  source_lang_code?: string;
  source_speech_lang?: string;
  target_language?: string;
  target_lang_code?: string;
  reply_text: string;
  translated_reply?: string;
  speech_text: string;
  speech_lang: string;
  intent_type: string;
  topic?: string;
  context_reference?: string;
  translation_data?: TranslationResult;
  analysis?: Analysis;
  is_uncertain?: boolean;
  needs_confirmation?: boolean;
  suggested_languages?: string[];
  translations?: {
    source_language: string;
    source_code: string;
    is_romanized: boolean;
    transliteration?: TransliterationInfo;
    translations: Record<string, TranslationLangItem>;
  };
};

export type ConversationHistoryItem = {
  id: string;
  timestamp: string;
  originalText: string;
  detectedLanguage: string;
  sourceLanguage?: string;
  sourceLangCode?: string;
  sourceSpeechLang?: string;
  targetLanguage: string;
  targetLangCode: string;
  translatedMeaning: string;
  status: 'success' | 'unavailable' | 'error' | 'same_language' | 'uncertain';
  replyText: string;
  speechText: string;
  speechLang: string;
  sentiment?: string;
  sentimentConfidence?: number | null;
  sentimentConfidenceGenuine?: boolean;
  intent?: string;
  cmi?: number;
  isRomanized?: boolean;
  nativeScript?: string;
  isUncertain?: boolean;
  suggestedLanguages?: string[];
  errorDetail?: string;
  sourceModule?: 'assistant' | 'analyzer';
};

export type Dataset = { path: string; name: string; columns: string[]; error?: string };
export type DatasetPreview = { path: string; columns: string[]; rows: Record<string, string>[]; preview_count: number };
export type ModelInfo = { id: string; name: string; available: boolean; tasks: string[]; family: string };

export type ModelComparison = {
  id: string;
  name: string;
  family: string;
  architecture: string;
  accuracy: number;
  macro_f1: number;
  weighted_f1: number;
  latency_ms: number;
  model_size_mb: number;
  gpu_required: boolean;
  training_time: string;
  strengths: string;
  weaknesses: string;
};

export type ErrorItem = {
  text: string;
  expected: string;
  predicted: string;
  category?: string;
  explanation?: string;
};

export type ExperimentRun = {
  id: string;
  created_at: string;
  dataset: string;
  task: string;
  category: string;
  model: string;
  text_column: string;
  label_column: string;
  group_column?: string | null;
  train_rows: number;
  test_rows: number;
  metrics: Record<string, number>;
  condition_metrics: { condition: string; rows: number; metrics: Record<string, number> }[];
  confusion_matrix: { labels: string[]; values: number[][] };
  errors: ErrorItem[];
};
