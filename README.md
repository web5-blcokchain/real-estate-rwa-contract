# 日本房产资产上链系统

这个项目实现了一套完整的房产资产数字化系统，包括房产注册、代币化、交易市场、租金分发以及赎回管理等功能。

## 文档中心

- [完整文档中心](./server/docs/README.md) - 详细的技术和用户文档
- [中文文档导航](./server/docs/文档导航.md) - 项目文档的中文导航
- [后端服务说明](./server/README.md) - 后端服务架构与API说明
- [系统流程图](./docs/系统流程图.md) - 系统组件交互流程图
- [技术文档](./docs/技术文档.md) - 详细技术实现说明
- [FAQ](./docs/FAQ.md) - 常见问题解答
- [修复指南](./docs/修复指南.md) - 常见问题修复方法

## 架构概述

系统由以下主要组件构成：

1. **角色管理 (RoleManager)** - 处理系统中的权限控制
2. **费用管理 (FeeManager)** - 管理各种交易和操作的费用
3. **房产注册 (PropertyRegistry)** - 管理房产信息和状态
4. **代币工厂 (TokenFactory)** - 创建和管理房产代币
5. **市场 (Marketplace)** - 提供代币交易功能
6. **租金分发 (RentDistributor)** - 管理租金收入的分发
7. **赎回管理 (RedemptionManager)** - 处理代币赎回流程
8. **持有者查询 (TokenHolderQuery)** - 提供代币持有者信息查询
9. **系统管理 (RealEstateSystem)** - 整合和管理上述所有组件

## 主要功能

- **房产注册和审批** - 将实物房产信息上链
- **房产代币化** - 将房产转化为可交易的数字资产
- **代币交易** - 通过市场合约买卖房产代币
- **租金分发** - 按持有比例分配租金收入
- **赎回机制** - 允许代币持有者赎回实物房产
- **权限控制** - 多角色管理系统访问权限
- **升级机制** - 支持合约升级和引用修复

## 测试覆盖

项目包含全面的测试套件，涵盖从部署到终止生命周期的各个阶段：

1. **E2EFlow.test.js** - 端到端流程测试，涵盖完整业务流程
2. **RealEstateSystem.test.js** - 系统合约基本功能测试
3. **RealEstateSystem-init.js** - 初始化流程和参数兼容性测试
4. **ManualReferenceUpdate.test.js** - 合约引用修复流程测试
5. **UpgradeScenarios.test.js** - 合约升级场景测试
6. **TokenInteractions.test.js** - 代币交互和功能测试

## 开始使用

### 安装依赖

```bash
npm install
```

### 编译合约

```bash
npx hardhat compile
```

### 运行测试

运行所有测试：

```bash
npx hardhat test
```

运行特定测试：

```bash
npx hardhat test test/E2EFlow.test.js
```

### 部署到测试网

```bash
npx hardhat run scripts/deploy.js --network goerli
```

## 合约升级和维护

系统使用UUPS（Universal Upgradeable Proxy Standard）模式实现可升级性。所有合约都支持以下维护操作：

1. **版本控制** - 每个合约都有版本号
2. **功能升级** - 可以升级合约实现
3. **引用修复** - 可以修复合约间的引用关系
4. **链ID支持** - 支持跨链部署和识别

## 安全考量

- 所有关键操作都需要适当的角色权限
- 使用重入锁保护资金相关操作
- 实现紧急暂停机制
- 支持白名单功能控制代币转账
- 支持代币冻结机制响应紧急情况

## 许可证

MIT 