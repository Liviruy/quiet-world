---
title: 博客音乐播放器：按需加载、歌词滚动与封面自动匹配
published: 2026-09-21
description: 给静态博客加一个会滚歌词的音乐播放器：首页常驻代码 0.28KB，播放器只在第一次点击时才进浏览器；歌词用对象存储上的 LRC，专辑封面由构建期脚本从公开 API 匹配并缓存。附六个真实 bug 的根因与修法。
tags:
  - 指南
  - 博客主题
lang: zh
abbrlink: music-player-lyrics
---

大多数博客播放器的做法是把播放器常驻在页面里：即使没人点，首屏也要背上几十 KB 的 JS、CSS 和一轮音频元数据请求。这篇记录的是另一条路线——**首页只留一个按钮，其余全部延后**，以及在这之上做的歌词滚动和专辑封面自动匹配。

所有数字都是构建产物和浏览器里实测的，不是估算。文末附六个踩到的真 bug，其中两个是"自测全绿、真机全废"那一类。

## 成果概览

| 指标 | 实测值 |
|---|---|
| 首页常驻音乐代码 | 0.28 KB gzip（原始 0.4 KB），不含任何 DOM |
| 首屏音乐相关请求 | **0** |
| 第一次点击 ♪ 新增 | 3 个：播放器 JS 5.0 KB、CSS 2.5 KB、`songs.json` 0.7 KB（压缩后传输体积，合计约 8.1 KB） |
| 封面 / 歌词 | 面板打开后各自按需再拉，切歌才拉下一首的 |
| 音频 | `<audio preload="none">`，不点播放不下载一个字节 |
| 运行时第三方 API | **0**（封面与元数据在构建期就落进 JSON） |
| 依赖 | 无。原生 `<audio>` + `<dialog>` + `fetch`，图标是内联的 Phosphor 官方 SVG path |

## 一、架构：首页只留一个按钮

入口组件不渲染任何标记，只挂一段脚本：

```ts
// MusicLauncher.astro —— 构建后 0.28KB gzip
if (!window.__musicLauncherBound) {
  window.__musicLauncherBound = true
  let busy = false
  document.addEventListener('click', async (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('#music-toggle')) {
      return
    }
    if (busy) return
    busy = true
    try {
      const { toggleMusicPanel } = await import('./music-player')
      await toggleMusicPanel()
    }
    catch { /* 拉取失败时按钮保持可用，下次点击重试 */ }
    finally { busy = false }
  })
}
```

`window.__musicLauncherBound` 那道闸门不是洁癖：Astro 在 ClientRouter 换页后会重跑普通 `<script>`，不加守卫每次导航就会多叠一层委托监听。

播放器本体是一个懒加载模块，内部只有一个 `new Audio()` 和一个 `<dialog>`，DOM 在首次点击时才建。三个坑值得单独记：

**CSS 会被提走。** Astro 会把模块里 `import './x.css'` 的样式提升到每页的 `<link rel="stylesheet">`——那就白懒加载了。改成 `import cssUrl from './music-player.css?url'`，挂载时用 JS 注入 `<link id="music-player-css">`，并在 `astro:page-load` 里幂等重注入（ClientRouter 换 `<head>` 会把它带走）。

**dialog 要跨换页存活。** `<dialog>` 挂在 `body` 上，SPA 换页把 body 子节点清空后，节点本身还活着，`page-load` 里重新 `append` 回去即可——**正在播的歌不会被打断**，也不需要把播放状态提升到全局。

**进度刷新别用 setInterval。** 播放中用 `requestAnimationFrame` 驱动进度条，暂停即自然停；面板关闭时短路掉刷新逻辑。

## 二、控件做减法

播放行最后只剩三个键：上一首 / 播放 / 下一首。随机播放和"顺序 ↔ 单曲循环"两态按钮都被砍掉了——歌单只有几首的时候它们没有意义。

音量换成手机信号格那样的 5 根阶梯柱：

```ts
const VOLUME_STEPS = [20, 40, 60, 80, 100]   // 柱高 6/10/14/18/22px，底部对齐
```

整组是一个 pointer 表面（柱子本身 `pointer-events: none`）：**点击**吸附到最近一档，**拖动**连续取值，**滑过左缘**即静音。因为静音由滑动承担了，原来那枚喇叭图标也删了。

> 这里有个教训：音量柱是底部对齐的阶梯，它的**视觉重心**比外接框中心低约 4px。按 DOM 几何把喇叭图标和柱子"对齐"了三次，肉眼看还是歪的。最后靠删图标解决——观感问题要用眼睛验收，不能只看 `getBoundingClientRect()`。

## 三、歌词滚动

歌词就是一个标准 `.lrc`，和 mp3 一起放在对象存储里：

```ini
[ti:戒不掉（原声版）]
[ar:欧阳耀莹]
[00:14.58]今天开始新出发吗
[00:18.88]留过了疤
```

