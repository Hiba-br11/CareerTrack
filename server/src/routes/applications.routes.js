import { Router } from 'express';
import { devAuth } from '../middleware/devAuth.js'; // TODO: swap for the real auth middleware
import { validate } from '../middleware/validate.js';
import * as controller from '../controllers/applications.controller.js';
import {
  createApplicationSchema,
  updateApplicationSchema,
  idParamSchema,
  listQuerySchema,
} from '../validators/applications.validator.js';

const router = Router();

router.use(devAuth); // every route below requires a logged-in user

router.get('/', validate(listQuerySchema, 'query'), controller.list);
router.post('/', validate(createApplicationSchema), controller.create);
router.get('/:id', validate(idParamSchema, 'params'), controller.getOne);
router.patch(
  '/:id',
  validate(idParamSchema, 'params'),
  validate(updateApplicationSchema),
  controller.update
);
router.delete('/:id', validate(idParamSchema, 'params'), controller.remove);

export default router;