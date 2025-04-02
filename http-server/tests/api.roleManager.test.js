/**
 * RoleManager API测试
 */
const chai = require('chai');
const chaiHttp = require('chai-http');
const { expect } = chai;
const app = require('../src');

chai.use(chaiHttp);

// 测试用API密钥
const API_KEY = process.env.TEST_API_KEY || 'test-api-key';

describe('RoleManager API测试', () => {
  // 获取所有角色测试
  describe('GET /api/v1/role-manager/all-roles', () => {
    it('应该返回所有角色列表', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/role-manager/all-roles')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('roles');
      expect(res.body.data.roles).to.be.an('array');
    });

    it('无API密钥应该返回401', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/role-manager/all-roles');
      
      expect(res).to.have.status(401);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 获取角色成员测试
  describe('GET /api/v1/role-manager/role-members/:role', () => {
    it('应该返回角色成员列表', async () => {
      // 假设存在ADMIN_ROLE角色
      const role = '0x0000000000000000000000000000000000000000000000000000000000000000';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/role-manager/role-members/${role}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('role');
      expect(res.body.data).to.have.property('members');
      expect(res.body.data.members).to.be.an('array');
    });

    it('无效角色ID应该返回错误', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/role-manager/role-members/invalid-role')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 获取账户角色测试
  describe('GET /api/v1/role-manager/account-roles/:account', () => {
    it('应该返回账户的角色列表', async () => {
      // 使用一个有效的以太坊地址
      const account = '0x1234567890123456789012345678901234567890';
      
      const res = await chai
        .request(app)
        .get(`/api/v1/role-manager/account-roles/${account}`)
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('account');
      expect(res.body.data).to.have.property('roles');
      expect(res.body.data.roles).to.be.an('array');
    });

    it('无效地址应该返回错误', async () => {
      const res = await chai
        .request(app)
        .get('/api/v1/role-manager/account-roles/invalid-address')
        .set('X-API-Key', API_KEY);
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 检查角色测试
  describe('POST /api/v1/role-manager/has-role', () => {
    it('应该返回账户是否拥有角色', async () => {
      const role = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const account = '0x1234567890123456789012345678901234567890';
      
      const res = await chai
        .request(app)
        .post('/api/v1/role-manager/has-role')
        .set('X-API-Key', API_KEY)
        .send({
          role,
          account
        });
      
      expect(res).to.have.status(200);
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.property('success', true);
      expect(res.body).to.have.property('data');
      expect(res.body.data).to.have.property('role');
      expect(res.body.data).to.have.property('account');
      expect(res.body.data).to.have.property('hasRole');
      expect(res.body.data.hasRole).to.be.a('boolean');
    });

    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/role-manager/has-role')
        .set('X-API-Key', API_KEY)
        .send({
          role: '0x0000000000000000000000000000000000000000000000000000000000000000'
          // 缺少account参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 授予角色测试（注意：这个测试需要有效的私钥才能成功运行）
  describe('POST /api/v1/role-manager/grant', () => {
    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/role-manager/grant')
        .set('X-API-Key', API_KEY)
        .send({
          role: '0x0000000000000000000000000000000000000000000000000000000000000000',
          account: '0x1234567890123456789012345678901234567890'
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 撤销角色测试（注意：这个测试需要有效的私钥才能成功运行）
  describe('POST /api/v1/role-manager/revoke', () => {
    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/role-manager/revoke')
        .set('X-API-Key', API_KEY)
        .send({
          role: '0x0000000000000000000000000000000000000000000000000000000000000000',
          account: '0x1234567890123456789012345678901234567890'
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });

  // 创建角色测试（注意：这个测试需要有效的私钥才能成功运行）
  describe('POST /api/v1/role-manager/create-role', () => {
    it('缺少必要参数应该返回错误', async () => {
      const res = await chai
        .request(app)
        .post('/api/v1/role-manager/create-role')
        .set('X-API-Key', API_KEY)
        .send({
          roleName: 'TEST_ROLE'
          // 缺少privateKey参数
        });
      
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('success', false);
    });
  });
}); 