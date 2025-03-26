module.exports = {
  // 测试环境
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    "**/server/tests/**/*.test.js",
    "**/server/tests/**/*.spec.js"
  ],
  
  // 测试覆盖率收集
  collectCoverage: false,
  collectCoverageFrom: [
    "server/src/**/*.js",
    "!server/src/index.js",
    "!**/node_modules/**",
    "!**/tests/**"
  ],
  
  // 覆盖率输出目录
  coverageDirectory: "coverage",
  
  // 覆盖率报告格式
  coverageReporters: ["text", "lcov"],
  
  // 测试前的设置
  setupFiles: ["./server/tests/setup.js"],
  
  // 测试超时时间
  testTimeout: 10000,
  
  // 在控制台显示详细输出
  verbose: true
}; 