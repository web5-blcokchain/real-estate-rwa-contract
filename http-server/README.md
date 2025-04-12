# Japanese Real Estate Tokenization Platform - HTTP API Server

## 背景介绍

本HTTP API服务器是日本房地产代币化平台（Japan RWA）的后端服务组件，为整个系统提供标准化的RESTful API接口，实现了区块链智能合约与前端应用之间的桥梁。该服务使用Express.js框架构建，集成了Swagger文档、认证中间件、合约交互等功能，为基于区块链的房地产资产代币化提供完整的API支持。

系统主要实现以下业务功能：
- 房产资产数字化与代币化
- 房产代币交易（买单/卖单）
- 资产价值评估与状态管理
- 房产收益分配与提取
- 用户权限与角色管理

## 系统架构

```
+----------------+     +----------------+     +----------------+
|                |     |                |     |                |
|  前端应用       |<--->|  HTTP API服务器 |<--->|  区块链网络     |
|                |     |                |     |                |
+----------------+     +----------------+     +----------------+
                               ^
                               |
                               v
                       +----------------+
                       |                |
                       |  共享模块       |
                       |                |
                       +----------------+
```

### 核心组件

```
+-----------------+
|    HTTP服务器    |
+-----------------+
         |
+--------v--------+
|                 |
|   控制器层       |
|  Controllers    |
|                 |
+--------+--------+
         |
+--------v--------+
|                 |
|   服务层         |
|   Services      |
|                 |
+--------+--------+
         |
+--------v--------+
|                 |
|   区块链交互层   |
|  ContractUtils  |
|                 |
+--------+--------+
         |
+--------v--------+
|                 |
|   智能合约层     |
|   Contracts     |
|                 |
+-----------------+
```

## 目录结构

```
http-server/
├── app.js                 # 服务器入口文件
├── config.js              # 配置文件
├── controllers/           # API控制器
│   ├── BaseController.js  # 基础控制器
│   ├── index.js           # 控制器索引
│   └── RealEstateFacadeController.js # 不动产外观控制器
├── middleware/            # 中间件
│   ├── auth.js            # 身份验证中间件
│   └── index.js           # 中间件索引
├── routes/                # 路由定义
│   ├── index.js           # 路由索引
│   └── realEstate.js      # 不动产路由
├── swagger/               # Swagger文档
│   └── swagger.js         # Swagger配置
├── utils/                 # 工具函数
│   └── index.js           # 工具索引
└── static/                # 静态资源
```

## 技术栈

- **Node.js**: v18+ 运行环境
- **Express.js**: Web应用框架
- **Swagger/OpenAPI**: API文档生成
- **ethers.js**: 以太坊交互库
- **Winston**: 日志记录
- **CORS/Helmet**: 安全中间件
- **dotenv**: 环境变量管理

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0 或 Yarn >= 1.22.19
- 以太坊兼容网络（本地、测试网或主网）

### 安装依赖

```bash
# 使用yarn
yarn install

# 使用npm
npm install
```

### 配置环境变量

创建一个`.env`文件（可从`.env.example`复制），并设置以下环境变量：

```env
# 服务器配置
PORT=3000
HOST=localhost

# API认证
API_KEY=your_api_key_here

# 区块链网络配置
NETWORK=localhost
RPC_URL=http://127.0.0.1:8545

# 角色钱包私钥（开发环境使用，生产环境应使用其他安全机制）
ADMIN_PRIVATE_KEY=0x...
MANAGER_PRIVATE_KEY=0x...
OPERATOR_PRIVATE_KEY=0x...

# 智能合约地址
CONTRACT_REALESTATEFACADE_ADDRESS=0x...
CONTRACT_PROPERTYMANAGER_ADDRESS=0x...
CONTRACT_TRADINGMANAGER_ADDRESS=0x...

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json
```

### 启动服务器

#### 开发模式

开发模式支持热重载，适合开发调试：

```bash
# 使用yarn
yarn http:dev

# 使用npm
npm run http:dev
```

#### 生产模式

```bash
# 使用yarn
yarn http:start

# 使用npm
npm run http:start
```

服务器默认启动在 `http://localhost:3000`

### 访问Swagger API文档

启动服务后，访问 `http://localhost:3000/api-docs` 查看API文档并进行交互测试。

## API认证

所有API请求需要通过API密钥进行认证，除了公开的API端点（如状态检查）。

认证方式：在URL查询参数中添加`apiKey`参数：

```
GET /api/v1/real-estate/property/12345?apiKey=your_api_key_here
```

API密钥在服务器启动时从环境变量或默认配置中加载。

## 角色权限

系统支持以下角色：

- **admin**: 管理员角色，拥有所有权限
- **manager**: 管理者角色，可以管理房产状态、估值、创建分配等
- **operator**: 操作员角色，可以执行基本操作
- **user**: 普通用户角色，可以查询信息和执行交易

角色通过查询参数`role`指定：

```
GET /api/v1/real-estate/property/12345?apiKey=your_api_key_here&role=admin
```

## API端点

