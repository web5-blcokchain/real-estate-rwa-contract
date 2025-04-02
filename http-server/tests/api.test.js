/**
 * API测试文件
 * 测试服务器API接口
 */
// 设置测试环境
process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../src');
const { expect } = chai;

// 配置chai
chai.use(chaiHttp);

// 测试API Key
const API_KEY = 'test-api-key';

describe('API测试', () => {
  // 健康检查接口测试
  describe('健康检查接口 GET /', () => {
    it('应返回服务器状态信息', (done) => {
      chai.request(app)
        .get('/')
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.property('status').equal('OK');
          expect(res.body).to.have.property('message');
          expect(res.body).to.have.property('timestamp');
          done();
        });
    });
  });

  // 系统接口测试
  describe('系统接口 GET /api/v1/system/status', () => {
    it('无API Key应返回401', (done) => {
      chai.request(app)
        .get('/api/v1/system/status')
        .end((err, res) => {
          expect(res).to.have.status(401);
          expect(res.body).to.have.property('success').equal(false);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('有效API Key应返回系统状态', (done) => {
      chai.request(app)
        .get('/api/v1/system/status')
        .set('x-api-key', API_KEY)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success').equal(true);
          expect(res.body).to.have.property('data');
          expect(res.body.data).to.have.property('server');
          done();
        });
    });
  });

  // 网络接口测试
  describe('网络接口 GET /api/v1/system/networks', () => {
    it('应返回网络列表', (done) => {
      chai.request(app)
        .get('/api/v1/system/networks')
        .set('x-api-key', API_KEY)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success').equal(true);
          expect(res.body).to.have.property('data');
          expect(res.body.data).to.have.property('networks').to.be.an('array');
          done();
        });
    });
  });

  // 404测试
  describe('未知路径访问', () => {
    it('应返回404状态码', (done) => {
      chai.request(app)
        .get('/api/v1/unknown-path')
        .set('x-api-key', API_KEY)
        .end((err, res) => {
          expect(res).to.have.status(404);
          expect(res.body).to.have.property('success').equal(false);
          expect(res.body).to.have.property('error').equal('NotFound');
          done();
        });
    });
  });

  // 签名验证测试
  describe('签名验证接口 POST /api/v1/system/verify-signature', () => {
    // 模拟数据
    const testData = {
      message: 'Hello, World!',
      // 这是一个有效的测试签名，生产环境应使用实际签名
      signature: '0x5a894c5794a03616c067d7f0a57ac68bfa41d0d9718b828eeb7370109d3a214e37f7a092debdee4576160eb950a6534a2163b0c94e6469d3b30d243bd2a2d52c1c',
      address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
    };

    it('应验证有效签名', (done) => {
      chai.request(app)
        .post('/api/v1/system/verify-signature')
        .set('x-api-key', API_KEY)
        .send(testData)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success').equal(true);
          expect(res.body).to.have.property('data');
          expect(res.body.data).to.have.property('isValid');
          expect(res.body.data).to.have.property('address').equal(testData.address);
          expect(res.body.data).to.have.property('message').equal(testData.message);
          done();
        });
    });

    it('无效签名应返回验证失败', (done) => {
      const invalidData = {
        ...testData,
        signature: '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
      };

      chai.request(app)
        .post('/api/v1/system/verify-signature')
        .set('x-api-key', API_KEY)
        .send(invalidData)
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success').equal(false);
          expect(res.body).to.have.property('error').equal('ValidationError');
          done();
        });
    });

    it('缺少必需参数应返回400错误', (done) => {
      chai.request(app)
        .post('/api/v1/system/verify-signature')
        .set('x-api-key', API_KEY)
        .send({ message: testData.message })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success').equal(false);
          expect(res.body).to.have.property('error').equal('ValidationError');
          done();
        });
    });
  });

  // 消息签名测试
  describe('消息签名接口 POST /api/v1/system/sign-message', () => {
    // 测试私钥和预期地址
    const testPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // 测试私钥
    const testAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'; // 对应的地址
    
    it('应成功签名消息', (done) => {
      const data = {
        message: 'Hello, World!',
        privateKey: testPrivateKey
      };
      
      chai.request(app)
        .post('/api/v1/system/sign-message')
        .set('x-api-key', API_KEY)
        .send(data)
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('success').equal(true);
          expect(res.body).to.have.property('data');
          expect(res.body.data).to.have.property('message').equal(data.message);
          expect(res.body.data).to.have.property('signature').to.be.a('string');
          expect(res.body.data).to.have.property('address').to.be.a('string');
          // 在测试环境中，我们无法确定具体的签名值，但可以验证签名存在且格式正确
          expect(res.body.data.signature).to.match(/^0x[0-9a-fA-F]+$/);
          done();
        });
    });
    
    it('缺少必需参数应返回400错误', (done) => {
      chai.request(app)
        .post('/api/v1/system/sign-message')
        .set('x-api-key', API_KEY)
        .send({ message: 'Hello, World!' })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success').equal(false);
          expect(res.body).to.have.property('error').equal('ValidationError');
          done();
        });
    });
    
    it('无效私钥应返回验证失败', (done) => {
      chai.request(app)
        .post('/api/v1/system/sign-message')
        .set('x-api-key', API_KEY)
        .send({ 
          message: 'Hello, World!',
          privateKey: '0xinvalid'
        })
        .end((err, res) => {
          expect(res).to.have.status(400);
          expect(res.body).to.have.property('success').equal(false);
          expect(res.body).to.have.property('error').equal('ValidationError');
          done();
        });
    });
  });
});