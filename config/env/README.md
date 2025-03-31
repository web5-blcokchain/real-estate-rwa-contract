# 环境配置文件说明

本文档描述了项目中使用的环境变量配置。所有配置项都应在 `.env` 文件中定义。

## 必需配置项

### 网络配置
- `HARDHAT_CHAIN_ID`: Hardhat 网络链 ID (必需，数字)
- `TESTNET_CHAIN_ID`: 测试网链 ID (必需，数字)
- `MAINNET_CHAIN_ID`: 主网链 ID (必需，数字)
- `TESTNET_RPC_URL`: 测试网 RPC URL (必需，字符串)
- `MAINNET_RPC_URL`: 主网 RPC URL (必需，字符串)

### 账户配置
- `DEPLOYER_PRIVATE_KEY`: 部署者私钥 (必需，字符串)

### Etherscan 配置
- `ETHERSCAN_API_KEY`: Etherscan API 密钥 (必需，字符串)
- `TESTNET_ETHERSCAN_URL`: 测试网 Etherscan URL (必需，字符串)
- `MAINNET_ETHERSCAN_URL`: 主网 Etherscan URL (必需，字符串)

### 合约初始化参数
#### 角色管理
- `ADMIN_ADDRESSES`: 管理员地址列表 (必需，地址数组)
- `MANAGER_ADDRESSES`: 经理地址列表 (必需，地址数组)
- `OPERATOR_ADDRESSES`: 操作员地址列表 (必需，地址数组)

#### 交易管理
- `TRADING_FEE_RECEIVER`: 交易费接收地址 (必需，地址)
- `TRADING_FEE_RATE`: 交易费率 (必需，数字，基点)
- `MIN_TRADE_AMOUNT`: 最小交易金额 (必需，数字)

#### 奖励管理
- `REWARD_FEE_RECEIVER`: 奖励费接收地址 (必需，地址)
- `PLATFORM_FEE_RATE`: 平台费率 (必需，数字，基点)
- `MAINTENANCE_FEE_RATE`: 维护费率 (必需，数字，基点)
- `MIN_DISTRIBUTION_THRESHOLD`: 最小分配阈值 (必需，数字)
- `SUPPORTED_PAYMENT_TOKENS`: 支持的支付代币列表 (必需，地址数组)

#### 代币配置
- `MIN_TRANSFER_AMOUNT`: 最小转账金额 (必需，数字)

#### 系统配置
- `SYSTEM_START_PAUSED`: 系统启动时是否暂停 (必需，布尔值)

#### 代币工厂配置
- `TOKEN_FACTORY_NAME`: 代币工厂名称 (必需，字符串)
- `TOKEN_FACTORY_SYMBOL`: 代币工厂符号 (必需，字符串)
- `TOKEN_FACTORY_INITIAL_SUPPLY`: 代币工厂初始供应量 (必需，数字)

#### 房产管理配置
- `PROPERTY_COUNTRY`: 房产所在国家 (必需，字符串)
- `PROPERTY_METADATA_URI`: 房产元数据 URI (必需，字符串)

## 可选配置项

### Gas 配置
- `GAS_LIMIT`: Gas 限制 (可选，数字，默认: 5000000)
- `GAS_PRICE`: Gas 价格 (可选，数字，默认: 50000000000)

### 服务器配置
- `PORT`: 服务器端口 (可选，数字，默认: 3000)
- `HOST`: 服务器主机 (可选，字符串，默认: "localhost")

### 监控配置
- `MONITORING_ENABLED`: 是否启用监控 (可选，布尔值，默认: false)
- `MONITORING_INTERVAL`: 监控间隔 (可选，数字，默认: 60000)

### 合约配置
- `CONTRACT_VERIFY`: 是否验证合约 (可选，布尔值，默认: true)
- `BLOCK_CONFIRMATIONS`: 区块确认数 (可选，数字，默认: 5)
- `UPGRADE_DELAY`: 升级延迟 (可选，数字，默认: 86400)
- `EMERGENCY_DELAY`: 紧急延迟 (可选，数字，默认: 300)
- `MAX_UPGRADE_ATTEMPTS`: 最大升级尝试次数 (可选，数字，默认: 3)

### 业务配置
- `MIN_PROPERTY_VALUE`: 最小房产价值 (可选，数字)
- `MAX_PROPERTY_VALUE`: 最大房产价值 (可选，数字)
- `MIN_TRADING_FEE`: 最小交易费 (可选，数字)
- `MAX_TRADING_FEE`: 最大交易费 (可选，数字)
- `MIN_REWARD`: 最小奖励 (可选，数字)
- `MAX_REWARD`: 最大奖励 (可选，数字)

## 环境特定配置

项目支持以下环境特定的配置文件：
- `development.env`: 开发环境配置
- `testnet.env`: 测试网环境配置
- `mainnet.env`: 主网环境配置

每个环境特定的配置文件可以覆盖基础 `.env` 文件中的配置项。环境特定的配置文件中的配置项优先级高于基础配置文件。

## 配置验证

系统会在启动时验证所有必需的配置项。如果缺少任何必需的配置项，系统将抛出错误并停止启动。可选配置项如果未设置，将使用默认值。

## 配置更新

当更新配置时，请确保：
1. 更新所有环境特定的配置文件
2. 更新本文档
3. 测试配置更改
4. 记录配置更改历史

## 安全注意事项

1. 永远不要在代码中硬编码私钥或 API 密钥
2. 确保 `.env` 文件已添加到 `.gitignore` 中
3. 使用环境变量或安全的密钥管理系统存储敏感信息
4. 定期轮换私钥和 API 密钥
5. 限制对配置文件的访问权限 