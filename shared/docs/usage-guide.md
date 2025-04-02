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

Shared 模块是区块链应用的基础设施，提供以下核心功能：

- 合约交互
- 网络连接
- 钱包管理
- 交易处理
- 事件监听
- 错误处理
- 日志记录
- 配置管理

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

1. **错误处理**
   - 始终使用 ErrorHandler
   - 添加详细的错误上下文
   - 记录错误日志

2. **日志记录**
   - 使用合适的日志级别
   - 添加必要的上下文信息
   - 避免记录敏感信息

3. **配置管理**
   - 使用环境变量
   - 避免硬编码
   - 提供默认配置

4. **代码组织**
   - 遵循模块化原则
   - 保持代码简洁
   - 添加必要注释

5. **测试编写**
   - 编写完整的测试用例
   - 覆盖边界条件
   - 保持测试独立

## 常见问题

1. **如何处理网络错误？**
   ```javascript
   try {
     await Contract.call(contract, 'method', []);
   } catch (error) {
     const handledError = ErrorHandler.handle(error, {
       type: 'network',
       context: { method: 'method' }
     });
     // 处理错误
   }
   ```

2. **如何配置日志路径？**
   ```javascript
   Logger.setPath('your-module-name');
   ```

3. **如何验证参数？**
   ```javascript
   Validation.validate(
     Validation.isValidAddress(address),
     '无效的地址格式'
   );
   ```

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