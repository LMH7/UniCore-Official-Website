# iNEX 联核智域官网 · 数据接口（腾讯云函数 SCF / Web 函数）
# 只用 Python 标准库，不依赖 Flask 等第三方包；Python 3.8 及以上都能跑。
# 接口：GET /products、GET /site-content、GET /（健康检查）

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

DATA = {
    "products": [
        {
            "id": "nex-500",
            "name": "NEX 500",
            "subtitle": "激光雷达平台",
            "sensor": "激光雷达",
            "image": "https://lmh7.github.io/UniCore-Official-Website/assets/images/nex-500.webp",
            "imageAlt": "NEX 500 激光雷达无人机实物图",
            "summary": "以激光雷达感知为起点，探索自主空中机器人的更多可能。",
            "description": "NEX 500 是 NEX 系列中的激光雷达无人机平台。面向自主空中机器人研究，可结合课题需求讨论平台、感知和实验配置。",
            "applications": [
                "环境感知研究",
                "自主导航实验",
                "机器人算法验证"
            ],
            "specs": [
                {
                    "label": "平台型号",
                    "value": "NEX 500"
                },
                {
                    "label": "传感器类型",
                    "value": "激光雷达"
                }
            ],
            "resources": [],
            "status": "platform"
        },
        {
            "id": "nex-250",
            "name": "NEX 250",
            "subtitle": "深度视觉平台",
            "sensor": "深度相机",
            "image": "https://lmh7.github.io/UniCore-Official-Website/assets/images/nex-250.webp",
            "imageAlt": "NEX 250 深度相机无人机实物图",
            "summary": "将深度视觉带入飞行实验，连接环境感知与自主决策。",
            "description": "NEX 250 是 NEX 系列中的深度相机无人机平台。围绕视觉感知与自主飞行，可根据研究方向进一步确认硬件和软件配置。",
            "applications": [
                "深度视觉研究",
                "机器人感知实验",
                "自主飞行探索"
            ],
            "specs": [
                {
                    "label": "平台型号",
                    "value": "NEX 250"
                },
                {
                    "label": "传感器类型",
                    "value": "深度相机"
                }
            ],
            "resources": [],
            "status": "platform"
        },
        {
            "id": "nex-30",
            "name": "NEX 30",
            "subtitle": "深度视觉平台",
            "sensor": "深度相机",
            "image": "https://lmh7.github.io/UniCore-Official-Website/assets/images/nex-30.webp",
            "imageAlt": "NEX 30 深度相机无人机实物图",
            "summary": "以深度相机为感知入口，让空中机器人研究有更多选择。",
            "description": "NEX 30 是 NEX 系列中的深度相机无人机平台。适合结合具体的教学科研课题，进一步讨论实验目标与平台选型。",
            "applications": [
                "机器人教学探索",
                "视觉算法实验",
                "自主感知研究"
            ],
            "specs": [
                {
                    "label": "平台型号",
                    "value": "NEX 30"
                },
                {
                    "label": "传感器类型",
                    "value": "深度相机"
                }
            ],
            "resources": [],
            "status": "platform"
        }
    ],
    "site-content": {
        "name": "联核智域科技团队",
        "shortName": "联核智域",
        "brand": "iNEX",
        "logo": "https://lmh7.github.io/UniCore-Official-Website/assets/images/inex-logo.webp",
        "tagline": "面向科研与教育的自主空中机器人平台",
        "email": "",
        "location": "",
        "qrImage": "",
        "contacts": [
            {
                "id": "wechat",
                "label": "微信",
                "name": "微信联系",
                "icon": "wechat",
                "description": "扫描二维码添加微信，交流产品选型与研究需求。",
                "qrImage": "https://lmh7.github.io/UniCore-Official-Website/assets/images/wechat-qr.png",
                "url": "",
                "action": "查看微信二维码",
                "downloadName": "inex-wechat-qr.png"
            },
            {
                "id": "linkedin",
                "label": "LinkedIn",
                "name": "LinkedIn · 魏宇昊",
                "icon": "linkedin",
                "description": "访问 LinkedIn 主页，或扫描二维码建立联系。",
                "qrImage": "https://lmh7.github.io/UniCore-Official-Website/assets/images/linkedin-qr.png",
                "url": "https://www.linkedin.com/in/%E5%AE%87%E6%98%8A-%E9%AD%8F-a7a450448?fromQR=1",
                "action": "访问 LinkedIn",
                "downloadName": "inex-linkedin-qr.png"
            }
        ],
        "faqs": [
            {
                "question": "如何选择合适的 NEX 平台？",
                "answer": "先明确研究目标、感知方式和实验环境。NEX 500 使用激光雷达，NEX 250 与 NEX 30 使用深度相机。其他配置请通过微信或 LinkedIn 与团队确认。"
            },
            {
                "question": "可以在哪里获取技术资料？",
                "answer": "资源页提供公开学习入口。NEX 平台的具体配置、软件支持与技术资料，请联系团队获取适合你研究方向的信息。"
            },
            {
                "question": "是否支持教学科研合作？",
                "answer": "欢迎围绕机器人感知、自主导航、集群协同与教学实验交流。请说明课题目标、实验环境和计划，便于进一步讨论。"
            },
            {
                "question": "手机上怎样使用联系二维码？",
                "answer": "点击二维码可放大，也可以保存原图，在微信或 LinkedIn 中使用识别图片功能；LinkedIn 还支持直接打开个人主页。"
            }
        ],
        "intro": "联核智域科技团队专注于微型自主空中机器人与集群技术研发。我们面向高校、科研院所与企业的研究需求，探索机器人平台、感知算法、仿真工具与教育科研的结合，让想法更快走向真实的飞行实验。",
        "mission": "加速空中具身智能研发效率与落地应用。",
        "solutions": [
            {
                "id": "education",
                "number": "01",
                "title": "教育与科研",
                "english": "EDUCATION & RESEARCH",
                "icon": "book",
                "summary": "从理解算法，到开展真实飞行实验。",
                "audience": "高校课程、科研课题与机器人实验教学",
                "description": "围绕自主飞行与机器人感知，将硬件平台、算法学习与仿真验证衔接起来，为课程实践和科研探索提供清晰的起点。",
                "topics": [
                    "机器人感知",
                    "自主导航",
                    "算法实验"
                ]
            },
            {
                "id": "exploration",
                "number": "02",
                "title": "自主探索与巡检",
                "english": "AUTONOMOUS EXPLORATION",
                "icon": "scan",
                "summary": "让空中机器人感知并理解环境。",
                "audience": "自主导航、环境探测与巡检方向的研发团队",
                "description": "围绕激光雷达或深度相机的环境感知，探索自主建图、环境理解与飞行规划。具体场景与交付内容可结合实验需求进一步讨论。",
                "topics": [
                    "环境感知",
                    "自主建图",
                    "路径规划"
                ]
            },
            {
                "id": "swarm",
                "number": "03",
                "title": "集群协同",
                "english": "MULTI-ROBOT COLLABORATION",
                "icon": "nodes",
                "summary": "从单机智能，走向多机协同。",
                "audience": "多机器人系统与集群算法研究人员",
                "description": "面向多机任务分配、协同感知与编队飞行等研究方向，探索仿真实验与实体平台之间的衔接，支持研究思路的逐步验证。",
                "topics": [
                    "多机协同",
                    "编队研究",
                    "仿真验证"
                ]
            }
        ],
        "resources": [
            {
                "title": "CDIF-Lab",
                "type": "实验室网站",
                "description": "跨域智能飞行器技术实验室的公开研究与项目介绍。",
                "url": "https://cdiflab.github.io/",
                "label": "访问网站"
            },
            {
                "title": "PX4 文档",
                "type": "飞行控制学习",
                "description": "PX4 官方中文文档，了解开源飞行控制与开发基础。",
                "url": "https://docs.px4.io/main/zh/",
                "label": "阅读文档"
            },
            {
                "title": "ROS 2 文档",
                "type": "机器人开发学习",
                "description": "ROS 2 官方文档与教程，了解机器人软件开发的基础概念。",
                "url": "https://docs.ros.org/en/jazzy/",
                "label": "阅读文档"
            }
        ]
    },
}

ROUTES = {
    "/products": "products",
    "/site-content": "site-content",
}


class Handler(BaseHTTPRequestHandler):
    server_version = "inex-api/1.0"
    protocol_version = "HTTP/1.1"

    def _write(self, status, payload):
        body = b"" if payload is None else json.dumps(
            {"data": payload}, ensure_ascii=False
        ).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        if status == 200:
            self.send_header("Cache-Control", "public, max-age=60")
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_OPTIONS(self):
        self._write(204, None)

    def do_GET(self):
        path = urlsplit(self.path).path.rstrip("/") or "/"
        if path == "/":
            self._write(200, {"ok": True, "hint": "GET /products 或 GET /site-content"})
            return
        key = ROUTES.get(path)
        if not key:
            self._write(404, {"error": {"code": "not_found", "message": "没有这个接口"}})
            return
        self._write(200, DATA[key])

    def log_message(self, fmt, *args):
        # 简化日志，避免刷屏
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)


def main():
    port = int(os.environ.get("PORT", "9000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print("inex-api listening on 0.0.0.0:%d" % port, flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
