# 智能合约系统 (Smart Contracts)

本目录包含日本房地产代币化平台的所有智能合约。系统基于可升级代理模式设计，实现了房产代币化、交易、收益分配和权限管理等核心功能。

## 合约架构

系统由以下主要合约组成：

```
contracts/
├── RealEstateFacade.sol      # 系统门面合约（统一入口）
├── RealEstateSystem.sol      # 系统核心合约
├── RoleManager.sol           # 角色与权限管理合约
├── PropertyManager.sol       # 房产资产管理合约
├── PropertyToken.sol         # 房产代币合约
├── TradingManager.sol        # 交易管理合约
├── RewardManager.sol         # 收益分配合约
├── SimpleERC20.sol           # 简单ERC20代币（测试用）
└── utils/                    # 工具合约
    └── SafeMath.sol          # 安全数学库
```

## 架构说明

系统采用以下架构模式：

1. **门面模式**：`RealEstateFacade` 作为统一入口，整合所有系统功能
2. **模块化设计**：各功能由专门的合约负责，职责明确
3. **代理升级模式**：所有合约均采用UUPS代理模式，支持升级
4. **权限控制**：基于角色的权限控制，由 `RoleManager` 集中管理

### 合约交互流程

```
用户/应用 → RealEstateFacade → RealEstateSystem → 各功能合约
                                   ↓
                 RoleManager ← 权限检查 → 各功能合约
```

## 主要合约说明

### 1. 门面合约 (RealEstateFacade.sol)

`RealEstateFacade` 是整个系统的统一入口，提供完整的业务逻辑接口。

**主要功能：**
- 房产注册与代币创建
- 交易订单管理
- 奖励分配管理
- 房产状态管理
- 用户资产概览

**关键接口：**
- `registerPropertyAndCreateToken`: 注册房产并创建对应代币
- `createOrder`: 创建代币卖单
- `executeTrade`: 执行交易（购买代币）
- `createDistribution`: 创建奖励分配
- `claimRewards`: 领取奖励

### 2. 系统合约 (RealEstateSystem.sol)

`RealEstateSystem` 是核心系统合约，负责管理系统状态和组件关系。

**主要功能：**
- 系统状态管理
- 紧急状态控制
- 组件地址管理
- 系统升级控制

**关键接口：**
- `getSystemStatus`: 获取系统状态
- `pause/unpause`: 暂停/恢复系统
- `setFacadeAddress`: 设置门面合约地址
- `emergencyShutdown`: 紧急关闭系统

### 3. 角色管理合约 (RoleManager.sol)

`RoleManager` 实现基于角色的权限控制系统。

**主要角色：**
- `ADMIN_ROLE`: 系统管理员，拥有最高权限
- `MANAGER_ROLE`: 业务管理员，负责房产和奖励管理
- `OPERATOR_ROLE`: 运营人员，负责日常操作
- `UPGRADER_ROLE`: 升级管理员，负责合约升级

**关键接口：**
- `hasRole`: 检查地址是否拥有特定角色
- `grantRole`: 授予角色
- `revokeRole`: 撤销角色
- `activateEmergencyMode`: 激活紧急模式

### 4. 房产管理合约 (PropertyManager.sol)

`PropertyManager` 负责管理房产信息和状态。

**主要功能：**
- 房产注册
- 房产状态管理
- 房产估值更新
- 房产代币关联

**关键接口：**
- `registerProperty`: 注册新房产
- `updatePropertyStatus`: 更新房产状态
- `updatePropertyValuation`: 更新房产估值
- `registerTokenForProperty`: 关联房产和代币

**房产状态：**
- `Active`: 活跃状态，可交易
- `Suspended`: 暂停状态，暂停交易
- `Archived`: 存档状态，停止所有操作

### 5. 房产代币合约 (PropertyToken.sol)

`PropertyToken` 是ERC20代币合约，代表房产所有权。

**主要功能：**
- 标准ERC20功能
- 房产所有权代表
- 权限控制的转账
- 代币供应管理

**关键接口：**
- `initialize`: 初始化代币（名称、符号、初始供应量等）
- `mint`: 增发代币
- `burn`: 销毁代币
- `transfer/transferFrom`: 转移代币

### 6. 交易管理合约 (TradingManager.sol)

`TradingManager` 管理代币的交易流程。

**主要功能：**
- 订单创建
- 交易执行
- 订单取消
- 交易费用管理

**关键接口：**
- `createOrder`: 创建卖单
- `executeOrder`: 执行交易
- `cancelOrder`: 取消订单
- `setFeeRate`: 设置交易费率

### 7. 奖励管理合约 (RewardManager.sol)

`RewardManager` 负责管理房产收益分配。

**主要功能：**
- 创建分配
- 计算分配金额
- 奖励提取
- 费用处理

**关键接口：**
- `createDistribution`: 创建新的分配
- `getAvailableDistributionAmount`: 获取可领取金额
- `withdrawDistribution`: 提取分配奖励
- `setPlatformFeeRate`: 设置平台费率

## 合约安全措施

系统实现了多层次的安全保障：

1. **权限控制**：基于角色的权限管理
2. **可暂停操作**：紧急情况下可暂停系统
3. **重入保护**：所有外部调用使用ReentrancyGuard
4. **安全数学库**：使用SafeMath防止溢出
5. **事件记录**：关键操作发出事件，便于监控
6. **紧急模式**：支持紧急操作和资金安全退出

## 开发与部署

### 编译合约

```bash
# 编译所有合约
yarn compile

# 清理缓存并重新编译
yarn hardhat clean && yarn compile
```

### 部署合约

部署使用 `scripts/deploy-step.js` 脚本，按照特定顺序部署所有合约。

```bash
# 本地部署
yarn deploy:local

# 测试网部署
yarn deploy:testnet

# 主网部署
yarn deploy:mainnet
```

### 交互示例

以下是与合约交互的基本示例：

```javascript
// 1. 获取合约实例
const facade = await ethers.getContractAt("RealEstateFacade", facadeAddress);

// 2. 注册房产并创建代币
const tx = await facade.connect(manager).registerPropertyAndCreateToken(
  "PROP001",             // 房产ID
  "日本东京房产",         // 房产名称
  "TKY",                 // 代币符号
  ethers.parseEther("10000"),  // 初始供应量
  propertyTokenImpl      // 代币实现合约地址
);
await tx.wait();

// 3. 创建卖单
await facade.connect(seller).createOrder(
  tokenAddress,           // 代币地址
  ethers.parseEther("100"),  // 出售数量
  ethers.parseEther("0.1")   // 单价
);

// 4. 执行交易
await facade.connect(buyer).executeTrade(
  orderId,                // 订单ID
  { value: ethers.parseEther("10") }  // 支付金额
);

// 5. 创建分配
await facade.connect(manager).createDistribution(
  propertyIdHash,         // 房产ID哈希
  ethers.parseEther("50"),   // 分配金额
  "4月租金收益",           // 描述
  true,                   // 应用费用
  ethers.ZeroAddress      // 支付代币（使用原生代币）
);

// 6. 领取奖励
await facade.connect(investor).claimRewards(distributionId);
```

## 测试

系统有完善的测试套件，包括单元测试、集成测试和端到端测试。

```bash
# 运行所有测试
yarn test

# 运行特定测试文件
yarn hardhat test test/RealEstateFacade.test.js

# 生成测试覆盖率报告
yarn test:coverage
``` 