const request = require('supertest');
const express = require('express');
const { authMiddleware } = require('../../src/middlewares/authMiddleware');
const { errorHandler } = require('../../src/middlewares/errorHandler');

describe('Auth Middleware Integration Tests', () => {
  let app;
  const apiKey = 'test-api-key';
  
  // 测试前设置
  beforeEach(() => {
    // 保存环境变量以便测试后恢复
    process.env.API_KEY = apiKey;
    process.env.NODE_ENV = 'production'; // 确保使用真实的验证中间件
    
    // 创建测试Express应用
    app = express();
    
    // 添加JSON解析
    app.use(express.json());
    
    // 添加受保护路由和公开路由
    app.get('/api/public', (req, res) => {
      res.status(200).json({ message: 'Public route' });
    });
    
    app.get('/api/protected', authMiddleware(), (req, res) => {
      res.status(200).json({ 
        message: 'Protected route',
        user: req.user
      });
    });
    
    // 添加错误处理中间件
    app.use(errorHandler);
  });
  
  // 测试后恢复环境
  afterEach(() => {
    // 恢复原始环境变量
    process.env.NODE_ENV = 'test';
  });
  
  it('should allow access to public routes without API key', async () => {
    const response = await request(app).get('/api/public');
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Public route');
  });
  
  it('should block access to protected routes without API key', async () => {
    const response = await request(app).get('/api/protected');
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
  
  it('should allow access with valid API key in header', async () => {
    const response = await request(app)
      .get('/api/protected')
      .set('X-API-Key', apiKey);
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Protected route');
    expect(response.body.user).toBeDefined();
    expect(response.body.user.authenticated).toBe(true);
  });
  
  it('should allow access with valid API key in query parameter', async () => {
    const response = await request(app)
      .get(`/api/protected?apiKey=${apiKey}`);
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Protected route');
  });
  
  it('should reject access with invalid API key', async () => {
    const response = await request(app)
      .get('/api/protected')
      .set('X-API-Key', 'invalid-key');
    
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
  
  it('should use mock middleware in development environment', async () => {
    // 切换到开发环境
    process.env.NODE_ENV = 'development';
    
    // 重新创建应用以加载开发环境中间件
    app = express();
    app.use(express.json());
    
    app.get('/api/protected', authMiddleware(), (req, res) => {
      res.status(200).json({ 
        message: 'Protected route',
        user: req.user
      });
    });
    
    app.use(errorHandler);
    
    // 在开发环境中，应该不需要API密钥
    const response = await request(app).get('/api/protected');
    
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Protected route');
    expect(response.body.user).toBeDefined();
    expect(response.body.user.authenticated).toBe(true);
    expect(response.body.user.apiKey).toBe('dev-mode');
  });
}); 