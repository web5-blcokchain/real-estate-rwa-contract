# 强制部署功能

## 功能概述

本项目添加了强制部署功能，允许用户绕过部署状态检查，强制重新部署所有智能合约。这在以下情况下特别有用：

1. 当合约发生重大更改，需要完全重新部署整个系统时
2. 当部署状态记录与实际区块链状态不一致时
3. 当遇到部署错误如"Contract creation without any data provided"时
4. 当在新的网络上首次部署时

## 实现方式

强制部署功能通过以下方式实现：

1. 修改了`deploy.sh`脚本，增加了`--force`选项
2. 创建了共享部署逻辑模块`shared/utils/deployment-core.js`
3. 更新了`scripts/deploy.js`以支持`FORCE_DEPLOY`环境变量
4. 提供了单独的`force-deploy.js`脚本作为备用选项

## 使用方法

### 使用命令行参数

```bash
# 在本地网络强制部署
./deploy.sh local --force

# 在测试网强制部署并验证合约
./deploy.sh testnet --force --verify

# 在主网强制部署
./deploy.sh mainnet --force
```

### 使用环境变量

你也可以通过直接设置环境变量来启用强制部署：

```bash
export FORCE_DEPLOY=true
./deploy.sh local
```

或者：

```bash
FORCE_DEPLOY=true npx hardhat run scripts/deploy.js --network localhost
```

### 使用专用脚本

在极少数情况下，如果以上方法都不起作用，可以使用专用的强制部署脚本：

```bash
npx hardhat run force-deploy.js --network localhost
```

## 技术细节

### 共享部署逻辑

为了提高代码复用性和可维护性，我们将核心部署逻辑抽取到了`shared/utils/deployment-core.js`模块中，该模块提供以下主要功能：

- `deployLibraries`: 部署库合约
- `deployUpgradeableContract`: 部署可升级合约
- `saveDeploymentRecord`: 保存部署记录
- `generateDeploymentSummary`: 生成部署摘要文档

### 强制部署工作流程

1. 当启用强制部署时，系统会设置`deployConfig.forceRedeploy = true`
2. 这将绕过`deployUtils.js`中的已部署检查逻辑
3. 系统会重新部署所有合约，无论其是否已存在
4. 部署记录中会包含`forceDeployed: true`标记

## 原因分析

在实现强制部署功能时，我们发现了一个问题：大型库合约部署失败并返回"Transaction ran out of gas"错误。通过分析，我们发现这是因为：

1. 库合约SystemDeployerLib1和SystemDeployerLib2非常大，分别有56333字节和48031字节，超过了以太坊的24576字节限制
2. 在部署过程中使用gas估算或gas限制时，会导致库合约部署失败
3. 重构部署逻辑后使用了gas估算，而原始成功部署未使用gas估算，由Hardhat自动处理

## 解决方案

为解决这个问题，我们采用了两种解决方案：

1. 在force-deploy.js中避免使用gas估算和限制
2. 增加了gas预估展示和用户确认功能，让用户可以选择是否继续部署
3. 同时保留了原有的共享部署逻辑，确保代码的可维护性

## 最佳实践

在大型合约部署时，应注意以下几点：

1. 避免使用gas估算，特别是对于接近或超过大小限制的合约
2. 使用优化器并减少runs值（已在hardhat.config.js中设置为1）
3. 启用viaIR和stripRevertStrings等优化选项
4. 对于库合约，尽量拆分为更小的单元
5. 使用`allowUnlimitedContractSize: true`和足够高的`blockGasLimit`

## 注意事项

- 强制部署会消耗更多的gas，因为它会重新部署所有合约
- 在生产环境使用强制部署前，请确保备份旧合约的数据和状态
- 强制部署后，可能需要重新设置合约之间的关系和权限
- 在主网上强制部署前，建议先在测试网上尝试 