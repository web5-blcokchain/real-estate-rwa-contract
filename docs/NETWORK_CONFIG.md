# 网络配置系统

本项目使用统一的网络配置管理方式，直接从`hardhat.config.js`读取所有区块链网络配置，以避免配置重复和不一致。

## 配置原则

1. **单一配置源**：所有网络配置均从`hardhat.config.js`读取，不再需要在`.env`文件中重复定义网络URL、链ID等信息
2. **环境隔离**：只需在`.env`文件中设置`DEPLOY_NETWORK`环境变量，指定要使用的网络名称即可
3. **配置一致性**：确保所有组件（合约部署、服务器、监控等）使用相同的网络配置

## 使用方法

### 1. 在`.env`中配置目标网络

只需设置`DEPLOY_NETWORK`变量，指定要使用的网络：

```
DEPLOY_NETWORK=bsc_testnet
```

支持的网络名称与`hardhat.config.js`中定义的网络名称一致，例如：
- `hardhat` - 本地开发网络
- `bsc_testnet` - BSC测试网
- `bsc_mainnet` - BSC主网

### 2. 在`hardhat.config.js`中配置网络参数

所有网络参数都在`hardhat.config.js`中统一配置：

```javascript
networks: {
  hardhat: {
    chainId: 31337,
    allowUnlimitedContractSize: true,
    port: 8546
  },
  bsc_mainnet: {
    url: MAINNET_RPC_URL,
    accounts: [PRIVATE_KEY],
    chainId: 56,
    gasPrice: 5000000000 // 5 Gwei
  },
  bsc_testnet: {
    url: TESTNET_RPC_URL,
    accounts: [PRIVATE_KEY],
    chainId: 97,
    gasPrice: 10000000000 // 10 Gwei
  }
}
```

### 3. 在代码中使用网络配置

```javascript
// 引入配置管理器
const { configManager } = require('./shared/config');

// 初始化（必须先调用）
await configManager.initialize();

// 获取当前网络配置
const networkConfig = configManager.getNetworkConfig();
// 或直接获取特定属性
const chainId = configManager.getChainId();
const rpcUrl = configManager.getRpcUrl();

// 获取Hardhat原始配置（如需要）
const hardhatConfig = configManager.getHardhatNetworkConfig();
```

## 特殊处理

1. **Hardhat网络**：本地网络自动处理，会自动设置URL为`http://127.0.0.1:端口号`
2. **区块浏览器URLs**：根据网络名称自动设置相应的区块浏览器URL
3. **原生代币**：根据网络类型自动配置原生代币信息

## 扩展配置

如需添加新的网络，只需在`hardhat.config.js`的`networks`部分添加新网络配置即可，系统会自动识别并加载。 