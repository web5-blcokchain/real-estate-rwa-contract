import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/error';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.query.api_key as string;
    
    if (!apiKey) {
      throw new AppError('API key is required', 401, 'AUTH_001');
    }

    // 验证API key
    if (apiKey !== process.env.API_KEY) {
      throw new AppError('Invalid API key', 401, 'AUTH_001');
    }

    next();
  } catch (error) {
    next(error);
  }
}; 