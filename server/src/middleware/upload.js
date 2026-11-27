import multer from 'multer';
import { MAX_FILE_SIZE } from '../config/uploads.js';
import { HttpError } from '../utils/httpError.js';

// Memory storage: nothing touches the disk until the content has been validated.
// files: 1 and fileSize also protect the server from huge or multiple uploads.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 5 },
});

// Wraps multer so its errors become clean HTTP errors
export function uploadSingleFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new HttpError(413, `Fichier trop volumineux (${MAX_FILE_SIZE / 1024 / 1024} Mo maximum)`));
    }
    if (err instanceof multer.MulterError) {
      return next(new HttpError(400, 'Envoi invalide : un seul fichier, dans le champ « file »'));
    }
    next(err);
  });
}
