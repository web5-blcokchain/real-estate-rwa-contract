# Frontend Tests Documentation

## 背景
前端测试目录包含了所有与前端交互相关的测试用例,包括用户界面测试、功能测试和集成测试。这些测试确保系统的用户界面和交互功能按预期工作。

## 目录结构
```
frontend-tests/
├── tests/                # 测试用例目录
│   ├── propertyFlow.js   # 房产流程测试
│   └── tokenOperations.js # 代币操作测试
├── scripts/             # 测试脚本目录
├── config/              # 测试配置目录
└── README.md            # 测试文档
```

## 测试类型

### 1. 功能测试
功能测试验证系统的核心功能是否正常工作:

#### 房产流程测试 (propertyFlow.js)
```javascript
describe('Property Flow Tests', () => {
  test('should register new property', async () => {
    const property = await registerProperty({
      id: 'PROP001',
      country: 'JP',
      metadataURI: 'ipfs://...'
    });
    expect(property.status).toBe('pending');
  });

  test('should approve property', async () => {
    const result = await approveProperty('PROP001');
    expect(result.status).toBe('approved');
  });
});
```

#### 代币操作测试 (tokenOperations.js)
```javascript
describe('Token Operation Tests', () => {
  test('should create new token', async () => {
    const token = await createToken({
      propertyId: 'PROP001',
      name: 'Test Token',
      symbol: 'TEST'
    });
    expect(token.address).toBeDefined();
  });

  test('should manage whitelist', async () => {
    await addToWhitelist(tokenAddress, userAddress);
    const isWhitelisted = await checkWhitelist(tokenAddress, userAddress);
    expect(isWhitelisted).toBe(true);
  });
});
```

### 2. 集成测试
集成测试验证不同组件之间的交互:

```javascript
describe('Integration Tests', () => {
  test('should complete property tokenization flow', async () => {
    // 1. 注册房产
    const property = await registerProperty(propertyData);
    
    // 2. 批准房产
    await approveProperty(property.id);
    
    // 3. 创建代币
    const token = await createToken({
      propertyId: property.id,
      ...tokenData
    });
    
    // 4. 验证结果
    expect(token.propertyId).toBe(property.id);
    expect(token.status).toBe('active');
  });
});
```

### 3. 用户界面测试
UI测试验证界面元素和交互:

```javascript
describe('UI Tests', () => {
  test('should display property details', async () => {
    const { getByText } = render(<PropertyDetails property={testProperty} />);
    expect(getByText(testProperty.name)).toBeInTheDocument();
  });

  test('should handle form submission', async () => {
    const { getByRole } = render(<PropertyForm onSubmit={handleSubmit} />);
    await userEvent.click(getByRole('button', { name: /submit/i }));
    expect(handleSubmit).toHaveBeenCalled();
  });
});
```

## 测试工具

### 1. Jest
- 测试运行器
- 断言库
- 模拟功能

### 2. React Testing Library
- 组件渲染
- 用户交互模拟
- 可访问性测试

### 3. Cypress
- 端到端测试
- 网络请求模拟
- 浏览器自动化

## 测试数据

### 1. 测试数据生成
```javascript
const generateTestProperty = () => ({
  id: `PROP${Date.now()}`,
  country: 'JP',
  metadataURI: `ipfs://${generateHash()}`,
  status: 'pending'
});
```

### 2. 模拟数据
```javascript
const mockProperty = {
  id: 'PROP001',
  country: 'JP',
  metadataURI: 'ipfs://QmTest',
  status: 'approved'
};
```

## 测试配置

### 1. Jest配置
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  }
};
```

### 2. 测试环境变量
```env
TEST_API_URL=http://localhost:3000
TEST_WEB3_PROVIDER=http://localhost:8545
TEST_CONTRACT_ADDRESS=0x...
```

## 测试流程

### 1. 运行测试
```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test propertyFlow

# 运行特定测试用例
pnpm test -t "should register new property"

# 监视模式
pnpm test --watch
```

### 2. 测试覆盖率
```bash
# 生成覆盖率报告
pnpm test --coverage

# 设置覆盖率阈值
pnpm test --coverageThreshold
```

## 最佳实践

### 1. 测试组织
- 按功能模块组织测试
- 使用描述性的测试名称
- 遵循AAA模式(Arrange-Act-Assert)

### 2. 测试隔离
- 每个测试用例独立运行
- 使用beforeEach和afterEach清理
- 避免测试间的依赖

### 3. 测试可维护性
- 提取公共测试逻辑
- 使用测试辅助函数
- 保持测试代码简洁

## 常见问题

### 1. 测试失败
- 检查测试环境配置
- 验证测试数据
- 检查异步操作处理

### 2. 性能问题
- 优化测试执行时间
- 减少不必要的渲染
- 使用适当的模拟策略

### 3. 维护问题
- 定期更新测试用例
- 重构重复代码
- 保持测试文档更新

## 持续集成

### 1. CI配置
```yaml
name: Frontend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: pnpm install
      - run: pnpm test
```

### 2. 测试报告
- 测试结果统计
- 失败用例详情
- 覆盖率报告

## 文档维护

### 1. 测试文档
- 测试用例说明
- 测试数据说明
- 测试环境配置

### 2. 更新日志
- 记录测试变更
- 记录问题修复
- 记录新功能测试 