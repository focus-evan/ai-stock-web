# 立伟：每日预判、次日验证、累计正确率

本模块将公开语料重建框架用于新的前瞻研究实验。预测由 Codex 按 `rubric.json` 分析当时可见资料后生成，账本和评分由程序执行。它不宣称恢复立伟的私有指标、内部权重或真实绩效。

## 入口与运行位置

- 用户页面：`/research-library/content/skill-list/liwei-personal-model/index.html`。
- 原方法报告：同目录 `methodology.html`，原文、反例和REA证据保留。
- 本地输出：`D:/Evan/html/skill-list/liwei-personal-model`。
- 持久账本：`D:/Evan/Codes/.codex-output/liwei-forecast-live`。
- 现有 Mac 日报继续使用 `/content/douyin/liwei-model/index.html`，本模块不修改其任务或历史。
- 代码必须先提交、推送至 `codex/liwei-forecast-validation-20261027`，发布器核对当前精确提交和源码干净状态。静态内容采用当前线上基线叠加，保持其他来源及服务不变，无需发布主应用。

## 固定口径

从2026-10-27收盘后开始，预测下一交易日沪深两个指数的收盘方向。实际涨跌幅严格大于0.3%为收涨，严格小于-0.3%为收跌，其余为平收（含边界）。这是预先约定的统计口径，不是作者原版参数，也不是对盘中振幅的判断。

整体一天一票：沪深两个指数都有明确方向、都判断正确才算正确一天。任何一个观望则不进入整体正确率，但保留在观望与覆盖率中；各指数分别统计。数据冲突或延迟保持待验证。缺报和迟报影响覆盖率，不能悄悄排除。基准“每天收涨”和“延续基准日方向”使用同一组已评分日期。置信度仅为低中高自评。Wilson区间仅为描述性参考，不调整市场自相关，不构成统计有效性证明。

旧报告的D/R等状态、分支预案和事后复述不补算成新实验的预测。反证条件失效也不撤销原方向或豁免计分。任何口径变更必须新版本，按契约哈希分开统计。

## 一次完整运行

Python 3.11+，仅标准库。Windows现有运行时：
`C:/Users/bzsj_/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`。

在本目录执行：

1. `python workflow.py review`：到期预测读取腾讯/新浪日线；某来源失败时尝试Yahoo。两独立来源OHLC差超过0.05指数点，保留待验证，不算对错。
2. 交易日19:30后执行 `python workflow.py prepare`。只使用已完成日线，计算SMA等可复算参照，同时读取已有日报作为有时间戳的辅助来源。`forecast_ready=false` 时不得冻结。
3. 通读 `rubric.json` 和状态目录 `prepared.json`。分别给出上证、深成指的唯一主判断，事实/假设/反证分开，明确原版恐贪、底部、席位属性缺口。不能机械地把D状态换成看跌；分支情景不能事后挑一个算命中。若无法作出判断，使用 `abstain`。
4. 写状态目录 `drafts/<target_date>.json`，示意结构如下（不是实际预测）：

```json
{
  "target_date": "从prepare结果读取",
  "context_sha256": "从prepare结果读取",
  "headline": "一个主结论和核心依据",
  "predictions": {
    "000001.SS": {
      "direction": "up或flat或down或abstain",
      "confidence": "low或medium或high",
      "reason": "为何形成这个主判断，引用当前已核验数据",
      "invalidation": "什么可观察事实会推翻该解释；不作为评分豁免",
      "rule_ids": ["R01", "R03"],
      "observed_facts": ["真实输入事实"],
      "assumptions": ["与事实分开的推断"]
    },
    "399001.SZ": {"direction":"abstain","confidence":"low","reason":"明确写出不能判断的原因和缺口","invalidation":"明确写出后续需要观察的确认条件","rule_ids":["R01"],"observed_facts":["真实输入事实"],"assumptions":[]}
  },
  "shared_risks": ["当时已知的共同风险"],
  "missing_inputs": ["当前未取得的作者原版指标"]
}
```

5. `python workflow.py freeze --draft <绝对草稿路径>`：校验交易日、19:30时限、数据新鲜度、规则引用、契约与上下文哈希；独占写入不可覆盖的预测和输入。同一目标日已冻结则跳过，不能另起版本重试方向。
6. `python workflow.py render`：生成入口、历史和统计；没有样本时显示“—”，不用0%冒充评测结果。
7. `python workflow.py publish`：校验已推送代码，增量合并线上目录，使用既有服务器锁/基线比较/原子发布/回滚目录。逐一验证HTTP与哈希，并记录首次成功公开发布时间。早于目标日09:15才进入正式评分。
8. 新预测发布成功后，可再执行一次 `render` / `publish`，使发布回执出现在公开日级附件中。重复任务不产生新预测或新评分。

## 调度

使用当前对话的 Codex heartbeat：北京时间每天15:50、19:50、20:50。15:50优先核验；19:50在既有19:30日报之后生成；20:50补跑。休市日不生成新预测，但允许补齐尚未获得行情的到期核验。本机、Codex与网络需可用；网页超过下一检查时段90分钟自动提示未更新。

仅新发布的预测/验证结果、失败或需要人工处理时通知；未变化保持安静。不自动改动评分规则、预测方向或已冻结文件。2027等未核实年份应停发并提示核对交易所日历，禁止把普通工作日直接当交易日。

## 验证

`python -m unittest test_workflow.py -v` 使用完全独立的合成行情，覆盖未来数据、事后改写、节假日、迟到发布、两来源冲突、观望分母、联合评分和重复核验。测试记录不得复制入正式账本或知识库。

发布后核对主入口、方法报告、统计JSON和目录分类，并确认现有日更与野人手册未变。不调用交易接口、不修改持仓、不启停业务服务。
