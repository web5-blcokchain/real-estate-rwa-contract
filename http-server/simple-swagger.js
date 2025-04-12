/**
 * 简化的Swagger UI服务器
 * 专用于展示API文档，排除所有可能的干扰因素
 */
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

// 创建Express应用
const app = express();

// 读取swagger规范文件
const swaggerJsonPath = path.join(__dirname, 'swagger-spec.json');
let swaggerDocument;

try {
  const swaggerJsonContent = fs.readFileSync(swaggerJsonPath, 'utf8');
  swaggerDocument = JSON.parse(swaggerJsonContent);
  console.log('成功加载Swagger规范文件');
} catch (error) {
  console.error('加载Swagger规范文件失败:', error.message);
  process.exit(1);
}

// 根路由 - 简单的HTML页面，提供链接
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Swagger UI 测试</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        a { display: block; margin: 10px 0; }
      </style>
    </head>
    <body>
      <h1>Swagger UI 测试页面</h1>
      <p>请点击以下链接访问 Swagger UI:</p>
      <a href="/docs">Swagger UI 文档 (/docs)</a>
      <a href="/api-docs">Swagger UI 文档 (/api-docs)</a>
      <a href="/swagger.json">原始 Swagger JSON</a>
    </body>
    </html>
  `);
});

// 提供swagger.json
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});

// 配置Swagger UI - 使用最简单的方式
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 添加对/api-docs路径的支持
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 启动服务器
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`简化Swagger UI服务器已启动，端口: ${PORT}`);
  console.log(`访问 http://localhost:${PORT} 查看首页`);
  console.log(`访问 http://localhost:${PORT}/docs 查看Swagger UI`);
}); 