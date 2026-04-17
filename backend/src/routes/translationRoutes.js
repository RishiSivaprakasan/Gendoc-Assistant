import { Router } from 'express';
import { translationController } from '../controllers/translationController.js';

const router = Router();

router.post('/', translationController.translate);

export default router;
