import type {
  Analysis,
  Dataset,
  DatasetPreview,
  ExperimentRun,
  ModelComparison,
  ModelInfo,
  TranslationResult,
  VoiceAssistantResponse,
} from '../types';

async function request<T>(url:string, init?:RequestInit):Promise<T>{
  const response=await fetch(url,init);
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.detail??'Request failed');}
  return response.json() as Promise<T>;
}

const json=(body:unknown):RequestInit=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

export async function analyzeText(text: string, model_id = 'baseline', target_language?: string, source_language?: string): Promise<Analysis> {
  return request<Analysis>('/api/analyze', json({ text, model_id, target_language, source_language }));
}
export async function getModels(): Promise<{ models: ModelInfo[] }> {
  return request<{ models: ModelInfo[] }>('/api/models');
}
export async function getDatasets(): Promise<{ datasets: Dataset[] }> {
  return request<{ datasets: Dataset[] }>('/api/datasets');
}
export async function previewDataset(path: string, rows = 10): Promise<DatasetPreview> {
  return request<DatasetPreview>(`/api/datasets/preview?path=${encodeURIComponent(path)}&rows=${rows}`);
}

export async function getExperiments(): Promise<{ experiments: ExperimentRun[]; message: string }> {
  return request<{ experiments: ExperimentRun[]; message: string }>('/api/experiments');
}
export async function trainModel(payload: { dataset_path: string; task: string; text_column: string; label_column: string; model: string }) {
  return request<{ id: string; training_rows: number; labels: string[] }>('/api/models/train', json(payload));
}
export async function runExperiment(payload: {
  dataset_path: string;
  task: string;
  model: string;
  text_column: string;
  label_column: string;
  test_size: number;
  category: string;
  group_column?: string;
}): Promise<ExperimentRun> {
  return request<ExperimentRun>('/api/experiments/run', json(payload));
}

export async function getModelComparisons(): Promise<{ comparisons: ModelComparison[]; benchmark_summary: string }> {
  return request<{ comparisons: ModelComparison[]; benchmark_summary: string }>('/api/models/compare');
}

export async function translateText(
  text: string,
  target_language = 'en',
  source_language = 'auto'
): Promise<TranslationResult> {
  return request<TranslationResult>('/api/translate', json({ text, target_language, source_language }));
}

export async function getMultilingualTranslations(text: string): Promise<any> {
  return request<any>('/api/translate/multilingual', json({ text }));
}

export async function queryVoiceAssistant(
  query: string,
  target_language = 'en',
  context?: Record<string, any>,
  model_id = 'baseline',
  source_language?: string
): Promise<VoiceAssistantResponse> {
  return request<VoiceAssistantResponse>('/api/assistant', json({ query, target_language, context, model_id, source_language }));
}


