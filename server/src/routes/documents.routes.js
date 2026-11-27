import { Router } from 'express';
import { devAuth } from '../middleware/devAuth.js'; // TODO: swap for the real auth middleware
import { uploadSingleFile } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import * as controller from '../controllers/documents.controller.js';
import { idParamSchema } from '../validators/applications.validator.js';
import { listDocumentsQuerySchema, uploadBodySchema } from '../validators/documents.validator.js';

const router = Router();

router.use(devAuth); // every route below requires a logged-in user

router.get('/', validate(listDocumentsQuerySchema, 'query'), controller.list);
// Order matters: authenticate -> parse the multipart body -> validate the text fields
router.post('/', uploadSingleFile, validate(uploadBodySchema), controller.upload);
router.get('/:id/download', validate(idParamSchema, 'params'), controller.download);
router.delete('/:id', validate(idParamSchema, 'params'), controller.remove);

export default router;
