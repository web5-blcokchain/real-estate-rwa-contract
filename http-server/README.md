# HTTP-Server 模块

本模块提供了基于Express的HTTP API服务，用于与区块链智能合约交互。它封装了智能合约的功能，为前端应用和其他服务提供RESTful API接口。

## 目录结构

```
http-server/
├── controllers/        # 控制器，处理业务逻辑
├── middleware/         # 中间件，如认证、权限验证等
├── routes/             # 路由定义
├── scripts/            # 测试和工具脚本
├── utils/              # 工具函数和辅助模块
├── app.js              # 应用主入口
└── README.md           # 本文档
```

## 环境要求

- Node.js 16.x 或更高版本
- 项目根目录下的.env文件配置

## 安装依赖

在项目根目录下运行:

```bash
yarn install
```

## 启动服务

在项目根目录下运行:

```bash
# 开发模式启动
yarn run http-server:dev

# 生产模式启动
yarn run http-server:start
```

默认端口为3001，可以在.env文件中通过HTTP_PORT变量修改。

## 测试脚本

我们提供了多个测试脚本来验证API功能：

### 房产相关测试

```bash
# 测试房产相关API（注册房产、获取房产信息等）
node http-server/scripts/test-real-estate-api.js
```

这个脚本会测试房产的注册、查询、状态更新等功能，并将房产ID缓存到`cache/property-cache.json`文件中，供其他测试脚本使用。

### 奖励分配测试

```bash
# 测试奖励分配相关API（创建分配、查询分配、提取分红等）
node http-server/scripts/test-reward-api.js
```

这个脚本会测试创建分配、更新分配状态、使用Merkle树进行分配等功能，它依赖于`property-cache.json`中缓存的房产ID。

## 缓存机制

系统使用简单的文件缓存来存储关键数据：

- **房产缓存**: `cache/property-cache.json` - 存储最近注册的房产ID
- **分配缓存**: `cache/distribution-cache.json` - 存储分配相关信息

缓存文件会在首次运行相关测试脚本时自动创建。

## API文档

### 房产相关API

- `GET /api/v1/real-estate/property/:id` - 获取房产信息
- `POST /api/v1/real-estate/register-property` - 注册新房产
- `PUT /api/v1/real-estate/property-status` - 更新房产状态
- `PUT /api/v1/real-estate/property-valuation` - 更新房产估值

### 奖励分配API

- `GET /api/v1/reward/distributions` - 获取所有分配ID
- `GET /api/v1/reward/distribution/:distributionId` - 获取分配详情
- `POST /api/v1/reward/create-distribution` - 创建新分配
- `POST /api/v1/reward/update-merkle-root` - 更新分配的Merkle根
- `PUT /api/v1/reward/distribution/:id/status` - 更新分配状态
- `POST /api/v1/reward/distribution/:id/withdraw` - 提取分红
- `POST /api/v1/reward/distribution/:id/recover` - 管理员回收未领取的资金

## 角色权限

系统支持多种用户角色：

- **admin**: 管理员权限，可以执行所有操作
- **manager**: 管理者权限，可以创建和管理房产、分配
- **user**: 普通用户权限，可以查询信息和提取分红

角色验证通过URL参数 `role` 进行，如 `?role=admin`。

## 常见问题

### 无法连接到区块链节点

确保本地Hardhat节点已启动：

```bash
npx hardhat node
```

### 测试脚本报错

1. 确保合约已部署并且地址正确配置在.env文件中
2. 确保已经运行过 `test-real-estate-api.js` 创建了房产缓存
3. 检查稳定币合约地址是否配置正确（CONTRACT_TESTTOKEN_ADDRESS）

## 贡献指南

1. 遵循项目的编码约定
2. 保持代码逻辑简洁，不添加不必要的复杂性
3. 使用中文注释
4. 修改前检查是否有现有功能可以复用 