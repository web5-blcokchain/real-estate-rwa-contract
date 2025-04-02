# Shared Blockchain Module

## 目录
1. [项目概述](#项目概述)
2. [目录结构](#目录结构)
3. [核心功能](#核心功能)
4. [使用说明](#使用说明)
5. [开发规范](#开发规范)
6. [测试规范](#测试规范)
7. [部署说明](#部署说明)
8. [贡献指南](#贡献指南)

## 项目概述

Shared 模块是区块链应用的基础设施，提供以下核心功能：

- 合约交互：提供统一的合约交互接口
- 网络连接：支持多种网络类型（mainnet/testnet/local）
- 钱包管理：安全的钱包操作和密钥管理
- 交易处理：统一的交易发送和监控
- 事件监听：标准化的事件监听机制
- 错误处理：统一的错误处理机制
- 日志记录：标准化的日志记录系统
- 配置管理：统一的配置管理方案

## 目录结构

```
shared/
├── src/                    # 源代码
│   ├── core/              # 核心功能模块
│   │   ├── contract.js    # 合约交互
│   │   ├── provider.js    # 网络连接
│   │   ├── wallet.js      # 钱包管理
│   │   ├── gas-manager.js # Gas 管理
│   │   ├── transaction-manager.js # 交易管理
│   │   └── event-manager.js # 事件管理
│   ├── utils/             # 工具模块
│   │   ├── errors.js      # 错误处理
│   │   ├── logger.js      # 日志记录
│   │   └── validation.js  # 参数验证
│   ├── config/            # 配置模块
│   │   ├── env.js         # 环境配置
│   │   ├── abi.js         # ABI 配置
│   │   └── network.js     # 网络配置
│   └── index.js           # 入口文件
├── tests/                 # 测试文件
│   ├── core/             # 核心模块测试
│   ├── utils/            # 工具模块测试
│   └── config/           # 配置模块测试
├── docs/                 # 文档
│   └── usage-guide.md    # 使用指南
└── package.json          # 项目配置
```

## 核心功能

### 1. 合约交互 (Contract)
- 创建合约实例
- 调用合约方法
- 发送交易
- 监听事件

### 2. 网络连接 (Provider)
- 创建网络连接
- 获取区块信息
- 获取交易信息
- 获取账户余额

### 3. 钱包管理 (Wallet)
- 创建钱包实例
- 签名消息
- 发送交易
- 管理私钥

### 4. 工具模块 (Utils)
- 错误处理
- 日志记录
- 参数验证

### 5. 配置管理 (Config)
- 环境配置
- 网络配置
- 合约配置
- 钱包配置

## 使用说明

### 1. 引用模块
```javascript
// 正确的方式：通过 index.js 导入所有模块
const { 
  Contract, 
  Provider, 
  Wallet,
  Logger,
  ErrorHandler,
  Validation,
  EnvConfig
} = require('../shared/src');

// 错误的方式：直接导入内部模块
// const Contract = require('../shared/src/core/contract');
// const Logger = require('../shared/src/utils/logger');
// const EnvConfig = require('../shared/src/config/env');
```

### 2. 使用示例
```javascript
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
const result = await Contract.call(contract, 'methodName', [arg1, arg2]);

// 发送交易
const tx = await Contract.send(contract, 'methodName', [arg1, arg2]);
```

详细的使用说明请参考 [使用指南](docs/usage-guide.md)。

## 开发规范

### 1. 代码规范
- 使用 ES6+ 语法
- 使用 async/await 处理异步
- 添加完整的 JSDoc 注释
- 遵循单一职责原则

### 2. 文件命名
- 使用小写字母和连字符
- 示例：`contract-manager.js`, `event-handler.js`

### 3. 错误处理
- 使用 ErrorHandler 统一处理错误
- 添加详细的错误上下文
- 记录错误日志

### 4. 日志记录
- 使用 Logger 模块记录日志
- 设置合适的日志级别
- 添加必要的上下文信息

### 5. 配置管理
- 使用环境变量
- 避免硬编码
- 提供默认配置

## 测试规范

### 1. 测试文件命名
- 使用 `.test.js` 后缀
- 示例：`contract.test.js`, `wallet.test.js`

### 2. 测试覆盖
- 测试正常流程
- 测试边界条件
- 测试错误情况
- 测试异步操作

### 3. 测试数据
- 使用测试专用的配置
- 使用模拟数据
- 清理测试数据

## 部署说明

1. 安装依赖
```bash
yarn install
```

2. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量
```

3. 运行测试
```bash
yarn test
```

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License