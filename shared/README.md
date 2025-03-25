# 日本房产代币化平台共享模块

## 概述

共享模块是日本房产代币化平台的核心组件，提供了一套统一的工具和配置，用于支持系统的各个部分（脚本、服务器、前端测试等）。该模块设计的目标是提高代码复用性，确保各组件使用一致的接口和数据，降低维护成本。

## 目录结构

```
shared/
├── config/              # 配置管理
│   ├── contracts.js     # 合约地址管理
│   ├── keys.js          # 私钥管理
│   └── index.js         # 配置入口
├── utils/               # 工具模块
│   ├── contractService.js  # 合约服务
│   ├── deployUtils.js   # 部署工具
│   ├── eventListener.js # 事件监听
│   ├── getAbis.js       # ABI管理
│   ├── logger.js        # 日志工具
│   ├── transaction.js   # 交易处理
│   ├── web3Provider.js  # Web3提供者
│   └── index.js         # 工具入口
├── contracts/           # 合约相关
│   ├── abis/            # ABI文件
│   │   ├── PropertyRegistry.json
│   │   ├── TokenFactory.json
│   │   └── ... 
│   └── addresses/       # 合约地址记录
└── README.md            # 文档
```

## 安装与配置

共享模块是项目的内部组件，无需单独安装。但请确保项目依赖已正确安装：

```bash
npm install
# 或
yarn install
```

### 环境变量

共享模块依赖于以下环境变量：

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| RPC_URL | 区块链节点RPC地址 | http://localhost:8545 |
| CHAIN_ID | 区块链网络ID | 31337 (Hardhat默认) |
| LOG_LEVEL | 日志级别 | info |
| MASTER_KEY | 密钥加密主密钥 | - |
| *_ADDRESS | 各合约地址 | - |
| *_PRIVATE_KEY | 各角色私钥 | - |

## 主要模块

### 1. 配置管理 (`config/`)

配置模块管理系统的所有配置项，包括网络设置、合约地址、角色地址等。

#### 使用示例

```javascript
// 导入配置
const config = require('../shared/config');

// 获取合约地址
const marketplaceAddress = config.contractAddresses.marketplace;

// 获取网络配置
const { rpcUrl, chainId } = config.networkConfig;
```

#### 合约地址管理 (`contracts.js`)

```javascript
const { contracts } = require('../shared/config');

// 获取所有合约地址
const addresses = contracts.getContractAddresses();

// 更新合约地址
contracts.updateContractAddress('marketplace', '0x...');

// 保存到部署状态文件
contracts.saveToDeployState();
```

#### 私钥管理 (`keys.js`)

```javascript
const { keys } = require('../shared/config');

// 获取角色私钥
const adminKey = keys.getKey('admin');

// 设置角色私钥
keys.setKey('operator', '0x...');

// 保存私钥到加密文件
keys.saveKeys();
```

### 2. 合约服务 (`utils/contractService.js`)

合约服务管理与区块链合约的交互，提供合约实例创建和调用功能。

#### 使用示例

```javascript
const { contractService } = require('../shared/utils');

// 初始化合约服务
contractService.initialize(contractAddresses);

// 获取合约实例
const roleManager = contractService.getRoleManager();
const marketplace = contractService.getMarketplace('admin'); // 使用admin角色

// 执行合约方法
const tx = await marketplace.createSellOrder(tokenAddress, amount, price);
```

### 3. 交易工具 (`utils/transaction.js`)

提供交易执行和错误处理的工具函数。

#### 使用示例

```javascript
const { transaction } = require('../shared/utils');

// 执行合约交易
const result = await transaction.executeTransaction(
  contract,
  'methodName',
  [param1, param2],
  {
    operation: '创建卖单',
    estimateGas: true,
    safetyMargin: 0.2,
    priority: 'medium'
  }
);

if (result.success) {
  console.log(`交易成功: ${result.transactionHash}`);
} else {
  console.error(`交易失败: ${result.error.message}`);
}
```

### 4. 事件监听 (`utils/eventListener.js`)

管理合约事件的监听和处理。

#### 使用示例

