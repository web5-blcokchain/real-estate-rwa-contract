/**
 * PropertyToken API测试
 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;
const app = require('../src');

chai.use(chaiHttp);

// 测试用API密钥
const API_KEY = process.env.TEST_API_KEY || 'test-api-key';

describe('PropertyToken API测试', () => {
  // 获取代币总供应量测试
  describe('GET /api/v1/property-token/total-supply/{tokenAddress}', () => {
    it('应该返回代币总供应量', async () => {
      // 使用一个有效的代币地址（测试环境）
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/property-token/total-supply/${tokenAddress}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('tokenAddress');
      expect(res.body.data).to.have.property('totalSupply');
    });

    it('无效地址应该返回错误', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/property-token/total-supply/invalid-address')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 获取代币余额测试
  describe('GET /api/v1/property-token/balance/{tokenAddress}/{account}', () => {
    it('应该返回账户代币余额', async () => {
      // 使用有效的代币地址和账户地址
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const account = '0x0987654321098765432109876543210987654321';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/property-token/balance/${tokenAddress}/${account}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('tokenAddress');
      expect(res.body.data).to.have.property('account');
      expect(res.body.data).to.have.property('balance');
    });

    it('无效参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/property-token/balance/invalid-address/invalid-account')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 代币转账测试
  describe('POST /api/v1/property-token/transfer', () => {
    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/property-token/transfer')
        .set('X-API-Key', API_KEY)
        .send({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          to: '0x0987654321098765432109876543210987654321',
          amount: '1000'
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 获取代币授权额度测试
  describe('GET /api/v1/property-token/allowance/{tokenAddress}/{owner}/{spender}', () => {
    it('应该返回授权额度', async () => {
      // 使用有效的代币地址、所有者地址和支出者地址
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const owner = '0x1111111111111111111111111111111111111111';
      const spender = '0x2222222222222222222222222222222222222222';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/property-token/allowance/${tokenAddress}/${owner}/${spender}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('tokenAddress');
      expect(res.body.data).to.have.property('owner');
      expect(res.body.data).to.have.property('spender');
      expect(res.body.data).to.have.property('allowance');
    });

    it('无效参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/property-token/allowance/invalid/invalid/invalid')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 批准代币额度测试
  describe('POST /api/v1/property-token/approve', () => {
    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/property-token/approve')
        .set('X-API-Key', API_KEY)
        .send({
          tokenAddress: '0x1234567890123456789012345678901234567890',
          spender: '0x0987654321098765432109876543210987654321',
          amount: '1000'
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 获取代币元数据测试
  describe('GET /api/v1/property-token/metadata/{tokenAddress}', () => {
    it('应该返回代币元数据', async () => {
      // 使用有效的代币地址
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/property-token/metadata/${tokenAddress}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('tokenAddress');
      expect(res.body.data).to.have.property('name');
      expect(res.body.data).to.have.property('symbol');
      expect(res.body.data).to.have.property('decimals');
    });

    it('无效地址应该返回错误', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/property-token/metadata/invalid-address')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });
}); 