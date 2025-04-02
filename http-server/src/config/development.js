/**
 * 开发环境配置
 */
module.exports = {
  // 服务器配置
  server: {
    port: 3000,
  },
  
  // 开发环境特定配置
  env: {
    // 是否启用Swagger
    enableSwagger: true,
    // 是否启用详细错误
    detailedErrors: true,
  },
  
  // 日志配置
  logging: {
    level: 'debug',
    pretty: true,
  }
}; 