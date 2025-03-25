const { contractAddresses, networkConfig } = require('../../shared/config');

// 测试账户配置
const testAccounts = {
  admin: process.env.ADMIN_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  operator: process.env.OPERATOR_PRIVATE_KEY || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  finance: process.env.FINANCE_PRIVATE_KEY || '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  user: process.env.USER_PRIVATE_KEY || '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
};

// 测试配置
const testConfig = {
  // 测试超时时间
  timeout: 30000,
  // 是否显示详细日志
  verbose: process.env.TEST_VERBOSE === 'true',
  // 测试数据
  testData: {
    // 房产测试数据
    property: {
      id: 'TEST-PROP-001',
      name: '测试房产',
      location: '东京都新宿区',
      price: ethers.utils.parseEther('100'),
      tokenSymbol: 'RETTOK',
      tokenName: 'Real Estate Test Token',
      totalSupply: ethers.utils.parseEther('100'),
    },
    // 代币测试数据
    token: {
      amount: ethers.utils.parseEther('10'),
      price: ethers.utils.parseEther('1'),
    },
    // 租金测试数据
    rent: {
      amount: ethers.utils.parseEther('5'),
    }
  }
};

module.exports = {
  contractAddresses,
  networkConfig,
  testAccounts,
  testConfig
}; 