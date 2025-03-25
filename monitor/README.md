# 区块链事件监控工具

这个工具用于监控日本房产代币化平台智能合约的区块链事件，实时捕获和显示系统中所有合约触发的事件。

## 功能特点

- **双模式监控**：历史事件扫描 + 实时事件监听
- **多合约支持**：同时监控多个智能合约
- **实时通知**：区块链事件实时捕获和通知
- **历史记录**：定期轮询获取历史事件
- **控制台展示**：美观的控制台事件输出
- **日志记录**：详细的事件日志保存
- **自动重连**：WebSocket连接断开后自动重连
- **可靠监听**：针对每个事件类型设置单独监听器
- **灵活配置**：提供丰富的配置选项
- **连接容错**：HTTP/WebSocket双通道支持

## 系统架构

系统由以下主要组件构成：

1. **配置管理 (config)** - 管理环境变量和系统配置
2. **以太坊服务 (ethereum)** - 处理与区块链的连接和交互
3. **事件监听器 (eventListener)** - 实时监听合约事件
4. **日志工具 (logger)** - 处理日志记录和输出格式化
5. **合约ABI管理 (contracts)** - 集中管理所有合约的ABI定义

## 支持的合约

- RoleManager - 角色管理合约
- PropertyRegistry - 房产注册合约
- TokenFactory - 代币工厂合约
- Marketplace - 交易市场合约
- RentDistributor - 租金分发合约
- RedemptionManager - 赎回管理合约
- TokenHolderQuery - 代币持有者查询合约
- RealEstateSystem - 系统管理合约

## 快速开始

### 安装依赖

```bash
cd monitor
npm install
```

### 配置环境变量

复制环境变量示例文件，并根据实际情况修改：

```bash
cp .env.example .env
```

配置以下关键参数：

- `ETH_RPC_URL` - 以太坊节点HTTP RPC地址
- `ETH_WS_URL` - 以太坊节点WebSocket地址 (推荐，用于实时事件)
- 各合约地址
- 监控参数

### 更新合约ABI

如果智能合约有更新，可以使用以下命令从编译产物中更新合约ABI：

```bash
# 只提取合约事件定义（推荐用于监控工具）
npm run update-abis

# 提取完整合约ABI
npm run update-abis:full

# 指定artifacts目录路径
npm run update-abis -- --artifacts-path ../path/to/artifacts/contracts
```

> 注意：需要先编译合约，确保 `artifacts` 目录中有最新的合约编译产物。

### 检查合约状态

在开始监控前，可以检查所有合约的可用性：

```bash
npm run check
```

### 启动监控

```bash
npm start
```

### 开发模式启动（自动重启）

```bash
npm run dev
```

## 工作原理

该工具以两种方式监控区块链事件：

1. **历史事件扫描**：定期轮询区块链，获取从上次扫描到现在区块中的事件
2. **实时事件监听**：使用以太坊节点的WebSocket连接，实时接收新事件

当新的区块被挖出或新的事件被触发时，监控工具会立即捕获并显示详细信息。

### WebSocket连接管理

工具优先使用WebSocket连接进行实时事件监听，提供以下功能：

- 自动检测连接断开
- 尝试自动重连(可配置次数)
- 故障转移到HTTP提供者

## 输出示例

### 历史事件输出

```
[2023-08-15T09:45:23.456Z] 📜 HISTORICAL EVENT:
- Contract: PropertyRegistry(0x1234...)
- Event: PropertyStatusChanged
- Block: 12345678 | Tx: 0xabcd...
- Args: {
    "propertyId": "1",
    "oldStatus": "0",
    "newStatus": "1",
    "operator": "0x9876..."
  }
-------------------------------------------
```

### 实时事件输出

```
[2023-08-15T09:45:23.456Z] 🔔 REAL-TIME EVENT DETECTED:
- Contract: TokenFactory(0x5678...)
- Event: TokenCreated
- Block: 12345679 | Tx: 0xefgh...
- Args: {
    "tokenAddress": "0xabcd...",
    "propertyId": "1",
    "name": "Tokyo Property",
    "symbol": "TKYP"
  }
===========================================
```

## 高级配置选项

在`.env`文件中可以设置以下配置：

| 参数 | 说明 | 默认值 |
|------|------|------|
| ETH_RPC_URL | 以太坊节点HTTP RPC地址 | - |
| ETH_WS_URL | 以太坊节点WebSocket地址 | 与RPC地址相同 |
| BLOCKS_TO_FETCH | 初始化时获取的历史块数量 | 5000 |
| POLLING_INTERVAL | 轮询间隔(毫秒) | 15000 |
| LOG_LEVEL | 日志级别(error/warn/info/debug) | info |
| ENABLE_HISTORICAL_EVENTS | 是否启用历史事件扫描 | true |
| ENABLE_REAL_TIME_EVENTS | 是否启用实时事件监听 | true |
| RECONNECT_DELAY | WebSocket断开后重连延迟(毫秒) | 5000 |
| MAX_RECONNECT_ATTEMPTS | 最大重连尝试次数 | 10 |
| SAVE_EVENTS_TO_FILE | 是否将事件保存到文件 | false |
| MERGE_BLOCK_EVENTS | 是否合并相同区块的事件 | false |

## 日志管理

日志文件保存在`logs`目录中，按日期自动分割：

- `logs/events-YYYY-MM-DD.log` - 每日事件日志

## 项目结构

```
monitor/
├── src/
│   ├── config/            # 配置文件目录
│   │   └── index.js       # 主配置文件
│   ├── contracts/         # 合约ABI定义目录
│   │   └── index.js       # ABI索引文件
│   ├── utils/             # 工具函数目录
│   │   ├── ethereum.js    # 以太坊连接和交互
│   │   ├── eventListener.js  # 实时事件监听
│   │   └── logger.js      # 日志管理
│   └── index.js           # 程序入口
├── scripts/               # 脚本目录
│   └── check-contracts.js # 合约状态检查脚本
├── logs/                  # 日志输出目录
├── .env.example           # 环境变量示例
├── .gitignore             # Git忽略文件
├── package.json           # 项目配置和依赖
└── README.md              # 项目说明文档
```

## 高级用法

### 仅使用历史事件扫描

如果不需要实时事件监听，可以在`.env`中设置：

```
ENABLE_REAL_TIME_EVENTS=false
```

### 仅使用实时事件监听

如果只需要实时事件，不关心历史事件，可以设置：

```
ENABLE_HISTORICAL_EVENTS=false
```

### 保存事件到文件

如果需要将捕获的事件保存到文件，可以设置：

```
SAVE_EVENTS_TO_FILE=true
```

## 故障排除

### WebSocket连接问题

如果看到以下警告：

```
Provider is not a WebSocket provider. Real-time events may not work properly.
```

确保您提供了有效的WebSocket URL (以`wss://`开头)。

### 未看到任何事件

1. 使用`npm run check`检查合约地址是否正确
2. 确认您监听的合约最近是否有事件触发
3. 检查区块范围设置是否合适 (BLOCKS_TO_FETCH)

## 贡献

欢迎提交问题和改进建议。

## 许可证

MIT 