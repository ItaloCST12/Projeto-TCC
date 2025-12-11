import { Router } from 'express';
import { cadastrar, login, getPerfil, deletarUsuario } from '../controllers/usuario.controller';
import { authMiddleware, adminMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/cadastrar', cadastrar);
router.post('/login', login);
router.get('/perfil', authMiddleware, getPerfil);
router.delete('/:id', authMiddleware, adminMiddleware, deletarUsuario);

export default router;