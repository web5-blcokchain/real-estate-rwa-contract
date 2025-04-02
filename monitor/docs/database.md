# 数据库设计

区块链监控系统使用PostgreSQL数据库存储监控数据。以下是系统使用的数据表设计。

## 监控地址表 (monitored_addresses)

存储需要监控的区块链地址。

| 字段名 | 类型 | 说明 |
|-------|------|-----|
| id | SERIAL | 主键 |
| address | VARCHAR(42) | 以太坊地址（小写） |
| address_type | VARCHAR(20) | 地址类型（CONTRACT, EOA, TOKEN_CONTRACT） |
| label | TEXT | 地址标签 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

唯一约束：address

## 交易表 (transactions)

存储监控地址的交易信息。

| 字段名 | 类型 | 说明 |
|-------|------|-----|
| id | SERIAL | 主键 |
| hash | VARCHAR(66) | 交易哈希 |
| block_number | BIGINT | 区块号 |
| block_hash | VARCHAR(66) | 区块哈希 |
| from_address | VARCHAR(42) | 发送方地址 |
| to_address | VARCHAR(42) | 接收方地址（合约创建时为NULL） |
| value | TEXT | 交易金额（Wei） |
| gas | BIGINT | Gas上限 |
| gas_price | BIGINT | Gas价格 |
| nonce | INTEGER | 发送方交易序号 |
| data | TEXT | 交易数据 |
| timestamp | TIMESTAMP | 交易时间 |
| transaction_index | INTEGER | 交易在区块中的索引 |
| status | BOOLEAN | 交易状态（1成功，0失败，NULL未知） |
| created_at | TIMESTAMP | 记录创建时间 |

唯一约束：hash

## 事件表 (events)

存储合约事件信息。

| 字段名 | 类型 | 说明 |
|-------|------|-----|
| id | SERIAL | 主键 |
| block_number | BIGINT | 区块号 |
| transaction_hash | VARCHAR(66) | 交易哈希 |
| contract_address | VARCHAR(42) | 合约地址 |
| event_name | VARCHAR(100) | 事件名称 |
| event_signature | VARCHAR(66) | 事件签名 |
| log_index | INTEGER | 日志索引 |
| parameters | JSONB | 事件参数 |
| timestamp | TIMESTAMP | 事件时间 |
| created_at | TIMESTAMP | 记录创建时间 |

唯一约束：transaction_hash, log_index

## 合约ABI表 (contract_abis)

存储合约ABI信息，用于解析事件。

| 字段名 | 类型 | 说明 |
|-------|------|-----|
| id | SERIAL | 主键 |
| address | VARCHAR(42) | 合约地址 |
| abi | JSONB | 合约ABI |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

唯一约束：address

## 同步状态表 (sync_status)

存储地址数据同步状态。

| 字段名 | 类型 | 说明 |
|-------|------|-----|
| id | SERIAL | 主键 |
| address | VARCHAR(42) | 区块链地址 |
| last_block_number | BIGINT | 最后同步的区块号 |
| last_sync_time | TIMESTAMP | 最后同步时间 |
| is_syncing | BOOLEAN | 是否正在同步 |

唯一约束：address

## 表关系

```
monitored_addresses 1 ------> 1 sync_status
        |
        | 1
        V
      many
   transactions
        ^
        | many
        |
contract_abis 1 ------> many events
```

## 索引

为了提高查询性能，系统在以下字段上创建了索引：

- monitored_addresses.address
- transactions.hash
- transactions.from_address
- transactions.to_address
- transactions.block_number
- events.transaction_hash
- events.contract_address
- events.event_name
- events.block_number
- contract_abis.address
- sync_status.address

## 数据约束

系统使用以下约束确保数据完整性：

1. 所有以太坊地址统一存储为小写形式
2. 交易哈希和区块哈希存储为完整形式（包括前缀"0x"）
3. 区块号和Gas值等数值使用BIGINT类型存储，以支持大数值
4. 交易金额以字符串形式存储，以避免精度损失

## 数据样例

### monitored_addresses 表

```
id | address                                    | address_type   | label           | created_at           | updated_at
---+--------------------------------------------+----------------+-----------------+----------------------+----------------------
1  | 0x1234567890123456789012345678901234567890 | CONTRACT       | 我的合约        | 2023-04-01 10:00:00 | 2023-04-01 10:00:00
2  | 0xabcdef0123456789abcdef0123456789abcdef01 | EOA            | 我的钱包        | 2023-04-01 10:30:00 | 2023-04-01 10:30:00
3  | 0xdcba9876543210fedcba9876543210fedcba9876 | TOKEN_CONTRACT | ERC20代币       | 2023-04-01 11:00:00 | 2023-04-01 11:00:00
```

### events 表

```
id | block_number | transaction_hash                                                     | contract_address                           | event_name | event_signature                                                      | log_index | parameters                         | timestamp            | created_at
---+--------------+----------------------------------------------------------------------+--------------------------------------------+------------+---------------------------------------------------------------------+-----------+------------------------------------+----------------------+----------------------
1  | 1000000      | 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef | 0x1234567890123456789012345678901234567890 | Transfer   | 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef | 0         | {"from": "0x1234...", "to": "0x5678...", "value": "1000000000000000000"} | 2023-04-01 10:15:00 | 2023-04-01 10:20:00
``` 