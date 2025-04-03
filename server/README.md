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

### 合约接口代理

系统为`config/abi`目录下的每个ABI文件创建专门的控制器，每个控制器代理对应合约的所有方法。

* **专用控制器**: 每个ABI文件有一个专门的控制器，如`SimpleERC20.controller.js`、`PropertyToken.controller.js`
* **直接方法映射**: 控制器中的每个方法直接对应合约中的方法
* **直观接口**: API路径直接反映合约名称和方法名称，易于理解和使用

每个合约的API端点遵循以下格式:

- `GET /api/v1/contracts/{contractName}/address`: 获取合约部署地址
- 只读方法: `GET /api/v1/contracts/{contractName}/{methodName}`
- 写入方法: `POST /api/v1/contracts/{contractName}/{methodName}`

示例:

```
# 获取PropertyToken合约地址
GET /api/v1/contracts/PropertyToken/address

# 获取PropertyToken的名称
GET /api/v1/contracts/PropertyToken/name

# 查询账户余额
GET /api/v1/contracts/PropertyToken/balanceOf?account=0x1234...5678

# 转账
POST /api/v1/contracts/PropertyToken/transfer
Body:
{
  "to": "0xabcd...1234",
  "amount": "1000000000000000000"
}
```

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

使用项目根目录下的`.env`文件进行配置，无需在server目录下创建单独的环境配置文件。

主要配置项包括:
- 区块链节点RPC URL
- 服务账户私钥
- 数据库连接信息
- 日志级别和配置

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

# 区块链服务器 (Blockchain Server)

## 概述

区块链服务器模块提供了与区块链网络交互的核心功能，负责处理链上交易，管理合约调用，以及提供区块链数据访问API。

## 特性

- 区块链交易处理
- 智能合约调用接口
- 交易签名和验证
- 区块监控和事件处理
- 钱包管理
- 区块链数据缓存

## 目录结构

```
server/
├── src/                   # 源代码
│   ├── controllers/       # 控制器
│   ├── services/          # 服务层
│   ├── models/            # 数据模型
│   ├── middlewares/       # 中间件
│   ├── utils/             # 工具函数
│   ├── config/            # 配置文件
│   └── index.js           # 入口文件
├── scripts/               # 服务器相关脚本
│   ├── analyze-logs.js    # 日志分析工具
│   └── generate-test-logs.js # 测试日志生成工具
├── docs/                  # 文档
└── README.md              # 说明文档
```

## 安装

确保您已经安装了Node.js (>= 18.0.0)

```bash
# 安装依赖
cd server
npm install
```

## 配置

使用项目根目录下的`.env`文件进行配置，无需在server目录下创建单独的环境配置文件。

主要配置项包括:
- 区块链节点RPC URL
- 服务账户私钥
- 数据库连接信息
- 日志级别和配置

## 启动服务

```
```

## 脚本工具

服务器模块提供了以下脚本工具：

### 日志分析工具 (analyze-logs.js)

分析服务器API请求日志，提取性能指标并生成统计报告。

```bash
# 分析日志文件
node server/scripts/analyze-logs.js [日志文件路径]

# 生成API接口文档
node server/scripts/analyze-logs.js [日志文件路径] --api-docs
```

### 测试日志生成工具 (generate-test-logs.js)

生成模拟的API请求日志，用于测试和开发。

```bash
# 生成测试日志
node server/scripts/generate-test-logs.js [日志数量] [输出文件路径]
```

### 房产代币化流程测试脚本 (test-property-flow.js)

测试房地产代币化的完整业务流程，包括房产注册、代币创建、转账、交易和收益分配。

```bash
# 运行测试流程
node server/scripts/test-property-flow.js
```

**功能特点:**
- 测试房产注册和代币创建
- 验证代币详情和转账功能
- 测试销售订单创建
- 模拟收益分配和领取流程
- 自动适应不同合约接口

> 注意: 运行此脚本前需确保已配置好.env文件中的合约地址和私钥。

### 房产代币化流程模拟测试脚本 (test-property-flow-mock.js)

使用模拟数据测试房地产代币化的完整业务流程，无需实际连接区块链网络。

```bash
# 运行模拟测试流程
node server/scripts/test-property-flow-mock.js
```

**功能特点:**
- 使用模拟数据模拟完整流程
- 无需区块链网络连接
- 适合演示和开发测试
- 完整模拟交易交互流程和等待时间