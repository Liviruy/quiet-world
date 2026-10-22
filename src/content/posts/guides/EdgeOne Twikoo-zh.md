---
title: 用 EdgeOne 部署 Twikoo 评论系统
published: 2026-09-19
tags:
  - 指南
  - 博客主题
lang: zh
abbrlink: edgeone-twikoo
---

本主题内置 [Twikoo](https://twikoo.js.org/) 评论支持。本文记录如何用腾讯云 EdgeOne Makers 免费部署 Twikoo 后端（[twikoo-eo](https://github.com/Mintimate/twikoo-eo)），并将评论系统接入博客。相比 Vercel + MongoDB 的方案，这个方式**不需要数据库、免费额度充足、自带全球 CDN**，管理也更简单。

文中示例域名 `comments.example.com`、`your-site.com` 请替换为你自己的域名。

## 部署 Twikoo 后端

1. 注册腾讯云账号并开通 EdgeOne 服务
2. 前往 GitHub fork [Mintimate/twikoo-eo](https://github.com/Mintimate/twikoo-eo) 到你的账号下
3. EdgeOne 控制台 → **服务总览 → Makers → 创建项目 → 导入 Git 仓库**，选择你的 fork，等待自动构建部署
4. 部署完成后，项目会分配一个默认访问域名（形如 `xxx.edgeone.app`）。浏览器访问它，看到如下 JSON 即为部署成功：

```json
{"code":0,"message":"Twikoo 云函数运行正常...","version":"1.7.19"}
```

存储使用 Makers 自带的 Blob，首次请求自动初始化，**无需任何数据库配置**。到这一步，其实已经可以直接把默认域名填入 `envId` 使用。

## 绑定自定义域名（可选）

默认分配域名可用但不好记。若想绑定自己的子域名（如 `comments.example.com`），按以下步骤：

### 1. 添加域名

在 Makers 项目的「域名」中添加自定义域名。**加速区域选择注意**：

- 域名已 ICP 备案 → 可选「全球（含中国内地）」，大陆节点速度最佳
- 未备案域名 → 只能选「不包含中国内地」，大陆访客仍可正常访问（走海外节点），只是延迟为海外级

### 2. 验证域名所有权

EdgeOne 会要求添加一条 **TXT 记录**（形如 `edgeonereclaim.comments`，值以 `reclaim-` 开头）。到你的 DNS 托管商（如 Cloudflare）添加：

| 字段 | 填法 |
|---|---|
| 类型 | TXT |
| 名称 | EdgeOne 给出的主机记录（只填子域前缀部分） |
| 内容 | 那串 token，原样粘贴 |

> 若提示该子域曾被其他账号认领（`reclaim` 验证不通过），换一个子域名前缀重新添加即可。

### 3. 添加 CNAME 记录

TXT 验证通过后，EdgeOne 会给出真正的 **CNAME 记录值**（形如 `xxx.edgeone.traffic`）。回到 DNS 托管商添加 CNAME：

- 名称：`comments`（前缀，托管商会自动补全）
- 目标：EdgeOne 给的记录值
- **代理状态必须选「仅 DNS」（灰云）**，否则流量会被双重代理，验证不通过

### 4. 申请 HTTPS 证书

在域名的「HTTPS / SSL 证书」设置中开启免费证书（自动验证签发，等待几分钟）。**这一步是必须的**：博客本身是 HTTPS 站点，浏览器会拦截对 HTTP 接口的请求（混合内容），`envId` 只能填 `https://` 地址。

## 主题配置

修改 [src/config.ts](https://github.com/radishzzz/astro-theme-retypeset/blob/master/src/config.ts) 的 `comment` 部分，共两处：

```ts
comment: {
  // 开启评论系统
  enabled: true
  // twikoo 评论系统
  twikoo: {
    envId: 'https://comments.example.com' // 不带末尾斜杠
  }
  // waline 评论系统
  waline: {
    // 服务器地址
    serverURL: '' // ⚠️ 必须清空！
  }
}
```

> ⚠️ 主题的渲染逻辑是"配置了谁就渲染谁，可叠加"。如果从 Waline 切换过来，**必须清空 `waline.serverURL`**，否则页面会出现两个评论区。

重新构建并部署博客即可。主题对 Twikoo 的支持开箱即用：滚动到评论区才懒加载、中英文文章自动使用各自语言、`comment.css` 中已适配主题字体与深色模式。

## 管理评论

这个部署方式**没有独立的 `/admin` 管理页面**，管理入口集成在评论区：

1. 打开任意有评论的文章，滚动到底部评论区
2. 点击评论区右下角的**齿轮图标**
3. 首次进入要求**设置管理员密码**——这就是唯一的管理凭证

之后删除评论、标记垃圾、导出导入数据、配置邮件通知（SMTP）都在这个面板中完成。注意两点：

- 管理员是"密码制"而非账号制：知道密码的人都是管理员，请保管好密码，可随时在面板设置中更换
- 普通访客的身份（accessToken）只能管理自己的评论，无法进入后台

## 常见问题

**评论提交报错 CORS 相关？**
Makers 项目环境变量 `CORS_ALLOW_ORIGIN` 控制允许的来源域名（逗号分隔，如 `your-site.com,www.your-site.com`）。**不设置 = 允许所有来源**，个人博客保持默认即可；后续收紧时修改后需重新部署生效。

**表情栏偶尔加载不出来？**
OωO 表情资源默认从 Twikoo 作者站点拉取，如遇不稳定可参考 [Twikoo 表情配置](https://twikoo.js.org/frontend.html) 自托管。

**改完配置评论没变化？**
确认 `src/config.ts` 修改后重新执行了构建部署；Makers 侧改环境变量则需在「部署」页点「重新部署」（或在关联仓库 push 一次提交自动触发）。
