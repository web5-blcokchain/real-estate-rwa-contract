/**
 * RealEstateSystem API测试
 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;
const app = require('../src');

chai.use(chaiHttp);

// 测试用API密钥
const API_KEY = process.env.TEST_API_KEY || 'test-api-key';

describe('RealEstateSystem API测试', () => {
  // 获取系统信息测试
  describe('GET /api/v1/real-estate-system/info', () => {
    it('应该返回系统信息', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/real-estate-system/info')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('version');
      expect(res.body.data).to.have.property('owner');
    });

    it('无API密钥应该返回401', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/real-estate-system/info');
      
      expect(res).to.have.status(401);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 获取合约地址测试
  describe('GET /api/v1/real-estate-system/contract-addresses', () => {
    it('应该返回所有合约地址', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/real-estate-system/contract-addresses')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('propertyManager');
      expect(res.body.data).to.have.property('roleManager');
      expect(res.body.data).to.have.property('tradingManager');
      expect(res.body.data).to.have.property('rewardManager');
      expect(res.body.data).to.have.property('propertyToken');
    });
  });

  // 获取系统参数测试
  describe('GET /api/v1/real-estate-system/parameter/{paramName}', () => {
    it('应该返回系统参数', async () => {
      // 假设存在minTradeAmount参数
      const paramName = 'minTradeAmount';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/real-estate-system/parameter/${paramName}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('paramName');
      expect(res.body.data).to.have.property('value');
    });

    it('无效参数名应该返回错误', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/real-estate-system/parameter/invalidParam')
        .set('X-API-Key', API_KEY);
      
      // 这里可能返回404或400，取决于实现
      expect(res.status).to.be.oneOf([404, 400]);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 检查系统是否暂停测试
  describe('GET /api/v1/real-estate-system/paused', () => {
    it('应该返回系统暂停状态', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/real-estate-system/paused')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('paused');
      expect(typeof res.body.data.paused).to.equal('boolean');
    });
  });

  // 更新系统参数测试（注意：这个测试需要有效的私钥才能成功运行）
  describe('POST /api/v1/real-estate-system/update-parameter', () => {
    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/real-estate-system/update-parameter')
        .set('X-API-Key', API_KEY)
        .send({
          paramName: 'minTradeAmount',
          value: '1000'
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 暂停系统测试（注意：这个测试需要有效的私钥才能成功运行）
  describe('POST /api/v1/real-estate-system/pause', () => {
    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/real-estate-system/pause')
        .set('X-API-Key', API_KEY)
        .send({
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 恢复系统测试（注意：这个测试需要有效的私钥才能成功运行）
  describe('POST /api/v1/real-estate-system/unpause', () => {
    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/real-estate-system/unpause')
        .set('X-API-Key', API_KEY)
        .send({
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });
}); 