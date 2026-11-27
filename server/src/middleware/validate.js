import { HttpError } from '../utils/httpError.js';

export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return next(new HttpError(400, 'Données invalides', errors));
  }
  req.valid = { ...req.valid, [source]: result.data };
  next();
};