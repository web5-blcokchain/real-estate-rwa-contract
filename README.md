# 日本房地产资产通证化平台 (Japan Real Estate Tokenization Platform)

## 项目说明

本项目实现了基于区块链的房地产资产通证化平台，专注于日本房地产市场，旨在解决传统房地产投资中的流动性低、门槛高、透明度不足等问题。通过区块链技术将房产资产转化为可分割、可交易的数字通证，使投资者能够通过智能合约以更灵活、透明的方式参与房地产投资。

### 核心功能

- **房产资产通证化**：将房产资产上链并转换为可分割、流通的数字通证
- **通证交易管理**：支持通证的挂单、买卖、转让和交易记录追踪
- **收益分配系统**：自动化的租金收益和分红发放机制
- **多级权限管理**：基于角色的权限控制系统
- **可升级合约架构**：支持合约升级以适应未来需求变化
- **区块链监控**：实时监控链上交易和系统状态

### 业务价值

- 降低房地产投资门槛，实现小额投资
- 提高资产流动性，允许部分股权交易
- 增强透明度，所有交易和收益分配公开记录在区块链上
- 简化跨境投资，消除国际交易中的中介环节
- 自动化收益分配，减少人工操作和错误

## 系统架构

系统由三个主要组件构成：

1. **智能合约**：运行在区块链上的业务逻辑核心
2. **HTTP API 服务器**：连接前端应用和区块链的中间层
3. **共享模块**：提供区块链交互的基础功能

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

### 技术架构

- **前端层**：用户界面和客户端应用（不在本仓库中）
- **API层**：Express.js REST API 服务器
- **共享层**：区块链交互基础设施
- **合约层**：Solidity 智能合约
- **区块链层**：以太坊兼容网络

## 合约依赖关系

系统采用模块化设计，由以下智能合约组成：

```
                      +---------------------+
                      |                     |
                      |   RealEstateFacade  |
                      |                     |
                      +----------+----------+
                                 |
                                 |
          +--------------------+-+------------------+
          |                    |                    |
+---------v---------+  +-------v-------+  +---------v---------+
|                   |  |               |  |                   |
|  PropertyManager  |  | TradingManager|  |  RewardManager   |
|                   |  |               |  |                   |
+---------+---------+  +---------------+  +---------+---------+
          |                                          |
          |                                          |
+---------v---------+                      +---------v---------+
|                   |                      |                   |
|   PropertyToken   |                      |  RoleManager     |
|                   |                      |                   |
+-------------------+                      +-------------------+
```

- **RealEstateFacade**：系统门面合约，提供统一入口，管理子合约地址
- **PropertyManager**：管理房产资产信息、元数据和状态
- **PropertyToken**：实现房产通证化功能，基于ERC20标准
- **TradingManager**：管理通证交易市场，包括订单创建、撮合和取消
- **RewardManager**：负责收益计算、分红发放和领取
- **RoleManager**：管理系统角色和权限分配

## 系统所需版本

- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0 （推荐使用 Yarn >= 1.22.19）
- **Solidity**: 0.8.20
- **Hardhat**: 2.20.1
- **ethers.js**: v6.0.0

## 代码结构

