# 部署和管理脚本 (Deployment and Management Scripts)

## 项目说明

本目录包含日本房地产资产通证化平台系统的部署、管理和实用工具脚本。这些脚本设计用于项目的整个生命周期，从初始部署到持续维护和管理。脚本采用模块化设计，支持多网络部署（本地开发、测试网和主网），并提供完整的日志和报告功能。

### 主要功能

- **智能合约部署**：自动化部署整个系统的合约套件
- **合约升级管理**：支持 UUPS 可升级模式的智能合约升级
- **部署验证**：验证部署是否成功并生成报告
- **权限管理**：设置和管理系统角色权限
- **环境配置**：自动更新环境变量和配置文件

### 技术特点

- **自动化**：脚本自动执行完整的部署流程，减少人为错误
- **可配置性**：通过环境变量和配置文件支持不同的部署环境
- **鲁棒性**：包含全面的错误处理和日志记录
- **可扩展性**：模块化设计，易于添加新的脚本和功能
- **安全性**：部署关键操作需要验证和确认
- **透明性**：生成详细的部署报告和日志

## 系统架构

脚本目录在整个系统架构中扮演部署和管理工具的角色，负责将智能合约部署到区块链网络，并提供持续的管理功能。

```
+---------------------+       +-----------------+       +-------------------+
|                     |       |                 |       |                   |
| 部署和管理脚本(Scripts) +-----> | 智能合约(Contracts) +-----> | 区块链网络(Blockchain) |
|                     |       |                 |       |                   |
+---------------------+       +-----------------+       +-------------------+
           |
           |
           v
+---------------------+       +---------------------+
|                     |       |                     |
| 配置和环境变量(Config) |<-----> | 共享模块(Shared)      |
|                     |       |                     |
+---------------------+       +---------------------+
```

## 合约依赖关系

部署脚本(`deploy-correct.js`)按照以下顺序部署智能合约，确保依赖关系得到正确处理：

```
[1] RealEstateSystem
      |
      v
[2] PropertyManager
      |
      v
[3] TradingManager
      |
      v
[4] RewardManager
      |
      v
[5] PropertyToken
      |
      v
[6] RealEstateFacade
```

1. 首先部署 `RealEstateSystem` 作为系统核心合约
2. 部署 `PropertyManager` 管理房产信息
3. 部署 `TradingManager` 处理交易功能
4. 部署 `RewardManager` 管理收益分配
5. 部署 `PropertyToken` 作为房产通证
6. 最后部署 `RealEstateFacade` 作为系统门面

## 脚本目录结构

```
scripts/
├── deploy-correct.js    # 正确的部署脚本
├── deploy.js           # 原始部署脚本（已废弃）
├── verify.js           # 合约验证脚本
└── README.md           # 本文档
```

## 脚本详解

### 部署脚本 (`deploy-correct.js`)

`deploy-correct.js` 是系统部署的主要脚本，负责按顺序部署所有必要的合约，并设置它们之间的引用关系。

**核心功能：**
- 部署所有系统合约（RealEstateSystem、PropertyManager、TradingManager、RewardManager、PropertyToken、RealEstateFacade）
- 初始化合约参数（交易费率、平台费率、维护费率等）
- 配置合约之间的引用关系和权限设置
- 设置角色权限（ADMIN_ROLE、MANAGER_ROLE、OPERATOR_ROLE）
- 生成部署报告
- 更新环境变量文件

**主要函数：**
- `deploySystemStep()`: 按步骤部署整个系统
- `updateEnvFile()`: 更新环境变量文件
- `generateDeploymentReport()`: 生成部署报告

**使用方法：**

```bash
# 部署到本地网络
yarn hardhat run scripts/deploy-correct.js --network localhost

# 部署到测试网
yarn hardhat run scripts/deploy-correct.js --network testnet

# 部署到主网
yarn hardhat run scripts/deploy-correct.js --network mainnet
```

**参数配置：**
部署脚本通过环境变量配置各种参数，包括：

| 环境变量 | 说明 | 默认值 |
|---------|------|-------|
| `ADMIN_PRIVATE_KEY` | 管理员私钥 | 必填 |
| `MANAGER_PRIVATE_KEY` | 经理私钥 | 必填 |
| `OPERATOR_PRIVATE_KEY` | 操作员私钥 | 必填 |
| `TRADING_FEE_RATE` | 交易费率（基点） | 100 (1%) |
| `PLATFORM_FEE_RATE` | 平台费率（基点） | 500 (5%) |
| `MAINTENANCE_FEE_RATE` | 维护费率（基点） | 200 (2%) |

**输出文件：**
- `.env`: 更新后的环境变量文件
- `deployment-report.txt`: 部署报告

### 验证脚本 (`verify.js`)

