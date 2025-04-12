/**
 * Swagger API 文档配置 - 重写
 */
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');

// 获取项目根目录的绝对路径
const rootDir = path.resolve(__dirname, '../..');

// Swagger 基本信息配置
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: '区块链房地产代币化系统 API',
    version: '1.0.0',
    description: '区块链房地产代币化系统的后端API文档，提供合约交互接口',
    contact: {
      name: 'Development Team',
      email: 'dev@example.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: '本地开发服务器'
    },
    {
      url: 'https://api.example.com',
      description: '生产环境服务器'
    }
  ],
  tags: [
    {
      name: 'RealEstateFacade',
      description: '房地产门面合约接口，提供统一的业务操作'
    },
    {
      name: 'PropertyManager',
      description: '房产管理接口，负责房产注册、状态管理等'
    },
    {
      name: 'TradingManager',
      description: '交易管理接口，负责订单创建、交易执行等'
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
          message: {
            type: 'string',
            example: '操作失败的错误信息'
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                example: 'CONTRACT_ERROR'
              },
              details: {
                type: 'string',
                example: '具体错误详情'
              }
            }
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
      },
      PropertyStatus: {
        type: 'integer',
        enum: [0, 1, 2, 3, 4],
        description: '房产状态: 0=未注册, 1=待审核, 2=已批准, 3=已拒绝, 4=已下架'
      },
      PropertyFacadeStatus: {
        type: 'integer',
        enum: [0, 1, 2, 3, 4, 5],
        description: '房产状态: 0=未激活, 1=激活, 2=出售中, 3=已售, 4=出租, 5=维护中'
      }
    },
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'query',
        name: 'apiKey',
        description: '通过URL参数传递apiKey进行认证'
      }
    }
  },
  security: [
    {
      ApiKeyAuth: []
    }
  ]
};

// 配置 options
const options = {
  swaggerDefinition,
  // 寻找 API 文档的路径
  apis: [
    path.join(rootDir, 'server/controllers/core/*.js'),
    path.join(rootDir, 'server/routes/core/*.js')
  ],
};

// 生成swagger规范并尝试写入磁盘缓存
let swaggerSpec;
try {
  // 初始化 Swagger 文档
  swaggerSpec = swaggerJSDoc(options);
  
  // 尝试将规范写入文件（便于调试和缓存）
  const outputPath = path.join(__dirname, '../swagger-spec.json');
  fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
  console.log(`Swagger规范已写入: ${outputPath}`);
} catch (error) {
  console.error('生成Swagger规范时出错:', error);
  // 创建一个基本的swagger规范
  swaggerSpec = { ...swaggerDefinition, paths: {} };
}

// Swagger UI选项
const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    docExpansion: 'list',
    filter: true,
    showRequestDuration: true,
  }
};

// 设置Swagger UI中间件
const setup = (app) => {
  if (!app) {
    console.error('Express app实例不存在，无法设置Swagger UI');
    return;
  }
  
  // 设置Swagger UI路由 - 简化设置，不使用静态文件
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
  
  // 提供swagger.json端点
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
  
  console.log('Swagger 文档已配置，访问 /api-docs 查看 API 文档');
};

module.exports = {
  setup,
  swaggerSpec
}; 