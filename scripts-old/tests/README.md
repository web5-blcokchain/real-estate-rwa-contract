# 智能合约测试策略

本目录包含用于验证系统部署和功能的测试脚本。这些测试旨在确保合约部署正确并且系统的各个组件能够正常协同工作。

## 测试文件结构

```
tests/
├── deployment-test.js         # 基础部署验证测试
├── basic-processes-test.js    # 基础业务流程测试（不含代币创建）
├── business-processes-test.js # 完整业务流程测试（含代币相关功能）
├── business-flow-test.js      # 业务流程统一入口测试
├── test-flow.js               # 通用测试流程和功能组件
└── processes/                 # 测试流程组件目录
    ├── property-process.js    # 房产注册相关测试函数
    ├── token-process.js       # 代币相关测试函数
    └── rent-process.js        # 租金分配相关测试函数
```

## 测试脚本说明

### 1. 部署验证测试 (`deployment-test.js`)

基本部署验证测试，确保所有合约已正确部署并且关键合约关系已建立。
这个测试在每次部署后自动运行。

测试内容：
- 检查所有必要合约已部署
- 验证合约地址有效
- 检查部署者拥有超级管理员角色
- 验证RealEstateSystem合约中的关键合约引用正确

使用场景：
- 部署完成后立即验证
- 升级合约后验证系统连接性

### 2. 基础业务流程测试 (`basic-processes-test.js`)

基础功能测试，验证系统的关键组件能够正常工作，但不依赖于代币创建功能。
这个测试适用于初始部署验证，即使未设置代币实现也能执行。

测试内容：
- 角色权限验证
- 房产注册和批准
- 系统合约关系验证
- 费用管理功能
- 系统状态控制

使用场景：
- 初始部署后的功能验证
- 在不涉及代币的系统组件变更后验证

### 3. 完整业务流程测试 (`business-processes-test.js`)

完整的业务流程测试，包括代币创建和交易。**注意：** 这个测试依赖于有效的代币实现，
必须确保TokenFactory的tokenImplementation地址已正确设置。

测试内容：
- 房产注册和批准
- 代币创建
- 代币交易（转账）
- 租金分配
- 代币赎回

使用场景：
- 完整系统验证
- 代币实现更新后的功能确认
- 生产环境前的最终验证

### 4. 业务流程统一入口 (`business-flow-test.js`)

业务流程的统一入口，整合了多个测试流程，提供了更完整的系统验证。这个文件调用了
`test-flow.js`中的测试组件。

测试内容：
- 多角色交互测试
- 完整业务流程端到端测试
- 系统状态验证

使用场景：
- 系统集成测试
- 模拟实际使用场景的验证

### 5. 测试流程和功能组件 (`test-flow.js`)

包含可重用的测试函数和流程，被其他测试脚本调用。提供了基础的测试功能和通用的测试逻辑。

内容：
- 测试工具函数
- 通用测试流程
- 报告生成逻辑

### 6. 测试流程组件目录 (`processes/`)

包含按功能分类的测试流程组件，每个文件专注于系统的特定方面：

- `property-process.js`: 房产注册、批准和管理测试
- `token-process.js`: 代币创建、转移和管理测试
- `rent-process.js`: 租金收集、分配和提取测试

## 运行测试

可以通过以下命令手动运行测试：

```bash
# 运行部署验证测试
npx hardhat run scripts/tests/deployment-test.js --network <网络名>

# 运行基础业务流程测试
npx hardhat run scripts/tests/basic-processes-test.js --network <网络名>

# 运行完整业务流程测试（需要代币实现）
npx hardhat run scripts/tests/business-processes-test.js --network <网络名>

# 运行业务流程统一测试
npx hardhat run scripts/tests/business-flow-test.js --network <网络名>
```

或者使用部署脚本进行自动测试：

```bash
# 部署并自动运行测试
./deploy.sh local

# 仅运行测试而不重新部署
./deploy.sh local --no-deploy --test-only
```

## 测试日志和报告

测试输出会显示在控制台上，同时也会记录在以下位置：

- `scripts/logging/tests/`: 测试日志目录
- `scripts/logging/tests/YYYY-MM-DD-HH-MM-SS-test-summary.log`: 带时间戳的测试日志

日志中的关键信息会用以下符号标记：
- ✅ 测试通过
- ❌ 测试失败
- ℹ️ 信息性消息
- ⚠️ 警告

## 问题排查指南

如果测试失败，请按以下步骤排查问题：

1. **部署问题**:
   - 检查部署是否成功完成（查看`deploy-state.json`）
   - 验证合约地址是否有效（使用区块浏览器或控制台）

2. **代币实现问题**:
   - 检查TokenFactory的tokenImplementation地址：
     ```javascript
     const tf = await ethers.getContractAt("TokenFactory", "<地址>");
     console.log(await tf.tokenImplementation());
     ```
   - 如果为零地址，运行`deploy-token-implementation.js`

3. **权限问题**:
   - 确认测试账户有正确的角色权限
   - 运行`setup-roles.js`重新设置角色

4. **网络问题**:
   - 确保连接到正确的网络
   - 检查RPC连接状态

5. **Gas和余额问题**:
   - 确保测试账户有足够的ETH余额
   - 调整硬件钱包的gas设置

## 自定义测试

如需创建自定义测试，建议基于现有测试脚本修改：

1. 复制最接近你需求的测试文件
2. 修改测试流程和参数
3. 确保导入所有必要的合约和工具函数
4. 添加详细的日志输出，便于调试 