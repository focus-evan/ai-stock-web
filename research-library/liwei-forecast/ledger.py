"""Immutable forecasts, append-only outcomes, and version-separated accuracy."""
import datetime as dt
import hashlib
import json
import math
import os
from pathlib import Path

from market import TZ, checked_quote, features


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()


def sha(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + f'.tmp-{os.getpid()}')
    temp.write_bytes(canonical(value) + b'\n')
    os.replace(temp, path)


def immutable(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = canonical(value) + b'\n'
    try:
        with path.open('xb') as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        return True
    except FileExistsError:
        if path.read_bytes() == raw:
            return False
        raise ValueError('不可改写已冻结记录: ' + str(path))


def timestamp(value):
    result = dt.datetime.fromisoformat(value)
    if result.utcoffset() is None:
        raise ValueError('时间必须含时区')
    return result.astimezone(TZ)


class Calendar:
    def __init__(self, spec):
        self.spec = spec

    def is_open(self, date):
        day = dt.date.fromisoformat(date) if isinstance(date, str) else date
        if day.year not in self.spec['verified_years']:
            raise ValueError(f'{day.year}年交易日历未核实，请先补齐交易所公告')
        return day.weekday() < 5 and not any(a <= day.isoformat() <= b for a, b in self.spec['closed_ranges'])

    def next(self, date):
        day = dt.date.fromisoformat(date) + dt.timedelta(days=1)
        for _ in range(40):
            if self.is_open(day):
                return day.isoformat()
            day += dt.timedelta(days=1)
        raise ValueError('找不到下一交易日')

    def last_completed(self, now):
        now = now.astimezone(TZ)
        day = now.date()
        if now.time() < dt.time(15, 30):
            day -= dt.timedelta(days=1)
        for _ in range(40):
            if self.is_open(day):
                return day.isoformat()
            day -= dt.timedelta(days=1)
        raise ValueError('找不到已完成交易日')

    def sessions(self, first, last):
        day, end = dt.date.fromisoformat(first), dt.date.fromisoformat(last)
        result = []
        while day <= end:
            if self.is_open(day):
                result.append(day.isoformat())
            day += dt.timedelta(days=1)
        return result


def direction(change, threshold):
    if not math.isfinite(change):
        raise ValueError('涨跌幅不是有限数')
    # Decimal rounding removes floating point noise exactly on +/-0.3% boundaries.
    value = round(change, 8)
    return 'up' if value > threshold else 'down' if value < -threshold else 'flat'


def interval(correct, count):
    if not count:
        return None
    z, p = 1.95996398454, correct / count
    den = 1 + z*z/count
    center = (p + z*z/(2*count)) / den
    width = z * math.sqrt(p*(1-p)/count + z*z/(4*count*count)) / den
    return [max(0, center-width), min(1, center+width)]


def freeze(state, draft, context, contract, rubric, calendar, now):
    state = Path(state)
    now = now.astimezone(TZ)
    today = now.date().isoformat()
    target = calendar.next(today)
    if not calendar.is_open(today) or now.time() < dt.time(19, 30):
        raise ValueError('正式预判仅在交易日19:30之后冻结')
    if today < contract['start_base_date']:
        raise ValueError('早于实验开始日')
    if context['completed_date'] != today or context.get('errors'):
        raise ValueError('缺少当日完整且核对一致的行情')
    if context['contract_sha256'] != sha(contract) or context['rubric_sha256'] != sha(rubric):
        raise ValueError('输入与规则版本不匹配')
    if timestamp(context['prepared_at']) > now or now - timestamp(context['prepared_at']) > dt.timedelta(hours=2):
        raise ValueError('输入晚于冻结时间或超过2小时')
    if timestamp(context['market']['retrieved_at']) > now or context['market']['completed_date'] != today:
        raise ValueError('行情时间与输入时间不一致')
    if draft.get('context_sha256') != sha(context) or draft.get('target_date') != target:
        raise ValueError('草稿绑定的输入或目标交易日不正确')
    if set(draft.get('predictions', {})) != set(contract['symbols']):
        raise ValueError('必须分别给出沪深两个指数，允许明确观望')
    rules = {x['id'] for x in rubric['rules']}
    predictions = {}
    for symbol, item in draft['predictions'].items():
        if item.get('direction') not in contract['labels']:
            raise ValueError('方向只能是up/flat/down/abstain')
        if item.get('confidence') not in ('low', 'medium', 'high'):
            raise ValueError('置信度只能是低中高等级')
        for field in ('reason', 'invalidation'):
            if not isinstance(item.get(field), str) or len(item[field].strip()) < 10:
                raise ValueError('必须给出依据和反证条件')
        ids = item.get('rule_ids')
        if not isinstance(ids, list) or not ids or not set(ids) <= rules:
            raise ValueError('规则引用必须来自冻结语料规则')
        if not item.get('observed_facts') or not isinstance(item['observed_facts'], list):
            raise ValueError('必须列出事实，不能只有方向')
        predictions[symbol] = {k: item[k] for k in ('direction', 'confidence', 'reason', 'invalidation', 'rule_ids', 'observed_facts')}
        predictions[symbol]['assumptions'] = item.get('assumptions', [])
    if not isinstance(draft.get('headline'), str) or len(draft['headline'].strip()) < 8:
        raise ValueError('缺少主结论')
    for path in (state/'forecasts').glob('*.json'):
        old = read(path)
        if old['contract']['version'] == contract['version'] and old['contract_sha256'] != sha(contract):
            raise ValueError('口径发生变化，必须升级版本')
    if (state/'forecasts'/f'{target}.json').exists():
        raise ValueError('该目标交易日已有正式预判，禁止重复或覆盖')
    for symbol in contract['symbols']:
        checked_quote(context['market'], symbol, today)
        if context['features'][symbol] != features(context['market'], symbol):
            raise ValueError('特征与冻结行情不一致')
        for series in ('primary', 'secondary'):
            if any(r['date'] > today for r in context['market']['indices'][symbol][series]['rows']):
                raise ValueError('输入混入未来行情')
    record = {
        'schema_version': 1, 'target_date': target, 'base_date': today, 'created_at': now.isoformat(),
        'headline': draft['headline'], 'predictions': predictions, 'shared_risks': draft.get('shared_risks', []),
        'missing_inputs': draft.get('missing_inputs', []), 'contract': contract, 'contract_sha256': sha(contract),
        'rubric_sha256': sha(rubric), 'context_sha256': sha(context), 'code_identity': context['code_identity'],
        'authoring': 'Codex依据冻结语料框架和截至基准日的可核验数据生成，尚未证明预测有效',
        'baseline_persistence': {s: direction(context['features'][s]['change_pct'], contract['flat_threshold_pct']) for s in contract['symbols']}
    }
    immutable(state/'inputs'/f'{target}.json', context)
    immutable(state/'forecasts'/f'{target}.json', record)
    return record


def receipt_eligible(forecast, receipt):
    if not receipt or receipt.get('forecast_sha256') != sha(forecast):
        return False
    published = timestamp(receipt['published_at'])
    deadline = dt.datetime.combine(dt.date.fromisoformat(forecast['target_date']), dt.time(9, 15), TZ)
    return timestamp(forecast['created_at']) <= published < deadline


def evaluate(forecast, market, receipt, calendar, now):
    target, base = forecast['target_date'], forecast['base_date']
    if target > calendar.last_completed(now):
        raise ValueError('目标日尚未收盘，不得提前结算')
    if calendar.next(base) != target:
        raise ValueError('目标日不是基准日的下一交易日')
    if market.get('errors'):
        raise ValueError('核验行情存在缺口或冲突')
    if timestamp(market['retrieved_at']) > now:
        raise ValueError('行情采集时间晚于核验时间')
    results = {}
    threshold = forecast['contract']['flat_threshold_pct']
    for symbol, prediction in forecast['predictions'].items():
        before, actual = checked_quote(market, symbol, base), checked_quote(market, symbol, target)
        change = (actual['close']/before['close'] - 1) * 100
        truth = direction(change, threshold)
        hit = None if prediction['direction'] == 'abstain' else prediction['direction'] == truth
        failure = None
        if hit is False:
            failure = '低估收盘波动' if prediction['direction'] == 'flat' else '高估方向强度' if truth == 'flat' else '方向相反'
        results[symbol] = {'name': forecast['contract']['symbols'][symbol], 'predicted': prediction['direction'], 'actual': truth,
            'change_pct': change, 'base_close': before['close'], 'ohlc': actual, 'correct': hit, 'failure_type': failure,
            'confidence': prediction['confidence'], 'always_up_correct': truth == 'up',
            'persistence_correct': truth == forecast['baseline_persistence'][symbol],
            'sources': [{k: market['indices'][symbol][p][k] for k in ('provider', 'url', 'payload_sha256')} for p in ('primary', 'secondary')]}
    called = all(x['correct'] is not None for x in results.values())
    return {'schema_version': 1, 'target_date': target, 'evaluated_at': now.astimezone(TZ).isoformat(),
        'forecast_sha256': sha(forecast), 'contract_sha256': forecast['contract_sha256'],
        'publication_eligible': receipt_eligible(forecast, receipt), 'publication_receipt': receipt,
        'eligible': receipt_eligible(forecast, receipt) and called, 'indices': results,
        'joint_correct': all(x['correct'] is True for x in results.values()) if called else None,
        'exclusion_reason': '发布时间未达到前瞻要求' if not receipt_eligible(forecast, receipt) else '至少一项为观望' if not called else None,
        'market_sha256': sha(market), 'review_scope': '只验证次日收盘方向。反证触发不豁免原判断；正确率不等于收益率。'}


def summarize(forecasts, outcomes, receipts, contract, calendar, now):
    expected = calendar.sessions(contract['first_target_date'], calendar.last_completed(now))
    current_hash = sha(contract)
    fs = [f for f in forecasts if f['contract_sha256'] == current_hash]
    joined, pending = [], []
    invalid = []
    by_date = {f['target_date']: f for f in fs}
    for f in fs:
        r = outcomes.get(f['target_date'])
        if r and (r['forecast_sha256'] != sha(f) or r['contract_sha256'] != f['contract_sha256']):
            raise ValueError('核验记录对应的预判哈希不一致')
        if not r:
            pending.append(f['target_date'])
        elif r['eligible']:
            joined.append(r)
        else:
            invalid.append({'date': f['target_date'], 'reason': r['exclusion_reason']})
    if any(date not in {f['target_date'] for f in forecasts} for date in outcomes):
        raise ValueError('存在没有原始预判的核验记录')
    joined.sort(key=lambda r:r['target_date'])
    n = len(joined)
    wins = sum(r['joint_correct'] for r in joined)
    baseline = {name: sum(all(v[name] for v in r['indices'].values()) for r in joined) for name in ('always_up_correct','persistence_correct')}
    per_index = {}
    for s in contract['symbols']:
        rows = [r['indices'][s] for r in outcomes.values() if r['contract_sha256'] == current_hash and r['publication_eligible'] and r['indices'][s]['correct'] is not None]
        confusion = {a: {b: 0 for b in ('up','flat','down')} for a in ('up','flat','down')}
        confidence = {x: {'count':0,'correct':0} for x in ('low','medium','high')}
        failures = {}
        for row in rows:
            confusion[row['predicted']][row['actual']] += 1
            confidence[row['confidence']]['count'] += 1
            confidence[row['confidence']]['correct'] += int(row['correct'])
            if row['failure_type']:
                failures[row['failure_type']] = failures.get(row['failure_type'],0)+1
        k = sum(r['correct'] for r in rows)
        per_index[s] = {'count':len(rows),'correct':k,'accuracy':k/len(rows) if rows else None,'confusion':confusion,'confidence':confidence,'failure_types':failures}
    eligible_published = [d for d in expected if d in by_date and receipt_eligible(by_date[d], receipts.get(d))]
    explicit = [d for d in eligible_published if all(x['direction']!='abstain' for x in by_date[d]['predictions'].values())]
    return {'version':contract['version'],'contract_sha256':current_hash,'as_of':now.astimezone(TZ).isoformat(),
        'count':n,'correct':wins,'accuracy':wins/n if n else None,'wilson_95':interval(wins,n),
        'sample_note':'样本积累中，暂不判断模型有效' if n<30 else '仍需结合基准、类别分布与不同市场阶段判断',
        'last20':{'count':len(joined[-20:]),'correct':sum(x['joint_correct'] for x in joined[-20:])},
        'baseline_correct':baseline,'baseline_accuracy':{k:v/n if n else None for k,v in baseline.items()},
        'expected_completed_days':len(expected),'published_on_time_days':len(eligible_published),'explicit_direction_days':len(explicit),
        'coverage':len(explicit)/len(expected) if expected else None,'abstention_days':len(eligible_published)-len(explicit),
        'missing_or_late_days':[d for d in expected if d not in eligible_published],
        'pending_dates':pending,'excluded':invalid,'per_index':per_index,
        'version_groups':sorted(set(f['contract']['version']+' / '+f['contract_sha256'][:10] for f in forecasts))}
