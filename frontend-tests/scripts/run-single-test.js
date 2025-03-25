/**
 * 单个测试执行脚本
 * 用于执行特定的测试用例
 */
const { initializeAbis } = require('../../shared/utils/getAbis');
const { logger } = require('../../shared/utils');

// 测试映射表
const tests = {
  'property-flow': require('../tests/property-flow.test'),
  'token-trading': require('../tests/token-trading.test'),
  'rent-distribution': require('../tests/rent-distribution.test'),
  'redemption-flow': require('../tests/redemption-flow.test'),
  'token-holder-query': require('../tests/token-holder-query.test')
};

/**
 * 执行单个测试
 * @param {string} testName 测试名称
 * @returns {Promise<boolean>} 测试结果
 */
async function runSingleTest(testName) {
  console.log(`=== 运行测试: ${testName} ===`);
  
  // 初始化ABI
  initializeAbis();
  
  if (!tests[testName]) {
    console.error(`错误: 未找到测试 "${testName}"`);
    console.log(`可用的测试: ${Object.keys(tests).join(', ')}`);
    return false;
  }
  
  try {
    // 执行测试
    const result = await tests[testName]();
    
    // 输出结果
    console.log(`\n测试结果: ${result ? '✅ 通过' : '❌ 失败'}`);
    
    return result;
  } catch (error) {
    console.error(`测试执行错误:`, error);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  // 获取命令行参数
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('请指定要运行的测试名称');
    console.log(`可用的测试: ${Object.keys(tests).join(', ')}`);
    process.exit(1);
  }
  
  const testName = args[0];
  const result = await runSingleTest(testName);
  
  process.exit(result ? 0 : 1);
}

// 执行主函数
main().catch(error => {
  console.error('运行测试失败:', error);
  process.exit(1);
}); 