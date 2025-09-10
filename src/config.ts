export const SITE = {
  website: "https://liubinfighter.github.io/blog/", // 你的部署域名
  author: "Jay Bridge", // 你的名字
  profile: "https://github.com/liubinfighter", // 你的个人资料链接
  desc: "Jay Bridge的个人博客 - 分享技术见解、生活感悟和创意想法", // 站点描述
  title: "Jay Bridge's Blog", // 站点标题
  ogImage: "astropaper-og.jpg", // Open Graph 图片
  lightAndDarkMode: true,
  postPerIndex: 4, // 首页显示的文章数量
  postPerPage: 8, // 每页显示的文章数量
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "编辑页面",
    url: "https://github.com/liubinfighter/blog/edit/main/", // 你的GitHub仓库编辑链接
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "zh-cn", // html lang code. 设置为中文
  timezone: "Asia/Shanghai", // 设置为上海时区
} as const;
