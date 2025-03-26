# Server Documentation

## 背景
服务器端是日本房地产代币化系统的核心组件,负责处理区块链交互、业务逻辑和API请求。它采用Node.js + Express框架构建,使用TypeScript确保类型安全。

## 目录结构
```
server/
├── src/                # 源代码目录
│   ├── controllers/   # 控制器层
│   ├── routes/       # 路由层
│   ├── services/     # 服务层
│   ├── middlewares/  # 中间件
│   ├── utils/        # 工具函数
│   └── config/       # 配置文件
├── tests/            # 测试目录
├── docs/             # 文档目录
└── logs/             # 日志目录
```

## 核心功能

### 1. 控制器层 (Controllers)
控制器负责处理HTTP请求和响应,主要功能包括:
- 请求参数验证
- 调用服务层方法
- 错误处理
- 响应格式化

示例:
```typescript
class PropertyController {
  async registerProperty(req: Request, res: Response) {
    try {
      const property = await propertyService.register(req.body);
      res.status(201).json(property);
    } catch (error) {
      handleError(error, res);
    }
  }
}
```

### 2. 路由层 (Routes)
路由定义了API端点,使用BaseRouter类统一处理:
- 路由注册
- 中间件配置
- 权限控制
- 参数验证

示例:
```typescript
class PropertyRouter extends BaseRouter {
  setupRoutes() {
    this.post('/', PropertyController.registerProperty, {
      auth: true,
      permissions: ['operator'],
      validation: propertySchema
    });
  }
}
```

### 3. 服务层 (Services)
服务层处理业务逻辑,与区块链交互:
- 合约调用
- 数据处理
- 状态管理
- 事件处理

示例:
```typescript
class PropertyService {
  async register(propertyData: PropertyData) {
    const contract = await this.getContract();
    const tx = await contract.registerProperty(
      propertyData.id,
      propertyData.country,
      propertyData.metadataURI
    );
    return this.waitForTransaction(tx);
  }
}
```

### 4. 中间件 (Middlewares)
中间件处理通用功能:
- 认证 (authMiddleware)
- 错误处理 (errorHandler)
- 请求验证 (validateRequest)
- 日志记录 (requestLogger)
- 缓存 (cacheMiddleware)

## 配置管理

### 1. 环境变量
```env
# 服务器配置
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=japan_rwa
DB_USER=admin
DB_PASSWORD=secret

# 区块链配置
BLOCKCHAIN_RPC_URL=http://localhost:8545
BLOCKCHAIN_CHAIN_ID=1337
```

### 2. 合约配置
```typescript
const contractConfig = {
  PropertyRegistry: {
    address: process.env.PROPERTY_REGISTRY_ADDRESS,
    abi: getAbi('PropertyRegistry')
  },
  RealEstateToken: {
    address: process.env.REAL_ESTATE_TOKEN_ADDRESS,
    abi: getAbi('RealEstateToken')
  }
};
```

## 错误处理

### 1. 错误类型
```typescript
enum ErrorType {
  CONTRACT_ERROR = 'CE',
  VALIDATION_ERROR = 'VE',
  PERMISSION_ERROR = 'PE',
  RESOURCE_ERROR = 'RE',
  SYSTEM_ERROR = 'SE'
}
```

### 2. 错误响应
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
}
```

## 日志系统

### 1. 日志配置
```typescript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL,
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### 2. 日志级别
- ERROR: 错误信息
- WARN: 警告信息
- INFO: 一般信息
- DEBUG: 调试信息

## 性能优化

### 1. 缓存策略
- 使用Redis缓存频繁访问的数据
- 实现缓存失效机制
- 支持缓存预热

### 2. 数据库优化
- 使用连接池
- 实现查询缓存
- 优化索引结构

### 3. 并发处理
- 使用异步/await处理异步操作
- 实现请求限流
- 使用队列处理高并发请求

## 安全措施

### 1. 认证
- JWT token认证
- 刷新token机制
- 会话管理

### 2. 授权
- 基于角色的访问控制
- 权限验证中间件
- 操作审计日志

### 3. 数据安全
- 请求参数验证
- SQL注入防护
- XSS防护

## 部署

### 1. 开发环境
```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test
```

### 2. 生产环境
```bash
# 构建
pnpm build

# 启动生产服务器
pnpm start

# 监控
pnpm monitor
```

### 3. Docker部署
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN pnpm install

COPY . .
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
```

## 监控和维护

### 1. 健康检查
- 服务器状态监控
- 数据库连接检查
- 区块链节点状态

### 2. 性能监控
- 响应时间统计
- 资源使用监控
- 错误率统计

### 3. 日志分析
- 错误日志分析
- 访问日志分析
- 性能日志分析

## 最佳实践

### 1. 代码规范
- 使用ESLint进行代码检查
- 使用Prettier进行代码格式化
- 遵循TypeScript最佳实践

### 2. 测试规范
- 单元测试覆盖核心功能
- 集成测试验证API
- 端到端测试验证流程

### 3. 文档规范
- 使用JSDoc注释
- 维护API文档
- 记录重要决策

## 常见问题

### 1. 启动问题
- 检查环境变量配置
- 验证数据库连接
- 确认区块链节点状态

### 2. 性能问题
- 检查缓存配置
- 优化数据库查询
- 监控资源使用

### 3. 安全问题
- 定期更新依赖
- 检查安全漏洞
- 监控异常访问 