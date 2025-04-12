/**
 * 独立的Swagger UI服务器
 * 只用于提供API文档，不包含实际API实现
 */
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const path = require('path');

const app = express();

// 读取生成的swagger文档
let swaggerSpec;
try {
  const swaggerFilePath = path.join(__dirname, 'swagger-output.json');
  if (fs.existsSync(swaggerFilePath)) {
    const swaggerContent = fs.readFileSync(swaggerFilePath, 'utf8');
    swaggerSpec = JSON.parse(swaggerContent);
  } else {
    throw new Error('Swagger文档文件不存在');
  }
} catch (error) {
  console.error('无法加载Swagger文档:', error.message);
  process.exit(1);
}

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'public')));

// 配置Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCssUrl: 'https://cdn.jsdelivr.net/npm/swagger-ui-themes@3.0.1/themes/3.x/theme-feeling-blue.css'
}));

// 主页重定向到Swagger UI
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// 提供swagger.json端点
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 启动服务器
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Swagger 文档服务器已启动在 http://localhost:${PORT}`);
  console.log(`访问 http://localhost:${PORT}/api-docs 查看API文档`);
}); 