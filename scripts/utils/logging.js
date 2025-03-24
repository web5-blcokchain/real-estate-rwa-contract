/**
 * 日志记录工具
 */

function getLogger(name) {
  return {
    info: (message) => {
      console.log(`[INFO][${name}] ${message}`);
    },
    warn: (message) => {
      console.warn(`[WARN][${name}] ${message}`);
    },
    error: (message) => {
      console.error(`[ERROR][${name}] ${message}`);
    },
    deployStart: (networkName) => {
      console.log(`========================================`);
      console.log(`开始部署到网络: ${networkName}`);
      console.log(`时间: ${new Date().toISOString()}`);
      console.log(`========================================`);
    },
    deployComplete: (networkName, contracts) => {
      console.log(`========================================`);
      console.log(`部署到网络 ${networkName} 已完成!`);
      console.log(`时间: ${new Date().toISOString()}`);
      for (const [name, address] of Object.entries(contracts)) {
        console.log(`${name}: ${address}`);
      }
      console.log(`========================================`);
    }
  };
}

module.exports = { getLogger }; 