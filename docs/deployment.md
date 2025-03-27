# 合约部署指南

## 概述

本文档详细介绍了如何使用统一部署系统部署智能合约。该系统支持多种部署策略和网络环境，具有强大的错误处理和配置能力。

## 前置条件

1. 确保已安装Node.js (v14.0.0+)和npm (v6.0.0+)
2. 克隆项目仓库并安装依赖：
   ```bash
   npm install
   ```
3. 配置环境变量（创建`.env`文件）：
   ```
   PRIVATE_KEY=你的钱包私钥
   BSCSCAN_API_KEY=BSCScan API密钥（用于验证合约）
   BSC_TESTNET_URL=BSC测试网RPC URL
   ```

## 部署方法

### 使用部署脚本

最简单的方法是使用部署脚本，它提供了友好的命令行界面：

```bash
# 部署到BSC测试网
./scripts/deploy-network.sh bsc_testnet

# 查看帮助
./scripts/deploy-network.sh --help
```

### 部署选项

部署脚本支持以下选项：

* `--strategy=<策略>`: 选择部署策略（direct、upgradeable、minimal）
* `--dry-run`: 空运行模式，不实际部署
* `--verify`: 部署后验证合约

示例：

```bash
# 使用直接部署策略并验证合约
./scripts/deploy-network.sh bsc_testnet --strategy=direct --verify

# 空运行模式测试
./scripts/deploy-network.sh bsc_testnet --dry-run
```

### 高级用法

如果需要更精细的控制，可以直接使用Hardhat命令：

```bash
# 部署到BSC测试网
npx hardhat run scripts/deploy.js --network bsc_testnet

# 验证合约
npx hardhat run scripts/verify-contracts.js --network bsc_testnet

# 测试部署
npx hardhat run scripts/test/deployment-test.js --network bsc_testnet
```

## 部署策略

系统支持三种部署策略：

1. **直接部署（direct）**：
   - 部署普通合约（非代理）
   - 更快速、成本更低
   - 不支持升级

2. **可升级部署（upgradeable，默认）**：
   - 使用UUPS代理模式
   - 支持无缝升级
   - 适合生产环境

3. **最小化部署（minimal）**：
   - 仅部署核心合约
   - 用于测试环境
   - 节约部署成本

## 支持的网络

* `hardhat`: 本地Hardhat网络（开发使用）
* `localhost`: 本地运行的节点
* `bsc_testnet`: 币安智能链测试网
* `bsc_mainnet`: 币安智能链主网
* `eth_sepolia`: 以太坊Sepolia测试网
* `eth_mainnet`: 以太坊主网

## 部署验证

部署后，可以通过以下方式验证部署是否成功：

```bash
# 运行部署测试
npx hardhat run scripts/test/deployment-test.js --network bsc_testnet
```

测试脚本会验证：
1. 所有必要合约是否已部署
2. 角色权限是否正确设置
3. 合约间关联关系是否符合预期

## 常见问题

### 部署失败

如果部署失败，查看日志获取详细信息：
```bash
cat logs/deploy-yyyy-mm-dd_hh-mm-ss.log
```

常见问题包括：
* 账户余额不足
* Gas费设置不当
* 网络拥堵

### 验证失败

合约验证可能因以下原因失败：
* 区块浏览器API密钥无效
* 网络延迟（尝试稍后手动验证）
* 合约编译版本不匹配

## 自定义部署配置

可以通过修改网络特定配置文件自定义部署配置：
```javascript
// shared/config/networks/bsc_testnet.js
const deploymentConfig = {
  strategy: DeploymentStrategy.UPGRADEABLE,
  options: {
    transaction: {
      gasLimitMultiplier: 2.0
    },
    // 其他选项...
  }
};
```

## 高级开发者

如果需要扩展部署系统，关键模块包括：
* `shared/config/deployment.js`: 部署配置管理
* `shared/utils/deployer.js`: 部署执行器
* `scripts/deploy.js`: 统一部署入口

添加新合约到部署流程，修改部署配置的`deploymentOrder`和`initializeParams`。 