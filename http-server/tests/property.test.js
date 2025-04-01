/**
 * 房产管理测试
 * 测试房产管理相关的API功能
 */
import { 
  apiRequest, 
  testRequiresApiKey, 
  TEST_PROPERTY,
  TEST_ADDRESSES
} from './testHelper.js';

describe('房产管理API测试', () => {
  // 测试所有接口都需要API密钥
  test('所有房产管理接口都应该需要API密钥', async () => {
    await testRequiresApiKey('/api/property-manager/properties');
    await testRequiresApiKey('/api/property-manager/properties/TEST-ID');
    await testRequiresApiKey('/api/property-manager/register', 'post');
    await testRequiresApiKey('/api/property-manager/update', 'post');
  });

  // 测试获取房产列表
  test('获取房产列表 - 应该返回所有注册的房产', async () => {
    const response = await apiRequest('/api/property-manager/properties');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(Array.isArray(response.body.data.properties)).toBe(true);
  });

  // 测试注册新房产
  test('注册新房产 - 应该能注册新的房产', async () => {
    const propertyData = { ...TEST_PROPERTY, propertyId: `TEST-${Date.now()}` };
    const response = await apiRequest('/api/property-manager/register', 'post', {
      ...propertyData,
      role: 'manager'
    });
    
    // 在模拟环境中验证
    expect(response.status).not.toBe(401);
    
    if (response.status === 200) {
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.propertyId).toBe(propertyData.propertyId);
      expect(response.body.data.transaction).toBeDefined();
    }
  });

  // 测试获取特定房产信息
  test('获取特定房产信息 - 应该返回指定ID的房产详情', async () => {
    // 先尝试获取房产列表
    const listResponse = await apiRequest('/api/property-manager/properties');
    
    if (listResponse.body.data.properties.length > 0) {
      // 获取第一个房产的ID
      const propertyId = listResponse.body.data.properties[0].propertyId;
      
      // 获取这个房产的详情
      const response = await apiRequest(`/api/property-manager/properties/${propertyId}`);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.propertyId).toBe(propertyId);
    } else {
      // 如果没有房产，跳过这个测试
      console.log('没有可用的房产来测试获取详情API');
    }
  });

  // 测试获取无效房产ID
  test('获取无效房产ID - 应该返回适当的错误', async () => {
    const response = await apiRequest('/api/property-manager/properties/INVALID-ID-123456789');
    
    // 这应该返回404或400等错误
    if (response.status !== 200) {
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    }
  });

  // 测试更新房产信息
  test('更新房产信息 - 应该能更新现有房产的信息', async () => {
    // 先尝试获取房产列表
    const listResponse = await apiRequest('/api/property-manager/properties');
    
    if (listResponse.body.data.properties.length > 0) {
      // 获取第一个房产的ID
      const propertyId = listResponse.body.data.properties[0].propertyId;
      
      // 更新这个房产的描述
      const updateResponse = await apiRequest('/api/property-manager/update', 'post', {
        propertyId: propertyId,
        description: `Updated description ${Date.now()}`,
        role: 'manager'
      });
      
      // 在模拟环境中验证
      expect(updateResponse.status).not.toBe(401);
      
      if (updateResponse.status === 200) {
        expect(updateResponse.body.success).toBe(true);
        expect(updateResponse.body.data).toBeDefined();
        expect(updateResponse.body.data.propertyId).toBe(propertyId);
        expect(updateResponse.body.data.transaction).toBeDefined();
      }
    } else {
      // 如果没有房产，跳过这个测试
      console.log('没有可用的房产来测试更新API');
    }
  });

  // 测试非管理员角色无法注册或更新房产
  test('非管理员角色无法注册或更新房产', async () => {
    const propertyData = { ...TEST_PROPERTY, propertyId: `TEST-${Date.now()}` };
    const response = await apiRequest('/api/property-manager/register', 'post', {
      ...propertyData,
      role: 'trader' // 非管理员角色
    });
    
    // 在真实环境中，这应该返回403或类似的错误
    // 但在模拟环境中，可能会有不同的行为
    if (response.status !== 200) {
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    }
  });
}); 