```
项目根目录/
├── contracts/                 # 智能合约代码
│   ├── facades/               # 门面合约
│   │   └── RealEstateFacade.sol  # 系统统一入口合约
│   ├── managers/              # 管理合约
│   │   ├── PropertyManager.sol   # 房产管理合约
│   │   ├── TradingManager.sol    # 交易管理合约 
│   │   ├── RewardManager.sol     # 收益管理合约
│   │   └── RoleManager.sol       # 角色管理合约
│   ├── tokens/                # 通证合约
│   │   └── PropertyToken.sol     # 房产通证合约
│   └── utils/                 # 工具合约
│       ├── interfaces/           # 接口定义
│       └── libraries/            # 合约库
├── http-server/               # HTTP API 服务器
│   ├── public/                # 静态资源
│   ├── src/                   # 源代码
│   │   ├── controllers/       # API 控制器
│   │   ├── middlewares/       # 中间件
│   │   ├── routes/            # 路由定义
│   │   ├── services/          # 服务层
│   │   ├── utils/             # 工具函数
│   │   ├── app.js             # Express 应用
│   │   └── server.js          # 服务器入口
│   ├── test/                  # API 测试
│   └── README.md              # API 服务器文档
├── shared/                    # 共享模块
│   ├── src/                   # 源代码
│   │   ├── core/              # 核心功能
│   │   │   ├── provider.js       # 区块链网络连接
│   │   │   ├── wallet.js         # 钱包管理
│   │   │   └── contract.js       # 合约交互
│   │   ├── utils/             # 工具函数
│   │   │   ├── logger.js         # 日志系统
│   │   │   ├── validation.js     # 数据验证
│   │   │   └── errors.js         # 错误处理
│   │   └── index.js           # 导出入口
│   ├── test/                  # 单元测试
│   └── docs/                  # 模块文档
├── scripts/                   # 部署和管理脚本
│   ├── deploy-step.js         # 部署脚本
│   └── verify-deployment.js   # 验证部署
├── test/                      # 合约测试
│   ├── integration/           # 集成测试
│   └── unit/                  # 单元测试
├── config/                    # 配置文件
│   ├── deployment.json        # 部署配置
│   └── networks.json          # 网络配置
├── docs/                      # 项目文档
│   ├── api/                   # API 文档
│   ├── contracts/             # 合约文档
│   └── deployment/            # 部署文档
├── logs/                      # 日志目录
├── hardhat.config.js          # Hardhat 配置
├── package.json               # 项目依赖
├── .env.example               # 环境变量示例
└── README.md                  # 项目主文档
```

## 开发环境搭建

### 前置条件

1. 安装 Node.js (>=18.0.0) 和 npm/Yarn
2. 全局安装 Hardhat（可选）: `npm install -g hardhat`
3. 安装 Git

### 安装步骤

1. 克隆仓库：

```bash
git clone <仓库地址>
cd japan-rwa
```

2. 安装依赖：

```bash
# 使用 Yarn
yarn install

# 或使用 npm
npm install
```

3. 配置环境变量：

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填写必要信息
# - 区块链节点 RPC URL
# - 开发钱包私钥
# - API 密钥
# - 其他配置项
```

4. 编译智能合约：

```bash
yarn compile
# 或
npx hardhat compile
```

5. 启动本地区块链节点：

```bash
yarn start:node
# 或
npx hardhat node
```

## 系统运行

### 部署智能合约

```bash
# 部署到本地网络
yarn deploy:local
# 或
npx hardhat run scripts/deploy-step.js --network localhost

# 部署到测试网
yarn deploy:testnet
# 或
npx hardhat run scripts/deploy-step.js --network testnet

# 部署到主网
yarn deploy:mainnet
# 或
npx hardhat run scripts/deploy-step.js --network mainnet
```

### 启动 HTTP 服务器

```bash
# 开发模式（支持热重载）
yarn server:dev
# 或
npm run server:dev

# 生产模式
yarn server:start
# 或
npm run server:start
```

服务器默认在 `http://localhost:3000` 启动。

### 验证部署

```bash
# 验证测试网部署
yarn verify:testnet
# 或
npx hardhat run scripts/verify-deployment.js --network testnet

# 验证主网部署
yarn verify:mainnet
# 或
npx hardhat run scripts/verify-deployment.js --network mainnet
```

## 快速起步

以下是项目的基本使用流程：

1. 部署合约并启动 HTTP 服务器
2. 访问 API 文档：`http://localhost:3000/api-docs`
3. 注册房产资产并发行通证
4. 创建交易订单和执行交易
5. 设置和分配收益

### 使用 API 进行操作示例

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

#### 4. 创建交易订单

```bash
curl -X POST \
  'http://localhost:3000/api/v1/trading/orders?api_key=YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "propertyId": "JP-TOKYO-001",
    "amount": "10000",
    "pricePerToken": "0.1",
    "expirationTime": "1719848400"
  }'
```

