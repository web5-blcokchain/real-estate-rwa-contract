# Shared 区块链交互共享模块

## 简介

Shared 模块是一个全面的区块链交互工具库，提供了与以太坊（Ethereum）兼容区块链进行交互的核心功能。该模块基于 ethers.js 构建，包含以下主要功能：

- **区块链网络连接**：管理与不同网络的连接
- **钱包管理**：创建和管理钱包、签名交易等
- **合约交互**：调用合约方法、发送交易、监听事件等
- **错误处理**：提供统一的错误类型和处理机制
- **工具函数**：提供日志记录、验证、性能监控等辅助功能

本模块设计遵循**低耦合高内聚**原则，各组件之间边界清晰，依赖透明，方便使用和维护。

## 目录结构

```
shared/
├── docs/                  # 文档目录
│   └── usage-guide.md     # 使用指南
├── src/                   # 源代码目录
│   ├── config.js          # 配置模块
│   ├── index.js           # 主入口文件
│   ├── core/              # 核心功能模块
│   │   ├── provider.js    # 网络连接管理
│   │   ├── wallet.js      # 钱包管理
│   │   ├── index.js       # 核心模块入口
│   │   └── contract/      # 合约交互模块
│   │       ├── index.js   # 合约模块入口
│   │       ├── factory.js # 合约创建工厂
│   │       ├── caller.js  # 合约调用管理
│   │       ├── sender.js  # 合约交易发送
│   │       ├── event.js   # 合约事件管理
│   │       └── transaction.js # 交易管理
│   └── utils/             # 工具模块
│       ├── index.js       # 工具模块入口
│       ├── logger.js      # 日志记录工具
│       ├── errors.js      # 错误类型与处理
│       ├── validation.js  # 参数验证工具
│       ├── performance.js # 性能监控工具
│       ├── security.js    # 安全工具
│       └── address.js     # 地址管理工具
└── logs/                  # 日志目录
```

## 安装与配置

### 环境要求

- Node.js 14.x 或更高版本
- ethers.js 6.x

### 安装依赖

```bash
cd shared
npm install
```

### 配置环境变量

创建 `.env` 文件配置环境变量，或直接在系统环境中设置：

```
# 区块链网络配置
BLOCKCHAIN_NETWORK=localhost    # 网络类型：localhost, testnet, mainnet
LOCALHOST_RPC_URL=http://localhost:8545
TESTNET_RPC_URL=https://your-testnet-rpc-url
MAINNET_RPC_URL=https://your-mainnet-rpc-url

# 钱包配置
PRIVATE_KEY_ADMIN=0x...         # 管理员私钥
PRIVATE_KEY_OPERATOR=0x...      # 操作员私钥
PRIVATE_KEY_MANAGER=0x...       # 管理者私钥
PRIVATE_KEY_DEPLOYER=0x...      # 部署者私钥

# 日志配置
LOG_LEVEL=info                  # 日志级别：error, warn, info, debug
LOG_DIR=./logs                  # 日志目录
LOG_MAX_SIZE=10m                # 单个日志文件最大大小
LOG_MAX_FILES=5                 # 保留的日志文件数量
LOG_CONSOLE=true                # 是否同时输出到控制台
```

## 模块架构

Shared 模块采用分层架构，从底层到高层依次为：

1. **工具层 (Utils)**
   - 提供基础工具函数和类
   - 包括日志、错误处理、验证等
   - 独立于业务逻辑，可单独使用

2. **核心层 (Core)**
   - 基于工具层构建
   - 提供与区块链交互的核心功能
   - 包括 Provider、Wallet、Contract 等主要类

3. **配置层 (Config)**
   - 提供统一的配置管理
   - 从环境变量或配置文件加载配置
   - 为各模块提供默认配置

各层级之间依赖关系清晰：上层可以依赖下层，但下层不应依赖上层，避免循环依赖。

## 使用示例

### 基本用法

```javascript
const { Provider, Wallet, Contract } = require('./shared/src');

// 创建Provider连接到区块链网络
const provider = await Provider.create();

// 创建钱包
const adminWallet = await Wallet.createAdmin(provider);

// 输出钱包地址
console.log(`管理员钱包地址: ${await Wallet.getAddress(adminWallet)}`);
```

### 合约交互

```javascript
// 创建合约实例
const tokenContract = await Contract.create(
  adminWallet,
  '0x1234567890123456789012345678901234567890',
  tokenAbi
);

// 只读调用
const balance = await Contract.call(tokenContract, 'balanceOf', [userAddress]);
console.log(`用户余额: ${balance.toString()}`);

// 发送交易
const tx = await Contract.send(
  tokenContract,
  'transfer',
  [recipientAddress, ethers.utils.parseEther('1.0')],
  { autoGasEstimation: true }
);

// 等待交易确认
const receipt = await Contract.waitForTransaction(tx, 2);
console.log(`交易已确认，区块号: ${receipt.blockNumber}`);
```

