/**
 * 重置部署指南
 * 该脚本打印重置Hardhat节点和重新部署系统的步骤
 */
require("dotenv").config();
const { getLogger } = require("./utils/logger");

const logger = getLogger("reset-node");

// 打印重置说明
function printResetInstructions() {
  logger.info("===== 重置 Hardhat 节点和重新部署系统 =====");
  logger.info("");
  logger.info("问题: RoleManager合约部署时未正确初始化，导致部署者没有DEFAULT_ADMIN_ROLE权限");
  logger.info("解决方案: 重置本地开发环境并重新部署系统");
  logger.info("");
  logger.info("步骤 1: 停止当前运行的Hardhat节点");
  logger.info("  - 按 Ctrl+C 终止终端中运行的 npx hardhat node 进程");
  logger.info("");
  logger.info("步骤 2: 重新启动Hardhat节点");
  logger.info("  - 打开新终端");
  logger.info("  - 运行: npx hardhat node");
  logger.info("");
  logger.info("步骤 3: 修改部署脚本以确保步骤11被正确执行");
  logger.info("  - 编辑 scripts/deploy-unified.js");
  logger.info("  - 找到并修改第10步后的代码，确保也执行步骤11：");
  logger.info("  - 将:");
  logger.info("    // 跳过步骤11");
  logger.info("    logger.info(\"跳过步骤11 (授予角色)，该步骤可以在部署后手动完成\");");
  logger.info("  - 修改为:");
  logger.info("    // 执行步骤11");
  logger.info("    logger.info(\"执行步骤11 (授予角色)...\");");
  logger.info("    await deployStep(deployer_contract, 11);");
  logger.info("");
  logger.info("步骤 4: 重新部署系统");
  logger.info("  - 在另一个终端中运行: npx hardhat run scripts/deploy-unified.js --network localhost");
  logger.info("");
  logger.info("步骤 5: 验证部署");
  logger.info("  - 运行: npx hardhat run scripts/debug-role-manager.js --network localhost");
  logger.info("  - 确认部署者已拥有DEFAULT_ADMIN_ROLE和SUPER_ADMIN角色");
  logger.info("");
  logger.info("备注: 本地开发环境重置后，所有部署的合约和状态都会丢失，需要重新部署整个系统");
}

// 主函数
async function main() {
  printResetInstructions();
}

// 执行主函数
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { printResetInstructions }; 