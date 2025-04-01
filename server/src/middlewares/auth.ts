import { Request, Response, NextFunction } from 'express';

// 导入环境配置
const envConfig = require('../../../shared/src/config/env');
const env = new envConfig();

/**
 * API密钥鉴权中间件
 * 通过URL参数api_key验证请求
 */
export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 健康检查接口不需要鉴权
  if (req.path === '/health') {
    return next();
  }
  
  // API文档接口不需要鉴权
  if (req.path.startsWith('/api-docs')) {
    return next();
  }

  const apiKey = req.query.api_key as string;
  
  // 从环境变量获取有效的API Key
  const validApiKey = env.get('API_KEY');
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ 
      success: false,
      error: '无效的API Key',
      message: '请提供有效的API密钥'
    });
  }
  
  next();
};