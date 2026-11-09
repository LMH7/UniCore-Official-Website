/* 产品公开内容。首页、产品中心、详情页、搜索和对比共用同一份数据。
   只填写经研发确认的事实。新增产品沿用此结构，id 必须唯一。
   image 使用站内相对路径，勿填写电脑绝对路径。 */
window.PRODUCTS = [
  {
    id: "nex-500",
    name: "NEX 500",
    subtitle: "激光雷达平台",
    sensor: "激光雷达",
    image: "assets/images/nex-500.webp",
    imageAlt: "NEX 500 激光雷达无人机实物图",
    summary: "以激光雷达感知为起点，探索自主空中机器人的更多可能。",
    description:
      "NEX 500 是 NEX 系列中的激光雷达无人机平台。面向自主空中机器人研究，可结合课题需求讨论平台、感知和实验配置。",
    applications: ["环境感知研究", "自主导航实验", "机器人算法验证"],
    specs: [
      { label: "平台型号", value: "NEX 500" },
      { label: "传感器类型", value: "激光雷达" },
    ],
    resources: [],
    status: "platform",
  },
  {
    id: "nex-250",
    name: "NEX 250",
    subtitle: "深度视觉平台",
    sensor: "深度相机",
    image: "assets/images/nex-250.webp",
    imageAlt: "NEX 250 深度相机无人机实物图",
    summary: "将深度视觉带入飞行实验，连接环境感知与自主决策。",
    description:
      "NEX 250 是 NEX 系列中的深度相机无人机平台。围绕视觉感知与自主飞行，可根据研究方向进一步确认硬件和软件配置。",
    applications: ["深度视觉研究", "机器人感知实验", "自主飞行探索"],
    specs: [
      { label: "平台型号", value: "NEX 250" },
      { label: "传感器类型", value: "深度相机" },
    ],
    resources: [],
    status: "platform",
  },
  {
    id: "nex-30",
    name: "NEX 30",
    subtitle: "深度视觉平台",
    sensor: "深度相机",
    image: "assets/images/nex-30.webp",
    imageAlt: "NEX 30 深度相机无人机实物图",
    summary: "以深度相机为感知入口，让空中机器人研究有更多选择。",
    description:
      "NEX 30 是 NEX 系列中的深度相机无人机平台。适合结合具体的教学科研课题，进一步讨论实验目标与平台选型。",
    applications: ["机器人教学探索", "视觉算法实验", "自主感知研究"],
    specs: [
      { label: "平台型号", value: "NEX 30" },
      { label: "传感器类型", value: "深度相机" },
    ],
    resources: [],
    status: "platform",
  },
];