更多示例请参见 [使用指南](docs/usage-guide.md)。

## API 参考

### Provider

Provider 模块负责与区块链网络建立连接。

```javascript
// 创建Provider
const provider = await Provider.create({
  networkType: 'testnet', // 可选，默认使用环境变量BLOCKCHAIN_NETWORK
  rpcUrl: 'https://custom-rpc-url' // 可选，优先级高于networkType
});

// 获取当前区块号
const blockNumber = await Provider.getBlockNumber(provider);

// 获取网络信息
const network = await Provider.getNetwork(provider);
```

### Wallet

Wallet 模块提供钱包管理功能。

```javascript
// 创建钱包 - 使用环境变量中的私钥
const adminWallet = await Wallet.createAdmin(provider);
const operatorWallet = await Wallet.createOperator(provider);
const managerWallet = await Wallet.createManager(provider);

// 创建指定类型的钱包
const wallet = await Wallet.createFromKeyType('DEPLOYER', provider);

// 直接使用私钥创建钱包
const customWallet = await Wallet.createFromPrivateKey(privateKey, provider);

// 获取钱包地址
const address = await Wallet.getAddress(wallet);

// 获取钱包余额
const balance = await Wallet.getBalance(wallet);
```

### Contract

Contract 模块提供与智能合约交互的功能。

```javascript
// 创建合约实例
const contract = await Contract.create(wallet, address, abi);

// 创建只读合约实例
const readOnlyContract = await Contract.createReadOnly(provider, address, abi);

// 通过名称创建合约实例
const namedContract = await Contract.createFromName('TokenContract', 'testnet', {
  signer: wallet
});

// 调用合约方法（只读）
const result = await Contract.call(contract, 'methodName', [arg1, arg2]);

// 发送合约交易
const tx = await Contract.send(contract, 'methodName', [arg1, arg2], {
  autoGasEstimation: true,
  useEIP1559: true
});

// 监听合约事件
const listenerId = await Contract.listenToEvent(contract, 'Transfer', {
  filter: { from: myAddress },
  callback: (event) => console.log('收到转账事件:', event)
});
```

### 工具类

```javascript
const { Logger, Validation, PerformanceMonitor } = require('./shared/src');

// 日志记录
Logger.info('操作成功', { module: 'myModule', data: result });
Logger.error('操作失败', { module: 'myModule', error });

// 参数验证
Validation.isValidAddress('0x1234...');
Validation.isValidHash('0xabcd...');

// 性能监控
const monitor = new PerformanceMonitor('数据处理');
monitor.start();
// ... 执行操作 ...
const stats = monitor.end();
console.log(`操作耗时: ${stats.duration}ms`);
```

## 错误处理

### 错误层次结构

```
BlockchainError (基类)
├── NetworkError
├── WalletError
├── ContractError
├── TransactionError
├── GasError
├── ConfigError
├── ValidationError
└── LoggerError
```

### 使用示例

```javascript
const { ErrorHandler } = require('./shared/src');

try {
  // 可能抛出错误的代码
} catch (error) {
  // 使用ErrorHandler转换为标准错误
  const handledError = ErrorHandler.handle(error, {
    type: 'contract',
    context: { method: 'transfer' }
  });
  
  // 根据错误类型处理
  if (handledError instanceof ContractError) {
    console.error('合约错误:', handledError.message);
  } else if (handledError instanceof NetworkError) {
    console.error('网络错误:', handledError.message);
  }
  
  // 记录错误日志
  Logger.error(`操作失败: ${handledError.message}`, {
    error: handledError,
    code: handledError.code
  });
}
```

## 最佳实践

### 网络连接管理

1. **优先使用环境变量**：
   ```javascript
   // 推荐 - 使用环境变量配置
   const provider = await Provider.create();
   
   // 不推荐 - 硬编码RPC URL
   const provider = await Provider.create({ rpcUrl: 'http://...' });
   ```

2. **适当的错误处理**：
   ```javascript
   try {
     const provider = await Provider.create();
   } catch (error) {
     if (error instanceof NetworkError) {
       // 处理网络错误
     } else if (error instanceof ConfigError) {
       // 处理配置错误
     }
   }
   ```

### 钱包管理

1. **使用角色特定钱包**：
   ```javascript
   // 推荐 - 使用角色特定钱包
   const adminWallet = await Wallet.createAdmin(provider);
   
   // 不推荐 - 直接使用私钥
   const wallet = await Wallet.createFromPrivateKey('0x...', provider);
   ```

2. **安全处理私钥**：
   - 始终使用环境变量或密钥管理系统存储私钥
   - 避免在代码中硬编码私钥
   - 避免将私钥记录到日志

### 合约交互

1. **读写分离**：
   ```javascript
   // 只读操作使用Provider
   const readOnlyContract = await Contract.createReadOnly(provider, address, abi);
   
   // 写入操作使用Wallet
   const writableContract = await Contract.create(wallet, address, abi);
   ```

