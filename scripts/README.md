# 部署与测试脚本使用指南

本文档介绍本项目中的部署和测试脚本的使用方法、开发调试流程、工作原理以及常见问题解决方案。

## 目录结构

```
scripts/
├── deploy-with-new-architecture.js  # 主部署脚本（使用新的三层架构）
├── verify-deployment.js            # 部署验证脚本
├── deploy-state.json               # 部署状态记录文件
├── logging/                        # 部署日志目录
└── tests/                          # 测试脚本目录
    ├── deployment-test.js          # 部署验证测试
    ├── basic-processes-test.js     # 基础业务流程测试
    ├── business-processes-test.js  # 完整业务流程测试（包括代币创建）
    └── README.md                   # 测试策略说明
```

## 三层部署架构说明

我们采用了一个新的三层部署架构来组织部署工具和流程：

1. **基础层 (deployment-state.js)** - 处理部署状态持久化，管理合约地址、网络配置和部署时间戳
2. **核心层 (deployment-core.js)** - 提供核心部署功能，处理合约编译、部署、升级和验证
3. **系统层 (deployment-system.js)** - 提供高级系统级部署功能，包括库部署、系统合约部署和角色配置

这种架构设计提供了更好的关注点分离、更高的可维护性和更强的扩展能力。

## 关键脚本说明

### 1. 部署脚本

#### 主部署脚本 (`deploy-with-new-architecture.js`)

这是使用新三层架构的主要部署脚本，负责协调整个部署流程，包括合约部署、库部署、角色配置等。

**使用方法**:
```bash
# 基本用法
npx hardhat run scripts/deploy-with-new-architecture.js --network <network>

# 或使用NPM脚本
npm run contracts:deploy:new

# 部署选项
FORCE_DEPLOY=true npx hardhat run scripts/deploy-with-new-architecture.js --network <network>  # 强制重新部署
VERIFY_CONTRACTS=true npx hardhat run scripts/deploy-with-new-architecture.js --network <network>  # 部署并验证源码
```

**环境变量**:
- `FORCE_DEPLOY`: 设置为`true`强制重新部署所有合约，忽略已部署状态
- `VERIFY_CONTRACTS`: 设置为`true`在区块链浏览器上验证合约源码
- `ADMIN_ADDRESS`: 管理员角色地址
- `OPERATOR_ADDRESS`: 操作员角色地址
- `VALIDATOR_ADDRESS`: 验证者角色地址
- `TREASURY_ADDRESS`: 资金管理员角色地址

#### 验证部署脚本 (`verify-deployment.js`)

验证已部署合约的配置和状态，确保部署成功且合约关系正确。

**使用方法**:
```bash
npx hardhat run scripts/verify-deployment.js --network <network>
```

**功能**:
- 验证所有合约是否已部署并有代码
- 验证系统合约引用是否正确
- 验证角色设置是否正确

### 2. 测试脚本

测试脚本与之前相同，但现在使用新的部署架构。

#### 部署验证测试 (`tests/deployment-test.js`)

验证基本合约部署是否成功，检查关键合约地址和关系。

```bash
npm run contracts:test:deployment
```

#### 基础业务流程测试 (`tests/basic-processes-test.js`)

测试系统基本功能，但不涉及代币创建操作。

```bash
npm run contracts:test:basic
```

#### 完整业务流程测试 (`tests/business-processes-test.js`)

测试完整业务流程，包括房产注册、代币创建、交易和租金分配等。

```bash
npm run contracts:test:business
```

## 开发与调试流程

### 本地开发流程

1. **启动本地节点**:
   ```bash
   npx hardhat node
   ```

2. **部署合约**:
   ```bash
   FORCE_DEPLOY=true npx hardhat run scripts/deploy-with-new-architecture.js --network localhost
   ```

3. **验证部署**:
   ```bash
   npx hardhat run scripts/verify-deployment.js --network localhost
   ```

4. **测试业务流程**:
   ```bash
   npm run contracts:test:business
   ```

### 调试常见问题

1. **合约部署问题**:
   - 检查账户余额是否足够
   - 确认网络连接是否正常
   - 查看部署日志了解具体错误
   
2. **角色权限问题**:
   - 在验证脚本中检查角色是否正确设置
   - 使用控制台手动检查角色:
   ```javascript
   const roleManager = await ethers.getContractAt("RoleManager", "<address>");
   const superAdminRole = await roleManager.SUPER_ADMIN();
   await roleManager.hasRole(superAdminRole, "<account>");
   ```

3. **合约初始化问题**:
   - 检查部署参数是否正确
   - 查看合约状态验证初始化是否成功

## 部署架构工作原理

### 1. 部署状态管理

部署状态通过`deployment-state.json`文件管理，主要功能：

