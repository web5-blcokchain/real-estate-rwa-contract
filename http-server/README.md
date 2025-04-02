# Japan RWA HTTP 服务器

这个模块提供 HTTP API 接口，封装区块链合约功能，方便前端和其他系统调用。

## 功能介绍

- 提供RESTful API接口，封装所有智能合约功能
- 支持API密钥验证，保证接口安全
- 自动生成Swagger API文档
- 标准化参数验证和错误处理
- 详细的日志记录
- 完整的单元测试

## 系统架构

本服务器基于Express.js框架构建，主要包括以下组件：

- **控制器（Controllers）**: 处理API请求，调用合约方法
- **路由（Routes）**: 定义API端点，映射到对应的控制器
- **中间件（Middlewares）**: 处理API密钥验证、错误处理等
- **工具（Utils）**: 提供参数验证、合约交互等功能
- **配置（Config）**: 管理环境变量和系统配置
- **测试（Tests）**: API单元测试和集成测试

系统与区块链的交互通过共享模块（`shared`）完成，确保与区块链交互的代码可以被复用。

## API端点

系统提供以下主要API模块：

1. **PropertyToken**: 资产代币相关API
2. **PropertyManager**: 资产管理相关API
3. **TradingManager**: 交易管理相关API
4. **RewardManager**: 奖励管理相关API
5. **RoleManager**: 角色管理相关API
6. **RealEstateSystem**: 系统管理相关API
7. **ContractInteraction**: 通用合约交互API

详细的API文档可以通过 `/api-docs` 访问。

## 安装和配置

### 安装依赖

```bash
yarn install
```

### 配置环境变量

1. 复制`.env.example`文件到`.env`：

```bash
cp .env.example .env
```

2. 根据需要修改`.env`文件中的配置：

```
# HTTP服务器配置
PORT=3000
HOST=localhost
NODE_ENV=development

# API配置
API_KEYS=key1,key2,key3

# 区块链网络配置
NETWORK_TYPE=local  # local, testnet, mainnet
RPC_URL=http://localhost:8545
CHAIN_ID=1337

# 日志配置
LOG_LEVEL=info
```

## 运行服务器

### 开发模式

```bash
yarn http-server:dev
```

### 生产模式

```bash
yarn http-server:start
```

## 运行测试

```bash
yarn http-server:test
```

## API使用示例

### 获取系统信息

```bash
curl -X GET "http://localhost:3000/api/v1/real-estate-system/info" -H "X-API-Key: your-api-key"
```

### 获取代币余额

```bash
curl -X GET "http://localhost:3000/api/v1/property-token/balance/0x1234567890123456789012345678901234567890/0x2345678901234567890123456789012345678901" -H "X-API-Key: your-api-key"
```

### 转移代币

```bash
curl -X POST "http://localhost:3000/api/v1/property-token/transfer" -H "Content-Type: application/json" -H "X-API-Key: your-api-key" -d '{"tokenAddress":"0x1234567890123456789012345678901234567890","to":"0x2345678901234567890123456789012345678901","amount":"1000","privateKey":"your-private-key"}'
```

## 文件结构

```
http-server/
├── src/                     # 源代码
│   ├── controllers/        # 控制器
│   ├── routes/             # 路由
│   ├── middlewares/        # 中间件
│   ├── utils/              # 工具函数
│   ├── config/             # 配置文件
│   └── index.js            # 入口文件
├── tests/                  # 测试代码
├── .env.example            # 环境变量示例
└── package.json            # 项目配置
```

## 错误处理

系统使用统一的错误处理机制，返回标准化的错误响应：

```json
{
  "success": false,
  "error": "ErrorType",
  "message": "错误描述信息",
  "details": {
    // 错误详细信息
  }
}
```

常见错误类型包括：

- `ValidationError`: 参数验证失败
- `AuthenticationError`: 认证失败
- `ContractError`: 合约调用失败
- `NotFoundError`: 资源不存在
- `ServerError`: 服务器内部错误

## 开发指南

1. 添加新的API接口时，遵循以下步骤：
   - 在`controllers/`中添加新的控制器
   - 在`routes/`中添加新的路由定义
   - 在`routes/index.js`中注册新的路由
   - 在`tests/`中添加对应的测试用例

2. 调用合约时，使用`utils/contract.js`中提供的方法：
   - `callContractMethod`: 调用只读方法
   - `sendContractTransaction`: 发送交易

3. 验证参数时，使用`utils/validateParams.js`中提供的方法：
   - `validateParams`: 批量验证参数

## 许可证

MIT License 