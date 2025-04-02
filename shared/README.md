# Shared Module

区块链基础功能模块，提供合约操作、交易管理、事件监听等基础功能。

## 目录结构

```
shared/
├── src/
│   ├── config/     # 配置模块
│   ├── core/       # 核心功能模块
│   ├── utils/      # 工具函数模块
│   └── index.js    # 入口文件
└── README.md       # 文档
```

## 模块说明

### 1. 核心功能模块 (core)

- `Contract`: 合约操作管理
- `Provider`: 区块链节点连接
- `GasManager`: Gas 费用管理
- `TransactionManager`: 交易管理
- `EventManager`: 事件监听
- `Wallet`: 钱包管理

### 2. 配置模块 (config)

- `EnvConfig`: 环境变量配置
- `AbiConfig`: 合约 ABI 配置
- `WalletConfig`: 钱包配置
- `ContractConfig`: 合约配置
- `NetworkConfig`: 网络配置

### 3. 工具函数模块 (utils)

- `Validation`: 数据验证
- `Logger`: 日志管理
- `PerformanceMonitor`: 性能监控
- `SecurityAuditor`: 安全审计
- `ErrorHandler`: 错误处理

## 使用示例

```javascript
const { Contract, Provider, Wallet } = require('shared');

// 创建 Provider 实例
const provider = await Provider.create({
  network: 'testnet',
  rpcUrl: 'http://localhost:8545'
});

// 创建 Wallet 实例
const wallet = await Wallet.create({
  privateKey: process.env.PRIVATE_KEY
});

// 创建 Contract 实例
const contract = await Contract.create({
  address: '0x...',
  abi: [...],
  provider,
  signer: wallet
});

// 调用合约方法
const result = await contract.call('methodName', [arg1, arg2]);

// 发送交易
const tx = await contract.send('methodName', [arg1, arg2]);
```

## 开发规范

1. 代码规范
   - 使用 ES6+ 语法
   - 使用 async/await 处理异步
   - 统一错误处理
   - 完善的注释和文档

2. 测试规范
   - 单元测试覆盖率 > 80%
   - 使用 Mocha/Chai 测试框架
   - 模拟外部依赖

3. 文档规范
   - 使用 JSDoc 注释
   - 保持文档更新
   - 提供使用示例

## 依赖管理

- ethers: ^6.0.0
- winston: ^3.0.0
- mocha: ^10.0.0
- chai: ^4.0.0

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT 