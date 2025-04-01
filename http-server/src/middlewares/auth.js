import utils from '../utils/mock.js';

const EnvConfig = utils.EnvConfig;
// 创建环境配置实例
const env = new EnvConfig();

/**
 * API密钥鉴权中间件
 * 通过URL参数api_key验证请求
 */
export const apiKeyMiddleware = (req, res, next) => {
  // 健康检查接口不需要鉴权
  if (req.path === '/health') {
    return next();
  }
  
  // API文档接口不需要鉴权
  if (req.path.startsWith('/api-docs')) {
    return next();
  }

  const apiKey = req.query.api_key;
  
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