解析用一个正则，`[ti:]` `[ar:]` `[offset:]` 这类元数据因为冒号前不是数字而天然不匹配，剥掉标签后为空的行再丢一次，所以不会渲染出空行。一行多个时间戳也会全部收下。

**滚动不用 `scrollTop`，用 `transform`。** 当前行居中靠给整列加一个位移：

```ts
const y = boxHeight / 2 - (activeLine.offsetTop + activeLine.offsetHeight / 2)
list.style.transform = `translateY(${y}px)`
```

好处是位置完全可控、能加 450ms 缓动、上下留白由遮罩决定，也不会和浏览器原生滚动行为打架。上下淡出用一条渐变遮罩，非当前行降透明度并加极轻的模糊：

```css
.mp-lyrics {
  overflow: clip;
  mask-image: linear-gradient(to bottom, transparent, #000 32%, #000 68%, transparent);
}
.mp-lyric-line { opacity: 0.32; filter: blur(0.4px); }
.mp-lyric-line.is-active { opacity: 1; font-weight: 600; filter: none; }
```

手动浏览也加在了这套位移模型上：拖拽和滚轮改的是"在自动居中之上再叠一个偏移量"，松手 2.5 秒后把偏移量归零、滑回当前行。拖动过程中歌曲继续往前唱，高亮照常换行，但会反向补偿偏移量让画面纹丝不动，否则你正在看的那句会被突然推走。

点击任意一句 → 跳到该句时间并起播。**每一行是真正的 `<button>`**，`aria-label` 带上时间（`1:12 喜欢这触摸俘虏我`），键盘 Tab + Enter 也能跳。

歌词只在面板打开、且这首歌配了 `.lrc` 时才 `fetch` 一次，结果按曲目缓存在内存里，重开面板零请求（实测 `extraFetches: 0`）。没有歌词的曲目整块区域 `display: none`，布局回到从前。

## 四、专辑封面自动匹配（构建期）

只给歌名和歌手，脚本自动去找专辑封面。数据源优先级：**iTunes Search → MusicBrainz + Cover Art Archive → 返回 null**。

iTunes 这一步的实测结果直接决定了实现：

| 请求 | 结果 |
|---|---|
| `country=CN` | **0 条**（国区搜索接口不给结果） |
| 默认 US | 返回 `Sunny Day / Cool Music / Piano Instrumental` 一类同名钢琴翻弹——典型错配 |
| `country=TW` / `HK` | ✅ `晴天 / 周杰倫 / 葉惠美`，Live 版排在第 2 位 |

所以查询要打 TW + HK 两个店，并且**不能取第一条了事**，要评分：

- 归一化（NFKC、小写、剥标点空白）后歌名全等 → 高分
- 歌手是区分同名翻唱的唯一屏障，判得更严：等长且共享过半字符才算同一名字的异体写法
- 原版查询撞上 `Live / Remix / 伴奏 / 翻唱` 等版本标记 → 直接丢弃，不进候选
- 专辑名含 `精选 / Best / OST` → 降级
- 两个店同时命中同一 `trackId` → 互相印证加分

封面尺寸按 Apple 的 URL 规则替换即可任意放大：`/100x100bb.jpg` → `/300x300bb.jpg`。实测同一张图 `100x100bb` 3.0 KB、`200x200bb` 7.1 KB、`300x300bb` 14.7 KB、`600x600bb` 82 KB。**取 300**：封面在面板里最大只画到 74px（歌单行 46px），3 倍屏也只要 222px，用 600 等于让首次点开面板多背 65 KB 却看不出差别。

**三态输出，宁缺勿滥**：

| 状态 | 含义 | 是否写封面 |
|---|---|---|
| `matched` | 标题异体或全等 + 有封面 + 是首位结果 + 无并列候选 + 歌手全等或两店互证 | ✅ |
| `review` | 差一点（例如结果标题多了 `(原聲版)` 后缀） | ❌，但把前 3 个候选连封面一起存下来给人看 |
| `not_found` | 没有可靠结果 | ❌ |

`review` 用 `--accept <id>` 一键提升为 `matched`。写盘前还会对封面 URL 发一次 HEAD，不可达就降级——往 `songs.json` 里写一个坏地址，等于亲手给播放器做破图。

首跑三首歌的真实结果：

```text
[1/3] 戒不掉 - 欧阳耀莹              ! review（候选 8 分：戒不掉 (原聲版) / 歐陽耀瑩）
[2/3] 春娇与志明 - 街道办GDC/欧阳耀莹  ✓ Apple Music  专辑：春嬌與志明 - Single
[3/3] 我们好像在哪见过 - 杨宗纬/叶蓓    ✗ Apple Music  ✗ MusicBrainz  ! 未找到封面
```

