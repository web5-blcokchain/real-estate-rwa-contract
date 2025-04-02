# 区块链监控系统使用说明

本文档介绍如何使用区块链监控系统进行区块链数据的监控和查询。

## 前置条件

在开始使用监控系统前，请确保以下条件已满足：

1. PostgreSQL 数据库已安装并运行
2. Node.js (v18+) 已安装
3. Yarn 包管理器已安装
4. 根目录下的 `.env` 文件已正确配置（可参考 `.env.example`）

## 安装依赖

```bash
cd monitor
yarn install
```

## 添加监控地址

要监控区块链上的地址（合约或普通账户），首先需要将其添加到监控列表中：

```bash
# 添加合约地址
yarn add-address 0x1234567890123456789012345678901234567890 CONTRACT "我的合约"

# 添加普通账户地址
yarn add-address 0xabcdef0123456789abcdef0123456789abcdef01 EOA "我的钱包"

# 添加代币合约地址
yarn add-address 0xdcba9876543210fedcba9876543210fedcba9876 TOKEN_CONTRACT "我的代币"
```

## 查看监控地址列表

```bash
# 查看所有监控地址
yarn list-addresses

# 查看指定类型的地址
yarn list-addresses -- --type CONTRACT
```

## 更新合约ABI

要监控合约事件，需要提供合约的ABI：

```bash
# 更新合约ABI
yarn update-abi 0x1234567890123456789012345678901234567890 ./path/to/abi.json
```

## 同步区块链数据

```bash
# 同步所有监控地址的数据
yarn sync

# 同步指定地址的数据
yarn sync -- --address 0x1234567890123456789012345678901234567890
```

## 启动监控服务

监控服务会根据配置的时间间隔，自动同步区块链数据：

```bash
# 开发模式（适合调试）
yarn dev

# 生产模式
yarn start
```

## 数据查询

监控系统会将数据存储在PostgreSQL数据库中，可以使用任何SQL工具进行查询。

主要数据表：

1. `monitored_addresses` - 监控地址表
2. `transactions` - 交易表
3. `events` - 事件表
4. `contract_abis` - 合约ABI表
5. `sync_status` - 同步状态表

### 简单查询示例

```sql
-- 查询指定地址的所有交易
SELECT * FROM transactions
WHERE from_address = '0x1234...' OR to_address = '0x1234...'
ORDER BY block_number DESC;

-- 查询指定合约的所有事件
SELECT * FROM events
WHERE contract_address = '0x1234...'
ORDER BY block_number DESC;

-- 查询指定名称的事件
SELECT * FROM events
WHERE event_name = 'Transfer'
ORDER BY block_number DESC;
```

## 日志查看

系统运行日志存放在 `logs` 目录下：

```bash
# 查看主应用日志
cat logs/app.log

# 查看监控服务日志
cat logs/monitor-service.log

# 查看错误日志
cat logs/error.log
```

## 常见问题

### 数据库连接问题

如果遇到数据库连接问题，请检查：

1. PostgreSQL服务是否正在运行
2. `.env` 文件中的数据库配置是否正确
3. 数据库用户是否有足够的权限

### 区块链连接问题

如果遇到区块链连接问题，请检查：

1. 区块链节点是否可访问
2. `.env` 文件中的PROVIDER_URL是否正确
3. 网络连接是否稳定

### 监控服务不工作

如果监控服务无法正常工作，请检查：

1. 日志文件中是否有错误信息
2. 是否已添加监控地址
3. 区块链和数据库连接是否正常 