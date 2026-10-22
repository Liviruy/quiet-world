export interface Album {
  slug: string
  title: string
  location: string
  date: string
  category: string
  imageId: number
  description: string
  tags: string[]
}

export const albums: Album[] = [
  {
    slug: 'kyoto-snow',
    title: '雪后的京都',
    location: '日本 · 京都',
    date: '2026年1月',
    category: '旅途',
    imageId: 1,
    description: '金阁寺的雪景，万籁俱寂，唯有雪花簌簌落下。屋顶与石阶覆上薄薄一层白，枯山水庭院在雪的映衬下更显禅意。',
    tags: ['京都', '雪景', '寺庙', '冬'],
  },
  {
    slug: 'shanghai-bund',
    title: '黄昏下的外滩',
    location: '中国 · 上海',
    date: '2025年11月',
    category: '城市',
    imageId: 2,
    description: '浦江两岸灯火渐次亮起，城市的另一面正缓缓展开。万国建筑群倒映在黄浦江上，恍如穿梭于时光隧道。',
    tags: ['上海', '外滩', '黄昏', '建筑'],
  },
  {
    slug: 'kanas-autumn',
    title: '喀纳斯之秋',
    location: '中国 · 新疆',
    date: '2025年10月',
    category: '自然',
    imageId: 3,
    description: '层林尽染，湖水如镜，秋色在这里达到了极致。白桦林金黄一片，喀纳斯湖碧蓝深邃，仿佛上帝打翻了调色盘。',
    tags: ['新疆', '喀纳斯', '秋色', '湖泊'],
  },
  {
    slug: 'prague-oldtown',
    title: '布拉格老城',
    location: '捷克 · 布拉格',
    date: '2025年8月',
    category: '建筑',
    imageId: 4,
    description: '中世纪的建筑群在晨光中苏醒，每一块砖石都在诉说故事。查理大桥上，街头艺人的琴声回荡在伏尔塔瓦河上。',
    tags: ['布拉格', '中世纪', '建筑', '欧洲'],
  },
  {
    slug: 'kamakura-sea',
    title: '镰仓的海',
    location: '日本 · 镰仓',
    date: '2026年3月',
    category: '旅途',
    imageId: 5,
    description: '江之电驶过海岸线的午后，湘南的海风有夏天的味道。镰仓高校前站的平交道口，是无数人青春记忆的坐标。',
    tags: ['镰仓', '海', '江之电', '湘南'],
  },
  {
    slug: 'chongqing-night',
    title: '山城夜景',
    location: '中国 · 重庆',
    date: '2025年12月',
    category: '城市',
    imageId: 6,
    description: '错落有致的灯火，层层叠叠的霓虹，山城的夜从不单调。洪崖洞的吊脚楼在灯光的勾勒下，宛如宫崎骏动画中的世界。',
    tags: ['重庆', '夜景', '山城', '洪崖洞'],
  },
  {
    slug: 'norway-forest',
    title: '挪威森林',
    location: '挪威 · 卑尔根',
    date: '2025年7月',
    category: '自然',
    imageId: 7,
    description: '峡湾深处的密林，云雾缭绕间仿佛走进北欧神话。布道石矗立在高处，俯瞰吕瑟峡湾的壮丽景色。',
    tags: ['挪威', '森林', '峡湾', '北欧'],
  },
  {
    slug: 'sagrada-familia',
    title: '圣家堂光影',
    location: '西班牙 · 巴塞罗那',
    date: '2025年6月',
    category: '建筑',
    imageId: 8,
    description: '高迪的旷世杰作，彩色玻璃窗投下梦幻光斑。光影在教堂内部流转，每一次到访都是全新的视觉盛宴。',
    tags: ['巴塞罗那', '高迪', '圣家堂', '光影'],
  },
  {
    slug: 'taipei-rain',
    title: '台北的雨',
    location: '中国 · 台北',
    date: '2026年2月',
    category: '城市',
    imageId: 9,
    description: '雨中的九份山城，红灯笼在朦胧水汽中微微晃动。老街的石阶湿漉漉的，空气中弥漫着茶香和芋圆的甜味。',
    tags: ['台北', '九份', '雨', '山城'],
  },
  {
    slug: 'tuscany-sun',
    title: '托斯卡纳艳阳',
    location: '意大利 · 托斯卡纳',
    date: '2025年9月',
    category: '自然',
    imageId: 10,
    description: '起伏的丘陵上，丝柏树静静矗立，日光把大地染成金色。橄榄园和葡萄园交错分布，每一帧都像文艺复兴时期的油画。',
    tags: ['托斯卡纳', '意大利', '田园', '艳阳'],
  },
  {
    slug: 'iceland-aurora',
    title: '冰岛极光',
    location: '冰岛 · 雷克雅未克',
    date: '2025年12月',
    category: '旅途',
    imageId: 11,
    description: '极光在夜空中舞动，如梦似幻，如同地球的呼吸。绿色与紫色的光带在黑暗的天幕上流淌，是此生必看的奇景。',
    tags: ['冰岛', '极光', '北极', '星空'],
  },
  {
    slug: 'chiangmai-temple',
    title: '清迈寺庙',
    location: '泰国 · 清迈',
    date: '2026年1月',
    category: '建筑',
    imageId: 12,
    description: '金色佛塔在夕阳下熠熠生辉，诵经声随风飘散。清迈古城内大小寺庙三百余座，每一步都踏在信仰与历史之上。',
    tags: ['清迈', '寺庙', '泰国', '佛塔'],
  },
]

