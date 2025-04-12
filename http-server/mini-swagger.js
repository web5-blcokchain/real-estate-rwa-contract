/**
 * 极简Swagger UI服务器
 * 专用于提供SwaggerUI文档，让前端开发更容易查看API
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
  // 检查文件是否存在
  if (!fs.existsSync(swaggerJsonPath)) {
    console.error('错误: swagger-spec.json文件不存在！');
    console.error(`预期路径: ${swaggerJsonPath}`);
    console.error('请先运行 yarn api:docs 生成Swagger文档');
    process.exit(1);
  }

  const swaggerJsonContent = fs.readFileSync(swaggerJsonPath, 'utf8');
  swaggerDocument = JSON.parse(swaggerJsonContent);
  console.log('✅ 成功加载Swagger规范文件');
  
  // 打印API路径数量
  const pathCount = Object.keys(swaggerDocument.paths || {}).length;
  console.log(`📚 文档包含 ${pathCount} 个API路径`);
} catch (error) {
  console.error('❌ 加载Swagger规范文件失败:', error.message);
  process.exit(1);
}

// 根路由 - 简单HTML界面
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>API文档查看器</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 2em; line-height: 1.5; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        a { display: inline-block; margin: 10px 0; padding: 10px 15px; 
            background: #4CAF50; color: white; text-decoration: none; 
            border-radius: 4px; }
        a:hover { background: #45a049; }
        .note { background: #f8f9fa; padding: 15px; border-left: 4px solid #ddd; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>区块链房地产代币化系统 API文档</h1>
        <p>使用下面的链接查看完整的API文档：</p>
        <a href="/api-docs">查看Swagger API文档</a>
        <a href="/swagger.json" style="background: #2196F3;">查看原始JSON规范</a>
        
        <div class="note">
          <p>注意：本服务器仅用于显示API文档，不提供实际API功能。</p>
          <p>要使用完整的API，请运行：<code>yarn http:dev</code></p>
        </div>
      </div>
    </body>
    </html>
  `);
});

// 提供swagger.json
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});

// 配置Swagger UI - 使用单一行配置
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }'
}));

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, (err) => {
  if (err) {
    console.error('❌ 启动服务器失败:', err.message);
    process.exit(1);
  }
  
  console.log('\n🚀 Swagger UI文档服务器已启动');
  console.log(`📝 主页: http://localhost:${PORT}`);
  console.log(`📚 API文档: http://localhost:${PORT}/api-docs`);
  console.log(`🔍 JSON规范: http://localhost:${PORT}/swagger.json\n`);
}); 