# 日本房产通证化系统 - 常见问题解答 (FAQ)

本文档收集了在开发、测试、部署和使用日本房产通证化系统过程中的常见问题及其解答。

## 目录

- [部署相关问题](#部署相关问题)
- [角色和权限管理问题](#角色和权限管理问题)
- [合约开发问题](#合约开发问题)
- [测试相关问题](#测试相关问题)
- [系统功能问题](#系统功能问题)
- [性能和优化问题](#性能和优化问题)
- [合约升级问题](#合约升级问题)
- [安全相关问题](#安全相关问题)
- [合约地址配置](#合约地址配置)

## 部署相关问题

### Q: 如何选择合适的部署方式？

A: 系统提供两种部署方法：
- **统一部署**(`deploy-unified.js`): 适合测试网和本地环境，一次性部署所有合约
- **手动分步部署**(`manual-deploy.js`): 推荐用于主网部署，特别是需要解决合约大小限制问题时

根据部署环境的不同，选择最适合的方法：
- 本地开发和测试：使用统一部署
- 测试网验证：可使用统一部署或手动部署
- 主网部署：推荐使用手动分步部署

### Q: 部署脚本使用了哪些环境变量？

A: 部署脚本主要使用以下环境变量：
- `PRIVATE_KEY`: 用于部署合约的钱包私钥
- `MAINNET_RPC_URL`/`TESTNET_RPC_URL`: 区块链网络的RPC端点
- `BSCSCAN_API_KEY`: 用于在BSCScan上验证合约
- 各种费用设置：`TRADING_FEE`, `TOKENIZATION_FEE`, `REDEMPTION_FEE`, `PLATFORM_FEE`, `MAINTENANCE_FEE`等

### Q: 关于PRIVATE_KEY环境变量的使用和安全管理？

A: PRIVATE_KEY环境变量是用于部署合约的钱包私钥，系统提供了多种管理这个私钥的方式：

1. **直接在`.env`文件中设置（最简单但安全性较低）**：
   - 在项目根目录创建一个`.env`文件并添加：
     ```
     PRIVATE_KEY=你的私钥（不带0x前缀）
     ```
   - 部署脚本会自动从环境变量中读取这个私钥
   - 注意：**不要**将包含私钥的`.env`文件提交到版本控制系统中

2. **使用secure-key.js工具加密存储（推荐用于测试网和主网部署）**：
   - 这种方法不需要在`.env`文件中写入明文私钥
   - 需要执行以下两个步骤：
     ```bash
     # 第一步：生成加密密钥（仅首次使用需要）
     node scripts/utils/secure-key.js generate
     
     # 第二步：设置并加密私钥
     node scripts/utils/secure-key.js setup
     ```
   - 之后部署脚本会自动从加密存储中读取私钥，不再需要在`.env`文件中设置PRIVATE_KEY

3. **部署过程中的优先级**：
   - 系统会先检查`.env`文件中是否有PRIVATE_KEY
   - 如果没有找到，则尝试从加密存储中读取
   - 如果两者都没有，将显示错误并使用默认私钥（仅用于开发，无实际价值）

4. **错误排查**：
   - 如果遇到"使用默认私钥"的警告，表示系统无法找到有效的私钥
   - 如果使用了secure-key.js但部署失败，请确认：
     - `.key`文件存在（加密密钥）
     - `.encrypted_key`文件存在（加密后的私钥）
     - 文件权限正确（600，仅所有者可读写）

5. **主网部署最佳实践**：
   - 使用临时部署私钥，部署后转移权限
   - 使用secure-key.js工具而非直接在环境变量中设置
   - 考虑使用专用的部署环境，避免在共享设备上存储密钥

### Q: 如何解决合约大小超限的问题？

A: 对于BSC主网部署，可能会遇到合约大小超过24KB的限制。解决方法：
1. 使用手动分步部署方法（scripts/manual-deploy.js）
2. 拆分大型合约为更小的合约（如SystemDeployer拆分为基础合约和库合约）
3. 优化合约代码，减少不必要的变量、函数和错误消息
4. 调整编译器优化设置

### Q: 如何在部署过程中处理失败和恢复？

A: 使用手动分步部署脚本（manual-deploy.js）可以记录每一步的部署状态。如果某一步失败：
1. 检查错误信息，解决问题
2. 使用`step`命令重新执行失败的步骤：
   ```bash
   npx hardhat run scripts/manual-deploy.js --network <network_name> step <step_number>
   ```
3. 或者在解决问题后，使用`next`命令继续部署

### Q: 部署完成后如何验证所有合约都正确配置？

A: 使用验证脚本检查部署和配置：
```bash
npx hardhat run scripts/verify-deployment.js --network <network_name>
```
该脚本会验证：
- 所有合约都已成功部署
- 合约间的引用关系正确设置
- 角色和权限正确分配
- 核心功能配置正确

## 角色和权限管理问题

### Q: 系统中的角色和权限是如何工作的？

A: 系统基于OpenZeppelin的AccessControl实现了一套完整的权限管理系统：

1. **核心角色**：
   - `DEFAULT_ADMIN_ROLE`: 基础管理员角色，拥有授予/撤销其他角色的权限
   - `SUPER_ADMIN`: 系统超级管理员，可以管理所有系统功能
   - `PROPERTY_MANAGER`: 房产管理员，可以管理房产注册和审核
   - `FEE_COLLECTOR`: 费用收集者，可以从系统中提取收取的费用

2. **角色分配逻辑**：
   - 部署者账户初始拥有`DEFAULT_ADMIN_ROLE`
   - 部署过程中，部署者被授予`SUPER_ADMIN`角色
   - `SUPER_ADMIN`可以进一步分配其他角色

3. **权限检查流程**：
   - 合约中的受保护函数使用`onlyRole`修饰器验证调用者是否拥有所需角色
   - 对关键操作的权限控制确保系统安全

### Q: 常见的RoleManager相关问题有哪些？

A: 以下是一些常见的角色管理问题及其解决方案：

1. **部署者没有DEFAULT_ADMIN_ROLE**：
   - 症状：部署后无法授予角色，权限验证失败
   - 原因：RoleManager合约初始化过程中没有正确授予部署者`DEFAULT_ADMIN_ROLE`
   - 解决方案：
     - 在本地开发环境中，重置Hardhat节点并重新部署
     - 确保deploy-unified.js中执行了步骤11（授予角色）
     - 使用debug-role-manager.js脚本检查权限状态

2. **无法授予SUPER_ADMIN角色**：
   - 症状：尝试授予SUPER_ADMIN角色时交易失败
   - 原因：调用者没有DEFAULT_ADMIN_ROLE
   - 解决方案：
     - 首先确认调用者已有DEFAULT_ADMIN_ROLE
     - 使用grant-roles.js脚本执行角色授予

3. **权限检查失败**：
   - 症状：调用特定函数时出现"caller is not a super admin"等错误
   - 原因：账户缺少所需角色权限
   - 解决方案：
     - 检查RoleManager合约中账户的角色状态
     - 使用拥有适当权限的账户执行操作
     - 通过正确的管理员账户授予所需角色

### Q: 如何排查和修复角色权限问题？

A: 系统提供了多个工具脚本来帮助排查和修复角色权限问题：

1. **debug-role-manager.js**：
   ```bash
   npx hardhat run scripts/debug-role-manager.js --network <network_name>
   ```
   - 检查部署者和关键合约的角色状态
   - 验证RoleManager是否正确初始化
   - 提供针对性的解决方案建议

2. **grant-roles.js**：
   ```bash
   npx hardhat run scripts/grant-roles.js --network <network_name>
   ```
   - 授予部署者所有必要的角色
   - 为各系统合约分配适当的角色权限
   - 验证授权结果

3. **fix-role-manager.js**：
   ```bash
   npx hardhat run scripts/fix-role-manager.js --network <network_name>
   ```
   - 尝试检测并修复RoleManager合约中的权限问题
   - 必要时部署新的RoleManager实例并更新部署记录

4. **reset-hardhat-node.js**：
   ```bash
   npx hardhat run scripts/reset-hardhat-node.js
   ```
   - 提供重置本地开发环境的完整指南
   - 详细说明如何解决权限初始化问题

### Q: 如何避免在部署过程中出现角色权限问题？

A: 遵循以下最佳实践可以减少角色权限问题的发生：

1. **确保正确执行所有部署步骤**：
   - 不要跳过deploy-unified.js中的步骤11（授予角色）
   - 或者部署后立即使用grant-roles.js脚本授予角色

2. **部署后验证**：
   - 部署完成后立即验证角色分配状态
   - 使用debug-role-manager.js检查关键角色是否正确分配

3. **自动化测试**：
   - 在测试过程中验证角色授予和权限检查逻辑
   - 模拟不同角色的操作场景

4. **明确记录角色分配**：
   - 维护一个明确的角色分配文档
   - 记录哪些地址拥有哪些角色权限

## 合约开发问题

### Q: 如何编译合约并检查语法错误？

A: 使用Hardhat的编译命令：
```bash
# 普通编译
npx hardhat compile

# 强制重新编译
npx hardhat compile --force
```

如遇编译错误，错误信息通常会指出具体问题和位置。

### Q: 如何确保合约可升级？

A: 遵循以下最佳实践：
1. 使用OpenZeppelin的可升级合约模式
2. 使用`initialize()`函数代替构造函数
3. 不修改已部署合约的存储布局
4. 不使用`selfdestruct`和`delegatecall`
5. 避免在构造函数中进行初始化操作

### Q: 如何添加或修改合约功能？

A: 修改合约功能时：
1. 确定是否需要合约升级
2. 对于新功能，先编写测试用例
3. 实现功能，保持兼容现有存储结构
4. 全面测试，包括回归测试
5. 如果是升级，使用升级脚本部署新实现

### Q: 如何在合约中处理权限控制？

A: 系统使用基于角色的访问控制：
1. 所有权限控制通过`RoleManager`合约管理
2. 使用预定义的角色常量（如`SUPER_ADMIN`, `PROPERTY_MANAGER`等）
3. 在函数中使用修饰符检查权限，如：
   ```solidity
   function registerProperty(...) external onlyRole(PROPERTY_MANAGER_ROLE) {
       // 函数实现
   }
   ```

## 测试相关问题

### Q: 如何执行特定的测试？

A: 可以使用以下命令：
```bash
# 运行所有测试
npx hardhat test

# 运行特定测试文件
npx hardhat test test/RoleManager.test.js

# 运行特定测试描述中包含某关键词的测试
npx hardhat test --grep "should assign SUPER_ADMIN role"
```

### Q: 如何模拟不同的账户和角色？

A: 在测试中，可以使用Hardhat提供的账户：
```javascript
const [owner, propertyManager, user] = await ethers.getSigners();
// 使用不同账户调用合约
await roleManager.connect(owner).grantRole(PROPERTY_MANAGER_ROLE, propertyManager.address);
// 使用特定角色账户调用功能
await propertyRegistry.connect(propertyManager).registerProperty(...);
```

### Q: 如何测试时间相关的逻辑？

A: 使用Hardhat提供的时间操作功能：
```javascript
// 增加区块时间
await ethers.provider.send("evm_increaseTime", [86400]); // 增加一天
await ethers.provider.send("evm_mine"); // 挖一个新区块

// 或者使用OpenZeppelin的测试助手
const { time } = require("@openzeppelin/test-helpers");
await time.increase(time.duration.days(1));
```

### Q: 如何编写更有效的测试用例？

A: 遵循以下最佳实践：
1. 将测试组织为模块化单元测试
2. 使用`beforeEach`设置测试环境
3. 测试正常路径和边缘情况
4. 验证事件触发和状态变化
5. 确保测试覆盖所有重要功能
6. 对于复杂功能，考虑使用基于场景的测试

## 系统功能问题

### Q: 如何注册新房产？

A: 房产注册流程：
1. 只有拥有`PROPERTY_MANAGER_ROLE`角色的账户可以注册房产
2. 调用`PropertyRegistry.registerProperty()`方法
3. 提供必要的房产信息，包括地址、价格、面积等
4. 系统将铸造代表该房产的NFT（ERC721）

### Q: 房产通证化过程是什么？

A: 通证化流程：
1. 已注册的房产NFT持有者调用`TokenManager.tokenizeProperty()`
2. 指定要创建的ERC20代币数量和其他参数
3. 系统创建对应的ERC20代币，代表房产的部分所有权
4. 代币将被铸造并转移给申请人

### Q: 如何处理租金分配？

A: 租金分配机制：
1. 租金收入通过`RentalManager`合约管理
2. 管理员通过`distributeRent()`函数分配特定房产的租金
3. 系统自动计算每个代币持有者应得的份额
4. 持有者可以调用`claimRent()`提取租金

### Q: 如何进行部分所有权代币交易？

A: 代币交易流程：
1. 代币持有者通过`PropertyExchange`创建卖单
2. 买家可以购买全部或部分卖单中的代币
3. 系统自动处理代币转移和资金结算
4. 交易会产生交易费用，由平台收取

## 性能和优化问题

### Q: 如何优化合约Gas消耗？

A: 减少Gas消耗的方法：
1. 优化存储模式，使用`mapping`代替数组
2. 减少链上存储数据量，将非关键数据存储在链下
3. 批量处理操作，减少交易次数
4. 优化循环和条件判断
5. 使用库合约共享通用逻辑

### Q: 如何提高合约执行效率？

A: 提高执行效率的技巧：
1. 避免在循环中执行存储操作
2. 使用事件而非存储变量记录历史数据
3. 优化数据结构，减少计算复杂度
4. 采用升级模式，允许后续优化
5. 考虑使用二级索引优化查询操作

### Q: 如何处理可能的区块链网络拥堵？

A: 应对网络拥堵的策略：
1. 实现灵活的Gas价格策略
2. 设计批处理机制，减少交易频率
3. 对于非紧急操作，提供延迟处理选项
4. 关键功能设计失败恢复机制
5. 考虑实现链下状态通道或二层解决方案

## 合约升级问题

### Q: 合约升级的限制有哪些？

A: 升级可升级合约时需注意以下几点：
1. 不能修改状态变量的顺序或删除状态变量
2. 不能修改合约继承的顺序
3. 不能修改状态变量的类型
4. 升级后新增的状态变量不会初始化

### Q: 如何升级单个合约？

A: 使用upgrade-contract.js脚本：
```bash
npx hardhat run scripts/upgrade/upgrade-contract.js --network <network_name> -- --contract <contract_name> --proxy <proxy_address>
```

该脚本会：
1. 部署新的实现合约
2. 将代理合约指向新实现
3. 在区块链浏览器上验证新合约

### Q: 升级后如何验证合约功能正常？

A: 部署后应该：
1. 使用verify-deployment.js验证合约关系
2. 执行手动交互测试，确认核心功能
3. 调用关键查询函数确认状态维持正确
4. 测试新增功能是否正常运行

### Q: 如何处理合约升级中的数据迁移？

A: 数据迁移应该在新实现合约的功能中处理：
1. 创建迁移函数，由管理员触发
2. 确保迁移函数有适当的权限控制
3. 迁移前检查系统状态，迁移后验证数据完整性
4. 考虑使用事件记录迁移过程
5. 设计恢复机制，以防迁移失败

## 安全相关问题

### Q: 系统如何防止未授权访问？

A: 安全机制包括：
1. 基于角色的访问控制，限制关键操作
2. 权限分离，避免单点故障
3. 输入验证和检查，防止恶意输入
4. 事件记录所有关键操作，便于审计
5. 紧急暂停功能，应对突发安全问题

### Q: 如何保障资金安全？

A: 资金安全措施：
1. 使用拉取式资金模式，而非自动推送
2. 实现交易限额和冷却期
3. 多重签名用于管理员操作
4. 防重入保护
5. 对关键金融操作进行事件记录和通知

### Q: 如何处理紧急安全漏洞？

A: 紧急响应流程：
1. 使用`pause()`功能暂停系统
2. 评估安全漏洞影响范围
3. 准备并测试修复方案
4. 使用升级机制部署修复
5. 验证修复有效性
6. 恢复系统操作 

### Q: 如何确保只有授权人员可以管理系统？

A: 管理权限控制：
1. 使用多重签名钱包管理`SUPER_ADMIN`角色
2. 实现时间锁定，延迟关键管理操作
3. 设置明确的权限层级和分离
4. 所有管理操作都记录事件，便于审计
5. 定期审查权限分配

## 合约地址配置

### 合约地址的来源和优先级

合约地址可以从两个来源获取：
1. 环境变量（.env 文件）
2. 部署状态文件（deploy-state.json）

地址加载的优先级规则：
1. 优先使用环境变量中的地址（如果地址是合法的以太坊地址）
2. 如果环境变量中的地址不合法，则使用部署状态文件中的地址（如果地址合法）
3. 如果两个地址都不合法，使用空字符串并输出警告

### 如何配置合约地址

1. 在 `.env` 文件中配置：
```bash
ROLE_MANAGER_ADDRESS=0x...
PROPERTY_REGISTRY_ADDRESS=0x...
TOKEN_FACTORY_ADDRESS=0x...
REDEMPTION_MANAGER_ADDRESS=0x...
RENT_DISTRIBUTOR_ADDRESS=0x...
FEE_MANAGER_ADDRESS=0x...
MARKETPLACE_ADDRESS=0x...
TOKEN_HOLDER_QUERY_ADDRESS=0x...
REAL_ESTATE_SYSTEM_ADDRESS=0x...
```

2. 或者通过部署脚本生成 `deploy-state.json` 文件：
```bash
npx hardhat run scripts/deploy-unified.js --network localhost
```

### 合约地址的使用

在代码中使用合约地址：
```javascript
const { getContractAddresses } = require('../../../shared/config/contracts');
const contractAddresses = getContractAddresses();
```

### 更新合约地址

1. 更新单个合约地址：
```javascript
const { updateContractAddress } = require('../../../shared/config/contracts');
updateContractAddress('roleManager', '0x...');
```

2. 保存到部署状态文件：
```javascript
const { saveToDeployState } = require('../../../shared/config/contracts');
saveToDeployState();
```

### 注意事项

1. 所有合约地址必须是合法的以太坊地址（0x开头的42位十六进制字符串）
2. 环境变量中的地址优先级最高，但必须确保地址合法
3. 如果环境变量中的地址不合法，系统会自动使用部署状态文件中的地址
4. 建议在开发环境中使用 `deploy-state.json`，在生产环境中使用环境变量配置

## 常见问题（密钥和访问相关）

### Q: 如何设置私钥？

A: 将您的私钥直接设置在 `.env` 文件中：

```bash
# 角色私钥
ADMIN_PRIVATE_KEY=0x...
OPERATOR_PRIVATE_KEY=0x...
DEPLOYER_PRIVATE_KEY=0x...
# 其他角色私钥...
```

### Q: 私钥管理的最佳实践是什么？

A: 遵循以下最佳实践确保私钥安全：

1. **永远不要**：
   - 将私钥提交到代码仓库
   - 在代码或日志中硬编码私钥
   - 通过不安全的渠道传输私钥
   - 在共享设备上存储私钥

2. **应该**：
   - 限制私钥访问权限
   - 对于主网部署使用临时私钥并在部署后转移管理员权限
   - 部署完成后考虑使用多签钱包替代单一私钥控制
   - 定期轮换部署私钥

3. **文件权限**：
   - 确保 `.env` 文件的权限设置为600（仅所有者可读写）
   - 确保项目目录位于安全的文件系统上
   - 避免在共享服务器上存储含有私钥的文件

## 合约地址配置

### 合约地址的来源和优先级

合约地址可以从两个来源获取：
1. 环境变量（.env 文件）
2. 部署状态文件（deploy-state.json）

地址加载的优先级规则：
1. 优先使用环境变量中的地址（如果地址是合法的以太坊地址）
2. 如果环境变量中的地址不合法，则使用部署状态文件中的地址（如果地址合法）
3. 如果两个地址都不合法，使用空字符串并输出警告

### 如何配置合约地址

1. 在 `.env` 文件中配置：
```bash
ROLE_MANAGER_ADDRESS=0x...
PROPERTY_REGISTRY_ADDRESS=0x...
TOKEN_FACTORY_ADDRESS=0x...
REDEMPTION_MANAGER_ADDRESS=0x...
RENT_DISTRIBUTOR_ADDRESS=0x...
FEE_MANAGER_ADDRESS=0x...
MARKETPLACE_ADDRESS=0x...
TOKEN_HOLDER_QUERY_ADDRESS=0x...
REAL_ESTATE_SYSTEM_ADDRESS=0x...
```

2. 或者通过部署脚本生成 `deploy-state.json` 文件：
```bash
npx hardhat run scripts/deploy-unified.js --network localhost
```

### 合约地址的使用

在代码中使用合约地址：
```javascript
const { getContractAddresses } = require('../../../shared/config/contracts');
const contractAddresses = getContractAddresses();
```

### 更新合约地址

1. 更新单个合约地址：
```javascript
const { updateContractAddress } = require('../../../shared/config/contracts');
updateContractAddress('roleManager', '0x...');
```

2. 保存到部署状态文件：
```javascript
const { saveToDeployState } = require('../../../shared/config/contracts');
saveToDeployState();
```

### 注意事项

1. 所有合约地址必须是合法的以太坊地址（0x开头的42位十六进制字符串）
2. 环境变量中的地址优先级最高，但必须确保地址合法
3. 如果环境变量中的地址不合法，系统会自动使用部署状态文件中的地址
4. 建议在开发环境中使用 `deploy-state.json`，在生产环境中使用环境变量配置 