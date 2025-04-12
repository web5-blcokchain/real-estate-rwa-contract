/**
 * 检查swagger-spec.json文件
 * 用于验证Swagger文档是否正确生成
 */
const fs = require('fs');
const path = require('path');

// 检查swagger-spec.json文件
const specPath = path.join(__dirname, 'swagger-spec.json');

try {
  // 检查文件是否存在
  if (!fs.existsSync(specPath)) {
    console.error('错误: swagger-spec.json文件不存在!');
    console.log('提示: 请先运行 "node generate-swagger.js" 生成文件');
    process.exit(1);
  }
  
  // 读取并解析文件
  const fileContent = fs.readFileSync(specPath, 'utf8');
  const swaggerSpec = JSON.parse(fileContent);
  
  console.log('============== Swagger规范检查 ==============');
  console.log('文件存在: ✅');
  console.log('文件大小:', (fileContent.length / 1024).toFixed(2), 'KB');
  console.log('格式有效: ✅ (JSON解析成功)');
  
  // 检查基本结构
  if (!swaggerSpec.openapi) {
    console.warn('警告: 缺少openapi版本');
  } else {
    console.log('OpenAPI版本:', swaggerSpec.openapi, '✅');
  }
  
  if (!swaggerSpec.info || !swaggerSpec.info.title) {
    console.warn('警告: 缺少API信息或标题');
  } else {
    console.log('API标题:', swaggerSpec.info.title, '✅');
  }
  
  // 检查服务器配置
  if (!swaggerSpec.servers || swaggerSpec.servers.length === 0) {
    console.warn('警告: 未定义服务器配置');
  } else {
    console.log('服务器配置:', swaggerSpec.servers.map(s => s.url).join(', '), '✅');
  }
  
  // 检查API路径
  if (!swaggerSpec.paths || Object.keys(swaggerSpec.paths).length === 0) {
    console.error('错误: 未检测到任何API路径! 请检查路由和控制器文件中的JSDoc注释');
  } else {
    console.log('API路径数量:', Object.keys(swaggerSpec.paths).length, '✅');
    console.log('API路径:');
    Object.keys(swaggerSpec.paths).forEach(path => {
      console.log(`  - ${path}`);
      const methods = Object.keys(swaggerSpec.paths[path]);
      if (methods.length > 0) {
        methods.forEach(method => {
          console.log(`    * ${method.toUpperCase()}`);
        });
      }
    });
  }
  
  console.log('========================================');
  console.log('Swagger规范检查完成!');
  console.log('API文档路径: http://localhost:3000/api-docs');
  
} catch (error) {
  console.error('检查过程中发生错误:', error.message);
  process.exit(1);
} 