- 记录已部署合约的地址
- 跟踪部署网络和时间戳
- 持久化部署记录到多个位置
- 提供向后兼容性

### 2. 部署策略

系统支持三种部署策略：

- **直接部署 (DIRECT)**: 普通合约部署，不使用代理
- **可升级部署 (UPGRADEABLE)**: 部署代理合约和实现合约，支持后续升级
- **最小化部署 (MINIMAL)**: 只部署核心合约，用于测试或开发环境

### 3. 部署流程

完整部署流程包括以下步骤：

1. 部署库合约(`SystemDeployerLib1`, `SystemDeployerLib2`)
2. 部署角色管理器(`RoleManager`)
3. 部署费用管理器(`FeeManager`)
4. 部署房产注册表(`PropertyRegistry`)
5. 部署租金分配器(`RentDistributor`)
6. 部署代币工厂(`TokenFactory`)  
7. 部署赎回管理器(`RedemptionManager`)
8. 部署市场(`Marketplace`)
9. 部署代币持有者查询(`TokenHolderQuery`)
10. 部署房地产系统(`RealEstateSystem`)
11. 配置系统角色
12. 记录部署状态

## 常见问题

### 1. 部署失败

**问题**: 部署脚本执行失败。

**解决方案**:
- 检查日志了解具体错误
- 确保账户余额充足
- 使用`FORCE_DEPLOY=true`选项强制重新部署
- 检查网络连接状态

### 2. 权限错误

**问题**: 操作时出现权限错误。

**解决方案**:
- 使用验证脚本检查角色设置
- 确认操作账户具有所需角色

### 3. 合约无代码错误

**问题**: 调用合约方法时出现"address has no code"错误。

**解决方案**:
- 确认节点是否重启过，可能需要重新部署
- 检查合约地址是否正确
- 验证部署记录中的地址是否匹配

## 脚本说明

本目录包含项目的部署、测试和工具脚本，用于管理智能合约的完整生命周期。

## 部署脚本

* `deploy-with-new-architecture.js` - 主要部署脚本，使用三层部署架构
* `deploy-force.js` - 强制部署脚本，用于解决部署过程中的问题
* `deploy-token-implementation.js` - 部署代币实现合约并设置到TokenFactory
* `verify-deployment.js` - 验证部署的合约功能是否正常
* `verify-etherscan.js` - 在区块链浏览器上验证合约代码

## 部署状态文件

部署过程中会生成`deploy-state.json`文件，记录所有已部署合约的地址。最新格式包含以下结构：

```json
{
  // 库合约地址（标准格式）
  "SystemDeployerLib1": "0x123...",
  "SystemDeployerLib2": "0x456...",
  
  // 代币实现地址
  "tokenImplementation": "0x789...",
  
  // 兼容旧格式的合约地址（驼峰命名）
  "roleManager": "0xabc...",
  "feeManager": "0xdef...",
  // ... 其他合约
  
  // 新格式 - 代理合约地址（Pascal命名）
  "contracts": {
    "RoleManager": "0xabc...",
    "FeeManager": "0xdef...",
    // ... 其他合约
  },
  
  // 新格式 - 实现合约地址
  "implementations": {
    "RoleManager": "0x111...",
    "FeeManager": "0x222...",
    // ... 其他合约
  }
}
```

### 注意事项

1. 合约交互应使用**代理合约地址**（`contracts`字段或旧格式的驼峰命名字段）
2. 合约升级应参考**实现合约地址**（`implementations`字段）
3. 旧格式的字段（直接在根级别的驼峰命名）保留是为了向后兼容

## 测试脚本

* `tests/basic-processes-test.js` - 基础功能测试
* `tests/business-processes-test.js` - 业务流程测试
* `tests/business-flow-test.js` - 完整业务流程测试
* `tests/deployment-test.js` - 部署验证测试
* `tests/verify-contracts-loading.js` - 验证合约地址加载测试

## 工具脚本

* `update-shared-abis.js` - 更新共享ABI文件

## 使用方法

以下是常用命令：

```bash
# 编译合约并更新共享ABI
npm run contracts:compile

# 部署合约
npm run contracts:deploy

# 强制重新部署合约
npm run contracts:deploy:force

# 验证部署功能
npm run contracts:verify:deployment

# 在区块链浏览器上验证合约代码
npm run contracts:verify:etherscan

# 运行基本功能测试
npm run contracts:test:basic

# 运行完整业务流程测试
npm run contracts:test:business-flow
```

## 可升级合约说明

本项目使用OpenZeppelin的UUPS代理模式部署可升级合约。每个合约包含两部分：

1. **代理合约** - 用户与之交互的合约，存储状态并转发调用
2. **实现合约** - 包含逻辑代码的合约，可以被升级

验证脚本`verify-deployment.js`会自动发现并记录实现合约地址，将其添加到`deploy-state.json`文件中。 