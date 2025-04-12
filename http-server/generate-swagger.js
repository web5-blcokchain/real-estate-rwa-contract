/**
 * 生成Swagger规范文件
 * 单独的脚本，用于生成swagger-spec.json文件
 */
const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs');

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
      url: 'http://localhost:3000',
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
try {
  console.log('开始生成Swagger规范...');
  const swaggerSpec = swaggerJSDoc(options);
  
  // 打印检测到的API路径
  if (swaggerSpec.paths && Object.keys(swaggerSpec.paths).length > 0) {
    console.log('检测到的API路径:', Object.keys(swaggerSpec.paths));
  } else {
    console.warn('警告: 未检测到任何API路径!');
  }
  
  // 将规范写入文件
  const specPath = path.join(__dirname, 'swagger-spec.json');
  fs.writeFileSync(specPath, JSON.stringify(swaggerSpec, null, 2), 'utf8');
  console.log(`Swagger规范已写入文件: ${specPath}`);
  console.log('生成完成!');
} catch (error) {
  console.error('生成Swagger规范失败:', error);
  process.exit(1);
} 