第 3 首是**正确**的失败：Apple 的繁中/港曲库里只有同名翻唱，MusicBrainz 里最接近的是薛之谦的《我好像在哪见过你》——不是同一首歌。找不到就留空，播放器会回落到"歌名首字"的字母砖。

> 版权：第三方封面图片的版权/使用许可需要根据来源和具体用途确认，不要默认认为 API 返回的图片可以任意再分发。这条提示也写在了脚本头部注释里。

## 五、踩到的六个坑

**1. 重开面板后歌词偏 459.6px。** `display: none` 的元素 `getBoundingClientRect()` 全是 0。居中量的是窗口高度，而渲染发生在 `showModal()` 之前，于是按 0 高度算出了位移。修法：先 `showModal()` 再渲染。

**2. 真机上点歌词完全不跳。** `setPointerCapture` 会把后续的 `pointerup` 和它派生的 `click` **一起改派到捕获元素**，于是 `event.target.closest('.mp-lyric-line')` 取不到那一句。更阴的是：自测时用的是合成 `PointerEvent`，`pointerId` 不存在，`setPointerCapture` 直接抛错、根本没形成捕获，于是测试一路绿灯。修法：跳转改在 `pointerup` 里做，用的是 `pointerdown` 当时记下的行（`pointerdown` 早于同一个 handler 里设置捕获，target 可信）；`click` 监听只服务键盘。

> 顺带一个测试陷阱：合成 `MouseEvent('click')` 不传 `detail` 时默认是 `0`，会被判成键盘激活。测指针点击必须显式 `detail: 1`。

**3. 聚焦把歌词容器滚走了。** 歌词行改成可聚焦的 `<button>` 之后，浏览器在聚焦时会滚动 `overflow: hidden` 的容器（它仍是可编程滚动的），实测内部 `scrollTop` 被推了 628px，居中全废。修法：`overflow: clip`——它不是滚动容器。

**4. 切歌从上一首的时间点继续播。** `audio.src = ...; audio.load()` 之后 `currentTime` 并不保证立刻归零，实测新曲从 0:07 开始，歌词也跟着先跳再弹回。修法：显式 `audio.currentTime = 0`，并且在新媒体元数据就绪前不采信 `currentTime`。

**5. 短视口下播放键被裁出卡片。** 歌词窗口占了固定高度后，卡片内容 366px > 可用 246px，播放键整个滚不到。修法：删掉"窄屏换行"分支，改成始终三列 + `height: clamp(4.6rem, 22vh, 8.5rem)`——矮屏退回封面自身高度，控件永不被裁。

**6. 拖拽边界和自动居中打架。** 边界最初写成"内容不能露出空白"（`clamp(box - content, 0)`），但自动居中时首行上方本来就留了半窗空白，两套规则互相否定：往下拖 60px 被错误夹到 0，而首行的居中位其实是 +24.5。修法：以首行、末行各自的居中位作为上、下限，手动与自动落在同一条连续刻度上。

## 六、搬到你自己的项目

涉及的文件：

```text
src/components/music/MusicLauncher.astro   常驻入口，无 DOM
src/components/music/music-player.ts       懒加载播放器（JS/CSS/数据/音频全在这里延后）
src/components/music/music-player.css      面板样式（以 ?url 方式引入）
src/pages/music/songs.json.ts              构建期产出 dist/music/songs.json
src/config/music.ts                        手写曲表（id/title/artist/url/lyrics）
src/data/music.ts                          合并自动元数据，产出播放器用的字段
src/data/music-metadata.json               匹配结果 + 缓存（脚本写，前端读）
scripts/music-meta.ts                      封面匹配脚本
```

三步接入：

1. 把音频和 `.lrc` 传到对象存储，在 `src/config/music.ts` 的 `tracks` 里各写一条
2. `pnpm music-meta` 匹配封面（之后 `pnpm build`，元数据在构建期就固化了）
3. 在导航里放一个 `id="music-toggle"` 的按钮，在 Layout 末尾挂 `<MusicLauncher />`

日常命令：

```bash
pnpm music-meta                    # 只处理未匹配成功的，已 matched 跳过
pnpm music-meta --force            # 全部重查
pnpm music-meta --song 晴天 周杰伦  # 单曲试查，只打印不写盘
pnpm music-meta --list-review      # 看哪些在等人工确认
pnpm music-meta --accept <id>      # 把 review 的首选提升为 matched
```

限速是硬要求：iTunes 每请求间隔 500ms，MusicBrainz 1200ms（它要求 ≤1 req/s 且必须带可识别的 `User-Agent`），超时 15 秒，5xx/429 退避重试两次。批量绝不并发。

最后一点心得：这套东西真正花时间的地方不在功能，而在**"看起来对了"和"在真机上对了"之间的缝隙**——`display: none` 下量不到尺寸、捕获改派了 click、聚焦悄悄滚了容器，这三条自测全都没抓到。所以凡是涉及视觉与手势的改动，最后一定要用真实指针走一遍。
