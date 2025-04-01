/**
 * 测试运行脚本
 * 启动服务器，运行测试，然后关闭服务器
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

// 保存测试结果的目录
const logDir = path.join(serverRoot, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 测试结果日志文件
const logFile = path.join(logDir, `test-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

console.log('启动服务器以进行测试...');
logStream.write('启动服务器以进行测试...\n');

// 启动服务器 - 注意我们删除了NODE_ENV=test环境变量，这样服务器会正常启动
const server = spawn('node', ['src/index.js'], {
  cwd: serverRoot,
  detached: true,
  stdio: 'pipe',
  env: { ...process.env, NODE_ENV: '' } // 确保不使用test环境
});

server.stdout.on('data', (data) => {
  process.stdout.write(data);
  logStream.write(data);
});

server.stderr.on('data', (data) => {
  process.stderr.write(data);
  logStream.write(data);
});

// 等待服务器启动
setTimeout(() => {
  console.log('\n服务器已启动，开始运行测试...');
  logStream.write('\n服务器已启动，开始运行测试...\n');

  // 运行测试 - 这里我们保留NODE_ENV=test环境变量
  const test = spawn('node', ['--experimental-vm-modules', 'node_modules/jest/bin/jest.js'], {
    cwd: serverRoot,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' } // 确保测试使用test环境
  });

  test.on('close', (code) => {
    console.log(`\n测试完成，退出码: ${code}`);
    logStream.write(`\n测试完成，退出码: ${code}\n`);

    // 关闭服务器
    console.log('关闭服务器...');
    logStream.write('关闭服务器...\n');
    
    // 在Windows上使用 taskkill
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', server.pid, '/f', '/t']);
    } else {
      // 在Unix系统上使用kill
      process.kill(-server.pid, 'SIGINT');
    }

    logStream.end();
    process.exit(code);
  });
}, 5000); // 等待5秒，确保服务器已启动 