export interface AlbumCopy {
  title: string
  location: string
  category: string
  description: string
  tags: string[]
}

const englishAlbumCopy: Record<string, AlbumCopy> = {
  'kyoto-snow': {
    title: 'Snowy Kyoto',
    location: 'Kyoto, Japan',
    category: 'Travel',
    description: 'Snow falls quietly over Kinkaku-ji. A thin white layer settles on the roofs and stone steps, making the dry landscape garden feel even more contemplative.',
    tags: ['Kyoto', 'Snow', 'Temple', 'Winter'],
  },
  'shanghai-bund': {
    title: 'The Bund at Dusk',
    location: 'Shanghai, China',
    category: 'City',
    description: 'Lights begin to appear along both sides of the Huangpu River as another side of the city slowly unfolds. The historic buildings shimmer in the water like a passage through time.',
    tags: ['Shanghai', 'The Bund', 'Dusk', 'Architecture'],
  },
  'kanas-autumn': {
    title: 'Autumn in Kanas',
    location: 'Xinjiang, China',
    category: 'Nature',
    description: 'The forest turns gold, the lake becomes a mirror, and autumn reaches its richest expression. The birches glow beside the deep blue water like a palette opened by nature.',
    tags: ['Xinjiang', 'Kanas', 'Autumn', 'Lake'],
  },
  'prague-oldtown': {
    title: 'Prague Old Town',
    location: 'Prague, Czechia',
    category: 'Architecture',
    description: 'Medieval buildings wake in the morning light, each stone carrying its own story. Street musicians echo across Charles Bridge and the Vltava River.',
    tags: ['Prague', 'Medieval', 'Architecture', 'Europe'],
  },
  'kamakura-sea': {
    title: 'The Sea at Kamakura',
    location: 'Kamakura, Japan',
    category: 'Travel',
    description: 'The Enoden traces the coast through an afternoon scented with summer. The crossing near Kamakura High School Station remains a landmark in countless memories of youth.',
    tags: ['Kamakura', 'Sea', 'Enoden', 'Shonan'],
  },
  'chongqing-night': {
    title: 'Chongqing by Night',
    location: 'Chongqing, China',
    category: 'City',
    description: 'Layered lights, stacked streets, and restless neon give the mountain city a different face every night. Hongyadong glows like a world from an animated film.',
    tags: ['Chongqing', 'Night', 'Mountain City', 'Hongyadong'],
  },
  'norway-forest': {
    title: 'Norwegian Forest',
    location: 'Bergen, Norway',
    category: 'Nature',
    description: 'Deep in the fjords, mist wraps the forest in the atmosphere of a Nordic myth. Preikestolen rises above the Lysefjord, vast and quiet.',
    tags: ['Norway', 'Forest', 'Fjord', 'Nordic'],
  },
  'sagrada-familia': {
    title: 'Light at the Sagrada Familia',
    location: 'Barcelona, Spain',
    category: 'Architecture',
    description: 'Gaudi\'s masterpiece turns stained glass into drifting color. Light moves through the interior, making every visit feel like a new visual experience.',
    tags: ['Barcelona', 'Gaudi', 'Sagrada Familia', 'Light'],
  },
  'taipei-rain': {
    title: 'Rain in Taipei',
    location: 'Taipei, Taiwan',
    category: 'City',
    description: 'In the rain, Jiufen\'s hillside streets sway behind a veil of mist. Wet stone steps, red lanterns, tea, and taro balls shape the mood of the old town.',
    tags: ['Taipei', 'Jiufen', 'Rain', 'Hillside Town'],
  },
  'tuscany-sun': {
    title: 'Tuscan Sun',
    location: 'Tuscany, Italy',
    category: 'Nature',
    description: 'Cypress trees stand quietly across rolling hills while sunlight turns the land gold. Olive groves and vineyards meet like a Renaissance painting.',
    tags: ['Tuscany', 'Italy', 'Countryside', 'Sunlight'],
  },
  'iceland-aurora': {
    title: 'Icelandic Aurora',
    location: 'Reykjavik, Iceland',
    category: 'Travel',
    description: 'The aurora moves through the night like the breathing of the earth. Green and violet bands flow across the dark sky in a spectacle worth waiting for.',
    tags: ['Iceland', 'Aurora', 'Arctic', 'Stars'],
  },
  'chiangmai-temple': {
    title: 'Temples of Chiang Mai',
    location: 'Chiang Mai, Thailand',
    category: 'Architecture',
    description: 'Golden stupas catch the last light while chanting drifts through the air. Every step through the old city touches both faith and history.',
    tags: ['Chiang Mai', 'Temple', 'Thailand', 'Stupa'],
  },
}

export function getAlbumCopy(album: Album, lang: string): AlbumCopy {
  if (lang === 'en') {
    return englishAlbumCopy[album.slug] ?? {
      title: album.title,
      location: album.location,
      category: album.category,
      description: album.description,
      tags: album.tags,
    }
  }

  return {
    title: album.title,
    location: album.location,
    category: album.category,
    description: album.description,
    tags: album.tags,
  }
}

export function formatAlbumDate(date: string, lang: string): string {
  if (lang !== 'en') {
    return date
  }

  const match = date.match(/^(\d{4})年(\d{1,2})月$/)
  if (!match) {
    return date
  }

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  return `${months[Number(match[2]) - 1]} ${match[1]}`
}
