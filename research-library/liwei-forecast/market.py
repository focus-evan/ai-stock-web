"""Read-only index data collection. Completed bars only; never infer missing quotes."""
import concurrent.futures as cf
import datetime as dt
import hashlib
import json
import math
import statistics
import urllib.request

TZ = dt.timezone(dt.timedelta(hours=8))
SYMBOLS = {'000001.SS': ('上证综指', 'sh000001'), '399001.SZ': ('深证成指', 'sz399001')}


def digest(value):
    return hashlib.sha256(value).hexdigest()


def download(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'})
    with urllib.request.urlopen(request, timeout=30) as response:
        raw = response.read(8 * 1024 * 1024 + 1)
    if len(raw) > 8 * 1024 * 1024:
        raise ValueError('行情响应超过8MiB')
    return json.loads(raw), digest(raw)


def normalize(rows, completed_date):
    result = []
    for row in rows:
        date = row['date'][:10]
        dt.date.fromisoformat(date)
        if date > completed_date:
            continue
        prices = {k: float(row[k]) for k in ('open', 'high', 'low', 'close')}
        if not all(math.isfinite(v) and v > 0 for v in prices.values()):
            raise ValueError('价格不是正的有限数')
        if prices['low'] > min(prices['open'], prices['close']) or prices['high'] < max(prices['open'], prices['close']):
            raise ValueError('OHLC关系错误')
        result.append({'date': date, **prices})
    dates = [x['date'] for x in result]
    if dates != sorted(set(dates)):
        raise ValueError('行情日期重复或乱序')
    if not result or result[-1]['date'] != completed_date:
        raise ValueError('缺少预期完整交易日 ' + completed_date)
    return result


def fetch_tencent(symbol, completed_date):
    code = SYMBOLS[symbol][1]
    url = f'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param={code},day,,,500,qfq'
    data, sha = download(url)
    item = data['data'][code]
    raw = item.get('day') or item.get('qfqday')
    if not raw:
        raise ValueError('腾讯无日线')
    rows = [{'date': r[0], 'open': r[1], 'close': r[2], 'high': r[3], 'low': r[4]} for r in raw]
    return {'provider': 'Tencent', 'url': url, 'payload_sha256': sha, 'rows': normalize(rows, completed_date)}


def fetch_sina(symbol, completed_date):
    code = SYMBOLS[symbol][1]
    url = f'https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData?symbol={code}&scale=240&ma=no&datalen=500'
    data, sha = download(url)
    if not isinstance(data, list):
        raise ValueError('新浪无日线数组')
    rows = [{'date': r['day'], **{k: r[k] for k in ('open', 'high', 'low', 'close')}} for r in data]
    return {'provider': 'Sina', 'url': url, 'payload_sha256': sha, 'rows': normalize(rows, completed_date)}


def fetch_yahoo(symbol, completed_date):
    errors = []
    for host in ('query2.finance.yahoo.com', 'query1.finance.yahoo.com'):
        url = f'https://{host}/v8/finance/chart/{symbol}?range=2y&interval=1d'
        try:
            data, sha = download(url)
            item = data['chart']['result'][0]
            q = item['indicators']['quote'][0]
            rows = []
            for i, stamp in enumerate(item['timestamp']):
                prices = {k: q[k][i] for k in ('open', 'high', 'low', 'close')}
                if all(v is None for v in prices.values()):
                    continue
                rows.append({'date': dt.datetime.fromtimestamp(stamp, TZ).date().isoformat(), **prices})
            return {'provider': 'Yahoo Finance', 'url': url, 'payload_sha256': sha, 'rows': normalize(rows, completed_date)}
        except Exception as exc:
            errors.append(str(exc))
    raise ValueError('Yahoo: ' + '; '.join(errors))


def at(series, date):
    return next((x for x in series['rows'] if x['date'] == date), None)


def checked_quote(bundle, symbol, date):
    data = bundle['indices'][symbol]
    a, b = at(data['primary'], date), at(data['secondary'], date)
    if not a or not b:
        raise ValueError(f'{symbol} {date} 缺少两来源日线')
    # Index levels are unadjusted; tolerance only permits provider rounding.
    for key in ('open', 'high', 'low', 'close'):
        if abs(a[key] - b[key]) > 0.05:
            raise ValueError(f'{symbol} {date} 两来源{key}冲突: {a[key]} / {b[key]}')
    return dict(a)


def fetch_bundle(completed_date, now):
    result, errors = {}, []
    def one(symbol):
        providers, failures = [], []
        with cf.ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(fn, symbol, completed_date) for fn in (fetch_tencent, fetch_sina)]
            for f in futures:
                try:
                    providers.append(f.result())
                except Exception as exc:
                    failures.append(str(exc))
        if len(providers) < 2:
            try:
                providers.append(fetch_yahoo(symbol, completed_date))
            except Exception as exc:
                failures.append(str(exc))
        if len(providers) < 2:
            raise ValueError(symbol + ': ' + '; '.join(failures))
        providers.sort(key=lambda x: len(x['rows']), reverse=True)
        return symbol, {'name': SYMBOLS[symbol][0], 'primary': providers[0], 'secondary': providers[1], 'fallback_errors': failures}
    with cf.ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(one, s) for s in SYMBOLS]
        for f in futures:
            try:
                symbol, data = f.result()
                result[symbol] = data
            except Exception as exc:
                errors.append(str(exc))
    bundle = {'retrieved_at': now.isoformat(), 'completed_date': completed_date, 'indices': result, 'errors': errors}
    for symbol in result:
        try:
            checked_quote(bundle, symbol, completed_date)
        except Exception as exc:
            errors.append(str(exc))
    if len(result) != len(SYMBOLS):
        errors.append('核心指数不完整')
    return bundle


def features(bundle, symbol):
    rows = bundle['indices'][symbol]['primary']['rows']
    if len(rows) < 360:
        raise ValueError(symbol + ' 历史不足360根')
    last, prior = rows[-1], rows[-2]
    checked_quote(bundle, symbol, last['date'])
    checked_quote(bundle, symbol, prior['date'])
    return {
        'name': SYMBOLS[symbol][0], 'date': last['date'], **{k: last[k] for k in ('open', 'high', 'low', 'close')},
        'prior_close': prior['close'], 'prior_high': prior['high'], 'prior_low': prior['low'],
        'change_pct': (last['close'] / prior['close'] - 1) * 100,
        'five_session_change_pct': (last['close'] / rows[-6]['close'] - 1) * 100,
        'ma': {str(n): statistics.mean(x['close'] for x in rows[-n:]) for n in (5, 10, 20, 60, 250, 360)},
        'bars': len(rows), 'ma_attribution': 'SMA为可复算工程参照，不冒充作者私有软件公式'
    }
