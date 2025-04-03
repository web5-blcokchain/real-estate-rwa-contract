# 日本房地产资产通证化HTTP服务器实现计划

## 1. 项目概述

开发一个基于Express的HTTP服务器，封装区块链合约功能，提供RESTful API接口，使前端和其他系统能够方便地与区块链合约交互。严格遵循项目约定，确保代码质量和一致性。

## 2. 技术栈与约定遵循

- **框架**: Express.js
- **区块链交互**: Ethers.js (仅支持v6版本，约定#1)
- **依赖管理**: 使用根目录的package.json (约定#12)
- **配置管理**: 通过环境变量，使用根目录的.env文件 (约定#3, #20)
- **日志管理**: 使用根目录下的logs文件夹 (约定#4)
- **代码组织**: 复用shared模块的基础功能 (约定#5, #25, #26)

## 3. 架构设计

### 3.1 目录结构

```
server/
├── src/
│   ├── index.js                # 应用入口点
│   ├── app.js                  # Express应用配置
│   ├── config/                 # 服务器配置
│   │   └── index.js            # 配置整合
│   ├── controllers/            # API控制器 (每个ABI文件对应一个控制器)
│   │   ├── RealEstateSystemController.js
│   │   ├── PropertyManagerController.js
│   │   └── ...
│   ├── services/               # 业务逻辑
│   │   ├── BlockchainService.js    # 区块链服务
│   │   ├── PropertyManagerService.js
│   │   └── ...
│   ├── routes/                 # API路由
│   │   ├── index.js            # 路由整合
│   │   ├── realEstateSystem.js
│   │   └── ...
│   └── middlewares/            # 中间件
│       ├── index.js            # 中间件整合
│       ├── auth.js             # API密钥验证
│       ├── errorHandler.js     # 错误处理
│       └── requestLogger.js    # 请求日志
├── docs/                       # API文档
└── README.md                   # 使用说明
```

### 3.2 核心模块

1. **区块链服务**
   - 管理与区块链的连接
   - 支持三种网络类型: 本地网络、测试网、主网 (约定#9)
   - 通过环境变量确定网络类型

2. **合约服务**
   - 为每个ABI文件创建对应的服务类
   - 优先使用RealEstateFacade合约提供功能 (约定#6)
   - 通过环境变量获取账号权限 (约定#10)

3. **API控制器**
   - 为每个ABI文件创建对应的控制器
   - 命名与config/abi下文件名保持一致 (大小写一致) (约定#10)
   - 实现ABI文件中所有方法的API接口

4. **配置管理**
   - 使用根目录的.env文件 (约定#20)
   - 通过shared模块读取环境变量 (约定#6)
   - 不使用硬编码值 (约定#3)

## 4. 实现细节

### 4.1 环境变量管理

使用shared模块的环境变量管理功能，确保符合约定#3和#20:

```javascript
// 使用shared模块的EnvConfig
const { EnvConfig } = require('../../shared/src/config');

// 获取网络类型
const networkType = EnvConfig.getNetworkType();

// 获取合约地址
const contractAddresses = EnvConfig.getContractAddresses();
```

### 4.2 日志管理

使用根目录下的logs文件夹，符合约定#4:

```javascript
// 使用shared模块的Logger
const { Logger } = require('../../shared/src/utils');

// 配置日志路径
Logger.setPath('http-server');

// 记录日志
Logger.info('API请求', { method, path, params });
```

### 4.3 合约交互

仅使用Ethers.js v6版本，符合约定#1:

```javascript
// 使用shared模块的合约交互功能
const { Contract, Provider } = require('../../shared/src/core');

// 创建Provider实例
const provider = await Provider.create();

// 创建合约实例
const contract = await Contract.create({
  name: 'PropertyManager',
  provider
});
```

### 4.4 API接口实现

为每个ABI文件实现对应的控制器，保持名称一致性，符合约定#10:

```javascript
// PropertyManagerController.js
async function registerProperty(req, res, next) {
  try {
    // 调用服务方法
    const result = await propertyManagerService.registerProperty(req.body);
    
    // 返回结果
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}
```

### 4.5 API认证

实现简单的API密钥认证，符合约定#8:

```javascript
// 中间件: auth.js
function apiKey(req, res, next) {
  // 从URL参数或请求头获取API密钥
  const key = req.query.api_key || req.headers['x-api-key'];
  
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '未授权访问'
      }
    });
  }
  
  next();
}
```

## 5. 实现步骤

### 5.1 初始化阶段

1. **分析ABI文件**
   - 分析config/abi目录下的所有ABI文件
   - 理解每个合约的功能和方法
   - 设计对应的API接口

2. **搭建基础架构**
   - 设置Express应用
   - 配置基础中间件
   - 实现API密钥验证

3. **区块链连接**
   - 实现BlockchainService
   - 配置网络连接
   - 测试连接稳定性

### 5.2 核心功能实现

1. **合约服务实现**
   - 为每个ABI文件创建服务类
   - 实现合约方法调用
   - 处理参数转换

2. **控制器实现**
   - 为每个ABI文件创建控制器
   - 实现API接口
   - 参数验证和响应格式化

3. **路由设置**
   - 定义API路由
   - 连接控制器方法
   - 添加中间件(认证等)

### 5.3 文档和测试

1. **API文档生成**
   - 为每个API添加Swagger注释
   - 生成API文档
   - 提供使用示例

2. **测试脚本**
   - 创建API测试脚本
   - 测试基本接口调用 (约定#9)
   - 测试核心业务流程 (约定#9)

## 6. 重点注意事项

### 6.1 代码质量

- 保持代码整洁和一致 (约定#13, #27)
- 不增加无关功能，减少不必要的逻辑 (约定#6)
- 优先使用现有代码，避免重复造轮子 (约定#21, #25)
- 使用CommonJS规范组织模块 (约定#19)

### 6.2 合约调用

- 所有合约调用通过shared模块进行
- 优先调用RealEstateFacade合约 (约定#6)
- 处理网络切换和连接问题

### 6.3 错误处理

- 统一的错误处理机制
- 详细的错误日志
- 用户友好的错误消息

### 6.4 跨平台兼容

- 使用JavaScript/TypeScript编写脚本 (约定#15)
- 避免平台相关的API
- 测试不同操作系统环境

## 7. 与其他模块的关系

- **依赖shared模块**: 复用基础功能，如合约交互、环境变量管理 (约定#5, #25)
- **不依赖其他模块**: HTTP服务器是独立的，提供API接口供其他系统调用
- **配置依赖**: 使用根目录的.env文件 (约定#20)

## 8. 交付物

1. **完整的HTTP服务器**
   - 支持所有ABI文件中的合约功能
   - 提供RESTful API接口
   - 实现API密钥认证

2. **API文档**
   - Swagger UI界面
   - 详细的接口说明
   - 使用示例

3. **测试脚本**
   - 基本接口测试
   - 业务流程测试

## 9. 实施计划

1. **第一阶段**: 基础架构搭建 (3天)
   - 设置项目结构
   - 实现基础中间件
   - 配置区块链连接

2. **第二阶段**: 核心功能实现 (7天)
   - 实现所有合约服务
   - 开发API控制器
   - 设置API路由

3. **第三阶段**: 文档和测试 (3天)
   - 生成API文档
   - 编写测试脚本
   - 进行集成测试

4. **第四阶段**: 优化和完善 (2天)
   - 性能优化
   - 错误处理完善
   - 代码质量审查

## 10. 成功标准

1. 所有ABI文件中的合约功能都有对应的API接口
2. API接口符合RESTful设计原则
3. 提供完整的API文档
4. 支持不同网络环境(本地、测试网、主网)
5. 代码符合项目约定和最佳实践

通过严格遵循项目约定，我们将构建一个高质量、可靠的HTTP服务器，提供统一的区块链合约访问接口，方便前端和其他系统与区块链交互。
