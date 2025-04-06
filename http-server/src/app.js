/**
 * 日本房地产资产通证化API服务器
 * Express应用配置
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const path = require('path');

// 导入中间件
const errorHandler = require('./middlewares/errorHandler');
const requestLogger = require('./middlewares/requestLogger');
const apiKeyAuth = require('./middlewares/apiKeyAuth');

// 导入路由
const apiRoutes = require('./routes');

// 创建Express应用
const app = express();

// 配置Swagger文档
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '日本房地产资产通证化API',
      version: '1.0.0',
      description: '基于区块链的房地产资产通证化API文档',
      contact: {
        name: '开发团队',
        email: 'dev@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: '开发服务器'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'query',
          name: 'api_key',
          description: 'API密钥验证，通过URL参数api_key提供'
        }
      }
    },
    security: [
      {
        ApiKeyAuth: []
      }
    ]
  },
  apis: [
    path.join(__dirname, 'routes/*.js'),
    path.join(__dirname, 'controllers/*.js')
  ]
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

// 应用中间件
app.use(helmet()); // 安全相关HTTP头
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
})); // 支持跨域请求
app.use(express.json()); // 解析JSON请求体
app.use(express.static(path.join(__dirname, '../public'))); // 静态文件

// 请求日志
app.use(requestLogger);

// API健康检查（不需要API密钥认证）
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 创建自定义 Swagger 中间件，用于处理 URL 中的 api_key 参数
const customSwaggerUiMiddleware = (req, res, next) => {
  // 从 URL 查询参数中获取 api_key
  const apiKey = req.query.api_key;
  
  // 如果 URL 中有 api_key 参数，将其添加到请求作为 Swagger 认证数据
  if (apiKey) {
    // 将 apiKey 注入到 Swagger UI 模板中
    req.swaggerApiKey = apiKey;
  }
  
  next();
};

// 自定义 Swagger UI 配置，确保API密钥授权功能正常显示
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    defaultModelsExpandDepth: 0,
    docExpansion: 'list'
  },
  customCss: `
    .swagger-ui .auth-wrapper .authorize {
      color: white;
      border-color: #49cc90;
      background: #49cc90;
      display: inline-block;
      padding: 10px;
      border-radius: 3px;
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
    }
    .swagger-ui .auth-container input[type=text] {
      min-width: 350px;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #d9d9d9;
    }
    .swagger-ui .auth-container h4 {
      margin-top: 10px;
      margin-bottom: 5px;
      color: #3b4151;
    }
    .swagger-ui .auth-container .wrapper {
      margin: 10px 0;
    }
    .api-key-notice {
      background-color: #e8f5e9;
      border-left: 4px solid #43a047;
      padding: 10px 15px;
      margin: 10px 0;
      border-radius: 2px;
      font-size: 14px;
    }
  `,
  // 自定义 HTML 模板，用于注入 API 密钥自动填充脚本
  customSiteTitle: "日本房地产资产通证化 API 文档",
  customfavIcon: "",
  customJs: '/js/swagger-init.js',
  // 添加一个顶部消息，提示用户 API 密钥用法
  customCssUrl: false,
  customJsUrl: false,
  // 添加认证说明和自动填充脚本
  customHeaders: `
    <div class="api-key-notice">
      <strong>API 密钥认证说明：</strong><br>
      所有 API 请求需要通过 URL 参数提供 <code>api_key</code> 进行认证。<br>
      示例：<code>/api/v1/properties?api_key=YOUR_API_KEY</code><br>
      测试环境可用密钥：<code>test-api-key-for-development</code>
    </div>
    <script>
      // 在页面加载完成后执行
      window.onload = function() {
        // 从 URL 获取 API 密钥
        const urlParams = new URLSearchParams(window.location.search);
        const apiKey = urlParams.get('api_key');
        
        // 如果 URL 中含有 API 密钥，自动填充到授权对话框
        if (apiKey) {
          // 等待 Swagger UI 完全加载
          setTimeout(function() {
            // 点击授权按钮
            const authorizeBtn = document.querySelector('.swagger-ui .auth-wrapper .authorize');
            if (authorizeBtn) {
              authorizeBtn.click();
              
              // 等待授权对话框打开
              setTimeout(function() {
                // 查找并填充 API 密钥输入框
                const apiKeyInput = document.querySelector('.swagger-ui .auth-container input[type="text"]');
                if (apiKeyInput) {
                  apiKeyInput.value = apiKey;
                  
                  // 点击授权按钮
                  const confirmBtn = document.querySelector('.swagger-ui .auth-btn-wrapper .authorize');
                  if (confirmBtn) {
                    confirmBtn.click();
                    
                    // 关闭对话框
                    setTimeout(function() {
                      const closeBtn = document.querySelector('.swagger-ui .close-modal');
                      if (closeBtn) closeBtn.click();
                    }, 200);
                  }
                }
              }, 300);
            }
          }, 1000);
          
          // 添加提示信息
          setTimeout(function() {
            const infoContainer = document.querySelector('.swagger-ui .info');
            if (infoContainer) {
              const noticeDiv = document.createElement('div');
              noticeDiv.className = 'api-key-notice';
              noticeDiv.innerHTML = '<strong>已自动应用 API 密钥：</strong> ' + apiKey;
              infoContainer.appendChild(noticeDiv);
            }
          }, 1500);
        }
        
        // 向所有 Swagger UI 生成的请求添加 API 密钥
        // 监听 fetch 请求
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
          if (url && typeof url === 'string' && apiKey && url.includes('/api/')) {
            const separator = url.includes('?') ? '&' : '?';
            url = url + separator + 'api_key=' + apiKey;
          }
          return originalFetch.call(this, url, options);
        };
      };
    </script>
  `
};

// Swagger文档（不需要API密钥认证）
app.use('/api-docs', customSwaggerUiMiddleware, swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 提供示例的 API 密钥参数
app.get('/api-docs-with-key', (req, res) => {
  res.redirect('/api-docs?api_key=test-api-key-for-development');
});

// API路由 - 应用API密钥认证
app.use('/api', apiKeyAuth, apiRoutes);

// 首页
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>日本房地产资产通证化API</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 50px; line-height: 1.6; }
          h1 { color: #333; }
          .link-button { 
            display: inline-block; 
            background: #4CAF50; 
            color: white; 
            padding: 10px 20px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin-top: 20px;
            margin-right: 10px;
          }
          .info-box {
            background-color: #e3f2fd;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 2px;
          }
        </style>
      </head>
      <body>
        <h1>日本房地产资产通证化API服务器</h1>
        <p>区块链网络: <strong>${process.env.BLOCKCHAIN_NETWORK || 'localhost'}</strong></p>
        <p>API版本: <strong>v1</strong></p>
        <p>环境: <strong>${process.env.NODE_ENV || 'development'}</strong></p>
        
        <div class="info-box">
          <h3>API 认证说明</h3>
          <p>所有 API 请求需要通过 URL 参数提供 <code>api_key</code> 进行认证。</p>
          <p>开发环境可用的测试密钥: <code>test-api-key-for-development</code></p>
        </div>
        
        <a href="/api-docs" class="link-button">API文档</a>
        <a href="/api-docs-with-key" class="link-button">带测试密钥的API文档</a>
        <a href="/health" class="link-button">健康检查</a>
      </body>
    </html>
  `);
});

// 全局错误处理
app.use(errorHandler);

// 处理未匹配的路由
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '请求的资源不存在'
    }
  });
});

module.exports = app; 