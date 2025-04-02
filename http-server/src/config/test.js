/**
 * 测试环境配置
 */
module.exports = {
  // 环境配置
  env: {
    nodeEnv: 'test',
    // 是否启用Swagger
    enableSwagger: true,
    // 是否启用详细错误
    detailedErrors: true,
  },
  
  // 服务器配置
  server: {
    port: 3001,
  },
  
  // API配置
  api: {
    // 测试环境API密钥
    key: 'test-api-key',
    // 测试环境限速更宽松
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 1000, // 每IP最多请求数
    }
  },
  
  // 日志配置
  logging: {
    level: 'warn', // 测试环境中减少日志输出
    pretty: true,
  }
}; 