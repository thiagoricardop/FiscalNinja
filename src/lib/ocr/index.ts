export {
  processReceipt,
  processReceiptFromBase64,
  validateReceiptImage,
} from './vision';
export type {
  ReceiptData,
  ValidationResult,
  GeminiOcrConfig,
  GeminiReceiptResponse,
  LineItem,
} from './types';
export { DEFAULT_GEMINI_CONFIG } from './types';
