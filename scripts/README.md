# 部署和管理脚本 (Deployment and Management Scripts)

## 项目说明

本目录包含日本房地产资产通证化平台系统的部署、管理和实用工具脚本。这些脚本设计用于项目的整个生命周期，从初始部署到持续维护和管理。脚本采用模块化设计，支持多网络部署（本地开发、测试网和主网），并提供完整的日志和报告功能。

### 主要功能

- **智能合约部署**：自动化部署整个系统的合约套件
- **合约升级管理**：支持透明代理模式的智能合约升级
- **部署验证**：验证部署是否成功并生成报告
- **实现地址管理**：获取和管理代理合约的实现地址
- **开发辅助工具**：生成测试签名、更新控制器等实用工具

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

脚本与项目中的其他组件紧密集成：
- 利用**共享模块**进行区块链交互和配置管理
- 读取**环境变量**自定义部署参数
- 生成**配置文件**供HTTP服务器和其他组件使用
- 提供**验证工具**确保系统正确部署和运行

## 合约依赖关系

部署脚本(`deploy-step.js`)按照以下顺序部署智能合约，确保依赖关系得到正确处理：

```
                      [1] RoleManager
                            |
                            v
      +-------------------+-------------------+
      |                   |                   |
      v                   v                   v
[2] PropertyManager  [3] TradingManager  [4] RewardManager
      |
      v
[5] PropertyToken
      |
      v
[6] RealEstateSystem
      |
      v
[7] RealEstateFacade
```

1. 首先部署 `RoleManager`（角色管理）作为基础权限控制系统
2. 部署功能管理器：`PropertyManager`（房产管理）、`TradingManager`（交易管理）和 `RewardManager`（收益管理）
3. 部署 `PropertyToken`（房产通证）作为通证化基础
4. 部署 `RealEstateSystem`（系统核心）集成各个组件
5. 最后部署 `RealEstateFacade`（系统门面）作为外部交互的统一入口

## 脚本目录结构

```
scripts/
├── deploy-step.js            # 主要部署脚本，逐步部署系统各组件
├── verify-deployment.js      # 验证部署是否成功
├── get-implementations.js    # 获取代理合约的实现地址
├── generate-test-signature.js # 生成测试签名工具
├── update-controllers.js     # 更新控制器文件工具
└── README.md                 # 本文档
```

## 脚本详解

### 部署脚本 (`deploy-step.js`)

`deploy-step.js` 是系统部署的主要脚本，负责按顺序部署所有必要的合约，并设置它们之间的引用关系。

**核心功能：**
- 部署所有系统合约（RoleManager、PropertyManager、TradingManager、RewardManager、PropertyToken、System、Facade）
- 初始化合约参数（交易费率、平台费率、维护费率等）
- 配置合约之间的引用关系和权限设置
- 生成部署信息和ABI文件
- 导出部署报告
- 更新环境变量文件（可选）
- 部署测试代币（开发环境）

**主要函数：**
- `getContractInitParams()`: 从环境变量获取合约初始化参数
- `verifyContract()`: 在区块链浏览器上验证合约代码
- `deployTestToken()`: 部署测试代币（开发/测试环境）
- `deploySystemStep()`: 按步骤部署整个系统
- `updateEnvFile()`: 更新环境变量文件
- `getImplementationAddresses()`: 获取代理合约的实现地址
- `generateDeploymentReport()`: 生成部署报告

**使用方法：**

```bash
# 部署到本地网络
yarn deploy:local

# 部署到测试网
yarn deploy:testnet

# 部署到主网
yarn deploy:mainnet
```

**参数配置：**
部署脚本通过环境变量配置各种参数，包括：

| 环境变量 | 说明 | 默认值 |
|---------|------|-------|
| `TRADING_FEE_RATE` | 交易费率（基点） | 100 (1%) |
| `TRADING_FEE_RECEIVER` | 交易费接收地址 | 0x0 |
| `PLATFORM_FEE_RATE` | 平台费率（基点） | 500 (5%) |
| `MAINTENANCE_FEE_RATE` | 维护费率（基点） | 200 (2%) |
| `REWARD_FEE_RECEIVER` | 收益费接收地址 | 0x0 |
| `MIN_DISTRIBUTION_THRESHOLD` | 最小分配阈值 | 0.01 |
| `TOKEN_FACTORY_NAME` | 代币工厂名称 | "Token Factory" |
| `TOKEN_FACTORY_SYMBOL` | 代币工厂符号 | "TF" |
| `TOKEN_FACTORY_INITIAL_SUPPLY` | 代币工厂初始供应量 | "0" |

**输出文件：**
- `config/deployment.json`: 记录所有合约地址
- `config/abi/`: 包含所有合约ABI的目录
- `config/implementations.json`: 记录所有代理合约的实现地址
- `docs/deployment/`: 包含部署报告的目录

### 验证脚本 (`verify-deployment.js`)

`verify-deployment.js` 用于验证部署是否成功，它检查各合约状态并验证关键功能。

**核心功能：**
- 验证合约在区块链浏览器上是否已验证
- 检查系统状态和合约关联
- 验证角色配置和权限设置
- 检查各管理器合约状态和配置
- 生成验证报告

