# 智能合约系统 (Smart Contracts)

本目录包含日本房地产代币化平台的所有智能合约。系统基于可升级代理模式设计，实现了房产代币化、交易、收益分配和权限管理等核心功能。

## 合约架构

系统由以下主要合约组成：

```
contracts/
├── RealEstateFacade.sol      # 系统门面合约（统一入口）
├── RealEstateSystem.sol      # 系统核心合约
├── PropertyManager.sol       # 房产资产管理合约
├── PropertyToken.sol         # 房产代币合约
├── PropertyTokenFactory.sol  # 房产代币工厂合约
├── TradingManager.sol        # 交易管理合约
├── RewardManager.sol         # 收益分配合约
├── SimpleERC20.sol           # 简单ERC20代币（测试用）
├── RoleConstants.sol         # 角色常量定义
└── utils/                    # 工具合约
    ├── RoleConstants.sol     # 角色常量定义（公共）
    └── SafeMath.sol          # 安全数学库
```

## 架构说明

系统采用以下架构模式：

1. **门面模式**：`RealEstateFacade` 作为统一入口，整合所有系统功能
2. **模块化设计**：各功能由专门的合约负责，职责明确
3. **代理升级模式**：所有合约均采用UUPS代理模式，支持升级
4. **权限控制**：基于角色的权限控制，由 `RealEstateSystem` 集中管理

### 合约交互流程

```
用户/应用 → RealEstateFacade → RealEstateSystem → 各功能合约
                                   ↓
             权限检查 ← RoleConstants角色定义 → 各功能合约
```

## 角色与权限系统

系统采用基于OpenZeppelin的AccessControl模式实现权限管理，通过`RoleConstants.sol`定义角色常量。每个操作都需要通过`system.validateRole()`进行权限验证，确保只有具备相应权限的地址才能执行特定操作。

### 角色层级结构

系统实现了严格的角色层级结构:

```
DEFAULT_ADMIN_ROLE
    ↓
ADMIN_ROLE (系统管理员)
    ↓
MANAGER_ROLE (业务管理员)
    ↓
OPERATOR_ROLE (运营人员)
```

### 详细权限模型

**ADMIN_ROLE权限**:
- 合约升级管理
- 系统参数配置
- 紧急操作执行
- 角色分配与撤销
- 所有MANAGER和OPERATOR权限

**MANAGER_ROLE权限**:
- 房产状态管理
- 房产估值更新
- 交易规则设置
- 费率调整
- 创建收益分配
- 所有OPERATOR权限

**OPERATOR_ROLE权限**:
- 房产注册
- 代币创建
- 基础数据维护
- 交易指令处理

### 权限验证流程

1. 用户调用`RealEstateFacade`合约的方法
2. 门面合约调用`RealEstateSystem.validateRole()`检查权限
3. 系统合约验证调用地址是否拥有所需角色
4. 验证通过则继续执行，失败则抛出错误并回滚

### 权限分配管理

权限通过以下方式进行管理:
- `grantRole(bytes32 role, address account)`: 授予角色
- `revokeRole(bytes32 role, address account)`: 撤销角色
- `renounceRole(bytes32 role, address account)`: 放弃角色

只有具有DEFAULT_ADMIN_ROLE或ADMIN_ROLE的地址才能管理其他角色。

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
- `createSellOrder`: 创建代币卖单
- `createBuyOrder`: 创建代币买单
- `updatePropertyStatus`: 更新房产状态
- `createDistribution`: 创建奖励分配
- `withdraw`: 提取分红

**主要事件:**
- `PropertyRegistered`: 房产注册成功
- `OrderCreated`: 订单创建成功
- `TradeExecuted`: 交易执行成功
- `DistributionCreated`: 分配创建成功
- `PropertyStatusUpdated`: 房产状态更新

**权限要求:**
- 注册房产: OPERATOR_ROLE或更高权限
- 更新房产状态: MANAGER_ROLE或更高权限
- 创建分配: MANAGER_ROLE或更高权限
- 创建卖单/买单: 任何认证用户

### 2. 系统合约 (RealEstateSystem.sol)

`RealEstateSystem` 是核心系统合约，负责管理系统状态和组件关系，并处理角色权限验证。

**主要功能：**
- 系统状态管理
- 紧急状态控制
- 角色权限管理
- 系统升级控制

**关键接口：**
- `validateRole`: 验证地址是否拥有特定角色
- `pause/unpause`: 暂停/恢复系统
- `grantRole/revokeRole`: 授予/撤销角色
- `checkEmergencyMode`: 检查紧急模式状态

**权限管理方法:**
- `grantRole`: 只能由ADMIN_ROLE调用
- `revokeRole`: 只能由ADMIN_ROLE调用
- `pause/unpause`: 只能由ADMIN_ROLE调用
- `setEmergencyMode`: 只能由ADMIN_ROLE调用

### 3. 房产管理合约 (PropertyManager.sol)

`PropertyManager` 负责管理房产信息和状态。

