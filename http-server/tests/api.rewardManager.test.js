/**
 * RewardManager API测试
 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;
const app = require('../src');

chai.use(chaiHttp);

// 测试用API密钥
const API_KEY = process.env.TEST_API_KEY || 'test-api-key';

describe('RewardManager API测试', () => {
  // 查询用户奖励测试
  describe('GET /api/v1/reward-manager/user-rewards/{address}', () => {
    it('应该返回用户奖励信息', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/reward-manager/user-rewards/${address}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('address');
      expect(res.body.data).to.have.property('rewards');
    });

    it('无效地址应该返回错误', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/reward-manager/user-rewards/invalid-address')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 查询资产奖励测试
  describe('GET /api/v1/reward-manager/property-rewards/{propertyId}', () => {
    it('应该返回资产奖励信息', async () => {
      const propertyId = 'PROPERTY-123';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/reward-manager/property-rewards/${propertyId}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('propertyId');
      expect(res.body.data).to.have.property('rewards');
    });
  });

  // 分配奖励测试
  describe('POST /api/v1/reward-manager/distribute-rewards', () => {
    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/reward-manager/distribute-rewards')
        .set('X-API-Key', API_KEY)
        .send({
          propertyId: 'PROPERTY-123',
          amount: '1000'
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 领取奖励测试
  describe('POST /api/v1/reward-manager/claim-rewards', () => {
    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/reward-manager/claim-rewards')
        .set('X-API-Key', API_KEY)
        .send({
          propertyId: 'PROPERTY-123'
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 查询可领取奖励测试
  describe('GET /api/v1/reward-manager/claimable-rewards/{address}/{propertyId}', () => {
    it('应该返回可领取奖励信息', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      const propertyId = 'PROPERTY-123';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/reward-manager/claimable-rewards/${address}/${propertyId}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('address');
      expect(res.body.data).to.have.property('propertyId');
      expect(res.body.data).to.have.property('claimableAmount');
    });

    it('无效地址应该返回错误', async () => {
      const propertyId = 'PROPERTY-123';
      const res = await chai
        .request(app)
        .get(`/api/v1/reward-manager/claimable-rewards/invalid-address/${propertyId}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 查询奖励历史测试
  describe('GET /api/v1/reward-manager/reward-history/{address}', () => {
    it('应该返回奖励历史记录', async () => {
      const address = '0x1234567890123456789012345678901234567890';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/reward-manager/reward-history/${address}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('address');
      expect(res.body.data).to.have.property('history');
      expect(res.body.data.history).to.be.an('array');
    });

    it('无效地址应该返回错误', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/reward-manager/reward-history/invalid-address')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 设置奖励参数测试
  describe('POST /api/v1/reward-manager/set-reward-parameters', () => {
    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/reward-manager/set-reward-parameters')
        .set('X-API-Key', API_KEY)
        .send({
          propertyId: 'PROPERTY-123',
          rewardRate: '0.05',
          distributionPeriod: '30'
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 获取奖励参数测试
  describe('GET /api/v1/reward-manager/reward-parameters/{propertyId}', () => {
    it('应该返回奖励参数信息', async () => {
      const propertyId = 'PROPERTY-123';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/reward-manager/reward-parameters/${propertyId}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('propertyId');
      expect(res.body.data).to.have.property('rewardRate');
      expect(res.body.data).to.have.property('distributionPeriod');
    });
  });
}); 