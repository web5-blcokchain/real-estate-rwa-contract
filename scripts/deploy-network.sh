#!/bin/bash

# 网络特定部署脚本
# 用法: ./deploy-network.sh <network_name>

# 检查参数
if [ -z "$1" ]; then
  echo "错误: 请指定网络名称"
  echo "用法: ./deploy-network.sh <network_name>"
  echo "支持的网络: hardhat, bsc_testnet, bsc_mainnet"
  exit 1
fi

NETWORK=$1

# 加载环境变量
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
  echo "已加载环境变量"
else
  echo "警告: .env 文件不存在，将使用默认值"
fi

# 创建日志目录
mkdir -p logs

# 记录部署开始时间
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
echo "开始部署到 $NETWORK 网络 - $TIMESTAMP"

# 运行统一部署脚本
echo "运行部署脚本..."
npx hardhat run scripts/deploy-unified.js --network $NETWORK

# 检查部署结果
if [ $? -ne 0 ]; then
  echo "部署失败"
  exit 1
fi

# 运行验证脚本
echo "运行验证脚本..."
npx hardhat run scripts/verify-$NETWORK.js --network $NETWORK

# 检查验证结果
if [ $? -ne 0 ]; then
  echo "警告: 验证失败，但部署已完成"
fi

# 运行功能测试
echo "运行功能测试..."
npx hardhat run scripts/test/functionality-test.js --network $NETWORK

# 检查测试结果
if [ $? -ne 0 ]; then
  echo "警告: 功能测试失败，请检查部署"
fi

echo "部署完成 - $(date)"