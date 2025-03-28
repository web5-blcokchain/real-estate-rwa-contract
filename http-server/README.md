# 区块链ABI自动生成HTTP服务

这个服务自动从区块链合约的ABI生成RESTful API接口，使前端应用可以通过HTTP直接与部署的智能合约交互，无需集成Web3库。

## 功能特性

- 自动从部署的智能合约ABI生成HTTP接口
- RESTful API设计（GET用于读取操作，POST用于写入操作）
- 简单的API密钥认证
- 支持所有智能合约函数，包括只读和写入操作
- 自动参数类型转换和验证
- 完整的错误处理和日志记录

## 安装和启动

### 安装依赖

```bash
cd http-server
npm install
```

### 环境变量

在项目根目录的`.env`文件中配置以下变量（或添加到已有的.env文件中）：

```
# HTTP服务器配置
HTTP_SERVER_PORT=3030
HTTP_SERVER_HOST=localhost
API_KEY=your-secure-api-key-here
```

### 启动服务

开发模式：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

### 测试API接口

服务启动后，可以运行测试脚本来验证API接口是否正常工作：

```bash
npm run test-api
```

这个脚本会自动测试常用合约的读取功能，包括：
- 获取所有合约列表
- 获取RoleManager合约信息和函数
- 获取PropertyRegistry合约信息和属性数据
- 获取TokenFactory合约信息和代币数据

## API接口

所有接口都需要在URL中添加`api_key`参数进行认证。

### 1. 获取所有合约

**GET** `/api/v1/contracts?api_key=your-api-key`

返回所有部署的合约及其函数和事件信息。

### 2. 获取特定合约信息

**GET** `/api/v1/contracts/{contractName}?api_key=your-api-key`

返回指定合约的详细信息，包括函数和事件定义。

### 3. 获取合约函数列表

**GET** `/api/v1/contracts/{contractName}/functions?api_key=your-api-key&type=read`

返回合约的函数列表。可选参数`type`为`read`、`write`或不提供（所有函数）。

### 4. 执行只读函数

**GET** `/api/v1/contracts/{contractName}/{functionName}?api_key=your-api-key&param1=value1&param2=value2`

执行合约的只读函数，参数作为查询参数传递。

### 5. 执行写入函数

**POST** `/api/v1/contracts/{contractName}/{functionName}?api_key=your-api-key`

执行合约的写入函数，参数在请求体中以JSON格式传递：

```json
{
  "param1": "value1",
  "param2": "value2"
}
```

## 响应格式

所有API响应都遵循统一的JSON格式：

成功响应：

```json
{
  "success": true,
  "data": { ... }
}
```

错误响应：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

## 示例

### 调用合约只读函数：

```bash
curl "http://localhost:3030/api/v1/contracts/RoleManager/getVersion?api_key=your-api-key"
```

### 执行合约写入函数：

```bash
curl -X POST \
  "http://localhost:3030/api/v1/contracts/RoleManager/grantRole?api_key=your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"role":"0x0000000000000000000000000000000000000000000000000000000000000000","account":"0x1234567890123456789012345678901234567890"}'
``` 