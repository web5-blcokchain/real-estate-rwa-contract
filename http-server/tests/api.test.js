/**
 * API基础测试
 * 测试服务器是否正常运行，API文档是否可访问等基础功能
 */
import { getRequest, API_KEY } from './testHelper.js';

describe('服务器基础功能测试', () => {
  test('健康检查接口应该正常响应', async () => {
    const request = await getRequest();
    const response = await request.get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('Swagger API文档应该可以访问', async () => {
    const request = await getRequest();
    const response = await request.get('/api-docs/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('swagger');
  });

  test('无效路径应该返回404', async () => {
    const request = await getRequest();
    const response = await request.get('/invalid-path');
    expect(response.status).toBe(404);
  });
});

describe('API密钥鉴权测试', () => {
  test('没有API密钥应该被拒绝访问', async () => {
    const request = await getRequest();
    const response = await request.get('/api/role-manager/roles/0x1234');
    expect(response.status).toBe(401);
    expect(response.body.error).toBeTruthy();
  });

  test('无效的API密钥应该被拒绝访问', async () => {
    const request = await getRequest();
    const response = await request.get('/api/role-manager/roles/0x1234?api_key=invalid-key');
    expect(response.status).toBe(401);
    expect(response.body.error).toBeTruthy();
  });

  test('有效的API密钥应该能够访问', async () => {
    const request = await getRequest();
    // 注意：这个测试可能会失败，因为它还需要有效的地址参数
    const response = await request.get(`/api/role-manager/roles/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266?api_key=${API_KEY}`);
    expect(response.status).not.toBe(401); // 至少不是因为API密钥而被拒绝
  });
}); 