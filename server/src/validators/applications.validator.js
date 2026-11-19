import { z } from 'zod';

export const APPLICATION_TYPES = ['PFE', 'SUMMER_INTERNSHIP', 'EMPLOYMENT'];
export const APPLICATION_STATUSES = ['TO_APPLY', 'APPLIED', 'INTERVIEW', 'ACCEPTED', 'REJECTED'];

// HTML forms send "" for empty fields: treat it as "no value"
const blankToNull = (schema) =>
  z.preprocess((v) => (v === '' ? null : v), schema.nullish());
const blankToUndefined = (schema) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema);

// ---------- Create / update ----------
// No .default() here on purpose: the schema is reused with .partial() for PATCH,
// and a default would silently reset the status on every partial update.
const applicationFields = z.object({
  companyId: z.coerce.number().int().positive(),
  jobTitle: z.string().trim().min(2).max(150),
  applicationType: z.enum(APPLICATION_TYPES),
  applicationDate: z.coerce.date(),
  status: z.enum(APPLICATION_STATUSES).optional(), // the database default is TO_APPLY
  offerUrl: blankToNull(z.string().trim().url().max(500)),
  description: blankToNull(z.string().trim().max(5000)),
  notes: blankToNull(z.string().trim().max(5000)),
  followUpDate: blankToNull(z.coerce.date()),
});

export const createApplicationSchema = applicationFields;

export const updateApplicationSchema = applicationFields
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Au moins un champ à modifier est requis',
  });

// ---------- URL parameter ----------
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// ---------- GET /api/applications query string ----------
export const SORT_OPTIONS = ['date_desc', 'date_asc', 'company_asc', 'company_desc'];

export const listQuerySchema = z.object({
  search: blankToUndefined(z.string().trim().max(100).optional()),
  status: blankToUndefined(z.enum(APPLICATION_STATUSES).optional()),
  type: blankToUndefined(z.enum(APPLICATION_TYPES).optional()),
  from: blankToUndefined(z.coerce.date().optional()),
  to: blankToUndefined(z.coerce.date().optional()),
  sort: blankToUndefined(z.enum(SORT_OPTIONS).default('date_desc')),
  page: blankToUndefined(z.coerce.number().int().min(1).default(1)),
  limit: blankToUndefined(z.coerce.number().int().min(1).max(50).default(10)),
});