# 部署脚本使用指南

本文档介绍智能合约部署系统的使用方法和文件结构。

## 目录结构

```
scripts/
├── deploy.sh              # 主部署脚本
├── deploy.js              # 部署执行脚本
├── setup-roles.js         # 角色设置脚本
├── verify.js              # 合约验证脚本
├── test/                  # 测试脚本目录
│   └── deployment-test.js # 部署测试脚本
├── upgrade/               # 合约升级脚本目录
├── config/                # 部署配置目录
└── utils/                 # 工具函数目录
```

## 快速入门

使用一个命令完成部署、角色设置和测试：

```bash
# 部署到本地网络
./deploy.sh local --strategy=upgradeable

# 部署到测试网
./deploy.sh testnet --verify

# 部署到主网
./deploy.sh mainnet --verify
```

## 部署流程

简化的部署流程包括以下步骤：

1. **合约部署**：部署所有必要的合约
2. **角色设置**：自动为部署者授予系统角色
3. **部署验证**：测试部署结果以确保一切正常
4. **合约验证**（可选）：在区块链浏览器上验证合约代码

## 命令参数

### deploy.sh

```bash
./deploy.sh <network> [options]
```

#### 网络参数

- `local`: 部署到本地开发网络
- `testnet`: 部署到测试网
- `mainnet`: 部署到主网

#### 选项

- `--strategy=<策略>`: 部署策略（direct、upgradeable、minimal）
- `--verify`: 部署后验证合约
- `--help`: 显示帮助信息

## 单独执行各个步骤

如果需要单独执行某个部署步骤，可以直接运行相应的脚本：

```bash
# 仅部署合约
npx hardhat run scripts/deploy.js --network localhost

# 仅设置角色
npx hardhat run scripts/setup-roles.js --network localhost

# 仅测试部署
npx hardhat run scripts/test/deployment-test.js --network localhost

# 仅验证合约
npx hardhat run scripts/verify.js --network localhost
```

## 持久化开发环境

使用持久化的Hardhat节点进行开发时，建议按以下步骤操作：

1. 启动持久化节点：
   ```bash
   npx hardhat node
   ```

2. 部署合约到本地节点：
   ```bash
   ./deploy.sh local
   ```

详细说明请参阅[持久化节点文档](../docs/persistent-node.md)。

## 注意事项

- 部署到主网前，请确保在测试网上充分测试
- 主网部署会要求确认，以防止意外部署
- 部署记录会保存在`deployments/`目录下
- 每次部署都会生成一个带时间戳的记录文件和一个`{network}-latest.json`文件

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