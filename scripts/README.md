# 部署和管理脚本 (Scripts)

此目录包含系统部署和管理所需的各种脚本，用于智能合约的部署、升级、验证和管理。

## 脚本清单

```
scripts/
├── deploy-step.js           # 主要部署脚本，逐步部署系统各组件
├── verify-deployment.js     # 验证部署是否成功
├── get-implementations.js   # 获取代理合约的实现地址
└── README.md                # 本文档
```

## 主要脚本说明

### 部署脚本 (`deploy-step.js`)

`deploy-step.js` 是系统部署的主要脚本，它按顺序部署所有必要的合约，并设置它们之间的关系。

**功能：**
- 部署所有系统合约（RoleManager、PropertyManager、TradingManager、RewardManager、PropertyToken、System、Facade）
- 初始化合约参数
- 配置合约之间的引用关系
- 生成部署信息和ABI文件
- 导出部署报告

**使用方法：**

```bash
# 部署到本地网络
yarn deploy:local

# 部署到测试网
yarn deploy:testnet

# 部署到主网
yarn deploy:mainnet
```

这些命令分别映射到：

```bash
# 本地部署
yarn hardhat run scripts/deploy-step.js --network localhost

# 测试网部署
yarn hardhat run scripts/deploy-step.js --network testnet

# 主网部署
yarn hardhat run scripts/deploy-step.js --network mainnet
```

**输出：**
- 将部署信息保存到 `config/deployment.json`
- 将ABI信息保存到 `config/abi/` 目录
- 将实现地址保存到 `config/implementations.json`
- 生成部署报告到 `docs/deploy/` 目录

### 验证脚本 (`verify-deployment.js`)

`verify-deployment.js` 验证部署是否成功，检查各合约状态并验证关键功能。

**功能：**
- 验证合约在区块链浏览器上是否已验证
- 检查系统状态
- 验证角色配置
- 检查各管理器合约状态
- 生成验证报告

**使用方法：**

```bash
# 验证测试网部署
yarn verify:testnet

# 验证主网部署
yarn verify:mainnet
```

这些命令分别映射到：

```bash
# 验证测试网部署
yarn hardhat run scripts/verify-deployment.js --network testnet

# 验证主网部署
yarn hardhat run scripts/verify-deployment.js --network mainnet
```

### 获取实现地址脚本 (`get-implementations.js`)

`get-implementations.js` 用于获取所有可升级代理合约的实现地址。

**功能：**
- 获取所有代理合约的实现地址
- 保存实现地址到配置文件
- 显示实现地址信息

**使用方法：**

```bash
yarn hardhat run scripts/get-implementations.js --network testnet
```

## 配置依赖

这些脚本依赖项目的环境配置，主要通过 `shared/src/config/env.js` 获取配置参数。确保在运行脚本前环境变量设置正确：

1. 确保 `.env` 文件包含必要的环境变量
2. 确认相关网络设置在 `hardhat.config.js` 中已正确配置

## 开发指南

### 添加新脚本

添加新脚本的步骤：

1. 在 `scripts/` 目录下创建新的 .js 文件
2. 引入必要的依赖（hardhat、ethers.js等）
3. 引入共享配置和工具函数（`shared/src/config/env.js`等）
4. 添加 `main()` 函数作为入口点
5. 添加错误处理和日志记录
6. 在 `package.json` 中添加对应的命令

示例脚本结构：

```javascript
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const envConfig = require("../shared/src/config/env");
const { logger } = require("../shared/src/logger");

async function main() {
  try {
    logger.info("开始执行脚本...");
    
    // 获取参数
    const params = envConfig.getContractInitParams();
    
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
    logger.error(error);
    process.exit(1);
  });
```

### 修改现有脚本

修改现有脚本时，请确保：

1. 保持向后兼容性
2. 充分测试修改
3. 更新相关文档
4. 遵循项目的错误处理和日志记录规范

## 常见问题

### 部署失败

如果部署失败，检查以下方面：

1. 确认网络连接正常
2. 确保部署账户有足够的代币（ETH或测试币）
3. 检查环境变量和配置参数是否正确
4. 查看日志了解具体错误原因

### 验证合约失败

合约验证失败可能由以下原因导致：

1. 区块链浏览器API密钥无效或过期
2. 网络连接问题
3. 合约编译器版本不匹配
4. 构造函数参数错误

解决方法：
- 检查 `ETHERSCAN_API_KEY` 环境变量
- 确保使用正确的编译器版本
- 手动收集构造函数参数，尝试通过浏览器直接验证

### 获取实现地址失败

如果无法获取实现地址，可能的原因：

1. 合约不是代理合约
2. 合约地址错误
3. 网络连接问题

尝试手动检查透明代理的存储槽来获取实现地址。 