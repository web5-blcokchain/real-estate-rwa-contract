const testPropertyFlow = require('../tests/property-flow.test');
const testTokenTrading = require('../tests/token-trading.test');
const testRentDistribution = require('../tests/rent-distribution.test');
const { initializeAbis } = require('../../shared/utils/getAbis');

/**
 * 运行所有前端测试
 */
async function runTests() {
  console.log('=== 日本房产代币化平台前端测试 ===');
  console.log('初始化ABI...');
  
  try {
    // 初始化ABI
    initializeAbis();
    
    // 运行测试
    console.log('\n=== 测试1: 房产流程 ===');
    const propertyFlowResult = await testPropertyFlow();
    
    console.log('\n=== 测试2: 代币交易 ===');
    const tokenTradingResult = await testTokenTrading();
    
    console.log('\n=== 测试3: 租金分配 ===');
    const rentDistributionResult = await testRentDistribution();
    
    // 输出测试结果
    console.log('\n=== 测试结果汇总 ===');
    console.log(`房产流程: ${propertyFlowResult ? '✅ 通过' : '❌ 失败'}`);
    console.log(`代币交易: ${tokenTradingResult ? '✅ 通过' : '❌ 失败'}`);
    console.log(`租金分配: ${rentDistributionResult ? '✅ 通过' : '❌ 失败'}`);
    
    const allPassed = propertyFlowResult && tokenTradingResult && rentDistributionResult;
    console.log(`\n总体结果: ${allPassed ? '✅ 所有测试通过' : '❌ 部分测试失败'}`);
    
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  }
}

// 运行测试
runTests(); 