API根路径：`/api/v1`

### 不动产资产管理

| 方法 | 路径 | 描述 | 所需角色 |
|------|------|------|----------|
| GET | /real-estate/property/:propertyId | 获取房产信息 | 公开 |
| POST | /real-estate/register-property | 注册新房产 | manager, admin |
| PUT | /real-estate/property-status | 更新房产状态 | manager, admin |
| PUT | /real-estate/property-valuation | 更新房产估值 | manager, admin |

### 交易管理

| 方法 | 路径 | 描述 | 所需角色 |
|------|------|------|----------|
| POST | /real-estate/create-sell-order | 创建卖单 | 任何认证用户 |
| POST | /real-estate/create-buy-order | 创建买单 | 任何认证用户 |

### 收益分配

| 方法 | 路径 | 描述 | 所需角色 |
|------|------|------|----------|
| POST | /real-estate/create-distribution | 创建奖励分配 | manager, admin |
| POST | /real-estate/withdraw | 提取分红 | 任何认证用户 |

## 测试

### API接口测试

使用提供的测试脚本进行API接口测试：

```bash
# 使用yarn
yarn test:api

# 使用npm
npm run test:api
```

测试脚本执行流程：
1. 注册新房产
2. 获取房产信息
3. 更新房产状态
4. 更新房产估值
5. 创建卖单
6. 创建买单
7. 创建奖励分配
8. 提取分红

### 手动测试

可以使用curl或Postman等工具手动测试API：

```bash
# 获取房产信息
curl "http://localhost:3000/api/v1/real-estate/property/12345?apiKey=123456"

# 注册新房产
curl -X POST "http://localhost:3000/api/v1/real-estate/register-property?apiKey=123456&role=admin" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "12345",
    "country": "JP",
    "metadataURI": "ipfs://QmXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "initialSupply": "1000",
    "tokenName": "测试房产Token",
    "tokenSymbol": "TEST"
  }'
```

## 错误处理

API返回标准化的错误响应：

```json
{
  "success": false,
  "error": "错误类型",
  "message": "详细错误信息",
  "timestamp": "2025-04-12T06:08:49.844Z"
}
```

常见错误码：

- `400`: 请求参数错误
- `401`: 认证失败
- `403`: 权限不足
- `404`: 资源不存在
- `500`: 服务器内部错误

## 日志系统

系统使用Winston日志库记录日志，支持多级别日志（error, warn, info, http, verbose, debug, silly）和多目标输出（控制台、文件）。

日志文件位于项目根目录的`logs`文件夹中：
- `error.log`: 仅错误日志
- `combined.log`: 所有级别日志

## 部署

### 开发环境

1. 启动本地以太坊节点：
```bash
npx hardhat node
```

2. 部署智能合约到本地网络：
```bash
yarn deploy:local
```

3. 启动HTTP服务器：
```bash
yarn http:dev
```

### 测试网络

1. 确保`.env`文件中配置了正确的测试网络RPC URL和私钥
2. 部署智能合约到测试网络：
```bash
yarn deploy:testnet
```

3. 更新`.env`文件中的合约地址
4. 启动HTTP服务器：
```bash
yarn http:start
```

### 生产环境

1. 配置生产环境的环境变量
2. 使用PM2或类似工具部署：
```bash
pm2 start http-server/app.js --name "japan-rwa-api"
```

## 区块链交互

系统使用`ContractUtils`类与区块链智能合约交互，主要功能包括：

- 获取合约实例
- 发送交易
- 等待交易确认
- 处理交易事件

示例：

```javascript
// 获取合约实例
const contract = ContractUtils.getContractForController('RealEstateFacade', 'admin');

// 发送交易
const tx = await contract.registerPropertyAndCreateToken(propertyId, country, metadataURI, initialSupply, tokenName, tokenSymbol);

// 等待交易确认
const receipt = await ContractUtils.waitForTransaction(tx);
```

## 设计模式

### 控制器模式

系统使用控制器模式组织API端点逻辑，所有控制器继承自`BaseController`，实现了统一的错误处理、参数验证等基础功能。

### 外观模式

`RealEstateFacadeController`提供了一个统一的外观，封装了多个底层智能合约的交互细节，简化了API层与区块链层的交互。

### 中间件模式

系统使用Express中间件模式实现了认证、角色验证、日志记录等横切关注点。

## 故障排除

### 常见问题

1. **无法连接到区块链节点**
   - 检查RPC URL是否正确
   - 确认区块链节点是否运行

2. **API认证失败**
   - 确认API密钥是否正确
   - 检查环境变量配置

3. **交易失败**
   - 检查角色钱包是否有足够的ETH支付gas费
   - 查看日志了解详细错误信息

### 调试技巧

1. 设置更详细的日志级别：
```
LOG_LEVEL=debug
```

2. 使用Swagger UI进行交互式测试

3. 检查合约ABI是否与已部署合约匹配

## 联系和支持

如有问题或需要支持，请联系项目管理团队。

## 贡献指南

1. Fork仓库
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 许可证

MIT License 