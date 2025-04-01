#!/bin/bash

# 进入服务器目录
cd server

# 修改package.json中的scripts
sed -i '' 's/ts-node src\/index.ts/node src\/index.js/g' package.json

# 为每个TypeScript文件创建一个JavaScript版本
find src -name "*.ts" | while read -r file; do
  # 获取文件名（不含扩展名）和目录
  dir=$(dirname "$file")
  filename=$(basename "$file" .ts)
  
  # 读取TypeScript文件内容
  content=$(cat "$file")
  
  # 删除类型声明和类型注解
  # 删除import语句中的类型导入
  content=$(echo "$content" | sed 's/import { [^}]*Request, Response[^}]* } from/import { Request, Response } from/g')
  content=$(echo "$content" | sed 's/import { [^}]*ethers, Contract[^}]* } from/import { ethers } from/g')
  
  # 删除函数参数和变量的类型注解
  content=$(echo "$content" | sed 's/: [A-Za-z<>|&]*/:/g')
  content=$(echo "$content" | sed 's/: any//g')
  content=$(echo "$content" | sed 's/: void//g')
  
  # 删除as any类型断言
  content=$(echo "$content" | sed 's/as any//g')
  
  # 创建JavaScript文件
  echo "$content" > "${dir}/${filename}.js"
  
  echo "Converted ${file} to ${dir}/${filename}.js"
done

# 更新导入语句
find src -name "*.js" | xargs sed -i '' 's/from \(.*\).ts/from \1.js/g'

# 删除旧的TypeScript文件（可选）
# find src -name "*.ts" -delete

echo "转换完成！项目现在使用JavaScript而不是TypeScript。" 