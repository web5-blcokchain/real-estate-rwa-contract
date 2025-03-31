# 简化版房产通证化系统（XG0010）

这是一个简化版的房产通证化系统，通过区块链技术将物理房产转化为数字化代币，并提供交易、赎回和租金分配等功能。

## 系统架构

系统由以下几个主要合约组成：

1. **SimpleRoleManager**：角色权限管理合约，采用基于角色的访问控制（RBAC）模式，实现三个核心角色：
   - ADMIN_ROLE：系统管理员，可以管理其他角色和升级合约
   - MANAGER_ROLE：业务管理员，管理实际业务操作
   - OPERATOR_ROLE：操作员，执行日常操作

2. **PropertyManager**：房产管理合约，负责：
   - 房产注册和信息管理
   - 房产状态跟踪（注册、审批、拒绝等）
   - 房产代币映射

3. **PropertyToken**：房产代币合约，合并了工厂和代币功能：
   - 提供ERC20代币功能表示房产所有权
   - 支持代币铸造、销毁和转账
   - 包含快照机制用于租金分配
   - 工厂模式创建新代币

4. **TradingManager**：交易管理合约，合并了市场和赎回功能：
   - 支持创建和完成代币交易订单
   - 支持代币赎回请求和处理
   - 处理交易费用

5. **RewardManager**：奖励管理合约，合并了租金分配和费用管理功能：
   - 接收和分配租金
   - 管理平台和维护费用
   - 根据代币持有比例分配租金

6. **SimpleRealEstateSystem**：系统主合约，负责：
   - 集成所有子系统
   - 管理系统状态
   - 提供紧急暂停/恢复功能
   - 处理合约升级

7. **SimpleSystemDeployer**：系统部署合约，用于一键部署整个系统

## 核心功能

1. **房产通证化**：允许将房产注册并转化为ERC20代币
2. **代币交易**：支持在平台上买卖房产代币
3. **代币赎回**：允许代币持有者请求赎回为稳定币
4. **租金分配**：按持有比例将房产租金分配给代币持有者
5. **权限管理**：通过RBAC模式实现系统权限控制

## 系统流程

1. 部署系统合约
2. 注册并审批房产
3. 为已审批房产创建代币
4. 用户可以购买代币获得房产所有权
5. 租金收集后自动分配给代币持有者
6. 代币持有者可以请求赎回代币

## 技术特点

- 采用可升级合约模式（UUPS）
- 使用代理模式实现合约升级
- 通过ERC20快照机制公平分配租金
- 完整的事件系统用于链下跟踪
- 紧急暂停机制确保系统安全

## 简化内容

相比原始系统，简化版：

1. 将合约数量从15+合约减少到7个核心合约
2. 角色从8+个简化为3个核心角色
3. 去除了复杂的部署库和外部依赖
4. 简化了房产状态和业务流程
5. 保留了核心功能，维持系统完整性

## 开发和部署

1. 通过SimpleSystemDeployer合约一键部署系统
2. 部署后自动初始化各个合约
3. 使用管理界面进行系统配置和管理

## 其他资源

- [部署总结](scripts/SUMMARY.md)
- [部署详情](scripts/DEPLOYMENT.md)
- [测试策略](scripts/tests/README.md)

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

1. **角色管理 (SimpleRoleManager)** - 处理系统中的权限控制
2. **费用管理 (RewardManager)** - 管理各种交易和操作的费用
3. **房产注册 (PropertyManager)** - 管理房产信息和状态
4. **代币工厂 (PropertyToken)** - 创建和管理房产代币
5. **市场 (TradingManager)** - 提供代币交易功能
6. **租金分发 (RewardManager)** - 管理租金收入的分发
7. **赎回管理 (TradingManager)** - 处理代币赎回流程
8. **持有者查询 (PropertyToken)** - 提供代币持有者信息查询
9. **系统管理 (SimpleRealEstateSystem)** - 整合和管理上述所有组件

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
2. **SimpleRealEstateSystem.test.js** - 系统合约基本功能测试
3. **SimpleRealEstateSystem-init.js** - 初始化流程和参数兼容性测试
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

### 持久化开发环境

项目支持使用持久化的Hardhat节点进行开发，这能保持合约部署状态，提高开发效率：

1. 启动持久化Hardhat节点：

```bash
npx hardhat node
```

2. 部署合约到持久化节点：

```bash
./deploy.sh localhost --strategy=upgradeable
```

3. 验证部署状态：

```bash
npx hardhat run --network localhost scripts/test/deployment-test.js
```

详细使用说明请参阅[持久化节点文档](./docs/persistent-node.md)。

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