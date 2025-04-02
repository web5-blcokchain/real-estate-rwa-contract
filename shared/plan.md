# Shared模块设计计划

## 一、模块定位
Shared模块是一个基础性的区块链操作工具库，为整个系统提供核心功能，包括网络连接管理、钱包管理、合约交互、事件监听、交易管理和Gas管理。

## 二、设计原则
1. 完全可配置，无硬编码
2. 职责单一，功能清晰
3. 接口简单，易于使用
4. 错误处理完善
5. 日志记录完整

## 三、目录结构
```
shared/
├── src/
│   ├── config/               # 配置管理
│   │   ├── index.js          # 配置入口
│   │   ├── env.js            # 环境变量管理
│   │   ├── network.js        # 网络配置管理
│   │   ├── contract.js       # 合约配置管理
│   │   ├── wallet.js         # 钱包配置管理
│   │   ├── abi.js            # ABI配置管理
│   │   └── logger.js         # 日志配置管理
│   ├── core/                 # 核心功能
│   │   ├── provider.js       # 网络连接管理
│   │   ├── wallet.js         # 钱包管理
│   │   ├── contract.js       # 合约管理
│   │   ├── event.js          # 事件管理
│   │   ├── transaction.js    # 交易管理
│   │   └── gas.js            # Gas管理
│   ├── utils/                # 工具函数
│   │   ├── logger.js         # 日志工具
│   │   ├── errors.js         # 错误处理
│   │   └── validation.js     # 参数验证
│   └── index.js              # 模块入口
```

## 四、核心功能设计

### 1. Provider模块
```javascript
class Provider {
  static async create(networkType) {
    const rpcUrl = process.env[`${networkType.toUpperCase()}_RPC_URL`];
    return new ethers.JsonRpcProvider(rpcUrl);
  }
}
```

### 2. Wallet模块
```javascript
class Wallet {
  static async create(role, provider) {
    const privateKey = process.env[`${role}_PRIVATE_KEY`];
    return new ethers.Wallet(privateKey, provider);
  }
}
```

### 3. Contract模块
```javascript
class Contract {
  static async create(contractName, wallet) {
    const address = process.env[`${contractName.toUpperCase()}_ADDRESS`];
    const abi = require(`../../config/abi/${contractName}.json`);
    return new ethers.Contract(address, abi, wallet);
  }
}
```

### 4. Event模块
```javascript
class EventManager {
  constructor(contract) {
    this.contract = contract;
  }

  on(eventName, callback) {
    return this.contract.on(eventName, callback);
  }

  async getPastEvents(eventName, filter) {
    return await this.contract.queryFilter(eventName, filter);
  }
}
```

### 5. Transaction模块
```javascript
class TransactionManager {
  constructor(wallet) {
    this.wallet = wallet;
  }

  async send(tx) {
    return await this.wallet.sendTransaction(tx);
  }

  async wait(txHash, confirmations = 1) {
    return await this.wallet.provider.waitForTransaction(txHash, confirmations);
  }
}
```

### 6. Gas模块
```javascript
class GasManager {
  constructor(provider) {
    this.provider = provider;
  }

  async estimate(contract, method, args) {
    return await contract.estimateGas[method](...args);
  }

  async getPrice() {
    return await this.provider.getGasPrice();
  }
}
```

## 五、使用示例

```javascript
const { 
  Provider,
  Wallet,
  Contract,
  EventManager,
  TransactionManager,
  GasManager
} = require('shared');

async function main() {
  // 1. 创建Provider
  const provider = await Provider.create('testnet');

  // 2. 创建Wallet
  const wallet = await Wallet.create('ADMIN', provider);

  // 3. 创建Contract
  const contract = await Contract.create('PropertyRegistry', wallet);

  // 4. 创建EventManager
  const eventManager = new EventManager(contract);

  // 5. 创建TransactionManager
  const txManager = new TransactionManager(wallet);

  // 6. 创建GasManager
  const gasManager = new GasManager(provider);

  // 7. 使用示例
  const gas = await gasManager.estimate(contract, 'registerProperty', [
    'PROPERTY001',
    '东京',
    1000000
  ]);

  const tx = await txManager.send({
    to: contract.address,
    data: contract.interface.encodeFunctionData('registerProperty', [
      'PROPERTY001',
      '东京',
      1000000
    ]),
    gasLimit: gas
  });

  eventManager.on('PropertyRegistered', (event) => {
    console.log('Property registered:', event);
  });
}
```

## 六、实现步骤

1. **第一阶段：基础架构**
   - 创建目录结构
   - 实现错误处理
   - 实现日志系统
   - 实现参数验证

2. **第二阶段：核心功能**
   - 实现Provider模块
   - 实现Wallet模块
   - 实现Contract模块
   - 实现Event模块
   - 实现Transaction模块
   - 实现Gas模块

3. **第三阶段：优化和完善**
   - 添加单元测试
   - 完善错误处理
   - 优化性能
   - 添加文档

## 七、注意事项

1. 所有配置必须通过环境变量管理
2. 保持代码简洁，避免过度设计
3. 确保错误处理完善
4. 保持日志记录完整
5. 遵循CommonJS规范
6. 确保接口简单易用 