# 共享模块 (Shared Module)

共享模块包含整个项目中可复用的通用代码，为区块链合约、HTTP服务器以及其他组件提供通用功能。

## 模块结构

```
shared/
├── src/
│   ├── config/           # 配置管理
│   │   ├── env.js        # 环境变量处理
│   │   └── network.js    # 网络配置
│   ├── utils/            # 工具函数
│   │   ├── contract.js   # 合约交互工具
│   │   ├── address.js    # 地址验证和转换工具
│   │   ├── signature.js  # 签名验证工具
│   │   └── validation.js # 数据验证工具
│   └── logger.js         # 日志系统
└── README.md             # 本文档
```

## 功能介绍

### 配置管理 (`src/config/`)

配置管理模块处理环境变量和网络配置，支持多环境部署（开发环境、测试网、主网）。

#### 环境配置 (`env.js`)

环境配置模块负责加载和管理环境变量：

```javascript
// 使用示例
const envConfig = require('../shared/src/config/env');

// 获取基本配置
const apiKey = envConfig.get('API_KEY');
const port = envConfig.getInt('PORT');
const debugMode = envConfig.getBoolean('DEBUG_MODE');
const adminAddresses = envConfig.getArray('ADMIN_ADDRESSES');

// 获取合约初始化参数
const contractParams = envConfig.getContractInitParams();
console.log(contractParams.tokenFactory.name); // 获取 PropertyToken 名称
```

#### 网络配置 (`network.js`)

网络配置模块管理区块链网络连接参数：

```javascript
// 使用示例
const { getNetworkConfig, getCurrentNetwork } = require('../shared/src/config/network');

// 获取当前网络配置
const network = getCurrentNetwork();
console.log(`当前连接网络: ${network.name}, 链ID: ${network.chainId}`);

// 获取特定网络配置
const mainnetConfig = getNetworkConfig('mainnet');
console.log(`主网RPC URL: ${mainnetConfig.rpcUrl}`);
```

### 工具函数 (`src/utils/`)

#### 合约交互工具 (`contract.js`)

提供与智能合约交互的便捷函数，支持部署合约、调用合约方法、监听事件等：

```javascript
const { 
  createPropertyToken, 
  registerTokenForProperty,
  getPropertyTokenInfo 
} = require('../shared/src/utils/contract');

// 部署 PropertyToken 合约
async function deployToken() {
  const params = {
    initialSupply: "1000000",
    name: "Tokyo Property",
    symbol: "TKP",
    owner: ownerAddress,
    manager: managerAddress
  };
  
  const tokenAddress = await createPropertyToken(params);
  console.log(`PropertyToken 已部署到地址: ${tokenAddress}`);
  
  // 注册代币与房产关联
  await registerTokenForProperty(propertyId, tokenAddress, 'admin', 'mainnet');
  
  // 获取代币信息
  const tokenInfo = await getPropertyTokenInfo(tokenAddress);
  console.log(`代币名称: ${tokenInfo.name}, 符号: ${tokenInfo.symbol}`);
}
```

#### 地址验证工具 (`address.js`)

提供与以太坊地址相关的工具函数：

```javascript
const { isValidAddress, normalizeAddress, shortenAddress } = require('../shared/src/utils/address');

// 验证地址
console.log(isValidAddress('0x1234...')); // false

// 规范化地址
const normalized = normalizeAddress('0xabC123...');

// 缩短地址显示
console.log(shortenAddress('0x1234567890123456789012345678901234567890')); // '0x1234...7890'
```

#### 签名验证工具 (`signature.js`)

提供与签名验证相关的工具函数：

```javascript
const { verifySignature, generateMessage } = require('../shared/src/utils/signature');

// 验证签名
const isValid = await verifySignature(address, message, signature);

// 生成消息
const message = generateMessage(account, action, nonce);
```

### 日志系统 (`logger.js`)

提供全应用统一的日志记录功能，支持多级别日志和文件轮替：

```javascript
const { logger } = require('../shared/src/logger');

// 记录不同级别的日志
logger.debug('调试信息', { additionalData: 'some data' });
logger.info('交易已提交', { txHash: '0x123...' });
logger.warn('配置项缺失', { missing: 'API_KEY' });
logger.error('合约调用失败', { error: err.message });
```

## 使用示例

### 部署脚本中使用共享模块

```javascript
// scripts/deploy.js
const { logger } = require('../shared/src/logger');
const envConfig = require('../shared/src/config/env');
const { createPropertyToken } = require('../shared/src/utils/contract');

async function main() {
  try {
    // 获取配置参数
    const config = envConfig.getContractInitParams();
    
    logger.info('开始部署 PropertyToken 合约');
    
    // 部署代币合约
    const tokenAddress = await createPropertyToken({
      initialSupply: config.tokenFactory.initialSupply,
      name: config.tokenFactory.name,
      symbol: config.tokenFactory.symbol,
      owner: deployer.address,
      manager: config.role.adminAddresses[0]
    });
    
    logger.info(`PropertyToken 合约已部署到 ${tokenAddress}`);
    
    // 其他部署步骤...
  } catch (error) {
    logger.error('部署失败', { error: error.message });
    throw error;
  }
}

main();
```

### HTTP 服务中使用共享模块

```javascript
// http-server/src/controllers/tokenController.js
const { logger } = require('../../shared/src/logger');
const { getPropertyTokenInfo } = require('../../shared/src/utils/contract');

// API 处理函数
async function getTokenDetails(req, res) {
  try {
    const { tokenAddress } = req.params;
    
    logger.info('获取代币详情', { tokenAddress });
    
    const tokenInfo = await getPropertyTokenInfo(tokenAddress);
    
    res.json({
      success: true,
      data: tokenInfo
    });
  } catch (error) {
    logger.error('获取代币详情失败', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

## 开发指南

### 安装依赖

共享模块的依赖已包含在项目根目录的 `package.json` 中。

### 添加新功能

1. 在适当的目录创建新文件（如 `src/utils/newFeature.js`）
2. 实现功能并导出必要的函数/对象
3. 在需要的地方导入并使用新功能
4. 更新本文档，说明新增功能的用途和用法

### 测试

共享模块的测试文件位于项目根目录的 `test/shared/` 目录下：

```bash
# 运行共享模块的测试
yarn test test/shared/

# 运行特定测试文件
yarn test test/shared/utils/contract.test.js
``` 