**主要功能：**
- 房产注册
- 房产状态管理
- 房产元数据更新
- 房产代币关联

**关键接口：**
- `registerProperty`: 注册新房产
- `updatePropertyStatus`: 更新房产状态
- `updatePropertyMetadata`: 更新房产元数据
- `propertyTokens`: 获取房产对应的代币地址

**房产状态：**
- `Pending (0)`: 待审核状态
- `Approved (1)`: 已审核状态
- `Active (2)`: 活跃状态，可交易
- `Suspended (3)`: 暂停状态，暂停交易
- `Archived (4)`: 存档状态，停止所有操作

**权限要求:**
- 注册房产: OPERATOR_ROLE或更高权限
- 更新状态: MANAGER_ROLE或更高权限
- 更新元数据: OPERATOR_ROLE或更高权限

### 4. 房产代币合约 (PropertyToken.sol)

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

**权限要求:**
- 铸造代币: MANAGER_ROLE或更高权限
- 销毁代币: MANAGER_ROLE或更高权限
- 转账: 任何持有代币的地址，但受系统状态影响

### 5. 代币工厂合约 (PropertyTokenFactory.sol)

`PropertyTokenFactory` 负责创建和管理房产代币合约的实例。

**主要功能：**
- 创建新的房产代币
- 管理代币信息
- 代币参数配置

**关键接口：**
- `createToken`: 创建新的房产代币
- `getTokenInfo`: 获取代币信息
- `setSystem`: 设置系统合约

**权限要求:**
- 创建代币: OPERATOR_ROLE或更高权限
- 更新配置: ADMIN_ROLE

### 6. 交易管理合约 (TradingManager.sol)

`TradingManager` 管理代币的交易流程。

**主要功能：**
- 买单/卖单创建
- 交易撮合执行
- 订单取消
- 交易费用管理

**关键接口：**
- `createSellOrder`: 创建卖单
- `createBuyOrder`: 创建买单
- `cancelOrder`: 取消订单
- `updateTokenPrice`: 更新代币价格
- `getMinTradeAmount/getMaxTradeAmount`: 获取交易限额

**权限要求:**
- 创建卖单/买单: 任何认证用户
- 取消订单: 订单创建者或MANAGER_ROLE
- 更新代币价格: MANAGER_ROLE或更高权限
- 更新交易限额: MANAGER_ROLE或更高权限

### 7. 奖励管理合约 (RewardManager.sol)

`RewardManager` 负责管理房产收益分配。

**主要功能：**
- 创建分配
- 计算分配金额
- 分红提取
- 费用处理

**关键接口：**
- `createDistribution`: 创建新的分配
- `createDistributionForProperty`: 为特定房产创建分配
- `withdraw`: 提取分红
- `getDistributionInfo`: 获取分配信息

**权限要求:**
- 创建分配: MANAGER_ROLE或更高权限
- 提取分红: 任何有权获取分红的地址
- 更新费率: ADMIN_ROLE

## 房产资产生命周期

房产资产在系统中的完整生命周期如下：

1. **创建阶段**:
   - 管理员使用OPERATOR权限注册房产
   - 创建对应的ERC20代币
   - 初始状态为Pending

2. **审核阶段**:
   - 管理员使用MANAGER权限审核房产
   - 更新状态为Approved
   - 更新房产元数据和估值

3. **激活阶段**:
   - 管理员使用MANAGER权限激活房产
   - 状态变为Active
   - 开启交易和分红功能

4. **交易阶段**:
   - 用户创建买单和卖单
   - 系统撮合交易
   - 所有权通过代币转移

5. **收益分配阶段**:
   - 管理员使用MANAGER权限创建分配
   - 计算每个代币持有者的分红
   - 用户提取自己的分红

6. **暂停/存档阶段**:
   - 管理员可以暂停房产交易(Suspended)
   - 或将房产存档(Archived)停止所有操作

## 合约安全措施

系统实现了多层次的安全保障：

1. **权限控制**：基于角色的权限管理，严格控制各操作的执行权限
2. **可暂停操作**：支持紧急情况下暂停系统（Pausable）
3. **重入保护**：使用ReentrancyGuard防止重入攻击
4. **安全数学库**：使用SafeMath防止数值操作溢出
5. **事件日志**：关键操作发出事件，便于链下监控和审计
6. **升级机制**：使用UUPS代理模式支持合约升级
7. **参数验证**：严格的参数验证和边界检查
8. **紧急模式**：允许在紧急情况下停止所有操作
9. **权限分离**：不同角色负责不同操作，实现职责分离
10. **状态验证**：所有交易前验证系统和资产状态

## 智能合约版本控制

合约使用版本字段跟踪当前实现版本，所有主要合约都支持通过UUPS模式升级：

```solidity
uint8 public version;  // 当前合约版本
```

每次升级时，新合约将增加版本号，并通过事件通知链外系统升级已完成。

## 开发与部署

### 编译合约

```bash
# 编译所有合约
yarn compile

# 清理缓存并重新编译
yarn hardhat clean && yarn compile
```

