# AI-Stock 战法质量与交易效果审计

入口：index.html；证据：evidence.html。报告可直接通过 file:// 打开，图表、筛选和成本情景不依赖网络。

固定快照：evan_main，2026-09-05 10:39:03 Asia/Shanghai。业务表原始JSON与SHA-256在data/manifest.json；外部日线截至2026-09-04。源码哈希在data/source_manifest.json。

复算现有快照（不要重新提取以保持本报告时点）：

```powershell
python -X utf8 scripts/enrich.py
python -X utf8 scripts/build_report.py
```

enrich.py会导入analyze.py完成原系统纯函数复算，再使用保存的外部日线重算，不访问数据库。需要Python、numpy、pymysql和python-dotenv（后两者仅提取需要）。analyze.py当前引用本地源代码；复算前应验证源码哈希。报告中的原始表、外部价格和输出不应覆盖，以便审计。

scripts/extract.py --full 是只读一致性快照提取器，会读取本地ai-stock/.env.main连接evan_main，重新运行将覆盖data原始快照；本次报告已完成提取，无需再运行。

scripts/check_all_prices.py、market_check.py用于外部行情核查，重新获取会改变抓取时点。凭据、用户ID未写入报告。所有投资表现均为模拟/信号代理，非真实券商成交验证。
