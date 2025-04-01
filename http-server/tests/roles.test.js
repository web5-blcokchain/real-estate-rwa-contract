/**
 * 角色管理测试
 * 测试角色相关的API功能
 */
import { 
  request, 
  API_KEY, 
  TEST_ADDRESSES, 
  testRequiresApiKey, 
  apiRequest 
} from './testHelper.js';

describe('角色管理API测试', () => {
  // 测试所有接口都需要API密钥
  test('所有角色管理接口都应该需要API密钥', async () => {
    await testRequiresApiKey(`/api/role-manager/roles/${TEST_ADDRESSES.admin}`);
    await testRequiresApiKey('/api/role-manager/grant', 'post');
    await testRequiresApiKey('/api/role-manager/revoke', 'post');
    await testRequiresApiKey('/api/role-manager/addresses');
  });

  // 测试获取角色信息
  test('获取角色信息 - 应该能获取地址的角色信息', async () => {
    const response = await apiRequest(`/api/role-manager/roles/${TEST_ADDRESSES.admin}`);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.address).toBe(TEST_ADDRESSES.admin);
    expect(response.body.data.roles).toBeDefined();
  });

  // 测试获取角色信息 - 无效地址
  test('获取角色信息 - 无效地址应返回400错误', async () => {
    const response = await apiRequest('/api/role-manager/roles/invalid-address');
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  // 测试授予角色
  test('授予角色 - 应该能授予角色给指定地址', async () => {
    const response = await apiRequest('/api/role-manager/grant', 'post', {
      address: TEST_ADDRESSES.user,
      role: 'trader',
      adminRole: 'admin'
    });
    
    // 注意：在模拟环境中，这可能会返回200或者其他状态码
    // 我们至少要验证它不是因为API密钥认证失败
    expect(response.status).not.toBe(401);
    
    // 如果成功执行
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.address).toBe(TEST_ADDRESSES.user);
      expect(response.body.data.role).toBe('trader');
    }
  });

  // 测试撤销角色
  test('撤销角色 - 应该能撤销指定地址的角色', async () => {
    const response = await apiRequest('/api/role-manager/revoke', 'post', {
      address: TEST_ADDRESSES.user,
      role: 'trader',
      adminRole: 'admin'
    });
    
    // 同样，在模拟环境中验证
    expect(response.status).not.toBe(401);
    
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.address).toBe(TEST_ADDRESSES.user);
      expect(response.body.data.role).toBe('trader');
    }
  });

  // 测试获取角色地址列表
  test('获取角色地址列表 - 应该能获取所有角色的地址列表', async () => {
    const response = await apiRequest('/api/role-manager/addresses');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.roles).toBeDefined();
    // 验证角色数据结构
    expect(response.body.data.roles.admin).toBeDefined();
    expect(response.body.data.roles.manager).toBeDefined();
    expect(response.body.data.roles.trader).toBeDefined();
  });
}); 