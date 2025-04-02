/**
 * 生产环境配置
 */
module.exports = {
  // 服务器配置
  server: {
    port: process.env.PORT || 8080,
    // 生产环境应配置特定的CORS源
    corsOrigin: process.env.CORS_ORIGIN || [
      'https://example.com',
      'https://www.example.com'
    ]
  },
  
  // 生产环境特定配置
  env: {
    // 是否启用Swagger，生产环境通常禁用
    enableSwagger: false,
    // 是否启用详细错误，生产环境通常禁用
    detailedErrors: false,
  },
  
  // API配置
  api: {
    // 生产环境限速更严格
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 60, // 每IP最多请求数
    }
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: false,
  }
}; 