2. **等待交易确认**：
   ```javascript
   const tx = await Contract.send(contract, 'method', [args]);
   const receipt = await Contract.waitForTransaction(tx, 2); // 等待2个确认
   ```

3. **自动Gas估算**：
   ```javascript
   const tx = await Contract.send(contract, 'method', [args], {
     autoGasEstimation: true,
     maxFeePerGasMultiplier: 1.2 // 比建议的gas费用高20%
   });
   ```

### 错误处理

1. **使用专用错误类型**：
   ```javascript
   // 推荐
   throw new ContractError(`调用合约失败: ${error.message}`);
   
   // 不推荐
   throw new Error(`调用合约失败: ${error.message}`);
   ```

2. **提供详细上下文**：
   ```javascript
   throw new ContractError(`转账失败`, {
     context: {
       from: sender,
       to: recipient,
       amount: amount.toString(),
       method: 'transfer'
     }
   });
   ```

### 日志记录

1. **按模块分类日志**：
   ```javascript
   // 同一个文件中
   const moduleName = 'WalletService';
   Logger.info('创建钱包', { module: moduleName, address });
   Logger.error('钱包操作失败', { module: moduleName, error });
   ```

2. **结构化日志信息**：
   ```javascript
   // 推荐 - 结构化元数据
   Logger.info('交易已发送', {
     from: wallet.address,
     to: recipient,
     value: amount.toString(),
     txHash: tx.hash
   });
   
   // 不推荐 - 纯文本日志
   Logger.info(`交易已发送: 从${wallet.address}到${recipient}，金额${amount}`);
   ```

## 维护指南 (对开发者和AI)

### 模块扩展原则

1. **保持低耦合高内聚**：
   - 每个文件/类应只有一个明确的职责
   - 模块间通过明确的接口交互，而非共享状态
   - 避免循环依赖

2. **依赖注入**：
   - 依赖应通过参数传入，而非在模块内部创建
   - 例如，Provider应作为参数传给Wallet，而非在Wallet内部创建

3. **接口稳定性**：
   - 公共API应保持向后兼容
   - 使用可选参数实现功能扩展
   - 标记废弃功能，提供迁移路径

### 添加新功能的步骤

1. **确定功能所属模块**：
   - utils/：通用工具，不依赖区块链
   - core/：区块链交互核心功能
   - core/contract/：合约交互特定功能

2. **创建新文件或扩展现有文件**：
   - 如果是全新概念，创建新文件
   - 如果是扩展现有功能，在现有文件中添加

3. **实现功能时注意事项**：
   - 遵循现有代码风格和命名约定
   - 添加JSDoc文档注释说明参数和返回值
   - 实现全面的错误处理
   - 添加适当的日志记录

4. **更新导出**：
   - 在相应的index.js中导出新功能
   - 确保从主模块可访问新功能

5. **更新文档**：
   - 在README.md中添加新功能说明
   - 更新usage-guide.md添加使用示例

### 修改现有功能的步骤

1. **分析影响范围**：
   - 确定哪些模块依赖于此功能
   - 评估向后兼容性影响

2. **遵循变更策略**：
   - 小改进：直接修改实现，保持接口不变
   - 大变更：保留原接口，添加新接口，标记原接口为废弃
   - 破坏性变更：版本号提升，明确记录迁移路径

3. **更新测试**：
   - 确保现有测试仍然通过
   - 为新功能添加测试用例
   - 为修复的Bug添加回归测试

### 代码质量检查

1. **规范一致性**：
   - 遵循一致的代码风格和命名约定
   - 类名使用大驼峰（PascalCase）
   - 方法名和变量使用小驼峰（camelCase）
   - 常量使用大写下划线（UPPER_SNAKE_CASE）

2. **模块职责**：
   - 每个模块应有明确的单一职责
   - 避免"上帝类"或过于庞大的模块

3. **错误处理**：
   - 所有公共方法应有适当的错误处理
   - 使用专用错误类型，而非通用Error
   - 提供有用的错误信息和上下文

4. **异步处理**：
   - 一致使用Promise和async/await
   - 避免混合使用回调和Promise
   - 确保Promise错误被捕获处理

5. **性能考虑**：
   - 注意潜在的性能瓶颈
   - 避免不必要的网络请求
   - 实现合理的缓存策略
   - 大型操作应考虑异步执行

### 错误排查指南

1. **日志检查**：
   - 查看`logs/`目录下的日志文件
   - 错误日志在`logs/*/error.log`中
   - 设置`LOG_LEVEL=debug`获取更详细日志

2. **常见问题**：
   - 网络连接问题：检查RPC URL配置和网络可访问性
   - 私钥问题：检查环境变量是否正确设置
   - 合约交互问题：检查ABI和地址是否匹配
   - Gas问题：检查是否启用自动Gas估算

3. **依赖问题**：
   - 检查ethers.js版本兼容性
   - 检查Node.js版本要求

## 贡献指南

我们欢迎社区贡献，请遵循以下步骤：

1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交修改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

本项目使用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。 