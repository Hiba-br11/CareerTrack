import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Private folder OUTSIDE any static/public route: files are only served through the
// authenticated download route. Override with UPLOAD_DIR in .env if needed.
export const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR || fileURLToPath(new URL('../../uploads', import.meta.url))
);

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_DOCUMENTS_PER_USER = Number(process.env.MAX_DOCUMENTS_PER_USER) || 50;
