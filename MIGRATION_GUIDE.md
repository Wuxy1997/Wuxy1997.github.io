# Hexo 博客迁移完成

您的博客已成功从 Jekyll 迁移到 Hexo 框架，并应用了 hexo-theme-particle 主题。

## 已完成的工作

1. ✅ 备份了原有的 Jekyll 文件到 `jekyll_backup/` 目录
2. ✅ 初始化了 Hexo 项目
3. ✅ 克隆并配置了 hexo-theme-particle 主题
4. ✅ 迁移了所有文章内容
5. ✅ 配置了站点信息（标题、作者等）
6. ✅ 生成了静态文件并启动了本地服务器

## 本地预览

Hexo 服务器已在后台运行，访问 http://localhost:4000 预览您的博客。

## 主要配置

### 站点配置 (_config.yml)
- 标题: 大木头WU的 Blog
- 作者: 大木头WU
- 语言: zh-CN
- 主题: particle
- URL: https://Wuxy1997.github.io

### 迁移的文章
- 2024-03-20-welcome-to-my-blog.md
- 2025-05-31-white-night-walk.md

## 常用命令

```bash
# 清理缓存
hexo clean

# 生成静态文件
hexo generate

# 启动本地服务器
hexo server

# 部署到 GitHub Pages
hexo deploy

# 创建新文章
hexo new "文章标题"
```

## 部署到 GitHub Pages

已配置自动部署到 gh-pages 分支。首次部署前需要：

1. 安装 git 部署插件（已完成）：
   ```bash
   npm install hexo-deployer-git --save
   ```

2. 生成并部署：
   ```bash
   hexo clean && hexo generate && hexo deploy
   ```

## 主题自定义

主题配置文件位于：`themes/particle/_config.yml`

您可以在该文件中自定义：
- 头像图片
- 社交媒体链接
- 导航菜单
- 颜色主题
- 等等

## 备份说明

原有的 Jekyll 文件已备份到 `jekyll_backup/` 目录，包括：
- _posts/（文章）
- _layouts/（布局）
- _config.yml（配置）
- assets/（资源文件）
- 其他相关文件

如需回退，可以从备份目录恢复。

## 下一步

1. 在浏览器中预览博客效果
2. 根据需要修改主题配置
3. 添加更多文章
4. 部署到 GitHub Pages
