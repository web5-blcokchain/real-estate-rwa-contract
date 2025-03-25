# 合约ABI管理

## 概述

本目录管理日本房产代币化平台使用的所有智能合约ABI（应用二进制接口）文件。ABI文件是应用程序与区块链智能合约交互的基础，它们定义了合约函数和事件的接口规范。

## 目录结构

```
contracts/
├── abis/               # ABI JSON文件
│   ├── RoleManager.json
│   ├── PropertyRegistry.json
│   ├── TokenFactory.json
│   ├── RealEstateToken.json
│   ├── RedemptionManager.json
│   ├── RentDistributor.json
│   ├── FeeManager.json
│   ├── Marketplace.json
│   ├── TokenHolderQuery.json
│   ├── RealEstateSystem.json
│   └── ... 
└── README.md           # 本文档
```

## ABI更新流程

系统通过以下机制保持ABI文件的同步和更新：

1. **自动更新**: 合约编译后，运行 `npm run update-abis` 自动提取最新的ABI并更新文件
2. **版本控制**: ABI文件纳入版本控制系统，确保所有开发者使用统一版本
3. **缓存机制**: 在运行时首次加载ABI后会进行缓存，提高性能

### 更新步骤

1. 编译合约
   ```bash
   npx hardhat compile
   ```

2. 运行ABI更新脚本
   ```bash
   npm run update-abis
   ```

3. 验证ABI更新
   ```bash
   git diff shared/contracts/abis
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
const roleManagerAbi = require('../shared/contracts/abis/RoleManager.json');
```

## ABI缓存

系统使用两级缓存机制提高性能：

1. **内存缓存**: 运行期间在内存中缓存已加载的ABI
2. **文件缓存**: 在 `shared/cache/abi-cache.json` 中保存所有已加载的ABI

缓存文件不应纳入版本控制，但会在首次运行后自动创建。

## 排错指南

### ABI不匹配问题

如果遇到合约交互错误，可能是ABI不匹配，解决方法：

1. 确保已编译最新版本的合约
2. 运行 `npm run update-abis` 更新ABI文件
3. 删除 `shared/cache/abi-cache.json` 清除缓存
4. 重启应用程序

### 缺失ABI文件

如果特定合约的ABI文件缺失：

1. 检查合约名称拼写是否正确
2. 确保合约已成功编译
3. 手动将合约ABI从 `artifacts/contracts/{ContractName}.sol/{ContractName}.json` 中的 `abi` 字段复制到对应的ABI文件 