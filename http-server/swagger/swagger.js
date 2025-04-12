/**
 * Swagger API 文档配置
 * 采用简化版服务器的成功方案
 */
const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs');

// 获取项目根目录的绝对路径
const rootDir = path.resolve(__dirname, '../..');

// 创建单例
let swaggerSpec = null;

/**
 * 生成Swagger规范
 */
const getSwaggerSpec = () => {
  if (swaggerSpec) {
    return swaggerSpec;
  }

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
        url: '/',
        description: '当前服务器'
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

  try {
    // 初始化swagger规范
    swaggerSpec = swaggerJSDoc(options);
    console.log('Swagger规范已生成');
    
    // 将规范写入文件
    const specPath = path.join(__dirname, '../swagger-spec.json');
    fs.writeFileSync(specPath, JSON.stringify(swaggerSpec, null, 2), 'utf8');
    console.log(`Swagger规范已写入文件: ${specPath}`);
  } catch (error) {
    console.error('生成swagger规范失败:', error);
    
    // 如果生成失败，尝试从文件加载
    try {
      const specPath = path.join(__dirname, '../swagger-spec.json');
      if (fs.existsSync(specPath)) {
        swaggerSpec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
        console.log('从文件加载Swagger规范成功');
      }
    } catch (err) {
      console.error('从文件加载swagger规范失败:', err);
      
      // 创建一个最小的规范对象
      swaggerSpec = {
        openapi: '3.0.0',
        info: { title: 'API', version: '1.0.0' },
        paths: {}
      };
    }
  }
  
  return swaggerSpec;
};

/**
 * 旧版setup方法 - 为了向后兼容保留，但内部使用新的实现
 */
const setup = (app) => {
  console.log('使用旧版setup方法，推荐直接使用getSwaggerSpec()');
  return swaggerSpec;
};

module.exports = {
  setup,
  getSwaggerSpec
}; 