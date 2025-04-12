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
const swaggerJSDoc = require('swagger-jsdoc');
// 移除CSRF中间件
// const cookieParser = require('cookie-parser');
// const csrf = require('csurf');
const { AuthMiddleware } = require('./middleware'); // 导入认证中间件

// 创建Express应用
const app = express();

// 基本中间件配置
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 移除cookie解析器
// app.use(cookieParser());

// 移除CSRF保护
// const csrfProtection = csrf({ 
//   cookie: {
//     sameSite: 'lax',
//     secure: false // 开发环境设为false，生产环境应设为true
//   } 
// });

// 移除CSRF令牌端点
// app.get('/csrf-token', (req, res) => {
//   // 确保创建新的CSRF令牌
//   const token = csrf.secretSync();
//   res.cookie('_csrf', token, {
//     sameSite: 'lax',
//     secure: false, // 开发环境设为false，生产环境应设为true
//     httpOnly: true
//   });
//   
//   res.json({ csrfToken: token });
// });

// 对API路由应用API密钥验证
app.use('/api/v1', AuthMiddleware.validateApiKey);

// 设置根路由
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '区块链房地产代币化系统API服务',
    timestamp: new Date().toISOString()
  });
});

// 生成Swagger规范并配置Swagger UI
try {
  console.log('开始生成Swagger规范...');
  
  // 获取项目根目录
  const rootDir = path.resolve(__dirname, '..');
  
  // Swagger定义
  const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
      title: '区块链房地产代币化系统 API',
      version: '1.0.0',
      description: '区块链房地产代币化系统的后端API文档'
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: '本地开发服务器'
      }
    ],
    components: {
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              example: '错误信息'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            data: {
              type: 'object',
              example: {}
            }
          }
        }
      },
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'query',
          name: 'apiKey'
        }
      }
    }
  };
  
  // 配置选项
  const options = {
    definition: swaggerDefinition,
    apis: [
      path.join(rootDir, 'http-server/controllers/**/*.js'),
      path.join(rootDir, 'http-server/routes/**/*.js')
    ]
  };
  
  // 生成swagger规范
  const swaggerSpec = swaggerJSDoc(options);
  
  // 打印检测到的API路径
  if (swaggerSpec.paths && Object.keys(swaggerSpec.paths).length > 0) {
    console.log('检测到的API路径:', Object.keys(swaggerSpec.paths).length, '个');
  } else {
    console.warn('警告: 未检测到任何API路径!');
  }
  
  // 仅在开发模式下或文件不存在时才写入文件
  const specPath = path.join(__dirname, 'swagger-spec.json');
  if (!fs.existsSync(specPath) || process.env.NODE_ENV === 'development') {
    fs.writeFileSync(specPath, JSON.stringify(swaggerSpec, null, 2), 'utf8');
    console.log(`Swagger规范已写入文件: ${specPath}`);
  } else {
    console.log('使用现有Swagger规范文件');
  }
  
  // 使用单一行配置方式
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true
  }));
  
  // 处理带尾部斜杠的URL
  app.get('/api-docs/', (req, res) => {
    res.redirect('/api-docs');
  });
  
  // 提供swagger.json端点
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log('Swagger UI已配置，访问路径: /api-docs 或 /api-docs/');
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
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`服务器已启动，端口: ${PORT}`);
  console.log(`API文档地址: http://localhost:${PORT}/api-docs`);
});

module.exports = app; 