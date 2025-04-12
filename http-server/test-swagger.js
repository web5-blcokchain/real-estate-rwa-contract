/**
 * 用于测试Swagger配置的独立脚本
 */
const express = require('express');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const { Logger } = require('../common');

// 创建一个简单的Express应用
const app = express();

// 直接加载swagger-spec.json文件
const swaggerDocument = require('./swagger-spec.json');

// 打印paths路径，检查内容是否正确
console.log('检测到的API路径:');
if (swaggerDocument && swaggerDocument.paths) {
  console.log(Object.keys(swaggerDocument.paths));
} else {
  console.log('swagger-spec.json中未找到有效的paths');
}

// 配置Swagger UI
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerDocument, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }'
}));

// 配置另一种方式
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true
}));

// 简单的根路由
app.get('/', (req, res) => {
  res.send(`
    <h1>Swagger测试页面</h1>
    <p>请访问以下链接测试Swagger:</p>
    <ul>
      <li><a href="/api-docs">方式1: /api-docs</a></li>
      <li><a href="/swagger">方式2: /swagger</a></li>
    </ul>
  `);
});

// 启动服务器
const PORT = 3333;
app.listen(PORT, () => {
  console.log(`测试服务器已启动，端口: ${PORT}`);
  console.log(`根页面: http://localhost:${PORT}`);
  console.log(`Swagger UI 方式1: http://localhost:${PORT}/api-docs`);
  console.log(`Swagger UI 方式2: http://localhost:${PORT}/swagger`);
}); 