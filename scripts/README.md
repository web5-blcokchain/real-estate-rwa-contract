# 部署与测试脚本使用指南

本文档介绍本项目中的部署和测试脚本的使用方法、开发调试流程、工作原理以及常见问题解决方案。

## 目录结构

```
scripts/
├── deploy.sh                      # 主部署脚本（Shell）
├── deploy.js                      # 合约部署执行脚本
├── deploy-token-implementation.js # 代币实现部署与TokenFactory配置脚本
├── setup-roles.js                 # 合约角色设置脚本
├── verify.js                      # 合约源码验证脚本
├── force-deploy.js                # 强制部署脚本（避免gas估算问题）
├── debug-token-creation.js        # 代币创建调试工具脚本
├── tests/                         # 测试脚本目录
│   ├── deployment-test.js         # 部署验证测试
│   ├── basic-processes-test.js    # 基础业务流程测试
│   ├── business-processes-test.js # 完整业务流程测试（包括代币创建）
│   └── README.md                  # 测试策略说明
├── deploy-state.json              # 部署状态记录文件
└── logging/                       # 部署日志目录
```

## 关键脚本说明

### 1. 部署脚本

#### 主部署脚本 (`deploy.sh`)

这是部署流程的入口脚本，集成了合约部署、代币实现设置、角色配置和测试验证的完整流程。

**使用方法**:
```bash
# 基本用法
./deploy.sh <network> [options]

# 部署示例
./deploy.sh local                       # 部署到本地网络
./deploy.sh local --force               # 强制重新部署所有合约
./deploy.sh testnet --verify            # 部署到测试网并验证源码
./deploy.sh mainnet --skip-token-impl   # 部署到主网但跳过代币实现设置
```

**重要参数**:
- `--force`: 强制重新部署所有合约，忽略已部署状态
- `--strategy=<upgradeable|direct>`: 选择部署策略
- `--verify`: 在区块链浏览器上验证合约源码
- `--no-roles`: 跳过角色设置步骤
- `--skip-token-impl`: 跳过代币实现部署和配置

#### 代币实现部署脚本 (`deploy-token-implementation.js`)

这个脚本负责部署RealEstateToken实现合约，并将其地址设置到TokenFactory中，是代币创建能够正常工作的关键步骤。

**使用方法**:
```bash
npx hardhat run scripts/deploy-token-implementation.js --network <network>
```

**功能**:
- 部署RealEstateToken实现合约
- 设置TokenFactory的tokenImplementation地址
- 保存实现地址到配置文件

### 2. 测试脚本

#### 部署验证测试 (`tests/deployment-test.js`)

验证基本合约部署是否成功，检查关键合约地址和关系。

```bash
npx hardhat run scripts/tests/deployment-test.js --network <network>
```

#### 基础业务流程测试 (`tests/basic-processes-test.js`)

测试系统基本功能，但不涉及代币创建操作。

```bash
npx hardhat run scripts/tests/basic-processes-test.js --network <network>
```

#### 完整业务流程测试 (`tests/business-processes-test.js`)

测试完整业务流程，包括房产注册、代币创建、交易和租金分配等。此测试需要TokenFactory正确配置tokenImplementation地址。

```bash
npx hardhat run scripts/tests/business-processes-test.js --network <network>
```

### 3. 调试工具

#### 代币创建调试工具 (`debug-token-creation.js`)

用于调试代币创建过程中可能出现的问题，提供手动代理部署功能。

```bash
npx hardhat run scripts/debug-token-creation.js --network <network>
```

## 开发与调试流程

### 本地开发流程

1. **启动本地节点**:
   ```bash
   npx hardhat node
   ```

2. **部署基础合约**:
   ```bash
   ./deploy.sh local
   ```

3. **验证基础功能**:
   ```bash
   npx hardhat run scripts/tests/basic-processes-test.js --network localhost
   ```

4. **测试业务流程**:
   ```bash
   npx hardhat run scripts/tests/business-processes-test.js --network localhost
   ```

### 调试常见问题

1. **代币创建失败**: 
   ```bash
   # 验证TokenFactory实现地址
   npx hardhat console --network localhost
   > const tf = await ethers.getContractAt("TokenFactory", "<TokenFactory地址>")
   > await tf.tokenImplementation()
   
   # 如果地址为0或不正确，重新部署代币实现
   npx hardhat run scripts/deploy-token-implementation.js --network localhost
   ```

2. **角色权限问题**:
   ```bash
   # 检查角色设置
   npx hardhat run scripts/setup-roles.js --network localhost
   ```

3. **手动创建代币**:
   ```bash
   # 使用调试工具手动创建代币
   npx hardhat run scripts/debug-token-creation.js --network localhost
   ```

## 工作原理

### 1. 代理模式与实现分离

本系统采用可升级代理模式，关键组件如下：

- **实现合约**: 包含业务逻辑，如RealEstateToken实现
- **代理合约**: 通过代理将调用转发到实现合约
- **TokenFactory**: 工厂合约，负责创建新的代币代理

TokenFactory需要知道RealEstateToken实现合约的地址才能创建新代币。这是通过`tokenImplementation`变量存储的，这个地址需要在部署后通过`deploy-token-implementation.js`脚本设置。

### 2. 部署流程

完整部署流程包括以下步骤：

1. 部署所有基础合约（`deploy.js`）
2. 部署RealEstateToken实现合约（`deploy-token-implementation.js`）
3. 设置TokenFactory的tokenImplementation地址
4. 设置合约角色（`setup-roles.js`）
5. 验证部署（`tests/deployment-test.js`）
6. 测试基础功能（`tests/basic-processes-test.js`）
7. 测试完整业务流程（`tests/business-processes-test.js`）

## 常见问题

### 1. TokenFactory代币创建失败

**问题**: 调用`TokenFactory.createTokenPublic()`方法失败，返回"Transaction reverted without a reason string"。

**解决方案**:
- 确保TokenFactory的tokenImplementation地址已正确设置
- 运行`deploy-token-implementation.js`脚本更新实现地址
- 使用`debug-token-creation.js`脚本手动创建代币进行测试

### 2. 权限错误

**问题**: 执行特定操作时出现"Caller is not a super admin"或类似权限错误。

**解决方案**:
- 运行`setup-roles.js`脚本确保角色正确设置
- 检查调用者是否有所需的角色（SUPER_ADMIN、TOKEN_MANAGER等）
- 在控制台中验证角色分配：
  ```javascript
  const rm = await ethers.getContractAt("RoleManager", "<RoleManager地址>");
  const SUPER_ADMIN = await rm.SUPER_ADMIN();
  await rm.hasRole(SUPER_ADMIN, "<账户地址>");
  ```

### 3. 部署失败

**问题**: 部署脚本执行失败，可能是gas估算问题。

**解决方案**:
- 使用`--force`选项运行部署脚本
- 检查账户余额是否足够
- 本地网络可能需要增加gas限制，可修改hardhat配置

### 4. 合约依赖错误

**问题**: 合约在验证阶段出现"Could not find contract dependencies"。

**解决方案**:
- 确保所有依赖合约已部署
- 检查导入路径是否正确
- 尝试单独验证每个合约

## 最佳实践

1. **先测试后生产**: 始终先在本地和测试网上验证部署脚本和业务流程
2. **完整记录**: 保留每次部署的日志和状态，便于排查问题
3. **分步验证**: 使用测试脚本逐步验证系统功能，从基础到复杂
4. **权限管理**: 设置完成后验证关键角色是否正确分配
5. **代币管理**: 理解TokenFactory与RealEstateToken实现的关系，确保设置正确 