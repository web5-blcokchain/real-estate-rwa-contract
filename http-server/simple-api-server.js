/**
 * 简化版API服务器，专门用于测试Swagger文档
 */
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

// 创建Express应用
const app = express();

// 使用已经生成好的swagger规范文件
const swaggerJsonPath = path.join(__dirname, 'swagger-spec.json');

if (fs.existsSync(swaggerJsonPath)) {
  try {
    const swaggerDocument = require('./swagger-spec.json');
    
    // 提供JSON
    app.get('/swagger.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerDocument);
    });
    
    // 使用swagger-ui-express
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    
    console.log('Swagger UI已配置: /api-docs');
  } catch (error) {
    console.error('加载swagger规范失败:', error);
  }
} else {
  console.log('未找到swagger-spec.json文件');
}

// 提供静态HTML页面
app.get('/api-static', (req, res) => {
  res.sendFile(path.join(__dirname, 'static', 'swagger.html'));
});

// 简单的首页
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>API测试服务器</title>
        <style>
          body { font-family: Arial; max-width: 800px; margin: 0 auto; padding: 20px; }
        </style>
      </head>
      <body>
        <h1>API文档测试服务器</h1>
        <ul>
          <li><a href="/api-docs">Swagger UI</a></li>
          <li><a href="/api-static">静态HTML版本</a></li>
          <li><a href="/swagger.json">原始JSON</a></li>
        </ul>
      </body>
    </html>
  `);
});

// 启动服务器
const PORT = 3333;
app.listen(PORT, () => {
  console.log(`测试服务器已启动: http://localhost:${PORT}`);
}); 