`verify.js` 用于验证部署是否成功，它检查各合约状态并验证关键功能。

**核心功能：**
- 验证合约在区块链浏览器上是否已验证
- 检查系统状态和合约关联
- 验证角色配置和权限设置
- 检查各管理器合约状态和配置
- 生成验证报告

**使用方法：**

```bash
# 验证本地网络部署
yarn hardhat run scripts/verify.js --network localhost

# 验证测试网部署
yarn hardhat run scripts/verify.js --network testnet

# 验证主网部署
yarn hardhat run scripts/verify.js --network mainnet
```

## 角色权限说明

### 角色定义

1. **ADMIN_ROLE**
   - 权限级别：最高
   - 主要职责：系统管理、角色分配、合约升级
   - 持有账户：管理员账户

2. **MANAGER_ROLE**
   - 权限级别：高
   - 主要职责：合约管理、参数配置、资产注册
   - 持有账户：经理账户

3. **OPERATOR_ROLE**
   - 权限级别：中
   - 主要职责：业务操作、订单处理、交易执行
   - 持有账户：操作员账户

### 权限验证

部署完成后，脚本会自动验证各角色的权限状态，确保权限正确分配。

## 部署流程

### 1. 环境准备
- 确保已安装所有依赖：`npm install`
- 配置 `.env` 文件，包含以下必要信息：
  ```
  ADMIN_PRIVATE_KEY=你的管理员私钥
  MANAGER_PRIVATE_KEY=你的经理私钥
  OPERATOR_PRIVATE_KEY=你的操作员私钥
  ```

### 2. 部署步骤
1. 部署 RealEstateSystem 系统合约
2. 部署管理合约（PropertyManager、TradingManager、RewardManager）
3. 在系统中授权管理合约
4. 部署 PropertyToken 代币合约
5. 部署 RealEstateFacade 门面合约
6. 配置交易参数
7. 激活系统
8. 设置角色权限

### 3. 部署报告
部署完成后，脚本会生成详细的部署报告，包含：
- 部署时间
- 网络信息
- 合约地址
- 角色账户信息
- 权限验证结果
- 系统状态

## 注意事项

1. **私钥安全**：
   - 私钥通过环境变量管理，不应在代码中硬编码
   - 避免将包含真实私钥的 `.env` 文件提交到版本控制系统
   - 在生产环境使用硬件钱包或密钥管理系统

2. **网络选择**：
   - 始终明确指定网络参数，避免意外部署到错误的网络
   - 先在测试网络验证，再部署到主网

3. **Gas 费用**：
   - 部署和交互需要支付 Gas 费用
   - 确保部署账户有足够的 ETH

4. **合约大小**：
   - 监控合约大小，确保不超过区块链大小限制
   - 考虑使用库合约拆分大型合约

5. **部署报告**：
   - 保存每次部署的报告和日志
   - 记录部署时的合约版本和配置参数

## 常见问题

### 部署失败

**问题：** 部署失败，控制台显示错误。

**解决方案：**
1. 检查网络连接和RPC URL是否正确
2. 确保部署账户有足够的ETH支付Gas费
3. 检查合约代码是否有编译错误
4. 查看日志了解具体错误原因

### 验证合约失败

**问题：** 合约验证失败。

**解决方案：**
1. 确保 `ETHERSCAN_API_KEY` 环境变量正确设置
2. 检查网络是否正确（testnet/mainnet）
3. 确保合约已成功部署
4. 对于复杂合约，可能需要扁平化合约代码

### 权限验证失败

**问题：** 角色权限验证失败。

**解决方案：**
1. 检查角色账户是否正确配置
2. 确保管理员账户有足够的权限
3. 检查合约授权状态
4. 重新运行部署脚本

## 开发规范

### 代码风格

- 使用4空格缩进
- 使用分号结束语句
- 为函数和复杂代码块添加JSDoc注释
- 使用有意义的变量名和函数名
- 保持一致的命名风格（驼峰命名法）

### 错误处理

- 使用 try/catch 捕获异步操作中的错误
- 提供有意义的错误消息
- 记录错误堆栈信息以便调试
- 对关键错误使用不同的处理策略

### 日志记录

- 使用统一的日志工具（如logger对象）
- 记录关键操作的开始和完成
- 记录重要参数和结果
- 使用不同的日志级别（info、warn、error）

## 参考资料

- [Hardhat 文档](https://hardhat.org/hardhat-runner/docs/getting-started)
- [ethers.js 文档 v6](https://docs.ethers.org/v6/)
- [OpenZeppelin Upgrades 插件](https://docs.openzeppelin.com/upgrades-plugins/1.x/)
- [Solidity 文档](https://docs.soliditylang.org/)
- [Etherscan API 文档](https://docs.etherscan.io/)

## 许可证

MIT © 2023-2024 