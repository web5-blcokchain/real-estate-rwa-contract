/**
 * Swagger配置初始化
 */
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * 初始化Swagger文档
 * @param {Object} app - Express应用实例
 * @param {number} port - 服务器端口
 */
const initSwagger = (app, port = 3000) => {
  // Swagger配置
  const swaggerOptions = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: '不动产系统API',
        version: '1.0.0',
        description: '不动产系统合约功能封装API',
      },
      servers: [
        {
          url: `http://localhost:${port}`,
          description: '开发服务器',
        },
      ],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'query',
            name: 'api_key',
          },
        },
      },
      security: [
        {
          ApiKeyAuth: [],
        },
      ],
    },
    apis: ['./src/routes/*.js'], // 路由文件路径
  };

  const swaggerDocs = swaggerJsDoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
};

export default initSwagger; 