export interface PhotoSet {
  date: string
  title: string
  titleEn: string
  emoji: string
  description: string
  descriptionEn: string
  images: { path: string, alt: string, w: number, h: number }[]
}

// `w`/`h` are the R2 originals' intrinsic size. They exist so both the polaroid
// cards and the lightbox can reserve their box before any byte arrives — without
// them every image loads as 0x0 and the page jumps under the reader's fingers.
// Measured from the webp headers, not typed by hand.
export const photosets: PhotoSet[] = [
  {
    date: '2026-09-26',
    title: '蓝天下午',
    titleEn: 'Blue-Sky Afternoon',
    emoji: '🌤️',
    description: '太阳温煦，旧瓦砖房，置于蓝天中，可见岁月痕迹',
    descriptionEn: 'The afternoon sun is mild while I work out; an old brick house under clay tiles, set against a canvas of blue sky, with the years plainly readable in it.',
    images: [
      { path: 'images/Ph260926a.webp', alt: '蓝天下午 1', w: 1080, h: 1920 },
      { path: 'images/Ph260926b.webp', alt: '蓝天下午 2', w: 1080, h: 1920 },
    ],
  },
  {
    date: '2026-09-22',
    title: '阳光树影',
    titleEn: 'Sunlight Through the Leaves',
    emoji: '🌳',
    description: '小径闲步，风轻抚面，树影斑驳稀疏',
    descriptionEn: 'A slow walk along the path, wind brushing my face, quiet all the way through. The dazzling sun falls in sparse dapples, and in the shade of the trees I borrow a measure of composure from nature.',
    images: [
      { path: 'images/Ph260919a.webp', alt: '阳光树影 1', w: 900, h: 1600 },
      { path: 'images/Ph260919b.webp', alt: '阳光树影 2', w: 1080, h: 1920 },
      { path: 'images/Ph260922a.webp', alt: '阳光树影 3', w: 900, h: 1600 },
      { path: 'images/Ph260922b.webp', alt: '阳光树影 4', w: 900, h: 1600 },
    ],
  },
  {
    date: '2026-08-24',
    title: '晚霞浸染',
    titleEn: 'Dyed by the Evening Glow',
    emoji: '🌇',
    description: '晚霞像是被打翻了的颜料盘，洒在了天空上',
    descriptionEn: 'The evening glow is an overturned paint palette, splashed across the sky without rule, uncanny and still. It spills into the heart as well, laying bright colour over the grey.',
    images: [
      { path: 'images/Ph260824a.webp', alt: '晚霞浸染 1', w: 1080, h: 1920 },
      { path: 'images/Ph260824b.webp', alt: '晚霞浸染 2', w: 1920, h: 1080 },
      { path: 'images/Ph260807.webp', alt: '晚霞浸染 3', w: 1080, h: 1920 },
      { path: 'images/Ph260810.webp', alt: '晚霞浸染 4', w: 1920, h: 1080 },
    ],
  },
  {
    date: '2026-08-05',
    title: '自然清幽',
    titleEn: 'Stillness in the Green',
    emoji: '🏞️',
    description: '湖水平静的像一面镜子，此刻又荡起无尽的回忆',
    descriptionEn: 'Dense growth beside a lake as calm as a mirror. Looking back over the path I have walked, figures scattered across the grass, and the moment stirs up endless memory.',
    images: [
      { path: 'images/Ph260805d.webp', alt: '自然清幽 1', w: 1080, h: 1920 },
      { path: 'images/Ph260805a.webp', alt: '自然清幽 2', w: 1080, h: 1920 },
      { path: 'images/Ph260805b.webp', alt: '自然清幽 3', w: 1080, h: 1920 },
      { path: 'images/Ph260805c.webp', alt: '自然清幽 4', w: 1080, h: 1920 },
      { path: 'images/Ph260805e.webp', alt: '自然清幽 5', w: 1080, h: 1920 },
    ],
  },

]