**使用方法：**

```bash
# 验证测试网部署
yarn verify:testnet

# 验证主网部署
yarn verify:mainnet
```

### 获取实现地址脚本 (`get-implementations.js`)

`get-implementations.js` 用于获取所有可升级代理合约的实现地址，方便合约升级和验证。

**核心功能：**
- 获取所有代理合约的实现地址
- 保存实现地址到配置文件
- 显示实现地址信息
- 验证实现合约的完整性

**使用方法：**

```bash
# 获取本地网络的实现地址
yarn hardhat run scripts/get-implementations.js --network localhost

# 获取测试网的实现地址
yarn hardhat run scripts/get-implementations.js --network testnet

# 获取主网的实现地址
yarn hardhat run scripts/get-implementations.js --network mainnet
```

### 生成测试签名工具 (`generate-test-signature.js`)

`generate-test-signature.js` 是一个实用工具，用于生成测试钱包、签名和消息，便于开发和测试。

**核心功能：**
- 创建随机测试钱包
- 生成测试消息和签名
- 验证签名有效性
- 输出测试数据，可直接用于开发

**使用方法：**

```bash
# 生成测试签名
node scripts/generate-test-signature.js
```

**输出示例：**

```
测试钱包地址: 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
测试私钥: 0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e
测试消息: Hello, World!
测试签名: 0x14280e5885a19f60e536de50097e5e3c46064245d90...(略)
恢复的地址: 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199
签名验证: 成功

测试数据:
const testWallet = {
  address: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
  privateKey: '0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e',
  message: 'Hello, World!',
  signature: '0x14280e5885a19f60e536de50097e5e3c46064245d90...(略)'
};
```

### 更新控制器工具 (`update-controllers.js`)

`update-controllers.js` 用于批量更新HTTP服务器控制器中的代码，特别是将旧版合约服务替换为新版区块链服务。

**核心功能：**
- 自动替换控制器中的服务引用
- 更新方法调用形式
- 批量处理多个控制器文件
- 提供变更日志和报告

**主要替换内容：**
1. `contractService` → `blockchainService` 模块引用
2. `contractService.createContractInstance` → `blockchainService.createContract`
3. `contractService.callMethod` → `blockchainService.callContractMethod`
4. `contractService.sendTransaction` → `blockchainService.sendContractTransaction`

**使用方法：**

```bash
# 更新控制器文件
node scripts/update-controllers.js
```

## 系统所需版本

脚本运行依赖以下技术栈：

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0 （推荐使用 Yarn >= 1.22.19）
- **Hardhat**: 2.20.1
- **ethers.js**: v6.0.0
- **dotenv**: ^16.0.0
- **fs-extra**: ^11.0.0

## 开发环境搭建

### 前置条件

1. 安装 Node.js (>=18.0.0) 和 npm/Yarn
2. 安装 Git 和基本开发工具
3. 熟悉 JavaScript 和区块链基础知识

### 安装步骤

1. 克隆仓库：

```bash
git clone <仓库地址>
cd japan-rwa
```

2. 安装依赖：

```bash
# 使用 Yarn
yarn install

# 或使用 npm
npm install
```

3. 配置环境变量：

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填写必要信息
# - 区块链节点 RPC URL
# - 部署钱包私钥
# - Etherscan API密钥（用于验证）
# - 合约初始化参数
```

## 快速起步

### 部署系统

```bash
# 启动本地区块链节点（如果需要）
yarn start:node

# 部署到本地网络
yarn deploy:local

# 检查部署输出
cat config/deployment.json
```

### 部署完整流程示例

下面是一个完整的部署和验证流程示例：

```bash
# 1. 确保配置了正确的环境变量
nano .env

# 2. 启动本地区块链节点（仅本地测试时需要）
yarn start:node

# 3. 部署系统
yarn deploy:local

# 4. 查看部署信息
cat config/deployment.json

# 5. 获取实现地址
yarn hardhat run scripts/get-implementations.js --network localhost

# 6. 验证部署
yarn hardhat run scripts/verify-deployment.js --network localhost
```

## 项目测试

脚本可以通过以下方式进行测试：

```bash
# 在本地网络测试部署脚本
yarn deploy:local

# 测试验证脚本
yarn hardhat run scripts/verify-deployment.js --network localhost

