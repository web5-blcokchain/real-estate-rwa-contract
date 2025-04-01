const axios = require('axios');

// 配置
const API_URL = 'http://localhost:3000';
const API_KEY = 'your-api-key'; // 替换为实际的API密钥

// 测试获取角色
async function testGetRoles() {
  const address = '0x1234567890123456789012345678901234567890'; // 替换为实际地址
  
  console.log(`测试获取角色: GET ${API_URL}/api/role-manager/roles/${address}?api_key=${API_KEY}`);
  
  try {
    const response = await axios.get(`${API_URL}/api/role-manager/roles/${address}?api_key=${API_KEY}`);
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('错误:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// 执行测试
(async () => {
  try {
    await testGetRoles();
    console.log('测试完成');
  } catch (error) {
    console.error('测试失败:', error);
  }
})();