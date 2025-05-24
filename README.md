# 🗳️ Vote System

这是一个基于 Node.js 的在线投票系统，支持扫码访问、实时投票统计、二维码生成等功能。适用于校园活动、投票问卷等场景。

## 🚀 功能特性

- 实时投票与结果统计（使用 Socket.IO 实现）
- 投票二维码自动生成（基于 qrcode 库）
- 支持多端访问（已适配 Render 云部署）
- 简单易用，开箱即用

---

## 🌐 在线部署（Render）

### 一键部署

点击下方按钮，将本项目一键部署至 Render：

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/你的用户名/vote-system)

> 将上述链接中的 `你的用户名` 替换为你的 GitHub 用户名

部署完成后，你将获得一个形如 `https://vote-system.onrender.com` 的公网地址，可以分享给任何人访问。

---

## 🛠️ 本地运行

### 安装依赖

```bash
npm install
