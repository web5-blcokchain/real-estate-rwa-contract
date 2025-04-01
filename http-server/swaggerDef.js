export default {
  openapi: '3.0.0',
  info: {
    title: '不动产系统API',
    version: '1.0.0',
    description: '不动产系统合约功能封装API',
  },
  servers: [
    {
      url: 'http://localhost:3000',
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
}; 