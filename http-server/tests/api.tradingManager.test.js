/**
 * TradingManager API测试
 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;
const app = require('../src');

chai.use(chaiHttp);

// 测试用API密钥
const API_KEY = process.env.TEST_API_KEY || 'test-api-key';

describe('TradingManager API测试', () => {
  // 创建订单测试
  describe('POST /api/v1/trading-manager/create-order', () => {
    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/trading-manager/create-order')
        .set('X-API-Key', API_KEY)
        .send({
          propertyId: 'PROPERTY-123',
          amount: '1000',
          price: '5000'
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 取消订单测试
  describe('POST /api/v1/trading-manager/cancel-order', () => {
    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/trading-manager/cancel-order')
        .set('X-API-Key', API_KEY)
        .send({
          orderId: '12345'
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 执行订单测试
  describe('POST /api/v1/trading-manager/execute-order', () => {
    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/trading-manager/execute-order')
        .set('X-API-Key', API_KEY)
        .send({
          orderId: '12345',
          amount: '500'
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 获取订单信息测试
  describe('GET /api/v1/trading-manager/order/{orderId}', () => {
    it('应该返回订单信息', async () => {
      const orderId = '12345';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/trading-manager/order/${orderId}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('orderId');
    });

    it('无效订单ID应该返回错误', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/trading-manager/order/invalid-id')
        .set('X-API-Key', API_KEY);
      
      expect(res.status).to.be.oneOf([400, 404]);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 获取用户订单测试
  describe('GET /api/v1/trading-manager/user-orders/{address}', () => {
    it('应该返回用户订单列表', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/trading-manager/user-orders/${address}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('address');
      expect(res.body.data).to.have.property('orders');
      expect(res.body.data.orders).to.be.an('array');
    });

    it('无效地址应该返回错误', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/trading-manager/user-orders/invalid-address')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 获取资产订单测试
  describe('GET /api/v1/trading-manager/property-orders/{propertyId}', () => {
    it('应该返回资产订单列表', async () => {
      const propertyId = 'PROPERTY-123';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/trading-manager/property-orders/${propertyId}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('propertyId');
      expect(res.body.data).to.have.property('orders');
      expect(res.body.data.orders).to.be.an('array');
    });
  });

  // 获取交易记录测试
  describe('GET /api/v1/trading-manager/transaction-history/{address}', () => {
    it('应该返回交易历史记录', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/trading-manager/transaction-history/${address}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('address');
      expect(res.body.data).to.have.property('transactions');
      expect(res.body.data.transactions).to.be.an('array');
    });

    it('无效地址应该返回错误', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/trading-manager/transaction-history/invalid-address')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 获取市场统计数据测试
  describe('GET /api/v1/trading-manager/market-stats', () => {
    it('应该返回市场统计数据', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/trading-manager/market-stats')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('totalOrders');
      expect(res.body.data).to.have.property('totalVolume');
      expect(res.body.data).to.have.property('activeOrders');
    });
  });
}); 