## 项目测试

### 合约测试

```bash
# 运行所有合约测试
yarn test
# 或
npx hardhat test

# 运行特定测试文件
npx hardhat test test/unit/PropertyManager.test.js

# 带覆盖率报告的测试
yarn test:coverage
# 或
npx hardhat coverage
```

### 共享模块测试

```bash
# 运行共享模块测试
yarn shared:test
# 或
yarn mocha shared/test/**/*.test.js
```

### API 服务器测试

```bash
# 运行 API 测试
yarn test:api
# 或
npm run test:api
```

## 项目部署

### 部署到测试网

1. 配置 `.env` 文件中的测试网参数：
   - `RPC_URL_TESTNET`
   - `PRIVATE_KEY_DEPLOYER`
   - 其他必要参数

2. 部署合约：

```bash
yarn deploy:testnet
```

3. 验证合约：

```bash
yarn verify:testnet
```

4. 启动 HTTP 服务器：

```bash
NODE_ENV=production yarn server:start
```

### 部署到主网

1. 配置 `.env` 文件中的主网参数：
   - `RPC_URL_MAINNET`
   - `PRIVATE_KEY_DEPLOYER`
   - 其他必要参数

2. 部署合约：

```bash
yarn deploy:mainnet
```

3. 验证合约：

```bash
yarn verify:mainnet
```

4. 使用进程管理工具启动服务器：

```bash
# 使用 PM2
pm2 start http-server/src/server.js --name "japan-rwa-api"
```

## 常见命令

下表列出了项目中最常用的命令：

| 命令 | 说明 |
|------|------|
| `yarn compile` | 编译智能合约 |
| `yarn test` | 运行合约测试 |
| `yarn shared:test` | 运行共享模块测试 |
| `yarn test:api` | 运行 API 测试 |
| `yarn test:coverage` | 生成测试覆盖率报告 |
| `yarn start:node` | 启动本地区块链节点 |
| `yarn deploy:local` | 部署合约到本地网络 |
| `yarn deploy:testnet` | 部署合约到测试网 |
| `yarn deploy:mainnet` | 部署合约到主网 |
| `yarn verify:testnet` | 验证测试网合约 |
| `yarn verify:mainnet` | 验证主网合约 |
| `yarn server:dev` | 开发模式启动 HTTP 服务器 |
| `yarn server:start` | 生产模式启动 HTTP 服务器 |
| `yarn lint` | 运行代码风格检查 |
| `yarn lint:fix` | 自动修复代码风格问题 |
| `yarn format` | 格式化代码 |

## 二次开发建议

### 合约开发原则

1. **使用 Facade 模式**：所有外部交互应通过 `RealEstateFacade` 合约，避免直接调用子合约
2. **保持模块化**：每个合约只负责单一功能领域，避免功能交叉
3. **优先使用升级模式**：使用透明代理模式实现合约升级
4. **访问控制**：所有关键操作必须有适当的权限检查
5. **事件记录**：关键操作发出事件，便于链下服务监听和处理
6. **防御性编程**：始终验证输入参数，防止异常情况

### HTTP 服务器开发

1. **遵循现有架构**：HTTP 服务器作为中间层，不应包含业务逻辑
2. **使用 shared 模块**：所有与区块链的交互应通过 `shared` 模块进行
3. **统一错误处理**：使用标准化的错误响应格式
4. **参数验证**：所有 API 请求参数必须经过验证
5. **文档更新**：修改 API 时更新 Swagger 文档
6. **编写测试**：为新功能编写单元测试和集成测试

### 共享模块开发

1. **稳定接口**：避免频繁修改公共接口
2. **向后兼容**：新功能应保持向后兼容
3. **全面测试**：必须有完整的单元测试
4. **性能优化**：关注性能关键点，如连接池、缓存等
5. **错误处理**：提供明确的错误信息和类型

## 注意事项

