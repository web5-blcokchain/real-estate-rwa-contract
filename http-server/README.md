# 日本房地产资产通证化 HTTP API 服务器

## 项目说明

本项目是日本房地产资产通证化平台的 HTTP API 服务器组件，负责将区块链智能合约的功能通过 RESTful API 提供给客户端应用。API 服务器直接与区块链网络交互，隐藏了底层区块链操作的复杂性，提供简洁统一的接口供前端或第三方系统使用。

### 核心功能

- 房产资产上链管理（注册、查询、通证化）
- 房产通证交易功能（挂单、购买、取消）
- 分红管理（创建分红、查询分红、领取分红）
- 角色权限管理（角色分配、权限控制）
- 区块链网络状态监控
- API 密钥认证

## 系统架构

HTTP API 服务器是整个系统的中间层，连接前端应用和区块链网络：

```
+---------------+        +----------------+        +-------------------+
|               |        |                |        |                   |
| 前端应用/客户端  <------> | HTTP API 服务器 | <-----> | 以太坊/区块链网络  |
|               |        |                |        |                   |
+---------------+        +----------------+        +-------------------+
                               |
                               |
                         +-------------+
                         |             |
                         | Shared 模块  |
                         |             |
                         +-------------+
```

### 技术栈

- **后端框架**：Express.js（v5.1.0）
- **区块链交互**：ethers.js（v6.0.0）
- **API 文档**：Swagger/OpenAPI（v3.0.0）
- **日志管理**：Winston
- **安全组件**：Helmet, CORS
- **环境变量**：dotenv

### 合约依赖关系

HTTP 服务器通过 `shared` 模块与以下智能合约交互：

- **RealEstateFacade**：系统总入口，管理各功能合约的地址
  - **PropertyManager**：管理房产登记和通证化
    - **PropertyToken**：房产通证合约（ERC20）
  - **TradingManager**：管理通证交易和订单
  - **RewardManager**：管理分红发放和领取
  - **RoleManager**：管理系统中的角色和权限

## 系统所需版本

- Node.js >= 18.0.0
- npm >= 8.0.0（或 Yarn >= 1.22.19，推荐）
- 以太坊兼容网络（本地开发使用 Hardhat）

## 代码结构

```
http-server/
├── public/                 # 静态文件
│   ├── css/                # 样式文件
│   ├── js/                 # 客户端脚本
│   └── ...
├── src/                    # 源代码
│   ├── controllers/        # API 控制器
│   │   ├── property.controller.js  # 房产相关控制器
│   │   ├── trading.controller.js   # 交易相关控制器
│   │   ├── reward.controller.js    # 分红相关控制器
│   │   ├── role.controller.js      # 角色权限相关控制器
│   │   └── network.controller.js   # 网络相关控制器
│   ├── middlewares/        # 中间件
│   │   ├── apiKeyAuth.js   # API 密钥认证中间件
│   │   ├── errorHandler.js # 错误处理中间件
│   │   └── requestLogger.js # 请求日志中间件
│   ├── routes/             # 路由定义
│   │   ├── index.js        # 路由总入口
│   │   ├── property.routes.js # 房产相关路由
│   │   ├── trading.routes.js  # 交易相关路由
│   │   ├── reward.routes.js   # 分红相关路由
│   │   └── role.routes.js     # 角色权限相关路由
│   ├── services/           # 服务层
│   │   ├── blockchainService.js # 区块链交互服务
│   │   └── ...
│   ├── utils/              # 工具函数
│   │   ├── responseFormatter.js # 响应格式化工具
│   │   └── ...
│   ├── app.js              # Express 应用配置
│   └── server.js           # 服务器入口
├── test/                   # 测试
│   └── ...
├── .env.example            # 环境变量示例
└── README.md               # 本文档
```

## 开发环境搭建

### 前置条件

1. 安装 Node.js (>=18.0.0)
2. 安装 Yarn 或 npm
3. 克隆整个项目仓库

### 步骤

1. 在项目根目录下创建 `.env` 文件，参考 `.env.example` 文件配置环境变量
2. 安装依赖：

```bash
# 在项目根目录执行
yarn install
# 或
npm install
```

3. 启动本地区块链网络（用于开发和测试）

```bash
# 在项目根目录执行
yarn start:node
# 或
npm run start:node
```

4. 部署测试合约

```bash
# 在项目根目录执行
yarn deploy:local
# 或
npm run deploy:local
```

## 系统运行

### 开发模式

```bash
# 在项目根目录执行，使用 nodemon 实时重载
yarn server:dev
# 或
npm run server:dev
```

### 生产模式

```bash
# 在项目根目录执行
yarn server:start
# 或
npm run server:start
```

服务器默认在 `http://localhost:3000` 启动。

### API 文档访问

- Swagger UI: `http://localhost:3000/api-docs`
- 带测试 API 密钥的 API 文档: `http://localhost:3000/api-docs-with-key`
- OpenAPI 规范: `http://localhost:3000/swagger.json`

## 快速起步

### 使用 API 进行操作示例

下面是一些常用 API 操作示例：

#### 1. 获取网络信息

```bash
curl http://localhost:3000/api/v1/network/info?api_key=YOUR_API_KEY
```

#### 2. 注册新房产

```bash
curl -X POST \
  'http://localhost:3000/api/v1/properties/register?api_key=YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "propertyId": "JP-TOKYO-001",
    "country": "Japan",
    "metadataURI": "https://example.com/metadata/JP-TOKYO-001.json",
    "tokenName": "Tokyo Property Token 1",
    "tokenSymbol": "JPTOK1",
    "initialSupply": "1000000"
  }'
```

#### 3. 获取所有房产列表

```bash
curl 'http://localhost:3000/api/v1/properties?api_key=YOUR_API_KEY&page=1&limit=10'
```

