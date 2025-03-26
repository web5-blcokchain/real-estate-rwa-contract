# Scripts Documentation

## 背景
脚本目录包含了各种自动化工具和部署脚本,用于简化开发、测试和部署流程。这些脚本提供了从合约部署到系统维护的完整工具链。

## 目录结构
```
scripts/
├── deploy/            # 部署相关脚本
│   ├── deploy-network.sh    # 网络部署脚本
│   └── deploy-unified.js    # 统一部署脚本
├── verify/            # 验证相关脚本
│   ├── verify-contracts.js  # 合约验证脚本
│   └── verify-deployment.js # 部署验证脚本
├── upgrade/           # 升级相关脚本
├── test/             # 测试相关脚本
├── config/           # 配置相关脚本
└── README.md         # 文档说明
```

## 核心脚本

### 1. 部署脚本 (deploy/)

#### deploy-network.sh
网络部署脚本,用于在不同网络上部署合约:

```bash
#!/bin/bash

# 设置网络参数
NETWORK=$1
RPC_URL=$2
PRIVATE_KEY=$3

# 部署合约
npx hardhat run scripts/deploy-unified.js --network $NETWORK \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

#### deploy-unified.js
统一部署脚本,处理合约部署和初始化:

```javascript
async function main() {
  // 部署合约
  const propertyRegistry = await deployPropertyRegistry();
  const tokenFactory = await deployTokenFactory();
  
  // 初始化合约
  await initializeContracts(propertyRegistry, tokenFactory);
  
  // 保存部署信息
  await saveDeploymentInfo({
    propertyRegistry: propertyRegistry.address,
    tokenFactory: tokenFactory.address
  });
}
```

### 2. 验证脚本 (verify/)

#### verify-contracts.js
合约验证脚本,用于在区块浏览器上验证合约:

```javascript
async function verifyContracts() {
  const contracts = [
    {
      name: 'PropertyRegistry',
      address: process.env.PROPERTY_REGISTRY_ADDRESS,
      constructorArguments: []
    },
    {
      name: 'TokenFactory',
      address: process.env.TOKEN_FACTORY_ADDRESS,
      constructorArguments: []
    }
  ];

  for (const contract of contracts) {
    await verifyContract(contract);
  }
}
```

#### verify-deployment.js
部署验证脚本,检查合约部署状态:

```javascript
async function verifyDeployment() {
  // 检查合约地址
  const addresses = await loadDeploymentInfo();
  
  // 验证合约代码
  for (const [name, address] of Object.entries(addresses)) {
    const code = await provider.getCode(address);
    if (code === '0x') {
      throw new Error(`Contract ${name} not deployed`);
    }
  }
}
```

### 3. 升级脚本 (upgrade/)

#### upgrade-contracts.js
合约升级脚本,处理合约升级流程:

```javascript
async function upgradeContracts() {
  // 部署新合约
  const newImplementation = await deployNewImplementation();
  
  // 升级代理
  await upgradeProxy(newImplementation);
  
  // 验证升级
  await verifyUpgrade();
}
```

### 4. 测试脚本 (test/)

#### run-tests.js
测试运行脚本,执行测试套件:

```javascript
async function runTests() {
  // 运行单元测试
  await runUnitTests();
  
  // 运行集成测试
  await runIntegrationTests();
  
  // 生成测试报告
  await generateTestReport();
}
```

## 配置管理

### 1. 环境变量
```env
# 网络配置
NETWORK=hardhat
RPC_URL=http://localhost:8545
CHAIN_ID=1337

# 账户配置
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_PRIVATE_KEY=0x...

# 合约配置
PROPERTY_REGISTRY_ADDRESS=0x...
TOKEN_FACTORY_ADDRESS=0x...
```

### 2. 部署配置
```javascript
const deploymentConfig = {
  networks: {
    hardhat: {
      rpcUrl: 'http://localhost:8545',
      chainId: 1337
    },
    sepolia: {
      rpcUrl: process.env.SEPOLIA_RPC_URL,
      chainId: 11155111
    }
  },
  contracts: {
    PropertyRegistry: {
      constructor: [],
      upgradeable: true
    },
    TokenFactory: {
      constructor: [],
      upgradeable: true
    }
  }
};
```

## 使用说明

### 1. 部署合约
```bash
# 部署到本地网络
pnpm deploy:local

# 部署到测试网
pnpm deploy:sepolia

# 部署到主网
pnpm deploy:mainnet
```

### 2. 验证合约
```bash
# 验证所有合约
pnpm verify:all

# 验证特定合约
pnpm verify:contract PropertyRegistry
```

### 3. 升级合约
```bash
# 升级合约实现
pnpm upgrade:contract PropertyRegistry

# 验证升级
pnpm verify:upgrade PropertyRegistry
```

## 错误处理

### 1. 部署错误
```javascript
async function handleDeploymentError(error) {
  console.error('Deployment failed:', error);
  
  // 尝试回滚
  await rollbackDeployment();
  
  // 保存错误日志
  await saveErrorLog(error);
  
  // 发送通知
  await sendDeploymentNotification(error);
}
```

### 2. 验证错误
```javascript
async function handleVerificationError(error) {
  console.error('Verification failed:', error);
  
  // 重试验证
  await retryVerification();
  
  // 记录失败原因
  await logVerificationFailure(error);
}
```

## 最佳实践

### 1. 脚本组织
- 按功能分类组织脚本
- 使用清晰的命名约定
- 保持脚本独立和可重用

### 2. 错误处理
- 实现优雅的错误处理
- 提供详细的错误信息
- 支持错误恢复机制

### 3. 日志记录
- 记录关键操作
- 保存错误日志
- 生成操作报告

## 维护指南

### 1. 版本控制
- 使用语义化版本
- 记录变更日志
- 维护向后兼容性

### 2. 文档更新
- 及时更新使用说明
- 记录重要决策
- 维护示例代码

### 3. 测试覆盖
- 测试脚本功能
- 验证错误处理
- 确保可靠性

## 常见问题

### 1. 部署问题
- 检查网络连接
- 验证账户余额
- 确认合约参数

### 2. 验证问题
- 检查合约代码
- 验证构造函数参数
- 确认网络设置

### 3. 升级问题
- 检查兼容性
- 验证代理合约
- 确认升级权限 