# 网络配置管理 (XG0007)

本文档介绍项目中的网络配置管理机制，确保所有组件使用统一的网络配置源。

## 设计原则

1. **单一配置源**: 所有网络配置均从 `.env` 文件读取，确保配置一致性
2. **配置统一**: 所有组件（hardhat, 服务器, 监控等）使用相同的配置源
3. **灵活性**: 支持多种网络环境，包括本地开发，测试网和主网
4. **默认值**: 提供合理的默认值，但允许用户覆盖

## 网络配置项

每个区块链网络配置包含以下属性:

| 属性 | 说明 | 示例 |
|------|------|------|
| chainId | 区块链网络ID | 56 (BSC主网) |
| url/rpcUrl | RPC节点URL | https://bsc-dataseed.binance.org/ |
| gasPrice | Gas价格 (wei) | 5000000000 (5 Gwei) |
| accounts | 部署账户私钥数组 | [私钥1, 私钥2] |

## 支持的网络

目前支持以下网络:

1. **hardhat** - 本地开发测试网
2. **bsc_testnet** - BSC测试网
3. **bsc_mainnet** - BSC主网

## 配置方式

### 1. 环境变量配置

在 `.env` 文件中配置:

```
# 部署网络选择
DEPLOY_NETWORK=bsc_testnet

# Hardhat本地网络
HARDHAT_RPC_URL=http://127.0.0.1:8545
HARDHAT_CHAIN_ID=31337
HARDHAT_GAS_PRICE=50000000000

# 测试网
TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
TESTNET_CHAIN_ID=97
TESTNET_GAS_PRICE=10000000000

# 主网
MAINNET_RPC_URL=https://bsc-dataseed.binance.org/
MAINNET_CHAIN_ID=56
MAINNET_GAS_PRICE=5000000000

# 区块链扫描器API密钥
ETHERSCAN_API_KEY=your-etherscan-api-key-here

# 部署账户私钥
DEPLOYER_PRIVATE_KEY=your_private_key_here
```

### 2. 在代码中使用

```javascript
// 获取当前配置的网络
const { configManager } = require('./shared/config');
const networkConfig = configManager.getNetworkConfig();

// 使用网络配置
console.log(`当前网络: ${networkConfig.name}`);
console.log(`链ID: ${networkConfig.chainId}`);
console.log(`RPC URL: ${networkConfig.rpcUrl}`);
```

## 添加新网络

要添加新的网络支持，需要:

1. 在 `.env.example` 文件中添加新网络的环境变量
2. 在 `hardhat.config.js` 中添加新网络配置
3. 在 `shared/config/networks.js` 中添加新网络的初始化方法

例如，添加Polygon网络:

```javascript
// 在.env文件中
POLYGON_MAINNET_RPC_URL=https://polygon-rpc.com/
POLYGON_MAINNET_CHAIN_ID=137
POLYGON_MAINNET_GAS_PRICE=30000000000

// 在NetworkConfigManager中添加初始化方法
_initPolygonMainnet() {
  const rpcUrl = getEnvVar('POLYGON_MAINNET_RPC_URL', 'https://polygon-rpc.com/');
  const chainId = parseInt(getEnvVar('POLYGON_MAINNET_CHAIN_ID', '137'));
  const gasPrice = parseInt(getEnvVar('POLYGON_MAINNET_GAS_PRICE', '30000000000'));
  
  this.networks.polygon_mainnet = {
    rpcUrl,
    chainId,
    // ... 其他配置
  };
}
```

## 最佳实践

1. 不要在代码中硬编码网络参数，始终从configManager获取
2. 使用环境变量的默认值，确保即使没有设置也能正常工作
3. 添加新网络时，确保在所有相关组件中同步更新 

## 常见问题与故障排查

### 1. 服务器无法连接到区块链网络

如果遇到服务器启动时报错 "Failed to initialize blockchain connection"，请检查：

1. 确认已设置正确的环境变量，特别是 `DEPLOY_NETWORK` 和相应网络的 RPC URL
2. 对于Hardhat网络，确保已运行本地节点：`npm run hardhat:node`
3. 对于测试网和主网，检查RPC URL可访问性和账户余额

### 2. 网络切换问题

当需要在不同网络间切换时：

1. 修改 `.env` 文件中的 `DEPLOY_NETWORK` 值
2. 确保已配置目标网络的所有必要参数
3. 重启应用以使配置生效

查看更多故障排查指南，请参考[系统故障排查指南](./故障排查.md)。 