## 项目测试

### 单元测试

```bash
# 在项目根目录执行
yarn test:api
# 或
npm run test:api
```

### API 测试

可以使用 Swagger UI 界面或 Postman 等工具进行 API 测试。

## 项目部署

### 部署到测试网

1. 配置 `.env` 文件中的测试网参数
2. 部署智能合约：

```bash
# 在项目根目录执行
yarn deploy:testnet
# 或
npm run deploy:testnet
```

3. 启动 HTTP 服务器：

```bash
NODE_ENV=production yarn server:start
# 或
NODE_ENV=production npm run server:start
```

### 部署到主网

1. 配置 `.env` 文件中的主网参数
2. 部署智能合约：

```bash
# 在项目根目录执行
yarn deploy:mainnet
# 或
npm run deploy:mainnet
```

3. 使用 PM2 或其他进程管理工具启动服务器：

```bash
pm2 start http-server/src/server.js --name "japan-rwa-api"
```

## 常见命令

| 命令 | 说明 |
|------|------|
| `yarn server:dev` | 开发模式启动服务器（支持热重载） |
| `yarn server:start` | 生产模式启动服务器 |
| `yarn test:api` | 运行 API 测试 |
| `yarn deploy:local` | 部署合约到本地网络 |
| `yarn deploy:testnet` | 部署合约到测试网 |
| `yarn deploy:mainnet` | 部署合约到主网 |

## 二次开发建议

1. **遵循现有架构**：HTTP 服务器作为中间层，不应包含业务逻辑，主要负责接口转发和格式转换。

2. **使用 shared 模块**：所有与区块链的交互应通过 `shared` 模块进行，不要在 HTTP 服务器中直接实现区块链交互功能。

3. **错误处理规范**：使用统一的错误处理机制，通过 `errorHandler` 中间件和 `responseFormatter` 工具确保 API 错误响应的一致性。

4. **扩展路由**：新增功能应该遵循现有的路由组织方式，在 `routes` 目录下创建新的路由文件，并在 `index.js` 中引入。

5. **安全考虑**：
   - 不要在代码中硬编码私钥
   - 使用环境变量管理敏感信息
   - 始终通过 API 密钥验证请求
   - 使用 HTTPS 进行生产环境部署

## 注意事项

1. **私钥管理**：所有私钥均通过环境变量管理，不应要求用户在请求中提供私钥。使用 `keyType` 参数指定要使用的角色私钥。

2. **Gas 费用**：与链上交互的操作（如注册房产、创建订单等）需要支付 Gas 费用，确保部署账户有足够的 ETH。

3. **API 密钥**：所有 API 请求都需要 `api_key` 参数进行认证，测试环境可以在 `.env` 中配置 `DISABLE_API_AUTH=true` 来禁用认证。

4. **状态管理**：链上操作是异步的，某些操作可能需要多个区块确认才能完成，应考虑在前端实现状态轮询或监听机制。

5. **资源限制**：考虑实现请求节流和流量限制，防止恶意请求或意外的API过载。

## FAQ

### Q: 如何添加新的 API 端点？

A: 在 `controllers` 目录下创建控制器函数，然后在 `routes` 目录下相应文件中注册路由，最后在 `routes/index.js` 中引入新路由。

### Q: 如何更改默认端口？

A: 在 `.env` 文件中设置 `PORT` 环境变量。

### Q: 如何处理大量请求？

A: 考虑使用缓存层（如 Redis）缓存频繁请求的数据，或实现请求节流和负载均衡。

### Q: 如何监控服务器性能？

A: 可以集成 Prometheus 或其他监控工具，或使用云服务提供商的监控服务。

## 关键依赖说明

- **express**：Web 应用框架，用于构建 API 服务器
- **ethers**：与以太坊网络交互的库，提供合约调用、交易发送等功能
- **swagger-jsdoc 和 swagger-ui-express**：用于生成 API 文档
- **helmet**：增强 Express 应用安全性的中间件集合
- **cors**：处理跨域资源共享的中间件
- **winston**：灵活的日志记录库
- **dotenv**：加载环境变量

## 参考资料

- [Express.js 文档](https://expressjs.com/)
- [ethers.js 文档](https://docs.ethers.io/v6/)
- [OpenAPI 规范](https://swagger.io/specification/)
- [ERC20 标准](https://eips.ethereum.org/EIPS/eip-20)
- [Hardhat 文档](https://hardhat.org/docs)

## 环境变量配置参考

```
# 网络配置
PORT=3000                           # HTTP 服务器端口
BLOCKCHAIN_NETWORK=localhost        # 区块链网络类型 (localhost, testnet, mainnet)
RPC_URL_LOCALHOST=http://127.0.0.1:8545  # 本地网络 RPC URL
RPC_URL_TESTNET=https://sepolia.infura.io/v3/YOUR_INFURA_KEY  # 测试网 RPC URL
RPC_URL_MAINNET=https://mainnet.infura.io/v3/YOUR_INFURA_KEY  # 主网 RPC URL

# API 认证
API_KEY=your-api-key-here           # API 密钥
DISABLE_API_AUTH=false              # 是否禁用 API 认证（仅开发环境）

# 日志配置
LOG_LEVEL=info                      # 日志级别 (debug, info, warn, error)
LOG_FORMAT=json                     # 日志格式 (json, text)

# 钱包私钥（注意安全，不要泄露！）
PRIVATE_KEY_ADMIN=0x...             # 管理员钱包私钥
PRIVATE_KEY_PROPERTY_MANAGER=0x...  # 房产管理员私钥
PRIVATE_KEY_TRADING_MANAGER=0x...   # 交易管理员私钥
PRIVATE_KEY_REWARD_MANAGER=0x...    # 分红管理员私钥
``` 