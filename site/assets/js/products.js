/* 产品公开内容。首页、产品中心、详情页、搜索和对比共用同一份数据。
   只填写经研发确认的事实。新增产品沿用此结构，id 必须唯一。
   image 使用站内相对路径，勿填写电脑绝对路径。
   字段说明与替换方法见 docs/D-PRODUCTS.md；未确认的参数写“参数值待确认”，
   resources 没有真实文件时保持空数组，video 没有视频时保持空字符串。 */
window.PRODUCTS = [
  {
    id: "nex-500",
    name: "NEX 500",
    subtitle: "激光雷达平台",
    series: "NEX 系列",
    sensor: "激光雷达",
    image: "assets/images/nex-500.webp",
    imageAlt: "NEX 500 激光雷达无人机实物图",
    summary: "以激光雷达感知为起点，探索自主空中机器人的更多可能。",
    description:
      "NEX 500 是 NEX 系列中的激光雷达无人机平台。面向自主空中机器人研究，可结合课题需求讨论平台、感知和实验配置。",
    features: [
      {
        title: "激光雷达感知",
        text: "以激光雷达点云作为核心感知输入，用于环境建模与感知算法实验。",
      },
      {
        title: "面向自主飞行研究",
        text: "围绕自主导航、路径规划与飞行控制，提供可验证的空中平台。",
      },
      {
        title: "实验配置可讨论",
        text: "机载计算、传感器与软件环境以团队沟通确认的配置为准。",
      },
    ],
    applications: ["环境感知研究", "自主导航实验", "机器人算法验证"],
    specs: [
      { group: "平台", label: "平台型号", value: "NEX 500" },
      { group: "感知", label: "传感器类型", value: "激光雷达" },
      { group: "飞行", label: "整机重量", value: "参数值待确认" },
      { group: "飞行", label: "续航时间", value: "参数值待确认" },
    ],
    resources: [],
    video: "",
    contentStatus: "placeholder",
    status: "platform",
  },
  {
    id: "nex-250",
    name: "NEX 250",
    subtitle: "深度视觉平台",
    series: "NEX 系列",
    sensor: "深度相机",
    image: "assets/images/nex-250.webp",
    imageAlt: "NEX 250 深度相机无人机实物图",
    summary: "将深度视觉带入飞行实验，连接环境感知与自主决策。",
    description:
      "NEX 250 是 NEX 系列中的深度相机无人机平台。围绕视觉感知与自主飞行，可根据研究方向进一步确认硬件和软件配置。",
    features: [
      {
        title: "深度视觉感知",
        text: "以深度相机获取环境信息，支持视觉感知与避障算法实验。",
      },
      {
        title: "便于实验开展",
        text: "面向教学与科研实验，便于在有限空间内完成飞行验证。",
      },
      {
        title: "软件环境可定制",
        text: "机载计算与开发环境按课题需要沟通确认，不预设固定组合。",
      },
    ],
    applications: ["深度视觉研究", "机器人感知实验", "自主飞行探索"],
    specs: [
      { group: "平台", label: "平台型号", value: "NEX 250" },
      { group: "感知", label: "传感器类型", value: "深度相机" },
      { group: "飞行", label: "整机重量", value: "参数值待确认" },
      { group: "飞行", label: "续航时间", value: "参数值待确认" },
    ],
    resources: [],
    video: "",
    contentStatus: "placeholder",
    status: "platform",
  },
  {
    id: "nex-30",
    name: "NEX 30",
    subtitle: "深度视觉平台",
    series: "NEX 系列",
    sensor: "深度相机",
    image: "assets/images/nex-30.webp",
    imageAlt: "NEX 30 深度相机无人机实物图",
    summary: "以深度相机为感知入口，让空中机器人研究有更多选择。",
    description:
      "NEX 30 是 NEX 系列中的深度相机无人机平台。适合结合具体的教学科研课题，进一步讨论实验目标与平台选型。",
    features: [
      {
        title: "深度相机入门",
        text: "以深度相机作为感知起点，适合视觉算法教学与入门实验。",
      },
      {
        title: "教学科研兼顾",
        text: "兼顾课程演示与课题验证，可从小规模实验逐步扩展。",
      },
      {
        title: "配置按需确认",
        text: "具体机载配置与软件环境以团队沟通结果为准。",
      },
    ],
    applications: ["机器人教学探索", "视觉算法实验", "自主感知研究"],
    specs: [
      { group: "平台", label: "平台型号", value: "NEX 30" },
      { group: "感知", label: "传感器类型", value: "深度相机" },
      { group: "飞行", label: "整机重量", value: "参数值待确认" },
      { group: "飞行", label: "续航时间", value: "参数值待确认" },
    ],
    resources: [],
    video: "",
    contentStatus: "placeholder",
    status: "platform",
  },
];

/* 规划文档中的旧名称，保留给尚未改写的脚本使用；两个名称指向同一份数据。 */
window.SITE_PRODUCTS = window.PRODUCTS;
