# 不动产系统API服务

## 项目说明

本项目是一个基于Express的API服务，用于封装区块链上的不动产管理系统合约功能，提供易用的RESTful API接口。系统主要功能包括角色管理、房产管理、交易管理、奖励管理以及系统管理等模块。

## 技术栈

- **后端框架**: Express.js + TypeScript
- **区块链交互**: ethers.js v6
- **API文档**: Swagger
- **测试工具**: Jest + Supertest
- **容器化**: Docker

## 代码结构

```
/server
  /src
    /controllers        - 控制器，每个合约一个控制器
      roleManagerController.ts      - 角色管理控制器
      propertyManagerController.ts  - 房产管理控制器
      tradingManagerController.ts   - 交易管理控制器
      rewardManagerController.ts    - 奖励管理控制器
      systemController.ts           - 系统管理控制器
    /routes             - 路由定义
      role.ts           - 角色管理路由
      property.ts       - 房产管理路由
      trading.ts        - 交易管理路由
      reward.ts         - 奖励管理路由
      system.ts         - 系统管理路由
    /middlewares        - 中间件
      auth.ts           - 鉴权中间件
    /utils              - 工具函数
    /docs               - API文档相关
    /tests              - 测试脚本
      /api              - 基本接口测试
      /flow             - 业务流程测试
    index.ts            - 入口文件
  /config
    /abi                - 合约ABI文件
    /env                - 环境配置文件
  package.json          - 项目依赖
  tsconfig.json         - TypeScript配置
  swagger.json          - Swagger文档
  Dockerfile            - Docker构建文件
```

## 运行环境

- Node.js v16+
- yarn v8+
- 连接到以太坊网络（主网、测试网或本地网络）

## 环境配置

项目使用环境变量进行配置
环境变量模板： config/env/.env，不同的启动环境需要对应不同的.env文件。如果启动环境是本地环境，配置文件可以是config/env/hardhat.env

主要配置项包括：

```
# 网络配置
RPC_URL=https://sepolia.infura.io/v3/your-api-key

# 合约地址
ROLE_MANAGER_ADDRESS=0x...
PROPERTY_MANAGER_ADDRESS=0x...
TRADING_MANAGER_ADDRESS=0x...
REWARD_MANAGER_ADDRESS=0x...

# 角色私钥
ADMIN_PRIVATE_KEY=0x...
MANAGER_PRIVATE_KEY=0x...
TRADER_PRIVATE_KEY=0x...
SELLER_PRIVATE_KEY=0x...
BUYER_PRIVATE_KEY=0x...
USER_PRIVATE_KEY=0x...

# API配置
PORT=3000
API_KEY=your-api-key
```

## 开发调试

### 安装依赖

```bash
cd rwa/server
yarn install
```

### 启动开发服务器

```bash
yarn run dev
```

服务器将在 http://localhost:3000 启动，并支持热重载。

### 构建生产版本

```bash
yarn run build
```

编译后的文件将输出到 `/dist` 目录。

### 启动生产服务器

```bash
yarn start
```

## API文档

项目使用Swagger生成API文档，可以通过以下方式访问：

1. 启动服务器
2. 访问 http://localhost:3000/api-docs

也可以通过以下命令生成静态文档：

```bash
yarn run docs
```

生成的文档将保存为 `swagger.json`。

## 测试

### 运行单元测试

```bash
yarn test
```

### 运行API测试

```bash
yarn run test:api
```

### 运行特定模块测试

```bash
yarn run test:role      # 测试角色管理API
yarn run test:property  # 测试房产管理API
yarn run test:trading   # 测试交易管理API
yarn run test:reward    # 测试奖励管理API
yarn run test:system    # 测试系统管理API
```

## 部署

### 使用Docker部署

1. 构建Docker镜像

```bash
docker build -t japan-rwa-server .
```

2. 运行Docker容器

```bash
docker run -p 3000:3000 --env-file .env japan-rwa-server
```

### 使用PM2部署

1. 安装PM2

```bash
yarn install -g pm2
```

2. 启动服务

```bash
pm2 start dist/index.js --name japan-rwa-server
```

## 安全注意事项

1. 所有私钥都存储在环境变量中，不通过API传输
2. API使用API密钥进行鉴权
3. 敏感操作需要适当的角色权限
4. 生产环境应使用HTTPS

## 主要功能模块

### 角色管理

- 获取地址的角色信息
- 授予角色
- 撤销角色

### 房产管理

- 注册新房产
- 获取房产信息
- 更新房产信息
- 获取房产列表

### 交易管理

- 创建订单
- 执行订单
- 取消订单
- 获取订单信息
- 获取活跃订单列表
- 获取用户订单列表

### 奖励管理

- 分发奖励
- 领取奖励
- 查询可领取奖励
- 添加奖励代币
- 移除奖励代币

### 系统管理

- 获取系统状态
- 切换紧急模式
- 暂停/恢复交易
- 获取合约地址

## 贡献指南

1. Fork项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

本项目采用MIT许可证。详情请参阅LICENSE文件。