1. **环境变量管理**：
   - 项目只有一个 `.env` 文件，位于项目根目录
   - 所有模块共享同一套环境变量
   - 敏感信息（如私钥）不应提交到代码仓库

2. **私钥安全**：
   - 私钥通过环境变量管理，不应在代码中硬编码
   - 不应要求用户在 API 请求中提供私钥
   - 使用 `keyType` 参数指定要使用的角色私钥

3. **合约升级**：
   - 合约升级需谨慎，确保新版本兼容旧版本的存储布局
   - 升级前必须全面测试新版本
   - 记录每次升级的变更日志

4. **Gas 费用**：
   - 与链上交互的操作需支付 Gas 费用
   - 合约设计应考虑 Gas 优化
   - 确保操作账户有足够的 ETH

5. **日志管理**：
   - 全系统使用统一的日志目录（`logs/`）
   - 按模块和日期分类记录日志
   - 敏感信息应从日志中过滤

## FAQ

### Q: 如何添加新的通证类型？

A: 可以通过继承现有的 `PropertyToken` 合约，并在 `PropertyManager` 中注册新类型。详细步骤参见 [docs/contracts/extend-token.md](./docs/contracts/extend-token.md)。

### Q: 如何更改默认的网络配置？

A: 在 `.env` 文件中修改 `BLOCKCHAIN_NETWORK` 和相关的 RPC URL。支持的网络类型有 `localhost`、`testnet` 和 `mainnet`。

### Q: 如何处理合约之间的交互？

A: 所有合约交互应通过 `RealEstateFacade` 合约进行，它提供了对所有子合约的访问。这样可以简化权限管理和未来升级。

### Q: 如何监控系统状态？

A: 系统包含以下监控方式：
1. HTTP API 提供 `/health` 端点查看系统状态
2. 通过 `shared` 模块的 `Logger` 记录关键操作和错误
3. 合约事件可以被外部服务订阅和处理

### Q: 如何处理合约升级？

A: 系统使用透明代理模式实现升级，步骤如下：
1. 部署新版本合约
2. 通过管理员账户调用升级函数
3. 验证新版本功能正常

## 开发规范

### 代码风格

- **JavaScript/TypeScript**：使用 ESLint 和 Prettier 进行代码风格检查和格式化
- **Solidity**：遵循 Solidity 风格指南，使用 4 空格缩进，函数和变量使用驼峰命名

### 提交规范

- 使用有意义的提交消息，包含改动内容和原因
- 保持每次提交的改动范围小而聚焦
- 提交前运行测试确保代码正常工作

### 文档规范

- 所有公共 API 必须有清晰的文档注释
- 复杂的业务逻辑应有流程图或序列图说明
- 合约文档使用 NatSpec 格式

### 测试规范

- 每个合约至少应有单元测试和集成测试
- 测试覆盖率应达到 80% 以上
- 测试应覆盖正常流程和异常情况

## 关键依赖说明

- **Hardhat**：以太坊开发环境，用于编译、测试和部署合约
- **ethers.js**：以太坊 JavaScript 库，用于与区块链交互
- **Express**：Node.js Web 框架，用于构建 HTTP API
- **Swagger/OpenAPI**：API 文档工具
- **Winston**：Node.js 日志库
- **Mocha/Chai**：JavaScript 测试框架
- **dotenv**：环境变量管理
- **hardhat-deploy**：Hardhat 插件，用于管理合约部署
- **@openzeppelin/contracts**：安全的智能合约库，提供标准实现和工具

## 参考资料

- [ethers.js 文档](https://docs.ethers.io/v6/)
- [Hardhat 文档](https://hardhat.org/docs)
- [OpenZeppelin 文档](https://docs.openzeppelin.com/)
- [Express.js 文档](https://expressjs.com/)
- [Solidity 文档](https://docs.soliditylang.org/)
- [ERC20 标准](https://eips.ethereum.org/EIPS/eip-20)
- [Proxy 升级模式](https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies)

## 许可证

MIT © 2023-2024