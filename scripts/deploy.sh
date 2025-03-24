#!/bin/bash
# 备用部署脚本！！！！
# 加载环境变量
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
  echo "已加载环境变量"
else
  echo "警告: .env 文件不存在，将使用默认值"
fi

# 设置默认网络
NETWORK=${DEPLOY_NETWORK:-"localhost"}
echo "部署网络: $NETWORK"

# 创建部署记录目录
mkdir -p deployments

# 部署脚本
echo "开始部署系统..."

# 1. 部署主系统合约
echo "步骤 1: 部署主系统合约"
npx hardhat run scripts/deploy/01_deploy_system.js --network $NETWORK
if [ $? -ne 0 ]; then
    echo "系统合约部署失败"
    exit 1
fi

# 2. 部署核心合约
echo "步骤 2: 部署核心合约"
npx hardhat run scripts/deploy/02_deploy_core.js --network $NETWORK
if [ $? -ne 0 ]; then
    echo "核心合约部署失败"
    exit 1
fi

# 3. 初始化系统
echo "步骤 3: 初始化系统"
npx hardhat run scripts/deploy/03_initialize_system.js --network $NETWORK
if [ $? -ne 0 ]; then
    echo "系统初始化失败"
    exit 1
fi

# 4. 验证合约
echo "步骤 4: 验证合约"
npx hardhat run scripts/verify/verify.js --network $NETWORK
if [ $? -ne 0 ]; then
    echo "警告: 合约验证失败，但部署流程将继续"
fi

# 5. 生成部署报告
echo "步骤 5: 生成部署报告"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_FILE="deployments/deployment-report-${TIMESTAMP}.md"

echo "# 部署报告 - ${TIMESTAMP}" > $REPORT_FILE
echo "## 网络信息" >> $REPORT_FILE
echo "- 网络: ${NETWORK}" >> $REPORT_FILE
echo "- 部署时间: $(date)" >> $REPORT_FILE
echo "" >> $REPORT_FILE
echo "## 部署合约地址" >> $REPORT_FILE
cat deployments.json >> $REPORT_FILE

echo "部署报告已生成: $REPORT_FILE"

# 6. 运行功能测试
echo "步骤 6: 运行功能测试"
npx hardhat run scripts/test/functionality-test.js --network $NETWORK
if [ $? -ne 0 ]; then
    echo "功能测试失败"
    exit 1
fi

echo "系统部署完成"