# 测试签名生成工具
node scripts/generate-test-signature.js
```

## 项目部署

### 部署到测试网

1. 配置 `.env` 文件中的测试网参数：
   - `RPC_URL_TESTNET`
   - `PRIVATE_KEY_DEPLOYER`
   - `ETHERSCAN_API_KEY`
   - 其他必要参数

2. 部署合约：

```bash
yarn deploy:testnet
```

3. 验证合约：

```bash
yarn verify:testnet
```

### 部署到主网

1. 配置 `.env` 文件中的主网参数：
   - `RPC_URL_MAINNET`
   - `PRIVATE_KEY_DEPLOYER`
   - `ETHERSCAN_API_KEY`
   - 其他必要参数

2. 部署合约（建议先在测试网验证）：

```bash
yarn deploy:mainnet
```

3. 验证合约：

```bash
yarn verify:mainnet
```

## 常见命令

下表列出了与脚本相关的最常用命令：

| 命令 | 说明 |
|------|------|
| `yarn deploy:local` | 部署到本地网络 |
| `yarn deploy:testnet` | 部署到测试网 |
| `yarn deploy:mainnet` | 部署到主网 |
| `yarn verify:testnet` | 验证测试网部署 |
| `yarn verify:mainnet` | 验证主网部署 |
| `node scripts/generate-test-signature.js` | 生成测试签名 |
| `node scripts/update-controllers.js` | 更新控制器文件 |

## 二次开发建议

### 添加新脚本

添加新脚本的步骤：

1. 在 `scripts/` 目录下创建新的 .js 文件
2. 引入必要的依赖（hardhat、ethers.js等）
3. 引入共享配置和工具函数（`../shared/src/config/env.js`等）
4. 添加 `main()` 函数作为入口点
5. 添加错误处理和日志记录
6. 在 `package.json` 中添加对应的命令

**示例脚本结构：**

```javascript
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// 日志工具
const logger = {
  info: (message, ...args) => console.log(`INFO: ${message}`, ...args),
  warn: (message, ...args) => console.warn(`WARN: ${message}`, ...args),
  error: (message, ...args) => console.error(`ERROR: ${message}`, ...args)
};

async function main() {
  try {
    logger.info("开始执行脚本...");
    
    // 获取签名者
    const [deployer] = await ethers.getSigners();
    logger.info("使用账户:", deployer.address);
    
    // 脚本逻辑...
    
    logger.info("脚本执行完成");
  } catch (error) {
    logger.error("脚本执行失败:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 修改现有脚本

修改现有脚本时，请确保：

1. 保持向后兼容性，避免破坏现有功能
2. 充分测试修改，验证所有功能正常
3. 更新相关文档和注释
4. 遵循项目的错误处理和日志记录规范
5. 注意处理特殊情况和边界条件

### 脚本开发最佳实践

1. **错误处理**：使用 try/catch 捕获错误，提供有用的错误信息
2. **参数验证**：验证所有输入参数的有效性
3. **日志记录**：记录关键步骤和决策点的信息
4. **异步处理**：正确使用 async/await 处理异步操作
5. **配置外部化**：使用环境变量而非硬编码配置
6. **模块化**：将重复的功能抽取成可重用的函数
7. **进度反馈**：为长时间运行的脚本提供进度反馈
8. **清理资源**：确保资源（文件句柄等）在脚本结束时被正确释放

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

## FAQ

### 部署失败

**问题：** 部署失败，控制台显示错误。

**解决方案：**
1. 检查网络连接和RPC URL是否正确
2. 确保部署账户有足够的ETH支付Gas费
3. 检查合约代码是否有编译错误
4. 查看日志了解具体错误原因

如果遇到 `Error: Transaction reverted without a reason string` 错误，可能是因为：
- 构造函数参数类型不匹配
- 初始化函数中的逻辑错误
- Gas不足

### 验证合约失败

**问题：** 合约验证失败。

**解决方案：**
1. 确保 `ETHERSCAN_API_KEY` 环境变量正确设置
2. 检查网络是否正确（testnet/mainnet）
3. 确保合约已成功部署
4. 对于复杂合约，可能需要扁平化合约代码

手动验证方法：
```bash
yarn hardhat verify --network testnet CONTRACT_ADDRESS CONSTRUCTOR_ARG1 CONSTRUCTOR_ARG2
```

### 获取实现地址失败

**问题：** 无法获取代理合约的实现地址。

**解决方案：**
1. 确保合约是使用代理模式部署的
2. 检查合约地址是否正确
3. 确认网络连接正常

可以使用`get-implementations.js`脚本手动获取：
```bash
yarn hardhat run scripts/get-implementations.js --network testnet
```

### 升级合约

**问题：** 如何升级已部署的合约？

**解决方案：**
1. 创建新的实现合约
2. 使用Hardhat的upgrades插件部署升级

```javascript
const { ethers, upgrades } = require("hardhat");

async function main() {
  const NewImplementation = await ethers.getContractFactory("NewImplementation");
  const upgraded = await upgrades.upgradeProxy(PROXY_ADDRESS, NewImplementation);
  console.log("合约升级完成:", await upgraded.getAddress());
}

main();
```

## 开发规范

### 代码风格

- 使用4空格缩进
- 使用分号结束语句
- 为函数和复杂代码块添加JSDoc注释
- 使用有意义的变量名和函数名
- 保持一致的命名风格（驼峰命名法）

### 注释规范

- 使用JSDoc格式为函数添加注释
- 函数注释应包括功能描述、参数和返回值
- 为复杂逻辑添加行内注释
- 保持注释的更新，与代码变更同步

示例：
```javascript
/**
 * 部署系统合约
 * @param {Signer} signer - 部署者签名者对象
 * @returns {Object} 包含所有部署合约地址的对象
 */
async function deploySystemStep(signer) {
  // 函数实现...
}
```

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