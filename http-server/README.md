# HTTP API 服务器

这是日本房地产代币化平台的HTTP API服务器，提供与区块链智能合约交互的RESTful接口。

## 功能特点

- **简洁明了的API设计**：接口直接映射到智能合约功能
- **安全认证**：通过API密钥认证
- **区块链交互**：与以太坊智能合约进行读写操作
- **细粒度权限**：根据合约类型使用不同的签名账户
- **交易监控**：提供交易状态查询接口
- **完善的日志**：详细的请求和错误日志记录

## 目录结构

```
http-server/
├── src/
│   ├── config/         - 配置文件
│   ├── controllers/    - 控制器（处理请求）
│   ├── middleware/     - 中间件（认证、日志等）
│   ├── routes/         - 路由定义
│   ├── services/       - 服务层（业务逻辑）
│   ├── utils/          - 工具函数
│   └── index.js        - 应用入口
├── tests/              - 测试文件
└── test-results/       - 测试结果
```

## 安装与配置

本项目依赖于主项目的依赖，无需单独安装依赖包。

### 环境变量

创建或修改项目根目录下的`.env`文件，添加以下配置：

```
# API服务器配置
HTTP_SERVER_PORT=3030
HTTP_SERVER_HOST=localhost
API_KEY=your-api-key

# 区块链配置
HARDHAT_RPC_URL=http://127.0.0.1:8545
HARDHAT_CHAIN_ID=31337

# 账户管理（根据合约类型配置不同的私钥）
ADMIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
PROPERTY_ADMIN_PRIVATE_KEY=0x...
TOKEN_ADMIN_PRIVATE_KEY=0x...
SYSTEM_ADMIN_PRIVATE_KEY=0x...
```

## 启动服务器

在项目根目录下运行以下命令：

```bash
# 开发模式（使用nodemon自动重启）
npm run http:dev

# 生产模式
npm run http:start

# 与其他服务一起启动（区块链节点、服务器、监控工具）
npm run dev:all
```

## API 端点

### 系统管理

- `GET /api/system/status` - 获取API服务状态
- `GET /api/system/info` - 获取系统信息
- `POST /api/system/pause` - 暂停系统
- `POST /api/system/unpause` - 恢复系统
- `GET /api/system/contracts` - 获取合约地址列表
- `GET /api/system/transaction/:txHash` - 获取交易状态

### 属性管理 (待实现)

- `GET /api/properties` - 获取属性列表
- `GET /api/properties/:id` - 获取属性详情
- `POST /api/properties` - 注册新属性
- `PUT /api/properties/:id/approve` - 批准属性
- `PUT /api/properties/:id/reject` - 拒绝属性

### 代币管理 (待实现)

- `GET /api/tokens` - 获取代币列表
- `GET /api/tokens/:address` - 获取代币详情
- `POST /api/tokens` - 创建新代币

### 认证与授权

所有API请求（除了`/api/system/status`）都需要提供API密钥，可以通过以下方式提供：

1. 查询参数：`?api_key=your-api-key`
2. 请求头：`X-API-Key: your-api-key`

## 测试

运行API测试：

```bash
npm run http:test:api
```

测试结果将保存在`http-server/test-results`目录中。

## 扩展

如需扩展API功能，可按以下步骤操作：

1. 在`controllers`目录下创建新的控制器
2. 在`routes`目录下创建新的路由文件
3. 在`routes/index.js`中注册新的路由
4. 在`tests`目录下添加相应的测试

## 日志

日志文件位于`logs/http-server`目录：

- `combined.log` - 所有日志
- `error.log` - 仅错误日志
- `api-requests.log` - API请求日志
- `exceptions.log` - 未捕获异常日志

## 注意事项

- 生产环境部署时，请确保设置强密码的API密钥
- 定期检查日志文件，及时发现并解决问题
- 请使用安全的方式管理私钥，避免硬编码在代码中 