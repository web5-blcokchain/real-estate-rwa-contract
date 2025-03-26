# 配置说明文档

## 配置概述

项目配置分为以下几个部分:

1. 环境配置
2. 网络配置
3. 合约配置
4. 测试配置

## 环境配置

### 环境变量

`.env` 文件包含以下配置:

```env
# 网络配置
NETWORK_RPC_URL=https://mainnet.infura.io/v3/your-project-id
NETWORK_CHAIN_ID=1

# 账户配置
ADMIN_PRIVATE_KEY=your-admin-private-key
OPERATOR_PRIVATE_KEY=your-operator-private-key
USER_PRIVATE_KEY=your-user-private-key

# 合约配置
PROPERTY_REGISTRY_ADDRESS=0x...
TOKEN_FACTORY_ADDRESS=0x...
REAL_ESTATE_TOKEN_ADDRESS=0x...

# 测试配置
TEST_NETWORK_RPC_URL=https://goerli.infura.io/v3/your-project-id
TEST_NETWORK_CHAIN_ID=5
```

### 配置加载

使用 `ConfigManager` 加载配置:

```javascript
const configManager = new ConfigManager();
await configManager.initialize();
```

## 网络配置

### 网络定义

`shared/config/networks.js` 定义支持的网络:

```javascript
const networks = {
  mainnet: {
    name: 'mainnet',
    chainId: 1,
    rpcUrl: process.env.NETWORK_RPC_URL,
    // 其他网络配置
  },
  testnet: {
    name: 'testnet',
    chainId: 5,
    rpcUrl: process.env.TEST_NETWORK_RPC_URL,
    // 其他网络配置
  }
};
```

### 网络选择

通过环境变量选择网络:

```javascript
const network = networks[process.env.NETWORK || 'mainnet'];
```

## 合约配置

### 合约地址

`shared/config/contracts.js` 管理合约地址:

```javascript
const contracts = {
  PropertyRegistry: {
    address: process.env.PROPERTY_REGISTRY_ADDRESS,
    abi: require('../abis/PropertyRegistry.json')
  },
  TokenFactory: {
    address: process.env.TOKEN_FACTORY_ADDRESS,
    abi: require('../abis/TokenFactory.json')
  },
  RealEstateToken: {
    address: process.env.REAL_ESTATE_TOKEN_ADDRESS,
    abi: require('../abis/RealEstateToken.json')
  }
};
```

### 合约部署状态

部署状态保存在 `deployments/` 目录:

```javascript
const deployState = {
  network: network.name,
  contracts: {
    PropertyRegistry: {
      address: '0x...',
      deployer: '0x...',
      timestamp: 1234567890
    }
    // 其他合约部署信息
  }
};
```

## 测试配置

### 测试环境

`frontend-tests/config/` 目录包含测试配置:

1. `test.config.js` - 测试主配置
```javascript
module.exports = {
  network: {
    name: 'testnet',
    chainId: 5,
    rpcUrl: process.env.TEST_NETWORK_RPC_URL
  },
  contracts: {
    // 测试合约地址
  },
  accounts: {
    // 测试账户配置
  }
};
```

2. `test.accounts.js` - 测试账户配置
```javascript
module.exports = {
  admin: {
    address: '0x...',
    privateKey: process.env.TEST_ADMIN_PRIVATE_KEY
  },
  operator: {
    address: '0x...',
    privateKey: process.env.TEST_OPERATOR_PRIVATE_KEY
  },
  user: {
    address: '0x...',
    privateKey: process.env.TEST_USER_PRIVATE_KEY
  }
};
```

3. `test.network.js` - 测试网络配置
```javascript
module.exports = {
  name: 'testnet',
  chainId: 5,
  rpcUrl: process.env.TEST_NETWORK_RPC_URL,
  // 其他网络配置
};
```

## 配置管理

### ConfigManager

`shared/config/index.js` 提供统一的配置管理:

```javascript
class ConfigManager {
  constructor() {
    this.networks = null;
    this.contracts = null;
    this.environment = null;
  }

  async initialize() {
    // 加载配置
    this.networks = await loadNetworks();
    this.contracts = await loadContracts();
    this.environment = await loadEnvironment();
  }

  // 获取配置方法
  getNetwork(name) { ... }
  getContract(name) { ... }
  getEnvironment() { ... }
}
```

### 配置验证

使用 `validateConfig` 验证配置:

```javascript
function validateConfig(config) {
  // 验证网络配置
  validateNetwork(config.network);
  
  // 验证合约配置
  validateContracts(config.contracts);
  
  // 验证环境配置
  validateEnvironment(config.environment);
}
```

## 最佳实践

### 1. 配置管理

- 使用环境变量
- 集中管理配置
- 验证配置有效性
- 提供默认值

### 2. 配置安全

- 保护敏感信息
- 使用环境变量
- 加密私钥
- 限制访问权限

### 3. 配置维护

- 版本控制
- 定期更新
- 备份配置
- 监控变更

### 4. 配置测试

- 验证配置
- 测试配置加载
- 检查配置依赖
- 模拟配置错误 