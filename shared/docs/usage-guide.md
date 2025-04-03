# Shared 模块使用指南

## 目录
1. [模块概述](#模块概述)
2. [安装与配置](#安装与配置)
3. [核心模块使用](#核心模块使用)
4. [工具模块使用](#工具模块使用)
5. [配置管理](#配置管理)
6. [错误处理](#错误处理)
7. [日志管理](#日志管理)
8. [代码生成规范](#代码生成规范)
9. [单元测试规范](#单元测试规范)

## 模块概述

Shared 模块提供了与区块链交互的统一接口，采用了清晰的分层结构设计，确保各个组件之间的职责分离。模块分为三个主要层次：

1. **配置层 (config)**: 负责管理环境变量、网络配置、ABI和合约设置
2. **工具层 (utils)**: 提供通用工具函数和类，如验证、日志记录、错误处理
3. **核心层 (core)**: 提供高级抽象，封装区块链交互的核心功能

## 安装与配置

### 1. 安装依赖

```bash
yarn add @your-org/shared
```

### 2. 环境配置

在项目根目录创建 `.env` 文件：

```env
# 网络配置
NETWORK_TYPE=mainnet|testnet|local
RPC_URL=https://your-rpc-url
CHAIN_ID=1

# 钱包配置
PRIVATE_KEY=your-private-key
MNEMONIC=your-mnemonic

# 合约配置
CONTRACT_ADDRESS=0x...
```

## 安装和引用

将 shared 模块添加到项目中：

```javascript
// 引入整个shared模块
const shared = require('../shared');

// 或者按需引入特定组件
const { Contract, Wallet, Logger } = require('../shared');
```

## 模块分层和职责

### 1. 配置层 (config)

配置层负责处理所有静态配置和环境变量，保持纯粹的数据获取和管理：

```javascript
const { EnvConfig, NetworkConfig, ContractConfig, AbiConfig } = require('../shared');

// 获取环境变量
const networkType = EnvConfig.getNetworkType();

// 获取网络配置
const networkConfig = NetworkConfig.getNetworkSpecificConfig(networkType);

// 获取合约地址
const contractAddress = ContractConfig.getContractAddress('RoleManager');

// 获取合约ABI
const contractConfig = ContractConfig.getContractConfig('RoleManager');
```

#### 主要组件

- **EnvConfig**: 环境变量管理
- **NetworkConfig**: 网络配置管理
- **AbiConfig**: ABI配置管理
- **ContractConfig**: 合约配置管理

### 2. 工具层 (utils)

工具层提供纯函数和通用工具，独立于业务逻辑：

```javascript
const { 
  Logger, 
  Validation, 
  callContractMethod,
  ConfigError 
} = require('../shared');

// 日志记录
Logger.info('操作开始', { method: 'createProperty' });

// 数据验证
if (!Validation.isValidAddress(address)) {
  throw new ConfigError('无效的地址格式');
}

// 合约调用工具
const result = await callContractMethod('PropertyManager', 'getProperty', [propertyId]);
```

#### 主要组件

- **Logger**: 日志记录工具
- **Validation**: 数据验证工具
- **错误类**: 各种专用错误类型
- **合约工具函数**: 便捷的合约交互函数

### 3. 核心层 (core)

核心层提供高级封装，基于配置层和工具层构建：

```javascript
const { Provider, Wallet, Contract } = require('../shared');

// 创建Provider
const provider = await Provider.create();

// 创建钱包
const wallet = await Wallet.create({ 
  keyType: 'ADMIN',
  provider 
});

// 创建合约实例
const contract = await Contract.create({
  contractName: 'PropertyManager',
  signer: wallet
});

// 调用合约方法
const result = await Contract.call(contract, 'getProperty', [propertyId]);

// 发送交易
const tx = await Contract.send(contract, 'createProperty', [propertyData]);
```

#### 主要组件

- **Provider**: 网络连接管理
- **Wallet**: 钱包和账户管理
- **Contract**: 合约交互管理

## 核心模块使用

### 1. Contract 模块

```javascript
// 正确的方式：通过 index.js 导入
const { Contract } = require('../shared/src');

// 创建合约实例
const contract = await Contract.create({
  address: '0x...',
  abi: [...],
  provider: providerInstance,
  signer: signerInstance
});

// 调用合约方法
const result = await Contract.call(contract, 'methodName', [arg1, arg2]);

// 发送交易
const tx = await Contract.send(contract, 'methodName', [arg1, arg2], {
  gasLimit: 100000,
  gasPrice: ethers.utils.parseUnits('10', 'gwei')
});

// 监听事件
Contract.on(contract, 'EventName', (event) => {
  console.log('Event:', event);
});
```

### 2. Provider 模块

```javascript
// 正确的方式：通过 index.js 导入
const { Provider } = require('../shared/src');

// 创建 Provider 实例
const provider = await Provider.create({
  url: 'https://your-rpc-url',
  network: 'mainnet'
});

// 获取区块号
const blockNumber = await Provider.getBlockNumber(provider);

// 获取交易
const tx = await Provider.getTransaction(provider, '0x...');

// 获取余额
const balance = await Provider.getBalance(provider, '0x...');
```

### 3. Wallet 模块

```javascript
// 正确的方式：通过 index.js 导入
const { Wallet } = require('../shared/src');

// 创建钱包实例
const wallet = await Wallet.create({
  privateKey: '0x...',
  provider: providerInstance
});

// 签名消息
const signature = await Wallet.signMessage(wallet, 'message');

// 发送交易
const tx = await Wallet.sendTransaction(wallet, {
  to: '0x...',
  value: ethers.utils.parseEther('1.0')
});
```

## 工具模块使用

### 1. 错误处理

```javascript
// 正确的方式：通过 index.js 导入
const { ErrorHandler } = require('../shared/src');

try {
  // 你的代码
} catch (error) {
  // 统一错误处理
  const handledError = ErrorHandler.handle(error, {
    type: 'contract',
    context: {
      method: 'transfer',
      params: { to: '0x...', amount: '1.0' }
    }
  });
}
```

### 2. 日志记录

```javascript
// 正确的方式：通过 index.js 导入
const { Logger } = require('../shared/src');

// 记录不同级别的日志
Logger.error('错误信息', { error: errorObject });
Logger.warn('警告信息', { data: someData });
Logger.info('信息', { data: someData });
Logger.debug('调试信息', { data: someData });

// 设置日志路径
Logger.setPath('your-module-name');
```

### 3. 参数验证

```javascript
// 正确的方式：通过 index.js 导入
const { Validation } = require('../shared/src');

// 验证地址
Validation.validate(
  Validation.isValidAddress(address),
  '无效的地址格式'
);

// 验证金额
Validation.validate(
  Validation.isValidAmount(amount),
  '无效的金额格式'
);
```

## 配置管理

```javascript
// 正确的方式：通过 index.js 导入
const { EnvConfig } = require('../shared/src');

// 获取网络配置
const networkConfig = EnvConfig.getNetworkConfig();

// 获取合约配置
const contractConfig = EnvConfig.getContractConfig();

// 获取钱包配置
const walletConfig = EnvConfig.getWalletConfig();
```

## 代码生成规范

### 1. 文件命名
- 使用小写字母和连字符
- 示例：`contract-manager.js`, `event-handler.js`

### 2. 目录结构
```
your-module/
├── src/                    # 源代码
│   ├── core/              # 核心功能
│   ├── utils/             # 工具函数
│   ├── config/            # 配置文件
│   └── index.js           # 入口文件
├── tests/                 # 测试文件
└── package.json           # 项目配置
```

### 3. 代码风格
- 使用 ES6+ 语法
- 使用 async/await 处理异步
- 添加完整的 JSDoc 注释
- 遵循单一职责原则

### 4. 错误处理
- 使用 ErrorHandler 统一处理错误
- 添加详细的错误上下文
- 记录错误日志

### 5. 日志记录
- 使用 Logger 模块记录日志
- 设置合适的日志级别
- 添加必要的上下文信息

## 单元测试规范

### 1. 测试文件命名
- 使用 `.test.js` 后缀
- 示例：`contract.test.js`, `wallet.test.js`

### 2. 测试结构
```javascript
const { expect } = require('chai');
const { Contract } = require('../shared/src');

describe('Contract Module', () => {
  describe('create()', () => {
    it('should create contract instance with valid parameters', async () => {
      // 测试代码
    });

    it('should throw error with invalid parameters', async () => {
      // 测试代码
    });
  });
});
```

### 3. 测试覆盖
- 测试正常流程
- 测试边界条件
- 测试错误情况
- 测试异步操作

### 4. 测试数据
- 使用测试专用的配置
- 使用模拟数据
- 清理测试数据

### 5. 测试断言
- 使用 chai 断言库
- 添加详细的错误信息
- 验证返回值和副作用

## 最佳实践

### 遵循模块分层

- **配置层**: 保持纯粹的数据获取与配置管理，不包含业务逻辑
- **工具层**: 提供独立的工具函数，避免依赖特定业务场景
- **核心层**: 使用配置层和工具层构建高级功能，不直接访问环境变量

### 错误处理

始终使用提供的错误类进行错误处理：

```javascript
const { ContractError, TransactionError } = require('../shared');

try {
  const result = await Contract.call(contract, 'getProperty', [propertyId]);
  return result;
} catch (error) {
  if (error instanceof ContractError) {
    Logger.error('合约调用失败', { error: error.message });
    // 处理合约相关错误
  } else {
    throw new TransactionError(`获取属性失败: ${error.message}`);
  }
}
```

### 日志记录

使用统一的日志工具记录关键操作和错误：

```javascript
const { Logger } = require('../shared');

Logger.info('开始处理', { operation: 'createToken', propertyId });
// 执行操作...
Logger.debug('处理完成', { result: 'success', txHash });
```

## 常见用例

### 完整流程示例

以下是一个完整的流程示例，展示了如何使用shared模块创建资产：

```javascript
const { 
  Contract, 
  Wallet, 
  Provider, 
  Logger, 
  ConfigError 
} = require('../shared');

async function createProperty(propertyData) {
  try {
    Logger.info('开始创建资产', { propertyData });
    
    // 创建钱包
    const wallet = await Wallet.create({ keyType: 'ADMIN' });
    
    // 创建合约实例
    const contract = await Contract.create({
      contractName: 'PropertyManager',
      signer: wallet
    });
    
    // 发送交易
    const tx = await Contract.send(contract, 'createProperty', [propertyData]);
    Logger.info('交易已发送', { hash: tx.hash });
    
    // 等待交易确认
    const receipt = await tx.wait();
    Logger.info('资产创建成功', { hash: receipt.hash });
    
    return receipt;
  } catch (error) {
    Logger.error('创建资产失败', { error: error.message, stack: error.stack });
    throw new ConfigError(`创建资产失败: ${error.message}`);
  }
}
```

## 常见问题

### 1. 如何处理网络切换？

在创建Provider或合约实例时指定网络类型：

```javascript
// 创建特定网络的Provider
const provider = await Provider.create({ networkType: 'mainnet' });

// 创建特定网络的合约实例
const contract = await Contract.create({
  contractName: 'PropertyManager',
  networkType: 'mainnet'
});
```

### 2. 如何处理不同环境的合约地址？

使用网络特定的合约地址命名方式：

```
# 测试网合约地址
CONTRACT_ADDRESS_TESTNET_PROPERTY_MANAGER=0x...

# 主网合约地址
CONTRACT_ADDRESS_MAINNET_PROPERTY_MANAGER=0x...
```

然后通过 `ContractConfig.getNetworkSpecificContractAddress()` 获取：

```javascript
const address = ContractConfig.getNetworkSpecificContractAddress('PROPERTY_MANAGER', 'testnet');
```

### 3. 如何监听合约事件？

使用Contract类的listen方法：

```javascript
const filter = Contract.listen(contract, 'PropertyCreated', (event) => {
  Logger.info('新资产创建', { 
    propertyId: event.args.propertyId,
    owner: event.args.owner
  });
});

// 停止监听
Contract.stopListening(contract, filter);
```

## 扩展和贡献

如需扩展shared模块功能，请遵循以下原则：

1. 保持模块分层清晰，不跨层调用
2. 底层模块不依赖高层模块
3. 使用适当的错误处理和日志记录
4. 编写完整的单元测试
5. 更新文档和注释

## 更新日志

### v1.0.0
- 初始版本发布
- 提供核心功能支持
- 添加完整文档

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License 