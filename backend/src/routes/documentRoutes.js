import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { documentController } from '../controllers/documentController.js';

const router = Router();

router.use(requireAuth);

router.get('/', documentController.list);
router.post('/', documentController.create);
router.patch('/:id', documentController.update);
router.delete('/:id', documentController.remove);

export default router;
