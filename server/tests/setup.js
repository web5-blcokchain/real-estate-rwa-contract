// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // 测试期间减少日志输出
process.env.SERVER_PORT = '3001'; // 使用不同端口避免冲突
process.env.API_KEY = 'test-api-key';

// 模拟区块链配置
process.env.RPC_URL = 'http://localhost:8545';
process.env.CHAIN_ID = '31337';

// 测试账户私钥 (Hardhat默认账户)
process.env.ADMIN_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
process.env.OPERATOR_PRIVATE_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
process.env.FINANCE_PRIVATE_KEY = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a';
process.env.EMERGENCY_PRIVATE_KEY = '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6';

// 合约地址将在测试中进行模拟

// 全局超时时间
jest.setTimeout(10000);

// 全局测试完成后操作
afterAll(async () => {
  // 在这里进行测试后的资源清理工作
}); 