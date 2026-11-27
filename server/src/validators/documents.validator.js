import { z } from 'zod';

export const DOCUMENT_TYPES = ['CV', 'COVER_LETTER', 'OTHER'];

const blankToUndefined = (schema) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema);

// Text fields that come with the file in the multipart form (multer puts them in req.body)
export const uploadBodySchema = z.object({
  type: z.enum(DOCUMENT_TYPES),
  applicationId: blankToUndefined(z.coerce.number().int().positive().optional()),
});

// GET /api/documents?applicationId=&type=
export const listDocumentsQuerySchema = z.object({
  applicationId: blankToUndefined(z.coerce.number().int().positive().optional()),
  type: blankToUndefined(z.enum(DOCUMENT_TYPES).optional()),
});
