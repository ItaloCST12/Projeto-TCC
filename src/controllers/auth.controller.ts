import { Request, Response} from 'express';
import * as AuthService from '../services/auth.service';
import * as bcrypt from 'bcrypt';

export const login = async (request: Request, response: Response) => {
    const data = request.body;
    try {
        const result = await AuthService.login(data);
        return response.json(result);
    } catch (error: any) {
        return response.status(401).json({ message: error.message })
    }
}

export const register = async (req: Request, res: Response) => {
  try {
    console.log('Body recebido:', req.body);
    const { nome, email, password, senha, role } = req.body;
    console.log('Nome extraído:', nome);
    
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }
    
    const senhaFinal = password || senha;
    if (!senhaFinal) {
      return res.status(400).json({ error: 'Senha é obrigatória' });
    }
    
    const hashedPassword = await bcrypt.hash(senhaFinal, 10);
    const usuario = await AuthService.register({
      nome: nome.trim(),
      email,
      password: hashedPassword,
      role: role === 'ADMIN' ? 'ADMIN' : 'USER'
    });
    res.status(201).json(usuario);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};