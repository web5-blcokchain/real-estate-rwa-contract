# 配置管理模块

## 概述

配置管理模块负责管理系统的所有配置项，包括网络设置、合约地址、角色权限等。该模块旨在提供统一的配置接口，确保系统各组件使用一致的配置。

## 文件结构

| 文件名 | 说明 |
|--------|------|
| `index.js` | 配置入口，整合所有配置模块 |
| `contracts.js` | 合约地址管理 |
| `networks.js` | 网络配置管理 |
| `keys.js` | 私钥管理 |
| `environment.js` | 环境变量处理 |
| `deployment.js` | 部署配置 |
| `ConfigManager.js` | 通用配置管理器 |

## 主要功能

### 合约地址管理 (`contracts.js`)

管理系统所有智能合约的地址，提供统一的接口读取和更新合约地址。

```javascript
const { contracts } = require('../shared/config');

// 获取合约地址
const marketplaceAddress = contracts.getContractAddress('marketplace');

// 更新合约地址
contracts.updateContractAddress('marketplace', '0x...');

// 保存到部署状态文件
contracts.saveToDeployState();
```

### 网络配置 (`networks.js`)

管理不同网络（本地开发、测试网、主网）的配置。

```javascript
const { networks } = require('../shared/config');

// 获取当前网络配置
const currentNetwork = networks.getCurrentNetwork();

// 获取特定网络配置
const testnetConfig = networks.getNetwork('testnet');
```

### 私钥管理 (`keys.js`)

安全地管理系统使用的私钥，包括加密存储和访问控制。

```javascript
const { keys } = require('../shared/config');

// 获取角色私钥
const adminKey = keys.getKey('admin');

// 设置角色私钥
keys.setKey('operator', '0x...');
```

## 维护指南

### 添加新配置

1. 确定配置所属的功能领域
2. 在相应的模块中添加配置项
3. 遵循现有的命名和组织模式
4. 在 `index.js` 中导出新配置项
5. 添加适当的文档和注释

### 修改现有配置

1. 尽量保持向后兼容性
2. 为重大变更提供迁移路径
3. 更新相关文档

### 环境变量

1. 所有敏感信息应使用环境变量
2. 在 `environment.js` 中定义环境变量处理逻辑
3. 为环境变量提供合理的默认值

## 最佳实践

1. **集中配置**: 所有配置都应在该模块中定义，避免在代码中硬编码
2. **环境隔离**: 为不同环境（开发、测试、生产）提供独立的配置
3. **版本控制**: 敏感配置不应直接提交到版本控制系统
4. **验证**: 加载配置时应验证其完整性和有效性
5. **默认值**: 为所有配置提供合理的默认值 