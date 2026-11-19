// TEMPORARY: replaced by the real JWT middleware (Hiba).
// Contract to respect: after this middleware, req.user.id is the logged-in user's id.
export function devAuth(req, _res, next) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('devAuth must not be used in production');
  }
  req.user = { id: Number(process.env.DEV_USER_ID || 1) };
  next();
}