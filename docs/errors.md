# 错误处理文档

## 错误类型

### 1. 合约错误

#### 交易错误

```javascript
class TransactionError extends Error {
    constructor(message, code, tx) {
        super(message);
        this.name = 'TransactionError';
        this.code = code;
        this.tx = tx;
    }
}
```

错误代码:
- `TX_FAILED`: 交易失败
- `TX_REVERTED`: 交易回滚
- `TX_TIMEOUT`: 交易超时
- `TX_NONCE_ERROR`: nonce错误
- `TX_GAS_ERROR`: gas错误

#### 合约调用错误

```javascript
class ContractCallError extends Error {
    constructor(message, code, method, args) {
        super(message);
        this.name = 'ContractCallError';
        this.code = code;
        this.method = method;
        this.args = args;
    }
}
```

错误代码:
- `CALL_FAILED`: 调用失败
- `CALL_REVERTED`: 调用回滚
- `CALL_TIMEOUT`: 调用超时
- `CALL_INVALID_ARGS`: 参数无效
- `CALL_METHOD_NOT_FOUND`: 方法不存在

### 2. 配置错误

#### 网络配置错误

```javascript
class NetworkConfigError extends Error {
    constructor(message, code, network) {
        super(message);
        this.name = 'NetworkConfigError';
        this.code = code;
        this.network = network;
    }
}
```

错误代码:
- `NETWORK_NOT_FOUND`: 网络不存在
- `NETWORK_INVALID`: 网络配置无效
- `NETWORK_CONNECTION_FAILED`: 网络连接失败
- `NETWORK_CHAIN_ID_MISMATCH`: 链ID不匹配

#### 合约配置错误

```javascript
class ContractConfigError extends Error {
    constructor(message, code, contract) {
        super(message);
        this.name = 'ContractConfigError';
        this.code = code;
        this.contract = contract;
    }
}
```

错误代码:
- `CONTRACT_NOT_FOUND`: 合约不存在
- `CONTRACT_ADDRESS_INVALID`: 合约地址无效
- `CONTRACT_ABI_INVALID`: 合约ABI无效
- `CONTRACT_BYTECODE_INVALID`: 合约字节码无效

### 3. 验证错误

#### 参数验证错误

```javascript
class ValidationError extends Error {
    constructor(message, code, field, value) {
        super(message);
        this.name = 'ValidationError';
        this.code = code;
        this.field = field;
        this.value = value;
    }
}
```

错误代码:
- `VALIDATION_REQUIRED`: 必填字段
- `VALIDATION_TYPE`: 类型错误
- `VALIDATION_FORMAT`: 格式错误
- `VALIDATION_RANGE`: 范围错误
- `VALIDATION_UNIQUE`: 唯一性错误

#### 权限验证错误

```javascript
class PermissionError extends Error {
    constructor(message, code, role, action) {
        super(message);
        this.name = 'PermissionError';
        this.code = code;
        this.role = role;
        this.action = action;
    }
}
```

错误代码:
- `PERMISSION_DENIED`: 权限拒绝
- `PERMISSION_INSUFFICIENT`: 权限不足
- `PERMISSION_EXPIRED`: 权限过期
- `PERMISSION_INVALID`: 权限无效

### 4. 测试错误

#### 测试执行错误

```javascript
class TestError extends Error {
    constructor(message, code, test) {
        super(message);
        this.name = 'TestError';
        this.code = code;
        this.test = test;
    }
}
```

错误代码:
- `TEST_FAILED`: 测试失败
- `TEST_TIMEOUT`: 测试超时
- `TEST_SETUP_FAILED`: 测试设置失败
- `TEST_TEARDOWN_FAILED`: 测试清理失败
- `TEST_ASSERTION_FAILED`: 断言失败

## 错误处理

### 1. 错误捕获

```javascript
try {
    // 执行操作
    await contract.method();
} catch (error) {
    // 处理错误
    if (error instanceof TransactionError) {
        // 处理交易错误
    } else if (error instanceof ContractCallError) {
        // 处理合约调用错误
    } else if (error instanceof ValidationError) {
        // 处理验证错误
    } else {
        // 处理其他错误
    }
}
```

### 2. 错误日志

```javascript
class ErrorLogger {
    constructor() {
        this.logger = new Logger('error');
    }

    log(error) {
        this.logger.error({
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
}
```

### 3. 错误恢复

```javascript
class ErrorRecovery {
    constructor() {
        this.retries = 3;
        this.delay = 1000;
    }

    async retry(operation) {
        for (let i = 0; i < this.retries; i++) {
            try {
                return await operation();
            } catch (error) {
                if (i === this.retries - 1) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, this.delay));
            }
        }
    }
}
```

## 错误预防

### 1. 参数验证

```javascript
class Validator {
    static validateProperty(data) {
        if (!data.name) {
            throw new ValidationError('Property name is required', 'VALIDATION_REQUIRED', 'name');
        }
        if (typeof data.price !== 'number') {
            throw new ValidationError('Property price must be a number', 'VALIDATION_TYPE', 'price', data.price);
        }
        if (data.price <= 0) {
            throw new ValidationError('Property price must be positive', 'VALIDATION_RANGE', 'price', data.price);
        }
    }
}
```

### 2. 状态检查

```javascript
class StateChecker {
    static async checkContractState(contract) {
        const state = await contract.getState();
        if (!state.isActive) {
            throw new ContractStateError('Contract is not active', 'CONTRACT_INACTIVE', contract.address);
        }
        if (state.isPaused) {
            throw new ContractStateError('Contract is paused', 'CONTRACT_PAUSED', contract.address);
        }
    }
}
```

### 3. 权限检查

```javascript
class PermissionChecker {
    static async checkPermission(contract, account, action) {
        const hasPermission = await contract.hasPermission(account, action);
        if (!hasPermission) {
            throw new PermissionError(
                `Account ${account} does not have permission for ${action}`,
                'PERMISSION_DENIED',
                account,
                action
            );
        }
    }
}
```

## 错误监控

### 1. 错误统计

```javascript
class ErrorMetrics {
    constructor() {
        this.metrics = new Map();
    }

    record(error) {
        const key = `${error.name}:${error.code}`;
        const count = this.metrics.get(key) || 0;
        this.metrics.set(key, count + 1);
    }

    getStats() {
        return Array.from(this.metrics.entries()).map(([key, count]) => ({
            error: key,
            count
        }));
    }
}
```

### 2. 错误告警

```javascript
class ErrorAlert {
    constructor() {
        this.threshold = 10;
        this.window = 60000; // 1分钟
        this.errors = [];
    }

    record(error) {
        const now = Date.now();
        this.errors = this.errors.filter(e => now - e.timestamp < this.window);
        this.errors.push({ error, timestamp: now });

        if (this.errors.length >= this.threshold) {
            this.alert();
        }
    }

    alert() {
        // 发送告警通知
        console.error('Error threshold exceeded:', this.errors);
    }
}
```

## 最佳实践

### 1. 错误处理原则

- 尽早捕获错误
- 提供有意义的错误信息
- 记录错误日志
- 实现错误恢复机制
- 监控错误趋势

### 2. 错误分类

- 按类型分类
- 按严重程度分类
- 按影响范围分类
- 按可恢复性分类

### 3. 错误处理流程

1. 错误检测
2. 错误分类
3. 错误记录
4. 错误恢复
5. 错误报告
6. 错误分析

### 4. 错误处理工具

- 错误类型定义
- 错误日志记录
- 错误监控统计
- 错误告警通知
- 错误恢复重试 