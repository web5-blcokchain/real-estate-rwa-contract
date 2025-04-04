/**
 * 日本房地产资产通证化HTTP服务器
 * 服务器入口文件
 */
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// 确保项目路径设置正确
const projectRootPath = process.env.PROJECT_PATH || path.resolve(__dirname, '../..');
// 明确设置PROJECT_PATH环境变量
process.env.PROJECT_PATH = projectRootPath;
if (!process.env.PROJECT_PATH.endsWith('/')) {
  process.env.PROJECT_PATH += '/';
}

console.log(`===== 服务器启动 =====`);
console.log(`项目根目录路径: ${process.env.PROJECT_PATH}`);
console.log(`当前工作目录: ${process.cwd()}`);

// 测试.env文件是否正确加载
console.log("环境变量BLOCKCHAIN_NETWORK:", process.env.BLOCKCHAIN_NETWORK);
console.log("环境变量NODE_ENV:", process.env.NODE_ENV);

// 在全局作用域声明这些变量
let AddressConfig, AbiConfig, Logger, ErrorHandler, blockchainService;

try {
  // 手动加载配置类
  console.log("开始导入配置模块...");
  
  AddressConfig = require('../../shared/src/config/address');
  console.log("AddressConfig导入成功:", typeof AddressConfig);
  
  AbiConfig = require('../../shared/src/config/abi');
  console.log("AbiConfig导入成功:", typeof AbiConfig);
  
  Logger = require('../../shared/src/utils/logger');
  console.log("Logger导入成功:", typeof Logger);
  
  ErrorHandler = require('../../shared/src/utils/errors');
  console.log("ErrorHandler导入成功:", typeof ErrorHandler);
  
  console.log('环境配置加载完成');
  
  // 确保Provider和其他依赖模块已加载
  const Provider = require('../../shared/src/core/provider');
  console.log("Provider导入成功:", typeof Provider);
  
  const Contract = require('../../shared/src/core/contract');
  console.log("Contract导入成功:", typeof Contract);
  
  const Wallet = require('../../shared/src/core/wallet');
  console.log("Wallet导入成功:", typeof Wallet);
  
  // 最后加载服务
  const services = require('./services');
  blockchainService = services.blockchainService;
  console.log("blockchainService导入成功:", typeof blockchainService);
  
} catch (error) {
  console.error("模块导入错误:", error);
  process.exit(1); // 如果关键模块导入失败，直接退出
}

// 设置部署文件路径
const deploymentPath = path.resolve(process.env.PROJECT_PATH, 'config/deployment.json');
if (fs.existsSync(deploymentPath)) {
  if (AddressConfig && typeof AddressConfig.setDeploymentPath === 'function') {
    AddressConfig.setDeploymentPath(deploymentPath);
    console.log(`部署文件路径设置完成: ${deploymentPath}`);
  } else {
    console.error('AddressConfig.setDeploymentPath 不是一个函数或AddressConfig未定义');
  }
} else {
  console.warn(`部署文件不存在: ${deploymentPath}`);
}

// 设置ABI目录路径
const abiDirPath = path.resolve(process.env.PROJECT_PATH, 'config/abi');
if (fs.existsSync(abiDirPath)) {
  try {
    if (AbiConfig && typeof AbiConfig.loadAllContractAbis === 'function') {
      const abis = AbiConfig.loadAllContractAbis(abiDirPath);
      console.log(`ABI文件加载成功，共${Object.keys(abis).length}个`);
    } else {
      console.error('AbiConfig.loadAllContractAbis 不是一个函数或AbiConfig未定义');
    }
  } catch (error) {
    console.error(`ABI文件加载失败: ${error.message}`);
  }
} else {
  console.warn(`ABI目录不存在: ${abiDirPath}`);
}

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// Swagger配置
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '日本房地产资产通证化API',
      version: '1.0.0',
      description: '基于区块链的房地产资产通证化API文档\n\n**安全要求**: 所有API请求必须包含有效的API密钥，通过请求头`X-API-Key`或URL参数`api_key`提供。',
      contact: {
        name: '开发团队',
        email: 'dev@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: '开发服务器'
      },
      {
        url: `${process.env.API_URL || 'https://api.example.com'}`,
        description: '生产服务器'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: '所有API调用必须包含有效的API密钥'
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
    // 使用绝对路径确保文件正确加载
    path.join(__dirname, 'routes', '*.js'),
    path.join(__dirname, 'controllers', '*.js'),
    path.join(__dirname, 'models', '*.js')
  ],
  // 启用更详细的日志以便调试
  swaggerDefinition: {
    openapi: '3.0.0',
    security: [{ApiKeyAuth: []}]
  }
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// 中间件
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Swagger UI路由
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Swagger JSON端点
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    blockchainService: blockchainService && blockchainService.initialized ? 'UP' : 'DOWN'
  });
});

// 简单的欢迎页面
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>日本房地产资产通证化API服务器</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 50px; line-height: 1.6; }
          h1 { color: #333; }
          .endpoint { background: #f4f4f4; padding: 10px; margin: 10px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>日本房地产资产通证化API服务器</h1>
        <p>服务器状态: <strong>运行中</strong></p>
        <p>区块链网络: <strong>${process.env.BLOCKCHAIN_NETWORK || 'localhost'}</strong></p>
        <p>API健康检查: <a href="/health">/health</a></p>
        <p>API文档: <a href="/api-docs">Swagger文档</a></p>
        <p>API版本: <a href="/api/v1/blockchain/status">v1</a></p>
      </body>
    </html>
  `);
});

// 尝试加载路由
try {
  // 加载统一的路由文件
  const routes = require('./routes/index');
  app.use('/', routes);
  console.log('已加载所有路由');
} catch (error) {
  console.error(`加载路由失败: ${error.message}`, error);
}

// 延迟初始化区块链服务，确保所有配置已加载
setTimeout(() => {
  // 初始化区块链服务
  if (blockchainService && typeof blockchainService.initialize === 'function') {
    console.log('开始初始化区块链服务...');
    blockchainService.initialize().then(() => {
      console.log('区块链服务初始化成功');
    }).catch(error => {
      console.warn(`区块链服务初始化失败: ${error.message}`);
    });
  } else {
    console.error('blockchainService.initialize 不是一个函数或blockchainService未定义');
  }
}, 1000);

// 全局错误处理
app.use((err, req, res, next) => {
  console.error(`API错误: ${err.message}`, { error: err, path: req.path });
  
  res.status(500).json({
    success: false,
    error: {
      message: err.message || '服务器内部错误',
      code: err.code || 'INTERNAL_SERVER_ERROR'
    },
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器已启动，端口: ${PORT}`);
  
  // 打印服务器信息
  console.log('======== 服务器配置信息 ========');
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`区块链网络: ${process.env.BLOCKCHAIN_NETWORK || 'localhost'}`);
  console.log(`项目根目录: ${process.env.PROJECT_PATH}`);
  console.log(`API文档: http://localhost:${PORT}/api-docs`);
  console.log('================================');
}); 