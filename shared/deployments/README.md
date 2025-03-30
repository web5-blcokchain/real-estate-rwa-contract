# 合约部署记录

## 概述

本目录存储系统智能合约的部署记录，包括不同网络上的合约地址和部署状态。

## 文件说明

- `contracts.json`: 所有合约的最新地址（主要参考文件）
- `[网络名称]-latest.json`: 各网络的最新部署状态
- 时间戳文件: 各次部署的历史记录（格式：`[网络名称]-[时间戳].json`）

## 管理指南

### 保留策略

为避免目录臃肿，建议采用以下策略管理部署记录：

1. 每个网络只保留最新的 `-latest.json` 文件
2. 历史部署记录保留不超过 5 个版本
3. 重要的里程碑部署应单独备份

### 清理脚本

以下是清理冗余部署记录的脚本示例：

```bash
#!/bin/bash

# 进入部署目录
cd "$(dirname "$0")"

# 为每个网络保留最新的5个历史记录
for network in hardhat localhost chain-31337 testnet mainnet; do
  # 跳过不存在记录的网络
  ls ${network}-*.json >/dev/null 2>&1 || continue
  
  # 保留最新的5个记录，删除其余的
  ls -t ${network}-*.json | grep -v "${network}-latest.json" | tail -n +6 | xargs rm -f
done

echo "部署记录清理完成"
```

可以将此脚本保存为 `cleanup.sh` 并定期运行以维护目录整洁。

### 文件格式

部署记录使用JSON格式，包含以下主要字段：

```json
{
  "timestamp": "ISO格式的部署时间",
  "network": {
    "name": "网络名称",
    "chainId": "网络ID"
  },
  "deployer": "部署账户地址",
  "contracts": {
    "Contract1": "地址1",
    "Contract2": "地址2"
  },
  "libraries": {
    "Lib1": "地址1",
    "Lib2": "地址2"
  }
}
```

## 注意事项

- 不要手动修改这些文件，除非你完全理解其结构和影响
- 使用脚本或工具来更新和管理部署记录
- 确保重要的部署记录有适当的备份
- 对于生产环境，考虑使用加密存储敏感部署信息