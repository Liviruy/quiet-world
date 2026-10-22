# 清静世界

> 觅一处安静角落。

这是 [Quiet World](https://artist.cc.cd) 的源代码。一个以文字、摄影和音乐为主的个人博客，中文为主，同时保留英文页面。

## 关于本站

- 文章、游记、摄影和关于页各自独立，不做统一的信息流。
- 中文和英文页面使用同一套排版，但字体按实际内容子集化，避免整站下载大字体。
- 图片通过 R2 提供，页面端按视口选择合适宽度；相册缩图优先命中预生成版本。
- 评论使用 Twikoo；播放器、歌词和封面在首次打开音乐面板时才加载。

## 技术栈

- [Astro](https://astro.build/) 静态输出，无前端框架运行时
- [UnoCSS](https://unocss.dev/) 生成样式
- Cloudflare Workers Assets + 一个处理 `/media` 图片的 Worker
- Cloudflare R2 存放照片、缩略图和音乐封面
- Twikoo + EdgeOne 提供评论
- TypeScript、ESLint、Astro Check

## 本地运行

```bash
pnpm install
pnpm dev
```

构建和预览：

```bash
pnpm build
pnpm preview
```

`pnpm build` 会依次执行 Astro 检查与构建、LQIP 占位图、本地图片限宽、响应式图片变体和按篇文章字体生成。生成结果在 `dist/`，不要直接编辑这个目录。

代码检查：

```bash
pnpm lint
pnpm exec astro check
```

## 内容与配置

- 文章：`src/content/posts/`，文件名必须以 `-zh.md` 或 `-en.md` 结尾；文章按日期倒序展示，`abbrlink` 可指定固定链接。
- 关于页：`src/content/about/`。
- 站点配置：`src/config.ts`，包括站点信息、默认配色、字体、评论等。
- 游记与摄影数据：`src/data/albums.ts`、`src/data/photos.ts`。
- 音乐曲目：`src/config/music.ts`；封面注册表是 `src/data/music-covers.json`。
- 页面布局：`src/components/`、`src/layouts/`、`src/pages/`。

新增文章后，如果正文新增了汉字，需要重新生成文章字体子集：

```bash
pnpm subset-fonts
```

字体、封面或照片有变化时，按需运行 R2 相关脚本。需要设置 `CLOUDFLARE_ACCOUNT_ID`、`R2_BUCKET`，以及 `CLOUDFLARE_API_TOKEN`（或本机 `wrangler` 登录态）：

```bash
pnpm r2-thumbnails      # 预生成相册/摄影缩图
pnpm r2-music-covers    # 镜像音乐封面
```

## 构建与部署

本站部署在 Cloudflare Workers，静态文件由 Workers Assets 提供，图片 Worker 处理 `/media/*`。

```bash
pnpm build
pnpm dlx wrangler@4 deploy
```

`wrangler.jsonc` 里定义了自定义域名、Assets 目录和 R2 变量。部署前需要先登录 Cloudflare，并为 R2 配置好公开访问域名。

## 目录结构

```text
src/
  components/   页面组件、播放器、灯箱、评论等
  content/      文章与关于页的 Markdown
  data/         游记、摄影、音乐及封面数据
  i18n/         中英文文案与路径
  layouts/      Head、Layout
  pages/        静态路由
  styles/       全局、主题、字体和 Markdown 样式
  worker.ts     图片 Worker
scripts/        构建后处理、字体子集、R2 工具
public/         字体、图标、音效和静态图片
```

## 致谢

本站基于 [Retypeset](https://github.com/radishzzz/astro-theme-retypeset) 主题二次开发，排版和交互的原始设计来自该项目。

感谢 Astro、UnoCSS、Twikoo、Cloudflare Workers/R2，以及 [Heroicons](https://heroicons.com/)、[Phosphor Icons](https://phosphoricons.com/) 等图标项目。字体来源和许可信息随对应文件放在 `public/fonts/` 与 `src/assets/fonts-full/` 中。

## 许可

代码沿用上游的 MIT 许可，原版权声明保留在 [LICENSE](./LICENSE)。

文章、照片、音乐封面及其他个人内容的版权归各自权利人所有，不随代码许可授权。
