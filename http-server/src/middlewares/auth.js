import utils from '../utils/index.js';

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
  
  // 获取有效的API Key
  // 在测试环境中使用硬编码的值
  let validApiKey;
  try {
    // 尝试从环境变量获取
    validApiKey = env.get('API_KEY');
  } catch (error) {
    // 如果在测试环境中，使用硬编码的值
    if (process.env.NODE_ENV === 'test') {
      validApiKey = 'dev-api-key';
    } else {
      console.error('获取API密钥失败:', error);
      return res.status(500).json({
        success: false,
        error: '服务器配置错误',
        message: '未能读取有效的API密钥配置'
      });
    }
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ 
      success: false,
      error: '无效的API Key',
      message: '请提供有效的API密钥'
    });
  }
  
  next();
}; 