#!/bin/bash
# 智能合约部署脚本
# 简化版本 - 支持本地、测试网和主网部署

# 显示颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 显示帮助信息
display_help() {
  echo -e "${BLUE}智能合约部署脚本${NC}"
  echo ""
  echo "用法: $0 <network> [options]"
  echo ""
  echo "网络:"
  echo "  local      部署到本地开发网络"
  echo "  testnet    部署到测试网"
  echo "  mainnet    部署到主网"
  echo ""
  echo "选项:"
  echo "  --strategy=<策略>    部署策略 (direct, upgradeable, minimal)"
  echo "  --verify             部署后验证合约"
  echo "  --force              强制部署（忽略已部署状态）"
  echo "  --help               显示此帮助信息"
  echo ""
  echo "示例:"
  echo "  $0 local --strategy=upgradeable"
  echo "  $0 testnet --verify"
  echo "  $0 local --force"
}

# 检查帮助参数
if [ "$1" = "--help" ]; then
  display_help
  exit 0
fi

# 默认值
NETWORK=""
STRATEGY="upgradeable"
VERIFY="false"
SETUP_ROLES="true"
FORCE_DEPLOY="false"

# 解析命令行参数
if [ $# -eq 0 ]; then
  display_help
  exit 1
fi

# 第一个参数是网络
NETWORK=$1
shift

# 处理剩余参数
for arg in "$@"; do
  case $arg in
    --strategy=*)
      STRATEGY=${arg#--strategy=}
      ;;
    --verify)
      VERIFY="true"
      ;;
    --force)
      FORCE_DEPLOY="true"
      ;;
    --help)
      display_help
      exit 0
      ;;
    *)
      echo "未知参数: $arg"
      display_help
      exit 1
      ;;
  esac
done

# 映射网络名称到Hardhat配置中的网络名称
HARDHAT_NETWORK=""
case $NETWORK in
  "local")
    HARDHAT_NETWORK="localhost"
    ;;
  "testnet")
    HARDHAT_NETWORK="testnet"
    ;;
  "mainnet")
    HARDHAT_NETWORK="mainnet"
    ;;
  *)
    echo -e "${RED}错误: 无效的网络名称: $NETWORK${NC}"
    echo -e "有效的网络名称: local, testnet, mainnet"
    exit 1
    ;;
esac

# 确认主网部署
if [[ "$NETWORK" == "mainnet" ]]; then
  echo -e "${RED}警告: 您正在部署到主网环境!${NC}"
  echo -e "${YELLOW}这将部署合约到生产环境，并消耗真实的资金。${NC}"
  echo -e "${RED}请确认您要继续执行部署操作 (y/N):${NC}"
  read -r confirmation
  
  if [[ "$confirmation" != "y" && "$confirmation" != "Y" ]]; then
    echo "部署已取消"
    exit 0
  fi
fi

# 显示部署信息
echo -e "${GREEN}开始部署到网络: ${BLUE}$NETWORK${NC}"
echo -e "${GREEN}部署选项:${NC}"
echo -e "  - 策略: ${BLUE}${STRATEGY}${NC}"
echo -e "  - 验证: $([ "$VERIFY" = "true" ] && echo "${BLUE}是${NC}" || echo "${BLUE}否${NC}")"
echo -e "  - 强制部署: $([ "$FORCE_DEPLOY" = "true" ] && echo "${BLUE}是${NC}" || echo "${BLUE}否${NC}")"
echo -e "  - 自动设置角色: ${BLUE}是${NC}"

# 设置环境变量
export DEPLOY_STRATEGY=$STRATEGY
export DEPLOY_VERIFY=$VERIFY
export FORCE_DEPLOY=$FORCE_DEPLOY

# 部署合约
echo -e "${GREEN}正在部署合约...${NC}"
if [ "$FORCE_DEPLOY" = "true" ]; then
  echo -e "${YELLOW}使用强制部署模式...${NC}"
  npx hardhat run scripts/force-deploy.js --network $HARDHAT_NETWORK
else
  npx hardhat run scripts/deploy.js --network $HARDHAT_NETWORK
fi

if [ $? -ne 0 ]; then
  echo -e "\n${RED}部署失败!${NC}"
  exit 1
fi

# 部署成功后设置角色
if [ "$SETUP_ROLES" = "true" ]; then
  echo -e "${GREEN}正在设置合约角色...${NC}"
  npx hardhat run scripts/setup-roles.js --network $HARDHAT_NETWORK
  
  if [ $? -ne 0 ]; then
    echo -e "\n${YELLOW}角色设置可能不完整!${NC}"
  fi
fi

# 测试部署
echo -e "${GREEN}验证部署状态...${NC}"
if [ -f "scripts/tests/deployment-test.js" ]; then
  npx hardhat run scripts/tests/deployment-test.js --network $HARDHAT_NETWORK
  
  if [ $? -ne 0 ]; then
    echo -e "\n${YELLOW}部署验证失败，可能需要手动检查!${NC}"
  else
    echo -e "\n${GREEN}部署验证成功!${NC}"
  fi
else
  echo -e "${YELLOW}部署验证脚本不存在，跳过验证!${NC}"
fi

# 验证合约（如果需要）
if [ "$VERIFY" = "true" ] && [ "$NETWORK" != "local" ]; then
  echo -e "\n${GREEN}正在验证合约...${NC}"
  npx hardhat run scripts/verify.js --network $HARDHAT_NETWORK
  
  if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}合约验证完成!${NC}"
  else
    echo -e "\n${RED}合约验证失败!${NC}"
  fi
fi

echo -e "\n${GREEN}部署流程完成!${NC}"
echo -e "${BLUE}请查看部署记录文件以获取详细信息。${NC}" 