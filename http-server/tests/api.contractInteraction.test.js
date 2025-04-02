/**
 * ContractInteraction API测试
 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;
const app = require('../src');

chai.use(chaiHttp);

// 测试用API密钥
const API_KEY = process.env.TEST_API_KEY || 'test-api-key';

describe('ContractInteraction API测试', () => {
  // 获取网络信息测试
  describe('GET /api/v1/contract-interaction/network', () => {
    it('应该返回网络信息', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/contract-interaction/network')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('chainId');
      expect(res.body.data).to.have.property('name');
      expect(res.body.data).to.have.property('blockNumber');
    });

    it('无API密钥应该返回401', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/contract-interaction/network');
      
      expect(res).to.have.status(401);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 获取合约ABI测试
  describe('GET /api/v1/contract-interaction/abi/:contractName', () => {
    it('应该返回RealEstateSystem合约ABI', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/contract-interaction/abi/RealEstateSystem')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.be.an('array');
    });

    it('请求不存在的合约ABI应该返回404', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/contract-interaction/abi/NonExistentContract')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(404);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 调用合约只读方法测试
  describe('POST /api/v1/contract-interaction/read', () => {
    it('应该能调用RealEstateSystem.getSystemInfo方法', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/contract-interaction/read')
        .set('X-API-Key', API_KEY)
        .send({
          contractName: 'RealEstateSystem',
          methodName: 'getSystemInfo',
          args: []
        });
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
    });

    it('缺少必要参数应该返回400', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/contract-interaction/read')
        .set('X-API-Key', API_KEY)
        .send({
          contractName: 'RealEstateSystem'
          // 缺少methodName参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 发送合约写入方法测试
  describe('POST /api/v1/contract-interaction/write', () => {
    // 注意：这个测试需要有效的私钥才能成功运行
    // 这里我们只测试参数验证逻辑
    
    it('缺少必要参数应该返回400', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/contract-interaction/write')
        .set('X-API-Key', API_KEY)
        .send({
          contractName: 'RealEstateSystem',
          methodName: 'updateSystemParameter'
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });
});