# 日本房地产管理系统后端

本项目是日本房地产代币化平台的后端服务，负责与以太坊智能合约交互，管理房产注册、代币化、赎回和租金分配。

## 功能特性

- 房产管理 - 注册、审核、下架房产
- 代币管理 - 创建代币、白名单管理
- 赎回管理 - 处理赎回请求
- 租金管理 - 租金分配和领取
- 安全认证 - 简单API密钥认证

## 技术栈

- Node.js
- Express.js
- ethers.js - 以太坊交互
- Winston - 日志记录

## 先决条件

- Node.js (v16.0.0+)
- pnpm 或 yarn
- 一个可连接的以太坊节点 (如本地Hardhat网络, Sepolia测试网等)
- 已部署的智能合约

## 安装

1. 克隆项目
```bash
git clone <repository-url>
cd japan-rwa/server
```

2. 安装依赖
```bash
pnpm install
```

3. 配置环境变量
```bash
cp .env.example .env
```
然后编辑 `.env` 文件，填入正确的配置信息

## 配置

在 `.env` 文件中配置以下参数:

- 服务器配置 (端口, 环境等)
- API密钥 (用于简单认证)
- 区块链网络配置 (RPC URL, 链ID)
- 账户私钥配置 (不同角色使用不同私钥)
- 合约地址

## 角色和私钥

系统支持多个角色，每个角色使用各自的私钥执行不同操作：

1. **管理员(admin)** - 具有最高权限，可执行所有操作
   - 环境变量: `ADMIN_PRIVATE_KEY`
   - 操作: 批准/拒绝房产, 更新代币实现, 添加支持的稳定币等

2. **操作员(operator)** - 处理日常操作
   - 环境变量: `OPERATOR_PRIVATE_KEY`
   - 操作: 注册房产, 管理白名单等

3. **财务(finance)** - 处理资金相关操作
   - 环境变量: `FINANCE_PRIVATE_KEY`
   - 操作: 分配租金, 批准/拒绝赎回请求等

4. **紧急恢复(emergency)** - 处理紧急情况
   - 环境变量: `EMERGENCY_PRIVATE_KEY`
   - 操作: 紧急提款等

如果未设置特定角色的私钥，将使用管理员私钥(`ADMIN_PRIVATE_KEY`)作为后备。

## 运行

启动开发服务器:
```bash
pnpm run dev
```

启动生产服务器:
```bash
pnpm start
```

## 测试

运行所有测试:
```bash
pnpm test
```

仅运行单元测试:
```bash
pnpm test -- --testPathPattern=unit
```

仅运行集成测试:
```bash
pnpm test -- --testPathPattern=integration
```

## 代码检查

运行ESLint检查代码风格:
```bash
pnpm run lint
```

自动修复ESLint问题:
```bash
pnpm run lint:fix
```

## API认证

API使用简单的API密钥认证，您可以通过以下方式提供密钥:

1. 在HTTP请求头中添加 `X-API-Key` 字段
   ```
   X-API-Key: your-api-key
   ```

2. 在URL查询参数中添加 `apiKey` 参数
   ```
   GET /api/properties?apiKey=your-api-key
   ```

在开发模式下，认证会被自动通过，无需提供API密钥。

## API文档

API路由分为以下几组:

1. **房产API** (`/api/properties`)
   - `GET /api/properties` - 获取所有房产
   - `GET /api/properties/:propertyId` - 获取特定房产
   - `POST /api/properties` - 注册新房产
   - `POST /api/properties/:propertyId/approve` - 批准房产
   - `POST /api/properties/:propertyId/reject` - 拒绝房产
   - `POST /api/properties/:propertyId/delist` - 下架房产
   - `PUT /api/properties/:propertyId/status` - 设置房产状态