### 部署合约

部署使用 `scripts/deploy-correct.js` 脚本，按照特定顺序部署所有合约。
根目录执行：
```bash
# 本地部署
yarn deploy:local

# 测试网部署
yarn deploy:testnet

# 主网部署
yarn deploy:mainnet
```

### 部署流程详解

完整部署流程包括以下步骤：

1. 部署RealEstateSystem合约
2. 部署各功能模块合约(PropertyManager, TradingManager等)
3. 部署RealEstateFacade合约
4. 初始化各合约，设置相互引用
5. 授予初始管理员ADMIN_ROLE权限
6. 设置系统基础参数(手续费率、交易限额等)
7. 验证部署结果

### 交互示例

以下是与合约交互的基本示例：

```javascript
// 1. 获取合约实例
const facade = await ethers.getContractAt("RealEstateFacade", facadeAddress);

// 2. 注册房产并创建代币
const tx = await facade.connect(manager).registerPropertyAndCreateToken(
  "12345",                         // 房产ID
  "JP",                            // 国家
  "ipfs://QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // 元数据URI
  "1000",                          // 初始供应量
  "测试房产Token",                  // 代币名称
  "TEST"                           // 代币符号
);
await tx.wait();

// 3. 创建卖单
await facade.connect(seller).createSellOrder(
  "12345",                         // 房产ID
  "100",                           // 卖出数量
  "11000"                          // 单价
);

// 4. 创建买单
await facade.connect(buyer).createBuyOrder(
  "12345",                         // 房产ID
  "50",                            // 买入数量
  "10500"                          // 出价
);

// 5. 更新房产状态
await facade.connect(manager).updatePropertyStatus(
  "12345",                         // 房产ID
  2                                // 新状态：活跃
);

// 6. 创建分配
await facade.connect(manager).createDistribution(
  "12345",                         // 房产ID
  "50000",                         // 分配金额
  "2023年第一季度租金分红"            // 描述
);

// 7. 提取分红
await facade.connect(investor).withdraw(
  "0",                             // 分配ID
  "0x1234567890123456789012345678901234567890", // 用户地址
  "1000"                           // 提取金额
);
```

## 测试

系统有完善的测试套件，包括单元测试和集成测试。

```bash
# 运行所有测试
yarn test

# 运行特定测试
yarn test test/RealEstateFacade.test.js

# 查看覆盖率报告
yarn test:coverage
```

## 失败场景处理

系统设计了完善的失败处理机制，对常见错误情况进行处理：

1. **权限不足**:
   - 返回明确的错误信息指明所需权限
   - 记录失败事件以便审计

2. **参数无效**:
   - 提供具体的参数验证失败信息
   - 对所有输入进行类型和范围检查

3. **状态错误**:
   - 验证操作是否符合当前状态
   - 提供清晰的状态转换规则

4. **资金不足**:
   - 交易前验证余额充足
   - 提供详细的余额要求信息

5. **合约暂停**:
   - 所有关键操作使用whenNotPaused修饰符
   - 提供紧急操作机制

## 升级流程

合约使用UUPS代理模式支持升级，升级流程如下：

1. 部署新版本实现合约
2. 由具有ADMIN_ROLE的账户调用代理合约的`upgradeTo`方法
3. 升级完成后，代理合约将指向新的实现合约，保持相同地址和存储数据

```javascript
// 升级合约示例
const proxyAdmin = await ethers.getContract("ProxyAdmin");
const newImplementation = await ethers.getContract("RealEstateFacadeV2");
await proxyAdmin.connect(admin).upgrade(proxyAddress, newImplementation.address);
```

## 审计和验证

建议在部署到生产环境前进行以下步骤：

1. 进行专业的安全审计
2. 使用Mythril、Slither等工具进行静态分析
3. 在测试网络上充分测试各种边界情况
4. 验证合约代码（例如通过Etherscan）
5. 实施监控和警报系统

## Gas优化与成本控制

系统采用多种技术优化Gas使用：

1. **数据类型优化**:
   - 使用uint40存储时间戳
   - 适当使用bytes32代替string
   - 结构体字段排序以减少存储间隙

2. **批处理操作**:
   - 批量处理多个操作以减少交易数量
   - 使用多返回值减少调用次数

3. **存储优化**:
   - 适当使用memory而非storage
   - 使用mapping代替数组存储大量数据

4. **访问控制**:
   - 使用internal和private减少函数调用开销
   - 为频繁操作提供View函数

## 注意事项

- 合约中的时间戳使用`uint40`类型以节省gas
- 区块链交互可能会失败，应实现适当的错误处理和重试机制
- 在操作大额资金前，应先进行小额测试交易
- 关键操作（如升级）应由多签钱包执行以提高安全性
- 不同角色的权限严格分离，避免越权操作
- 所有金额操作采用代币最小单位（wei），显示时需转换
- 智能合约操作不可撤销，谨慎执行资金相关操作
- 链上数据是公开的，敏感信息应采用加密或链下存储
