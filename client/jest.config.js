module.exports = {
  // 测试环境
  testEnvironment: 'jsdom',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/src/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.test.{js,jsx,ts,tsx}'
  ],
  
  // 模块文件扩展名
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  
  // 模块名称映射
  moduleNameMapper: {
    // 处理样式文件
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // 处理图片文件
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/src/__tests__/__mocks__/fileMock.js',
    // 处理路径别名
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // 设置测试环境
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.js'],
  
  // 收集测试覆盖率
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // 测试超时时间
  testTimeout: 10000,
  
  // 测试运行器
  testRunner: 'jest-jasmine2',
  
  // 测试结果输出
  verbose: true,
  
  // 测试缓存
  cache: true,
  cacheDirectory: '.jest-cache'
}; 