2. **代币API** (`/api/tokens`)
   - `GET /api/tokens` - 获取所有代币
   - `GET /api/tokens/property/:propertyId` - 获取特定房产的代币
   - `POST /api/tokens` - 创建新代币
   - `POST /api/tokens/:tokenAddress/whitelist` - 添加地址到白名单
   - `DELETE /api/tokens/:tokenAddress/whitelist` - 从白名单移除地址

3. **赎回API** (`/api/redemptions`)
   - `GET /api/redemptions` - 获取所有赎回请求
   - `GET /api/redemptions/:requestId` - 获取特定赎回请求
   - `POST /api/redemptions/:requestId/approve` - 批准赎回请求
   - `POST /api/redemptions/:requestId/reject` - 拒绝赎回请求
   - `POST /api/redemptions/:requestId/complete` - 完成赎回请求

4. **租金API** (`/api/rents`)
   - `GET /api/rents` - 获取所有租金分配记录
   - `GET /api/rents/:distributionId` - 获取特定租金分配记录
   - `POST /api/rents` - 分配租金
   - `POST /api/rents/:distributionId/liquidate` - 清算未领取的租金

## 项目结构

```
server/
├── src/                    # 源代码
│   ├── config/             # 配置目录
│   │   ├── index.js        # 主配置文件
│   │   └── keyManager.js   # 私钥管理器
│   ├── controllers/        # API控制器
│   │   ├── propertyController.js    # 房产控制器
│   │   ├── tokenController.js       # 代币控制器
│   │   ├── redemptionController.js  # 赎回控制器
│   │   └── rentController.js        # 租金控制器
│   ├── middlewares/        # 中间件
│   │   ├── authMiddleware.js        # 认证中间件
│   │   ├── errorHandler.js          # 错误处理中间件
│   │   └── asyncHandler.js          # 异步处理中间件
│   ├── routes/             # API路由
│   │   ├── index.js                 # 路由索引
│   │   ├── propertyRoutes.js        # 房产路由
│   │   ├── tokenRoutes.js           # 代币路由
│   │   ├── redemptionRoutes.js      # 赎回路由
│   │   └── rentRoutes.js            # 租金路由
│   ├── services/           # 服务层
│   │   ├── baseContractService.js   # 合约服务基类
│   │   ├── propertyRegistryService.js # 房产注册服务
│   │   ├── tokenFactoryService.js   # 代币工厂服务
│   │   ├── redemptionManagerService.js # 赎回管理服务
│   │   └── rentDistributorService.js # 租金分配服务
│   ├── utils/              # 工具函数
│   │   ├── web3Provider.js # Web3提供者
│   │   ├── logger.js       # 日志工具
│   │   └── getAbis.js      # ABI加载工具
│   └── index.js            # 应用入口
├── tests/                  # 测试目录
│   ├── unit/               # 单元测试
│   │   └── keyManager.test.js       # 密钥管理器测试
│   ├── integration/        # 集成测试
│   │   └── auth.test.js             # 认证中间件测试
│   └── setup.js            # 测试设置文件
├── logs/                   # 日志目录
├── .env                    # 环境变量
├── .env.example            # 环境变量示例
├── .eslintrc.js            # ESLint配置
├── .gitignore              # Git忽略文件
├── jest.config.js          # Jest测试配置
├── nodemon.json            # Nodemon配置
├── package.json            # 依赖和脚本
├── tsconfig.json           # TypeScript配置
└── README.md               # 项目说明
```

## 开发说明

- 服务层(services): 封装与智能合约的交互逻辑，`baseContractService.js` 提供了根据操作类型自动选择使用哪个角色的私钥
- 控制器(controllers): 处理HTTP请求和响应
- 路由(routes): 定义API路径和认证
- 配置(config): `keyManager.js` 管理不同角色的私钥，`operationRoles` 定义每个操作使用哪个角色

## 安全特性

- 使用Helmet增强安全性
- 简单API密钥认证
- 请求验证和错误处理
- 角色分离：不同操作使用不同的私钥

## 许可证

MIT 