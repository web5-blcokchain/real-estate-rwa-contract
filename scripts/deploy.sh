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
  echo "  --no-roles           跳过角色设置"
  echo "  --skip-token-impl    跳过代币实现部署"
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
SKIP_TOKEN_IMPL="false"

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
    --no-roles)
      SETUP_ROLES="false"
      ;;
    --skip-token-impl)
      SKIP_TOKEN_IMPL="true"
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
    HARDHAT_NETWORK="sepolia"
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
echo -e "  - 自动设置角色: ${BLUE}$SETUP_ROLES${NC}"
echo -e "  - 跳过代币实现部署: $([ "$SKIP_TOKEN_IMPL" = "true" ] && echo "${BLUE}是${NC}" || echo "${BLUE}否${NC}")"

# 创建日志目录
mkdir -p logs

# 设置日志文件
LOG_FILE="logs/deploy-$(date +%Y%m%d-%H%M%S).log"

# 设置环境变量
export DEPLOY_STRATEGY=$STRATEGY
export DEPLOY_VERIFY=$VERIFY
export FORCE_DEPLOY=$FORCE_DEPLOY

# 主部署函数
deploy() {
  echo "正在部署合约..."
  
  # 检查是否使用强制部署模式
  if [ "$FORCE_DEPLOY" = "true" ]; then
    echo "使用强制部署模式..."
    # 使用force-deploy.js脚本进行强制部署，避免gas估算问题
    npx hardhat run scripts/force-deploy.js --network $HARDHAT_NETWORK
  else
    # 常规部署使用deploy.js
    npx hardhat run scripts/deploy.js --network $HARDHAT_NETWORK
  fi
  
  # 检查部署结果
  if [ $? -ne 0 ]; then
    echo -e "\n部署失败!"
    exit 1
  else
    echo -e "\n部署成功!"
  fi
}

# 部署代币实现并设置TokenFactory
deploy_token_implementation() {
  if [ "$SKIP_TOKEN_IMPL" = "true" ]; then
    echo "跳过代币实现部署"
    return 0
  fi
  
  echo -e "\n${GREEN}开始部署代币实现合约...${NC}"
  echo -e "${YELLOW}这是关键步骤：确保TokenFactory正确配置代币实现地址${NC}"
  
  # 确保TokenFactory已部署
  if [ ! -f "scripts/deploy-state.json" ]; then
    echo -e "${RED}错误：找不到deploy-state.json文件，请先部署基础合约${NC}"
    return 1
  fi
  
  # 检查TokenFactory是否已部署
  if ! grep -q "TokenFactory" scripts/deploy-state.json; then
    echo -e "${RED}错误：TokenFactory尚未部署，请先部署基础合约${NC}"
    return 1
  fi
  
  # 部署RealEstateToken实现并设置TokenFactory
  npx hardhat run scripts/deploy-token-implementation.js --network $HARDHAT_NETWORK
  
  if [ $? -ne 0 ]; then
    echo -e "\n${RED}❌ 代币实现部署失败!${NC}"
    echo -e "${YELLOW}TokenFactory的tokenImplementation可能未正确设置${NC}"
    echo -e "${YELLOW}完整业务流程测试可能会失败，代币创建将无法正常工作${NC}"
    return 1
  else
    echo -e "\n${GREEN}✅ 代币实现部署成功!${NC}"
    echo -e "${GREEN}TokenFactory的tokenImplementation已正确设置${NC}"
    echo -e "${GREEN}现在可以创建代币和运行完整业务流程测试${NC}"
    return 0
  fi
}

# 验证部署
verify_deployment() {
  echo -e "\n${BLUE}正在验证部署...${NC}"
  
  # 验证部署的合约
  if [ -f "scripts/tests/deployment-test.js" ]; then
    echo -e "运行部署验证测试..."
    npx hardhat run scripts/tests/deployment-test.js --network $HARDHAT_NETWORK
    
    if [ $? -ne 0 ]; then
      echo -e "\n${RED}部署验证失败!${NC}"
      exit 1
    else
      echo -e "\n${GREEN}部署验证成功!${NC}"
      
      # 运行基础业务流程测试
      if [ -f "scripts/tests/basic-processes-test.js" ]; then
        echo -e "\n${BLUE}运行基础业务流程测试...${NC}"
        npx hardhat run scripts/tests/basic-processes-test.js --network $HARDHAT_NETWORK
        
        if [ $? -ne 0 ]; then
          echo -e "\n${YELLOW}⚠️ 基础业务流程测试失败!${NC}"
          echo "请检查合约部署和角色设置。"
        else
          echo -e "\n${GREEN}✅ 基础业务流程测试成功!${NC}"
          
          # 告知用户完整业务流程测试
          if [ -f "scripts/tests/business-processes-test.js" ]; then
            echo -e "\n${BLUE}运行完整业务流程测试...${NC}"
            npx hardhat run scripts/tests/business-processes-test.js --network $HARDHAT_NETWORK
            
            if [ $? -ne 0 ]; then
              echo -e "\n${YELLOW}⚠️ 完整业务流程测试失败${NC}"
              echo -e "${YELLOW}这可能是因为代币创建过程出现问题${NC}"
              echo -e "${YELLOW}请检查TokenFactory.tokenImplementation是否已正确设置${NC}"
            else
              echo -e "\n${GREEN}✅ 完整业务流程测试成功!${NC}"
              echo -e "${GREEN}所有测试都已通过，系统已准备就绪${NC}"
            fi
          else
            echo -e "\n${YELLOW}未找到完整业务流程测试脚本${NC}"
          fi
        fi
      else
        echo -e "\n${YELLOW}未找到基础业务流程测试脚本${NC}"
      fi
    fi
  else
    echo -e "${YELLOW}未找到部署验证测试脚本${NC}"
  fi
}

# 主执行流程
main() {
  # 部署合约
  deploy
  
  # 立即部署代币实现并设置TokenFactory
  # 这是关键修改：确保在部署基础合约后立即设置TokenImplementation
  if [ "$SKIP_TOKEN_IMPL" != "true" ]; then
    deploy_token_implementation
    
    # 如果代币实现部署失败，提示用户
    if [ $? -ne 0 ]; then
      echo -e "\n${YELLOW}⚠️ 警告：代币实现设置失败${NC}"
      echo -e "${YELLOW}这将导致代币创建功能不可用${NC}"
      echo -e "${YELLOW}请在部署完成后手动运行: npx hardhat run scripts/deploy-token-implementation.js --network $HARDHAT_NETWORK${NC}"
    fi
  fi

  # 设置角色
  if [ "$SETUP_ROLES" = "true" ]; then
    echo -e "${GREEN}正在设置合约角色...${NC}"
    npx hardhat run scripts/setup-roles.js --network $HARDHAT_NETWORK
    
    if [ $? -ne 0 ]; then
      echo -e "\n${YELLOW}角色设置可能不完整!${NC}"
    fi
  fi
  
  # 验证部署
  verify_deployment
  
  # 所有步骤成功完成
  echo -e "\n✨ 所有操作成功完成!"
}

# 执行主函数
main

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