# 日本房地产代币化平台

## 项目概述

日本房地产代币化平台是一个基于区块链技术的房地产资产数字化解决方案。该平台允许房地产所有者将其物业代币化，投资者可以购买这些代币来获得部分所有权和相应的租金收益。

## 重要更新

**2023-03-26**: 完成了项目依赖统一管理 [RW0001](./docs/dev/REFACTOR_README.md) - 所有子模块现在共享根目录的依赖和配置。

**2023-03-26**: 完成了代码改进任务 [XG0002](./docs/dev/XG0002.md) - 解决了多个潜在问题，包括环境变量加载、错误处理、初始化顺序等。

**2023-03-27**: 完成了日志系统优化任务 [XG0003](./docs/dev/XG0003.md) - 统一了日志路径，增强了日志功能，添加了日志轮转和优雅关闭机制。

**2023-03-28**: 完成了监控模块集成任务 [XG0004](./docs/dev/XG0004.md) - 集成监控模块与共享模块，统一了配置管理、ABI获取、区块链连接和事件监听。

**2023-03-30**: 完成服务器模块优化任务 [XG0005](./docs/dev/XG0005.md) - 减少代码冗余，最大化使用共享模块，统一错误处理，并验证了合约接口覆盖。

**2023-04-02**: 完成API性能优化与测试增强任务 [XG0006](./docs/dev/XG0006.md) - 实现了性能监控、多层次缓存策略、统一参数验证框架、速率限制和交易队列管理模块，完成了全面性能测试。

## 主要功能

- 房产登记与审核
- 房产资产代币化
- 代币交易市场
- 自动租金分配
- 实时区块链交易监控
- 支持赎回机制

## 文档中心

- [English Documentation](./server/docs/README.md) - English documentation center
- [中文文档导航](./server/docs/文档导航.md) - 项目文档的中文导航
- [后端服务说明](./server/README.md) - 后端服务架构与API说明
- [技术实施指南](./server/docs/技术实施.md) - 后端与智能合约交互实现细节

### 核心文档

- [系统流程图](./docs/系统流程图.md) - 系统组件交互流程图
- [技术文档](./docs/技术文档.md) - 详细技术实现说明
- [角色功能表](./docs/角色功能表.md) - 系统角色及权限说明

### 用户文档

- [用户手册](./docs/用户手册.md) - 系统操作指南
- [FAQ](./docs/FAQ.md) - 常见问题解答

### 工具与监控

- [区块链事件监控](./monitor/README.md) - 区块链事件监控工具
- [合约状态检查](./monitor/scripts/check-contracts.js) - 检查合约状态的脚本

### 部署与维护

- [开发部署指南](./docs/开发部署指南.md) - 开发环境部署步骤
- [主网部署指南](./docs/主网部署指南.md) - 生产环境部署流程
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

### 环境配置

1. 复制环境变量模板并进行配置：

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，设置必要的环境变量：
   - `DEPLOY_NETWORK` - 部署网络，可选值：`hardhat`、`testnet`、`mainnet`
   - 网络配置（根据您选择的网络设置相应变量）:
     - Hardhat: `HARDHAT_RPC_URL`, `HARDHAT_CHAIN_ID`, `HARDHAT_GAS_PRICE`
     - Testnet: `TESTNET_RPC_URL`, `TESTNET_CHAIN_ID`, `TESTNET_GAS_PRICE`
     - Mainnet: `MAINNET_RPC_URL`, `MAINNET_CHAIN_ID`, `MAINNET_GAS_PRICE`
   - 其他必要的密钥和配置

详细配置说明请参阅 [网络配置文档](./docs/NETWORK_CONFIG.md)。

### 安装依赖

```bash
npm install
```

### 编译合约

```bash
npm run contracts:compile
```

### 启动本地开发环境

1. 启动 Hardhat 节点（本地区块链）：

```bash
npm run hardhat:node
```

2. 在另一个终端窗口部署合约到本地网络：

```bash
npm run contracts:deploy
```

3. 启动开发服务器：

```bash
npm run server:dev
```

或者使用一键启动命令（同时启动 Hardhat 节点和服务器）：

```bash
npm run dev
```

### 运行测试

运行所有测试：

```bash
npm run contracts:test
```

运行特定测试：

```bash
npx hardhat test test/E2EFlow.test.js
```

### 部署到测试网/主网

```bash
# 部署到测试网
npm run contracts:deploy:testnet

# 部署到主网
npm run contracts:deploy:mainnet
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