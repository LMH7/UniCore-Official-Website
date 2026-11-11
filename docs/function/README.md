# 后端交付入口

2026-11-11 新版实现已迁移至 [`backend/`](../../backend/README.md)。原来的独立 `app.py` 已移除，避免继续部署写死内容、缺依赖、旧运行环境的版本。

- 运行和腾讯云部署：[backend/README.md](../../backend/README.md)
- 维护内容：[CONTENT_GUIDE.md](../../CONTENT_GUIDE.md)
- 新版接口：[接口说明.md](接口说明.md)
- 新版本地验收：[backend/ACCEPTANCE.md](../../backend/ACCEPTANCE.md)
- 同学原先的线上记录：[验收记录.md](验收记录.md)，仅对应 2026-11-10 的旧服务。

不要再用“复制一个 app.py 覆盖旧模板”的方式部署。新版提供锁定依赖、启动入口和完整 ZIP，需要 Python 3.12 环境；目标云环境尚需账号持有人确认。

旧公网地址仍为 <https://1529293111-996nrvu444.ap-chengdu.tencentscf.com/>。仓库修复不等于该地址已经升级，新版云端验收必须在部署后单独记录。默认网页继续使用本地内容，9000 预览可以直接检验新版后端。
