# 合约部署文档

本文档提供了房地产代币化平台智能合约系统的部署指南。系统包括多个智能合约，如RoleManager、PropertyRegistry、TokenFactory等，它们共同协作实现房地产代币化的核心功能。

## 目录

1. [部署要求](#部署要求)
2. [部署架构](#部署架构)
3. [一键部署流程](#一键部署流程)
4. [分步部署流程](#分步部署流程)
5. [部署验证](#部署验证)
6. [测试脚本](#测试脚本)
7. [常见问题排查](#常见问题排查)

## 部署要求

部署前请确保满足以下条件：

- Node.js v16+
- npm v7+
- Hardhat v2.19+
- 配置好的`.env`文件（包含部署账户私钥和网络信息）
- 足够的ETH支付部署和交易费用

## 部署架构

系统采用三层架构设计：

1. **基础层**：保存和管理合约地址和部署状态
2. **核心层**：处理具体的合约部署、升级和验证操作
3. **系统层**：协调多个合约的部署顺序和相互依赖关系

部署流程按照以下顺序：

1. 部署库合约（SystemDeployerLib1, SystemDeployerLib2）
2. 部署基础合约（RoleManager, FeeManager, PropertyRegistry等）
3. 部署RealEstateToken实现合约
4. 更新TokenFactory指向代币实现
5. 验证全部部署是否成功

## 一键部署流程
先要编译，编译之后会自动更新：shared/contracts/abis.js  文件，全局统一使用这个

```


```

为了简化部署过程，我们提供了一键部署命令，它会自动完成所有必要的部署步骤，包括代币实现合约的部署和配置：

```bash
# 启动hardhat节点
# 如何避免 Hardhat 本地节点数据丢失？
# 如果你希望 Hardhat Network 重启后仍然保留合约和链上数据，可以使用 Hardhat # # Node 的持久存储模式：

npx hardhat node 

````

```bash
# 一键部署并运行测试
npm run contracts:deploy:complete

# 只部署，不运行测试
npm run contracts:deploy:force
```

**一键部署过程**:

1. 部署环境准备：检查网络连接、部署账户和余额
2. 合约系统部署：部署所有合约并设置初始化参数
3. 部署代币实现合约：部署RealEstateToken实现并配置TokenFactory
4. 部署验证：确认所有合约都已正确部署和配置
5. 运行集成测试（如果启用）：验证系统功能正常
6. 生成部署记录

部署完成后，所有合约地址会保存在以下文件中：
- `scripts/deploy-state.json`
- `shared/deployments/contracts.json`
- `shared/deployments/{network}-latest.json`

注意：测试脚本可能在Hardhat测试环境中由于各种原因失败，特别是业务流程测试。这通常不影响实际部署的合约有效性，可以单独运行验证脚本进行确认。

## 分步部署流程

如果需要更细粒度的控制，可以使用分步部署方式：

### 1. 部署基本合约系统

```bash
npm run contracts:deploy
```

这会部署所有核心合约，但此时TokenFactory的实现地址仍为零地址，无法创建代币。

### 2. 部署代币实现合约

```bash
npm run contracts:deploy:token-impl
```

这个步骤会：
- 部署RealEstateToken实现合约
- 更新TokenFactory指向该实现合约
- 保存更新后的配置到部署状态文件

### 3. 验证部署结果

```bash
npm run contracts:verify:deployment
```

验证包括：
- 合约存在性验证
- 系统引用验证
- 角色设置验证
- 关键合约设置（如TokenFactory实现地址）验证

## 部署验证

系统提供了多种验证机制确保部署成功：

```bash
# 验证部署结果
npm run contracts:verify:deployment

# 验证合约地址加载
npm run contracts:test:contracts-loading

# 验证基本功能
npm run contracts:test:basic
```

验证过程会检查：

- 所有合约是否成功部署
- 合约之间的引用关系是否正确
- 角色和权限是否正确配置
- TokenFactory实现地址是否正确设置
- 基本业务流程是否可以执行

## 测试脚本

系统包含多种测试脚本验证功能正常：

```bash
# 部署验证测试
npm run contracts:test:deployment

# 基础功能测试
npm run contracts:test:basic

# 业务流程测试
npm run contracts:test:business

# 完整业务流程测试
npm run contracts:test:business-flow

# 合约加载测试
npm run contracts:test:contracts-loading

# 测试流程
npm run contracts:test:flow

# 运行所有基本测试
npm run contracts:test:all
```

## 常见问题排查

### TokenFactory无法创建代币

**症状**：调用TokenFactory的createToken方法失败

**解决方法**：
1. 验证代币实现地址是否已设置：`npm run contracts:verify:deployment`
2. 如果未设置，执行：`npm run contracts:deploy:token-impl`
3. 再次验证确认更新成功

### 部署验证失败

**症状**：`npm run contracts:verify:deployment`显示验证失败

**解决方法**：
1. 检查失败的具体验证项
2. 如果是TokenFactory实现地址问题，执行代币实现部署
3. 如果是角色问题，确认部署账户拥有正确的权限
4. 如果是合约引用问题，可能需要重新部署系统

### 合约地址加载失败

**症状**：HTTP服务器或测试脚本无法识别合约地址

**解决方法**：
1. 确认部署状态文件存在：`scripts/deploy-state.json`
2. 验证合约地址加载：`npm run contracts:test:contracts-loading`
3. 检查`shared/config/contracts.js`的加载逻辑是否正确

### 业务流程测试失败

**症状**：业务流程测试失败，显示交易错误

**解决方法**：
1. 确认所有合约正确部署和配置
2. 检查测试账户是否有足够的权限和余额
3. 查看具体错误消息，针对性解决

---

## 部署脚本说明

主要部署脚本位于`scripts/`目录下：

- `deploy-with-new-architecture.js`: 主部署脚本，支持一键部署
- `deploy-token-implementation.js`: 部署代币实现合约
- `verify-deployment.js`: 验证部署结果

部署脚本使用了模块化设计，核心逻辑位于`shared/utils/`目录：

- `deployment-state.js`: 管理部署状态
- `deployment-core.js`: 核心部署功能
- `deployment-system.js`: 系统级部署协调

通过这种分层设计，使部署过程更加可靠和可维护。 