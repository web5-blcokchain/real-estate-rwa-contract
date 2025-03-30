#!/bin/bash

# 清理部署记录脚本
# 保留每个网络的最新记录和最多5个历史记录

# 进入部署目录
cd "$(dirname "$0")"

echo "开始清理部署记录..."

# 为每个网络保留最新的5个历史记录
for network in hardhat localhost chain-31337 testnet mainnet; do
  # 跳过不存在记录的网络
  ls ${network}-*.json >/dev/null 2>&1 || continue
  
  count=$(ls ${network}-*.json | grep -v "${network}-latest.json" | wc -l)
  
  if [ $count -gt 5 ]; then
    echo "清理 ${network} 网络的历史记录，当前有 $count 个记录..."
    
    # 保留最新的5个记录，删除其余的
    to_delete=$(ls -t ${network}-*.json | grep -v "${network}-latest.json" | tail -n +6)
    
    if [ ! -z "$to_delete" ]; then
      echo "$to_delete" | xargs rm -f
      echo "删除了 $((count-5)) 个过时的 ${network} 部署记录"
    fi
  else
    echo "${network} 网络的部署记录小于或等于5个，无需清理"
  fi
done

echo "清理完成" 