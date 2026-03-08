import { Router } from 'express';
import { createRoom, joinRoom } from '../controllers/roomController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.post('/', requireAuth, createRoom);
router.get('/:roomId', joinRoom);

export default router;
