# 不动产系统 HTTP API 服务

这是一个基于Express框架的HTTP服务器，用于与不动产系统的智能合约进行交互。

## 功能特点

- 提供REST API接口，实现不动产系统所有核心功能
- 使用ethers.js (v6) 与以太坊区块链交互
- 支持Swagger API文档
- 提供API密钥鉴权
- 完全基于JavaScript ES模块，采用现代模块化结构

## 模块结构

- `src/controllers/`: 控制器，处理业务逻辑
- `src/routes/`: 路由定义，包含API端点和Swagger文档
- `src/middlewares/`: 中间件，如鉴权处理
- `shared/`: 共享工具和配置

## 主要功能

服务器提供以下核心功能：

1. **角色管理** - 管理用户角色和权限
   - 获取角色信息
   - 授予和撤销角色
   - 获取角色地址列表

2. **房产管理** - 不动产代币化和管理
   - 注册新房产
   - 获取房产信息
   - 更新房产信息
   - 获取所有房产列表

3. **交易管理** - 房产代币交易
   - 创建交易订单
   - 执行交易
   - 取消交易
   - 获取订单信息

4. **奖励管理** - 处理房产收益分配
   - 分发奖励
   - 领取奖励
   - 查询可领取奖励
   - 获取奖励历史

5. **系统管理** - 系统状态控制
   - 获取系统状态
   - 紧急模式控制
   - 交易暂停控制

## 安装和运行

### 前提条件

- Node.js >= 14.0.0
- Yarn 包管理器

### 安装依赖

```bash
cd http-server
yarn install
```

### 配置环境变量

在项目根目录创建或编辑 `.env` 文件：

```
# 服务器配置
SERVER_PORT=3000
API_KEY=your_api_key_here

# 区块链网络配置
RPC_URL=http://localhost:8545
CHAIN_ID=31337

# 合约地址
ROLE_MANAGER_ADDRESS=0x...
PROPERTY_MANAGER_ADDRESS=0x...
TRADING_MANAGER_ADDRESS=0x...
REWARD_MANAGER_ADDRESS=0x...

# 角色私钥
ADMIN_PRIVATE_KEY=0x...
MANAGER_PRIVATE_KEY=0x...
TRADER_PRIVATE_KEY=0x...
```

### 启动服务器

开发模式：

```bash
yarn dev
```

生产模式：

```bash
yarn start
```

API文档可在 `http://localhost:3000/api-docs` 访问。

## API使用示例

### 获取角色信息

```
GET /api/role-manager/roles/0x1234...?api_key=your_api_key_here
```

### 注册房产

```
POST /api/property-manager/register?api_key=your_api_key_here
Content-Type: application/json

{
  "propertyId": "P12345",
  "location": "东京都新宿区西新宿1-1-1",
  "area": 120.5,
  "description": "高层公寓，临近车站，设施齐全",
  "initialSupply": "1000",
  "decimals": 18
}
```

更多API用法请参考Swagger文档。 