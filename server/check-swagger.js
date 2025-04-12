/**
 * 检查Swagger文档是否正确生成
 */
const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs');

// 获取项目根目录的绝对路径
const rootDir = path.resolve(__dirname, '..');

// Swagger 基本信息配置
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: '区块链房地产代币化系统 API',
    version: '1.0.0',
    description: '测试配置',
  },
};

// 配置 options
const options = {
  swaggerDefinition,
  apis: [
    path.join(rootDir, 'server/controllers/*.js'),
    path.join(rootDir, 'server/controllers/**/*.js'),
    path.join(rootDir, 'server/routes/*.js'),
    path.join(rootDir, 'server/routes/**/*.js')
  ],
};

// 初始化 Swagger 文档
const swaggerSpec = swaggerJSDoc(options);

// 将swagger文档输出到文件，以便检查
fs.writeFileSync(
  path.join(__dirname, 'swagger-output.json'),
  JSON.stringify(swaggerSpec, null, 2)
);

console.log('Swagger文档已生成到: server/swagger-output.json');
console.log('检查文档中是否包含API路径...');

// 检查是否有API路径
const paths = swaggerSpec.paths;
if (paths && Object.keys(paths).length > 0) {
  console.log(`找到 ${Object.keys(paths).length} 个API路径:`);
  Object.keys(paths).forEach(path => {
    console.log(`- ${path}`);
  });
} else {
  console.log('警告: 没有找到API路径，可能存在配置问题!');
}

// 检查controllers目录文件
console.log('\n检查controllers目录:');
const controllersDir = path.join(rootDir, 'server/controllers/core');
if (fs.existsSync(controllersDir)) {
  const files = fs.readdirSync(controllersDir);
  console.log(`找到 ${files.length} 个控制器文件:`);
  files.forEach(file => {
    console.log(`- ${file}`);
  });
} else {
  console.log('警告: controllers/core目录不存在!');
}

// 检查routes目录文件
console.log('\n检查routes目录:');
const routesDir = path.join(rootDir, 'server/routes/core');
if (fs.existsSync(routesDir)) {
  const files = fs.readdirSync(routesDir);
  console.log(`找到 ${files.length} 个路由文件:`);
  files.forEach(file => {
    console.log(`- ${file}`);
  });
} else {
  console.log('警告: routes/core目录不存在!');
} 