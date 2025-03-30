# 部署工具架构设计

## 架构概述

部署工具采用三层架构设计，分离关注点，实现灵活而强大的部署功能：

```
┌───────────────────────────────────────┐
│            SystemDeployer             │ 第3层：系统层
│ (部署策略、合约依赖管理、系统级操作)    │ (deployment-system.js)
└───────────────────┬───────────────────┘
                    │
┌───────────────────▼───────────────────┐
│           Deployment Core              │ 第2层：核心层
│   (合约部署、库部署、记录保存等核心功能) │ (deployment-core.js)
└───────────────────┬───────────────────┘
                    │
┌───────────────────▼───────────────────┐
│          DeploymentState               │ 第1层：状态层
│      (部署状态管理、持久化和读取)       │ (deployment-state.js)
└───────────────────────────────────────┘
```

## 第1层：状态层 (deployment-state.js)

基础层负责部署状态的持久化和读取，管理合约地址、配置和时间戳。

**主要功能**：
- 读取和保存合约地址
- 管理部署时间戳
- 提供向后兼容旧API的函数
- 处理文件IO和状态持久化

**特点**：
- 无业务逻辑依赖，只关注状态管理
- 为上层提供简单API访问部署状态
- 定义基本数据结构和接口

## 第2层：核心层 (deployment-core.js)

核心层提供合约部署的基础功能，包括直接部署、可升级部署和库合约部署。

**主要功能**：
- 单个合约部署 (`deployContract`)
- 库合约部署 (`deployLibraries`)
- 可升级合约部署 (`deployUpgradeableContract`)
- 合约升级 (`upgradeContract`)
- 部署记录保存 (`saveDeploymentRecord`)
- 合约验证 (`verifyContract`)

**特点**：
- 依赖状态层管理部署状态
- 提供丰富的部署选项和配置
- 处理错误重试、交易确认等细节
- 包含默认配置选项

## 第3层：系统层 (deployment-system.js)

系统层负责协调整个系统的部署流程，管理合约间的依赖关系。

**主要功能**：
- 完整系统部署 (`deploySystem`)
- 部署策略管理
- 合约依赖处理
- 角色配置
- 部署状态跟踪

**特点**：
- 提供高级接口简化复杂部署
- 管理多个合约的依赖和部署顺序
- 支持不同部署策略（直接、可升级、最小化）
- 集成角色配置等系统级功能

## 使用示例

### 简单部署单个合约

```javascript
const { deploymentCore } = require('../shared/utils');

async function deployTokenFactory() {
  const Contract = await ethers.getContractFactory('TokenFactory');
  
  const result = await deploymentCore.deployContract(
    Contract,
    'TokenFactory',
    [roleManagerAddress, propertyRegistryAddress],
    { force: true }
  );
  
  console.log(`TokenFactory 部署成功: ${result.contractAddress}`);
}
```

### 使用系统部署器部署整个系统

```javascript
const { SystemDeployer, DEPLOYMENT_STRATEGIES } = require('../shared/utils');

async function deployEntireSystem() {
  // 创建部署器
  const deployer = new SystemDeployer({
    strategy: DEPLOYMENT_STRATEGIES.UPGRADEABLE,
    force: true,
    network: 'hardhat'
  });
  
  // 部署整个系统
  const result = await deployer.deploySystem({
    libraries: ['SystemDeployerLib1', 'SystemDeployerLib2'],
    roles: {
      ADMIN_ROLE: adminAddress,
      OPERATOR_ROLE: operatorAddress
    }
  });
  
  console.log('系统部署成功:', result.contractAddresses);
}
```

## 优势与特点

1. **关注点分离**：每层专注于不同职责，代码更清晰
2. **灵活配置**：提供多级配置选项，满足不同部署需求
3. **可扩展性**：易于添加新功能而不影响现有功能
4. **错误处理**：健壮的错误处理和重试机制
5. **向后兼容**：保持对旧API的兼容性
6. **部署策略**：支持多种部署策略以适应不同场景

## 配置选项

系统提供丰富的配置选项，包括：

```javascript
const options = {
  // 交易选项
  transaction: {
    gasLimitMultiplier: 1.5,  // Gas限制倍数
    gasPrice: null,           // Gas价格（null表示自动）
    priority: 'normal',       // 优先级：'low', 'normal', 'high'
    confirmations: 1          // 确认数
  },
  
  // 重试选项
  retry: {
    maxRetries: 3,            // 最大重试次数
    retryInterval: 5000,      // 重试间隔（毫秒）
    retryMultiplier: 1.5      // 重试间隔增长倍数
  },
  
  // 升级选项
  upgrade: {
    kind: 'uups',             // 代理类型
    timeout: 60000            // 超时时间（毫秒）
  },
  
  // 验证选项
  verify: {
    enabled: false,           // 是否验证合约
    delay: 60000              // 验证延迟（毫秒）
  },
  
  // 记录选项
  records: {
    saveRecords: true,        // 是否保存部署记录
    generateSummary: true     // 是否生成摘要
  }
};
```

## 未来扩展

1. **链上监控**：集成链上监控功能，跟踪部署状态
2. **部署测试**：自动化部署后测试
3. **多网络支持**：增强多网络部署和配置
4. **交互式部署**：提供交互式部署界面 