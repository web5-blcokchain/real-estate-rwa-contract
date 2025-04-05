# 日本房地产资产通证化 HTTP API 服务器

基于区块链的房地产资产通证化 HTTP API 服务器，提供与智能合约交互的 RESTful API 接口。

## 功能特性

- 区块链网络连接管理
- 房产资产登记与查询
- 通证交易功能
- 收益分配管理
- 角色权限管理
- 完整的 Swagger API 文档

## 技术栈

- Node.js (18+)
- Express.js
- Ethers.js
- Swagger UI

## 快速开始

### 前置条件

- Node.js 18.0.0 或更高版本
- Yarn 包管理器
- 本地区块链节点或远程区块链网络（Testnet、Mainnet）

### 安装依赖

项目使用根目录的依赖包，不需要单独安装依赖。

### 环境配置

1. 复制环境变量示例文件:

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，配置以下必要参数:

```
# 服务器配置
PORT=3000
NODE_ENV=development

# 区块链配置
BLOCKCHAIN_NETWORK=localhost  # localhost, testnet, mainnet
RPC_URL_LOCALHOST=http://localhost:8545
RPC_URL_TESTNET=https://...
RPC_URL_MAINNET=https://...

# 合约地址配置
CONTRACT_REAL_ESTATE_FACADE_ADDRESS=0x...
CONTRACT_PROPERTY_TOKEN_IMPLEMENTATION_ADDRESS=0x...

# 私钥配置（开发环境使用）
ADMIN_PRIVATE_KEY=0x...

# API密钥
API_KEY=your_api_key
```

### 启动服务器

开发模式（自动重载）:

```bash
cd http-server
yarn dev
```

生产模式:

```bash
cd http-server
yarn start
```

服务器默认在 http://localhost:3000 运行，可通过环境变量 `PORT` 修改端口。

## API 文档

启动服务器后，访问以下链接查看 Swagger API 文档:

```
http://localhost:3000/api-docs
```

## API 认证

所有 API 请求需要通过 URL 参数提供 API 密钥进行认证:

```
http://localhost:3000/api/v1/blockchain/info?api_key=your_api_key
```

## 目录结构

```
http-server/
├── src/                  # 源代码
│   ├── controllers/      # 控制器
│   ├── middlewares/      # 中间件
│   ├── routes/           # 路由定义
│   ├── services/         # 服务层
│   ├── utils/            # 工具函数
│   ├── app.js            # Express应用配置
│   └── server.js         # 服务器入口
├── swagger/              # Swagger文档配置
└── public/               # 静态文件
```

## 模块说明

- **区块链模块**: 提供区块链网络连接、状态查询等功能
- **房产模块**: 房产资产登记、查询、状态管理
- **交易模块**: 通证订单创建、执行、取消
- **收益模块**: 收益分配创建、查询、领取
- **角色模块**: 角色权限管理、授予、撤销 