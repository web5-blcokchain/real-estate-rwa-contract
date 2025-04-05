#!/usr/bin/env node

/**
 * HTTP API测试工具 - 简易版
 * 类似curl，但可以自动打印更多信息，便于API测试
 * 不依赖第三方库，只使用Node.js内置模块
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// 默认配置
const DEFAULT_CONFIG = {
  host: 'localhost',
  port: 3000,
  apiKey: 'test_api_key',
  apiPath: '/api/v1',
  outputColors: true,
  saveResponses: true,
  responseDir: './responses',
  useHttps: false
};

// 加载配置
let config = { ...DEFAULT_CONFIG };

// 从环境变量加载配置
function loadConfigFromEnv() {
  // 优先从process.env加载
  if (process.env.API_KEY) {
    config.apiKey = process.env.API_KEY;
  }
  
  // 处理API_BASE_URL，可能包含协议和主机名
  if (process.env.API_BASE_URL) {
    try {
      const url = new URL(process.env.API_BASE_URL);
      config.host = url.hostname;
      if (url.port) config.port = parseInt(url.port, 10);
      config.useHttps = url.protocol === 'https:';
      console.log(`从API_BASE_URL解析: 主机=${config.host}, 端口=${url.port || '(默认)'}, 协议=${url.protocol}`);
    } catch (e) {
      console.warn(`警告: API_BASE_URL (${process.env.API_BASE_URL}) 格式无效，使用默认主机和协议`);
    }
  }
  
  // 如果有API_BASE_PORT，优先使用它
  if (process.env.API_BASE_PORT) {
    const portNum = parseInt(process.env.API_BASE_PORT, 10);
    if (!isNaN(portNum)) {
      config.port = portNum;
      console.log(`使用API_BASE_PORT: ${portNum}`);
    }
  } 
  // 否则尝试使用PORT环境变量
  else if (process.env.PORT) {
    const portNum = parseInt(process.env.PORT, 10);
    if (!isNaN(portNum)) {
      config.port = portNum;
      console.log(`使用PORT: ${portNum}`);
    }
  }
  
  // 其他配置项
  if (process.env.API_PATH) {
    config.apiPath = process.env.API_PATH;
  }
  
  // 打印最终配置
  console.log(`最终配置: ${config.useHttps ? 'https' : 'http'}://${config.host}:${config.port}${config.apiPath}`);
  console.log(`API密钥: ${config.apiKey ? (config.apiKey.substring(0, 3) + '...' + config.apiKey.substring(config.apiKey.length - 3)) : '未设置'}`);
}

try {
  // 先从环境变量加载
  loadConfigFromEnv();
  
  // 再尝试从.env文件加载（如果存在）
  if (fs.existsSync('.env')) {
    console.log('找到.env文件，正在加载配置...');
    const envContent = fs.readFileSync('.env', 'utf8');
    
    // 解析.env文件中的变量
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        
        // 只处理我们未从process.env获取的变量
        if (key === 'API_KEY' && !process.env.API_KEY) {
          config.apiKey = value;
        }
        
        if (key === 'API_BASE_URL' && !process.env.API_BASE_URL) {
          try {
            const url = new URL(value);
            config.host = url.hostname;
            if (url.port) config.port = parseInt(url.port, 10);
            config.useHttps = url.protocol === 'https:';
          } catch (e) {
            console.warn(`警告: .env中的API_BASE_URL (${value}) 格式无效`);
          }
        }
        
        if (key === 'API_BASE_PORT' && !process.env.API_BASE_PORT) {
          const portNum = parseInt(value, 10);
          if (!isNaN(portNum)) {
            config.port = portNum;
          }
        } else if (key === 'PORT' && !process.env.PORT && !process.env.API_BASE_PORT) {
          const portNum = parseInt(value, 10);
          if (!isNaN(portNum)) {
            config.port = portNum;
          }
        }
        
        if (key === 'API_PATH' && !process.env.API_PATH) {
          config.apiPath = value;
        }
      }
    });
    
    // 打印最终配置
    console.log(`配置已从.env加载，最终配置: ${config.useHttps ? 'https' : 'http'}://${config.host}:${config.port}${config.apiPath}`);
  }
} catch (error) {
  console.error('加载配置失败:', error.message);
}

// 控制台颜色
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

// 如果不需要颜色，重置所有颜色代码
if (!config.outputColors) {
  Object.keys(colors).forEach(key => {
    colors[key] = '';
  });
}

// 打印帮助信息
function printHelp() {
  console.log(`
${colors.bright}简易HTTP API测试工具${colors.reset}

用法: node http-test.js [选项] <endpoint>

选项:
  -m, --method <method>    HTTP方法 (GET, POST, PUT, DELETE等)
  -d, --data <data>        请求体数据 (JSON字符串)
  -f, --file <file>        从文件加载请求体数据
  -H, --header <header>    添加HTTP头 (格式: 'Name: Value')
  -o, --output <file>      将响应保存到文件
  -h, --help               显示此帮助信息
  -v, --verbose            显示详细信息
  -p, --port <port>        指定端口号（覆盖配置）
  --no-api-path            不使用API路径前缀（直接访问根路径）

示例:
  node http-test.js /system/status
  node http-test.js -m POST -d '{"name":"测试"}' /property/register
  node http-test.js -f request.json -o response.json /trading/create-order
  node http-test.js -p 8080 /blockchain/info
  node http-test.js --no-api-path /health

当前配置:
  主机: ${config.host}
  端口: ${config.port}
  API路径: ${config.apiPath}
  协议: ${config.useHttps ? 'HTTPS' : 'HTTP'}
  API密钥: ${config.apiKey ? config.apiKey.substring(0, 3) + '...' + config.apiKey.substring(config.apiKey.length - 3) : '未设置'}
  `);
}

// 解析命令行参数
function parseArgs() {
  const args = {
    endpoint: null,
    method: 'GET',
    data: null,
    headers: { 'Accept': 'application/json' },
    outputFile: null,
    verbose: false,
    port: config.port,
    useApiPath: true  // 是否使用API路径前缀
  };

  const argv = process.argv.slice(2);
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    } else if (arg === '-m' || arg === '--method') {
      args.method = argv[++i].toUpperCase();
    } else if (arg === '-d' || arg === '--data') {
      args.data = argv[++i];
      args.headers['Content-Type'] = 'application/json';
    } else if (arg === '-f' || arg === '--file') {
      const file = argv[++i];
      try {
        args.data = fs.readFileSync(file, 'utf8');
        args.headers['Content-Type'] = 'application/json';
      } catch (error) {
        console.error(`${colors.red}错误: 无法读取文件 ${file}${colors.reset}`);
        process.exit(1);
      }
    } else if (arg === '-H' || arg === '--header') {
      const header = argv[++i];
      const match = header.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        args.headers[match[1].trim()] = match[2].trim();
      } else {
        console.error(`${colors.red}错误: 无效的头格式 ${header}${colors.reset}`);
      }
    } else if (arg === '-o' || arg === '--output') {
      args.outputFile = argv[++i];
    } else if (arg === '-v' || arg === '--verbose') {
      args.verbose = true;
    } else if (arg === '-p' || arg === '--port') {
      const port = parseInt(argv[++i], 10);
      if (isNaN(port)) {
        console.error(`${colors.red}错误: 无效的端口号 ${argv[i]}${colors.reset}`);
      } else {
        args.port = port;
      }
    } else if (arg === '--no-api-path') {
      args.useApiPath = false;
    } else if (arg.startsWith('-')) {
      console.error(`${colors.red}错误: 未知选项 ${arg}${colors.reset}`);
      printHelp();
      process.exit(1);
    } else {
      args.endpoint = arg;
    }
  }
  
  if (!args.endpoint) {
    console.error(`${colors.red}错误: 未指定端点${colors.reset}`);
    printHelp();
    process.exit(1);
  }
  
  return args;
}

// 格式化JSON
function formatJson(json) {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch (e) {
    return json;
  }
}

// 保存响应到文件
function saveResponse(data, filename) {
  if (!config.saveResponses) return;
  
  const dir = config.responseDir;
  
  // 如果没有指定文件名，生成一个
  if (!filename) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    filename = path.join(dir, `response-${timestamp}.json`);
  }
  
  // 确保目录存在
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filename, typeof data === 'string' ? data : JSON.stringify(data, null, 2));
    console.log(`${colors.green}响应已保存到: ${filename}${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}保存响应失败: ${error.message}${colors.reset}`);
  }
}

// 发送HTTP请求
function sendRequest(args) {
  // 构建URL
  let endpoint = args.endpoint;
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  
  const protocol = config.useHttps ? 'https' : 'http';
  // 根据useApiPath决定是否使用API路径前缀
  const apiPathPrefix = args.useApiPath ? config.apiPath : '';
  const url = new URL(`${protocol}://${config.host}:${args.port}${apiPathPrefix}${endpoint}`);
  
  // 添加API密钥
  if (config.apiKey) {
    url.searchParams.append('api_key', config.apiKey);
  }
  
  console.log(`${colors.magenta}[请求]${colors.reset} ${args.method} ${url.toString()}`);
  
  // 打印请求头
  if (args.verbose) {
    console.log(`${colors.cyan}[请求头]${colors.reset}`);
    Object.entries(args.headers).forEach(([key, value]) => {
      console.log(`  ${colors.dim}${key}:${colors.reset} ${value}`);
    });
  }
  
  // 打印请求体
  if (args.data) {
    console.log(`${colors.cyan}[请求体]${colors.reset}`);
    console.log(formatJson(args.data));
  }
  
  // 准备请求选项
  const options = {
    hostname: config.host,
    port: args.port,
    path: url.pathname + url.search,
    method: args.method,
    headers: args.headers
  };
  
  // 发送请求
  const reqModule = config.useHttps ? https : http;
  const req = reqModule.request(options, (res) => {
    const startTime = Date.now();
    const chunks = [];
    
    // 响应头
    const statusColor = res.statusCode < 400 ? colors.green : colors.red;
    console.log(`${colors.magenta}[响应]${colors.reset} ${statusColor}${res.statusCode} ${res.statusMessage}${colors.reset}`);
    
    if (args.verbose) {
      console.log(`${colors.cyan}[响应头]${colors.reset}`);
      Object.entries(res.headers).forEach(([key, value]) => {
        console.log(`  ${colors.dim}${key}:${colors.reset} ${value}`);
      });
    }
    
    // 获取响应体
    res.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    res.on('end', () => {
      const responseTime = Date.now() - startTime;
      const body = Buffer.concat(chunks).toString();
      
      console.log(`${colors.cyan}[响应体]${colors.reset} (${responseTime}ms)`);
      
      // 尝试解析响应为JSON
      try {
        const jsonBody = JSON.parse(body);
        console.log(JSON.stringify(jsonBody, null, 2));
        
        // 保存响应
        if (args.outputFile || config.saveResponses) {
          saveResponse(jsonBody, args.outputFile);
        }
      } catch (e) {
        console.log(body);
        
        // 保存响应
        if (args.outputFile || config.saveResponses) {
          saveResponse(body, args.outputFile);
        }
      }
    });
  });
  
  req.on('error', (e) => {
    console.error(`${colors.red}请求错误: ${e.message}${colors.reset}`);
  });
  
  // 发送请求体
  if (args.data) {
    req.write(args.data);
  }
  
  req.end();
}

// 交互模式
function startInteractiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${colors.cyan}http-test>${colors.reset} `
  });
  
  console.log(`${colors.bright}HTTP API测试工具 - 交互模式${colors.reset}`);
  console.log(`当前API地址: ${config.useHttps ? 'https' : 'http'}://${config.host}:${config.port}${config.apiPath}`);
  console.log(`输入 'help' 获取帮助，'exit' 退出，'port 端口号' 修改端口，'direct' 切换API路径模式`);
  
  let currentPort = config.port;
  let useApiPath = true; // 默认使用API路径前缀
  
  rl.prompt();
  
  rl.on('line', (line) => {
    const input = line.trim();
    
    if (input === 'exit' || input === 'quit') {
      console.log('再见!');
      rl.close();
      return;
    }
    
    if (input === 'help') {
      printHelp();
      rl.prompt();
      return;
    }
    
    // 切换端口
    if (input.startsWith('port ')) {
      const port = parseInt(input.substring(5), 10);
      if (isNaN(port)) {
        console.error(`${colors.red}错误: 无效的端口号${colors.reset}`);
      } else {
        currentPort = port;
        console.log(`${colors.green}已切换到端口: ${port}${colors.reset}`);
      }
      rl.prompt();
      return;
    }
    
    // 切换API路径模式
    if (input === 'direct') {
      useApiPath = !useApiPath;
      if (useApiPath) {
        console.log(`${colors.green}已启用API路径前缀: ${config.apiPath}${colors.reset}`);
      } else {
        console.log(`${colors.green}已禁用API路径前缀，直接访问根路径${colors.reset}`);
      }
      rl.prompt();
      return;
    }
    
    // 解析输入
    try {
      const args = {
        endpoint: input,
        method: 'GET',
        data: null,
        headers: { 'Accept': 'application/json' },
        outputFile: null,
        verbose: false,
        port: currentPort,
        useApiPath: useApiPath
      };
      
      // 简单解析，支持 "GET /path", "POST /path {'data':123}"
      const parts = input.split(' ');
      
      if (parts.length >= 2) {
        const method = parts[0].toUpperCase();
        if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
          args.method = method;
          args.endpoint = parts[1];
          
          // 检查是否有请求体
          if (parts.length > 2) {
            const bodyParts = parts.slice(2);
            const body = bodyParts.join(' ');
            
            try {
              // 验证JSON格式
              JSON.parse(body);
              args.data = body;
              args.headers['Content-Type'] = 'application/json';
            } catch (e) {
              console.error(`${colors.red}错误: 无效的JSON${colors.reset}`);
              rl.prompt();
              return;
            }
          }
        }
      }
      
      sendRequest(args);
    } catch (error) {
      console.error(`${colors.red}错误: ${error.message}${colors.reset}`);
    }
    
    rl.prompt();
  }).on('close', () => {
    process.exit(0);
  });
}

// 主函数
function main() {
  // 检查是否有命令行参数
  if (process.argv.length <= 2) {
    startInteractiveMode();
  } else {
    const args = parseArgs();
    sendRequest(args);
  }
}

// 执行主函数
main(); 