```javascript
const { eventListener } = require('../shared/utils');

// 创建事件监听器
const listenerId = eventListener.createEventListener(
  contract,
  'Transfer',
  (eventData) => {
    console.log(`监听到转账: ${eventData.args.from} -> ${eventData.args.to}, 金额: ${eventData.args.value}`);
  }
);

// 查询历史事件
const events = await eventListener.queryEvents(
  contract,
  'OrderCreated',
  { fromBlock: 0, toBlock: 'latest' }
);

// 等待特定事件
const event = await eventListener.waitForEvent(
  contract,
  'RentDistributed',
  { timeout: 60000 }
);

// 清理监听器
eventListener.removeEventListener(listenerId);
```

### 5. 日志工具 (`utils/logger.js`)

提供统一的日志记录功能。

#### 使用示例

```javascript
const { logger, getLogger } = require('../shared/utils');

// 使用默认日志记录器
logger.info('这是一条信息');
logger.warn('这是一条警告');
logger.error('这是一条错误');

// 创建特定模块的日志记录器
const deployLogger = getLogger('deploy');
deployLogger.info('开始部署...');
```

### 6. Web3提供者 (`utils/web3Provider.js`)

管理与区块链网络的连接。

#### 使用示例

```javascript
const { web3Provider } = require('../shared/utils');

// 获取提供者
const provider = web3Provider.getProvider();

// 获取签名者
const signer = web3Provider.getSigner(privateKey);

// 获取网络信息
const network = await web3Provider.getNetworkInfo();
console.log(`连接到网络: ${network.name} (ID: ${network.chainId})`);

// 测试连接
const connected = await web3Provider.testConnection();
```

### 7. ABI管理 (`utils/getAbis.js`)

管理合约ABI的加载和缓存。

#### 使用示例

```javascript
const { getAbi, initializeAbis } = require('../shared/utils');

// 初始化所有主要合约ABI
initializeAbis();

// 获取特定合约ABI
const roleManagerAbi = getAbi('RoleManager');
```

### 8. 部署工具 (`utils/deployUtils.js`)

提供合约部署和验证的功能。

#### 使用示例

```javascript
const { deployUtils } = require('../shared/utils');

// 部署合约
const result = await deployUtils.deployContract(
  factory, 
  'RoleManager',
  [adminAddress],
  { gasLimit: 4000000 }
);

// 验证合约
await deployUtils.verifyContract(
  contractAddress,
  'RoleManager',
  [adminAddress]
);
```

## 使用最佳实践

### 配置管理

1. **集中配置**: 所有配置都应在 `shared/config` 中定义，避免在代码中硬编码
2. **环境变量**: 敏感信息（如私钥、API密钥）应通过环境变量传入
3. **默认值**: 为所有配置提供合理的默认值，确保在环境变量缺失时系统仍能运行

### 合约交互

1. **使用合约服务**: 始终通过 `contractService` 获取合约实例，避免直接创建
2. **角色管理**: 在调用需要特定权限的合约方法时，指定适当的角色
3. **错误处理**: 使用 `transaction.executeTransaction` 处理交易，以获得统一的错误处理

### 事件处理

1. **清理监听器**: 不再需要时，务必清理事件监听器，避免内存泄漏
2. **事件过滤**: 为事件监听设置适当的过滤条件，避免处理不必要的事件
3. **超时处理**: 使用 `waitForEvent` 时，设置合理的超时时间

### 日志记录

1. **模块化日志**: 为不同模块创建专用的日志记录器
2. **适当级别**: 使用合适的日志级别（info、warn、error、debug）
3. **结构化数据**: 对于复杂数据，使用结构化格式记录

## 排错指南

### 合约交互问题

- **合约地址错误**: 检查合约地址是否正确，确保 `deploy-state.json` 文件存在且有效
- **ABI不匹配**: 确保ABI与合约版本匹配，运行 `npm run update-abis` 更新ABI
- **权限不足**: 确认使用了正确的角色/签名者执行操作
- **Gas不足**: 检查账户余额，或调整Gas限制和价格

### 配置问题

- **环境变量缺失**: 检查 `.env` 文件是否完整，包含所有必要的变量
- **网络配置错误**: 确认 `RPC_URL` 和 `CHAIN_ID` 设置正确
- **私钥问题**: 验证角色私钥是否正确设置

### 日志和调试

- **启用调试日志**: 设置 `LOG_LEVEL=debug` 获取更详细的日志
- **检查日志文件**: 日志文件默认保存在 `logs/` 目录中
- **合约事件**: 使用 `eventListener.queryEvents` 查询历史事件进行调试

## API参考

详细的API文档请参考各模块的JSDoc注释，或使用自动化工具（如JSDoc、TypeDoc）生成完整的API文档。 