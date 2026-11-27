// Values match the Prisma enums on the server; labels are what the user sees.
export const STATUS_LABELS = {
  TO_APPLY: 'À postuler',
  APPLIED: 'Postulée',
  INTERVIEW: 'Entretien planifié',
  ACCEPTED: 'Acceptée',
  REJECTED: 'Refusée',
}

// Full class names on purpose: Tailwind only keeps classes it can find as plain strings
export const STATUS_STYLES = {
  TO_APPLY: 'bg-slate-100 text-slate-700',
  APPLIED: 'bg-blue-100 text-blue-800',
  INTERVIEW: 'bg-amber-100 text-amber-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

export const TYPE_LABELS = {
  PFE: 'Stage PFE',
  SUMMER_INTERNSHIP: 'Stage d’été',
  EMPLOYMENT: 'Emploi',
}

export const SORT_LABELS = {
  date_desc: 'Date (plus récentes)',
  date_asc: 'Date (plus anciennes)',
  company_asc: 'Entreprise (A → Z)',
  company_desc: 'Entreprise (Z → A)',
}

// Starting values of the application form
export const EMPTY_FORM = {
  companyId: '',
  jobTitle: '',
  applicationType: '',
  applicationDate: '',
  status: 'TO_APPLY',
  offerUrl: '',
  description: '',
  notes: '',
  followUpDate: '',
}

export const DOCUMENT_TYPE_LABELS = {
  CV: 'CV',
  COVER_LETTER: 'Lettre de motivation',
  OTHER: 'Autre',
}

// Same limits as the server (the server is the one that really enforces them)
export const MAX_UPLOAD_MB = 5
export const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx']
