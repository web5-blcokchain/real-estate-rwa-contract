/**
 * HTTP服务器，提供区块链房地产代币化系统API
 */
const express = require('express');
const cors = require('cors');
// 暂时移除 helmet 以排除可能的干扰
// const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');

// 创建Express应用
const app = express();

// 基本中间件配置 - 移除可能干扰Swagger UI的中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 设置根路由
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '区块链房地产代币化系统API服务',
    timestamp: new Date().toISOString()
  });
});

// Swagger文档配置 - 使用已验证的有效配置方式
try {
  // 使用fs直接读取JSON文件而非require
  const swaggerJsonPath = path.join(__dirname, 'swagger-spec.json');
  const swaggerJsonContent = fs.readFileSync(swaggerJsonPath, 'utf8');
  const swaggerDocument = JSON.parse(swaggerJsonContent);
  
  // 使用单一行配置方式
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: true
  }));
  
  // 提供swagger.json端点
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });
  
  console.log('Swagger UI已配置，访问路径: /api-docs');
} catch (error) {
  console.error('配置Swagger UI失败:', error.message);
}

// 加载路由
const routes = require('./routes');
app.use('/api/v1', routes);

// 404处理
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `未找到路由: ${req.method} ${req.url}`,
    availableRoutes: {
      root: '/',
      apiDocs: '/api-docs',
      swaggerJson: '/swagger.json'
    },
    timestamp: new Date().toISOString()
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err.message);
  
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器已启动，端口: ${PORT}`);
  console.log(`API文档地址: http://localhost:${PORT}/api-docs`);
});

module.exports = app; 