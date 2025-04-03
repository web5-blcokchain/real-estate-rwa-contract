# 日本房地产资产通证化 - 服务器模块

## 项目概述

本模块是日本房地产资产通证化项目的HTTP服务器部分，提供与区块链交互的API接口，支持前端应用与区块链的通信。

## 目录结构

```
server/
├── src/                  # 源代码目录
│   ├── config/           # 配置文件
│   ├── controllers/      # 控制器
│   ├── middlewares/      # 中间件
│   ├── routes/           # 路由定义
│   ├── services/         # 服务层
│   ├── app.js            # Express应用配置
│   └── index.js          # 服务器入口文件
├── tests/                # 测试文件
└── README.md             # 本文档
```

## 核心功能

- 提供RESTful API接口，供前端应用调用
- 与以太坊区块链交互，读取和写入数据
- 处理智能合约的调用和事件监听
- 支持API文档自动生成（Swagger）
- 提供完善的日志记录和错误处理

## 服务架构

### 区块链服务

- `BlockchainService`: 底层区块链连接和交互服务
- `blockchain.service`: 区块链业务逻辑服务

### 合约服务

- `contract.service`: 智能合约交互服务

### 控制器

- `blockchain.controller`: 区块链相关API控制器
- `contract.controller`: 智能合约相关API控制器

### API路由

- `/api/v1/blockchain`: 区块链相关API
- `/api/v1/contracts`: 智能合约相关API

## 开发指南

### 环境要求

- Node.js v14+
- npm或yarn

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 配置

在项目根目录创建`.env`文件，参考`.env.example`设置以下关键配置：

```
# 服务器配置
PORT=3000
HOST=localhost
API_BASE_PATH=/api/v1

# 区块链网络配置
BLOCKCHAIN_NETWORK=localhost  # localhost, testnet, mainnet
LOCAL_RPC_URL=http://localhost:8545
TESTNET_RPC_URL=https://sepolia.infura.io/v3/your-key
MAINNET_RPC_URL=https://mainnet.infura.io/v3/your-key
```

### 启动服务器

```bash
# 开发模式
npm run dev
# 或
yarn dev

# 生产模式
npm start
# 或
yarn start
```

### 访问API文档

启动服务器后，访问：http://localhost:3000/api-docs

## API示例

### 获取区块链网络信息

```
GET /api/v1/blockchain/network-info
```

响应示例：

```json
{
  "success": true,
  "data": {
    "chainId": 1,
    "blockNumber": 14500000,
    "gasPrice": "50",
    "networkType": "mainnet",
    "timestamp": "2023-01-01T00:00:00.000Z"
  }
}
```

### 获取合约地址

```
GET /api/v1/contracts/addresses
```

响应示例：

```json
{
  "success": true,
  "data": {
    "PropertyToken": "0x1234567890abcdef1234567890abcdef12345678",
    "PropertyRegistry": "0xabcdef1234567890abcdef1234567890abcdef12"
  }
}
``` 