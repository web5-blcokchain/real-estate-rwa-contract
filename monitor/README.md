# 区块链监控系统

区块链监控系统是一个用于监控以太坊区块链上交易和事件的工具，它可以抓取指定地址（包括合约地址和普通地址）的交易记录和事件数据，并将其存储到数据库中，以便进行后续分析。

## 功能特点

- 监控指定地址的交易记录
- 抓取合约事件并解析
- 区分合约地址和普通地址的处理
- 数据持久化存储
- 灵活的配置系统
- 支持不同网络环境（本地、测试网、主网）

## 项目结构

```
monitor/
├── src/                  # 源代码目录
│   ├── config/           # 配置文件
│   │   ├── database.js   # 数据库配置
│   │   └── index.js      # 配置入口
│   ├── db/               # 数据库相关
│   │   ├── models/       # 数据表模型
│   │   └── index.js      # 数据库连接和初始化
│   ├── services/         # 业务服务
│   │   ├── monitor.js    # 区块链监控服务
│   │   ├── event.js      # 事件处理服务
│   │   └── address.js    # 地址管理服务
│   ├── utils/            # 工具函数
│   └── index.js          # 程序入口
├── scripts/              # 脚本文件
│   ├── add-address.js    # 添加监控地址脚本
│   └── sync-data.js      # 数据同步脚本
├── logs/                 # 日志目录
├── package.json          # 项目配置
└── README.md             # 项目说明
```

## 安装和配置

### 前置要求

- Node.js >= 18.0.0
- PostgreSQL 数据库
- Yarn 包管理器

### 安装

```bash
# 安装依赖
cd monitor
yarn install
```

### 配置

本项目使用根目录 `.env` 文件的配置，确保其中包含以下配置项：

```
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=blockchain_monitor

# 区块链网络配置
# 由NODE_ENV和BLOCKCHAIN_NETWORK环境变量决定使用哪个网络
```

## 使用方法

### 添加监控地址

```bash
# 添加合约地址
yarn add-address 0x123... CONTRACT "Contract Label"

# 添加普通地址
yarn add-address 0x456... EOA "EOA Label"
```

### 启动监控

```bash
# 开发模式
yarn dev

# 生产模式
yarn start
```

### 手动同步数据

```bash
# 同步所有监控地址的数据
yarn sync

# 同步指定地址的数据
yarn sync -- --address 0x123...
```

## 数据表设计

本系统使用PostgreSQL数据库存储区块链数据，主要数据表包括：

1. **monitored_addresses** - 监控地址表
2. **transactions** - 交易表
3. **events** - 事件表
4. **contract_abis** - 合约ABI表
5. **sync_status** - 同步状态表

详细的表结构定义请参见 [数据库设计文档](./docs/database.md)。

## 开发说明

本项目遵循项目根目录`约定.md`中的规范，特别是：

1. 只使用ethers V6版本
2. 所有配置通过环境变量管理
3. 日志存放在logs目录下
4. 优先使用shared中的功能模块
5. 使用CommonJS规范组织代码
6. 代码保持整洁，遵循项目编码规范 