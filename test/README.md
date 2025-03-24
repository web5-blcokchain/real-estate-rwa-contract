# 测试说明

本目录包含用于测试日本房产资产上链系统的测试脚本。

## 测试文件

- `MockFlowTest.js` - 使用JavaScript模拟对象测试整个业务流程，不依赖合约实现
- `SimpleE2EFlow.test.js` - 简化版的端到端测试，测试基本组件交互
- `E2EFlow.test.js` - 完整的端到端流程测试（需要所有合约编译成功）
- `TokenInteractions.test.js` - 测试房产代币交互功能
- `UpgradeScenarios.test.js` - 测试合约升级场景

## 运行测试

### 运行所有测试

```bash
npx hardhat test
```

### 运行特定测试文件

```bash
npx hardhat test test/MockFlowTest.js
```

### 运行特定测试套件

```bash
npx hardhat test --grep "模拟房产资产业务流程测试"
```

## 模拟测试说明

`MockFlowTest.js` 实现了使用纯JavaScript模拟对象的测试方法，完全不依赖实际合约的实现。这种测试方法的优点是：

1. 可以在合约实现之前编写测试，指导开发
2. 测试运行速度快，不需要部署合约
3. 可以模拟各种边界情况和异常情况

模拟测试覆盖以下业务流程：

1. 系统初始化与角色设置
2. 房产注册与代币化
3. 代币交易与白名单管理
4. 租金分发
5. 赎回流程

## 编写新测试

添加新测试时，请遵循以下建议：

1. 为每个测试套件添加清晰的描述
2. 使用 `before` 和 `beforeEach` 钩子设置测试环境
3. 每个测试只测试一个功能点
4. 使用适当的断言验证结果
5. 添加日志输出以便调试

## 注意事项

- 运行 `E2EFlow.test.js` 需要确保所有合约都已正确实现并编译
- 如果遇到合约依赖问题，请优先运行 `MockFlowTest.js` 测试业务逻辑
- 升级测试需要理解UUPS升级模式的工作原理 