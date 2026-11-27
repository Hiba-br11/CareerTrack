import { HttpError } from '../utils/httpError.js';

export function notFound(_req, res) {
  res.status(404).json({ message: 'Route introuvable' });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, errors: err.errors });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON invalide' });
  }
  console.error(err); // details stay in the server log, never sent to the client
  res.status(500).json({ message: 'Erreur interne du serveur' });
}