# 合约ABI管理

## 概述

本项目使用Hardhat编译框架管理智能合约ABI（应用二进制接口）文件。ABI文件是应用程序与区块链智能合约交互的基础，它们定义了合约函数和事件的接口规范。

## ABI文件位置

项目中的ABI文件存储在以下位置（Hardhat标准输出目录）：

```
artifacts/
└── contracts/           # 合约编译产物，包含完整ABI
    ├── ContractName.sol/
    │   └── ContractName.json
    └── ...
```

## ABI更新流程

系统通过以下机制保持ABI文件的同步和更新：

1. **自动编译**: 通过 `npx hardhat compile` 编译合约后，Hardhat会自动更新ABI
2. **版本控制**: ABI文件纳入版本控制系统，确保所有开发者使用统一版本
3. **缓存机制**: 在运行时首次加载ABI后会进行缓存，提高性能

### 更新步骤

1. 编译合约
   ```bash
   npx hardhat compile
   ```

2. 验证ABI更新
   ```bash
   git diff artifacts/contracts
   ```

## 使用方法

### 通过共享工具获取ABI

推荐使用共享工具模块提供的函数获取ABI：

```javascript
const { getAbi, initializeAbis } = require('../shared/utils');

// 初始化所有主要合约ABI
initializeAbis();

// 获取特定合约ABI
const roleManagerAbi = getAbi('RoleManager');
```

### 直接访问ABI文件

如果需要直接访问ABI文件，可以使用：

```javascript
const roleManagerAbi = require('../artifacts/contracts/RoleManager.sol/RoleManager.json').abi;
```

## ABI缓存

系统使用两级缓存机制提高性能：

1. **内存缓存**: 运行期间在内存中缓存已加载的ABI
2. **文件缓存**: 在 `shared/cache/abi-cache.json` 中保存所有已加载的ABI

缓存文件不应纳入版本控制，但会在首次运行后自动创建。

## 排错指南

### ABI不匹配问题

如果遇到合约交互错误，可能是ABI不匹配，解决方法：

1. 确保已编译最新版本的合约： `npx hardhat compile`
2. 删除 `shared/cache/abi-cache.json` 清除缓存
3. 重启应用程序

### 缺失ABI文件

如果特定合约的ABI文件缺失：

1. 检查合约名称拼写是否正确
2. 确保合约已成功编译
3. 确认 `artifacts/contracts/{ContractName}.sol/{ContractName}.json` 文件存在 