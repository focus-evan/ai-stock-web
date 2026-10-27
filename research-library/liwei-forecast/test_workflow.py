"""Synthetic fixtures only; never publish these samples as historical performance."""
import copy
import datetime as dt
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import ledger
import market
import workflow
import publish
import render

HERE=Path(__file__).resolve().parent
CONTRACT=ledger.read(HERE/'contract.json')
RUBRIC=ledger.read(HERE/'rubric.json')
CAL=ledger.Calendar(ledger.read(HERE/'calendar.json'))
NOW=dt.datetime(2026,10,27,19,50,tzinfo=market.TZ)
REVIEW=dt.datetime(2026,10,28,15,50,tzinfo=market.TZ)

def fixture():
    rows=[];day=NOW.date()
    while len(rows)<365:
        if day.weekday()<5:rows.append({'date':day.isoformat(),'open':1000.,'high':1005.,'low':995.,'close':1000.})
        day-=dt.timedelta(days=1)
    rows.reverse()
    bundle={'retrieved_at':NOW.isoformat(),'completed_date':'2026-10-27','errors':[],'indices':{}}
    for s in CONTRACT['symbols']:
        bundle['indices'][s]={'primary':{'provider':'fixture-a','url':'https://example.invalid/a','payload_sha256':'a','rows':copy.deepcopy(rows)},'secondary':{'provider':'fixture-b','url':'https://example.invalid/b','payload_sha256':'b','rows':copy.deepcopy(rows)}}
    context={'prepared_at':NOW.isoformat(),'completed_date':'2026-10-27','contract_sha256':ledger.sha(CONTRACT),'rubric_sha256':ledger.sha(RUBRIC),'market':bundle,'errors':[],'features':{s:market.features(bundle,s) for s in CONTRACT['symbols']},'code_identity':{'git_revision':'test-only'}}
    draft={'target_date':'2026-10-28','context_sha256':ledger.sha(context),'headline':'测试预判，仅用于检验账本，不是真实市场判断','predictions':{s:{'direction':'up','confidence':'low','reason':'测试依据，仅用于检验冻结和核验流程。','invalidation':'测试反证，不改变原判断在评分中的归属。','observed_facts':['人工构造的固定价格测试数据'],'rule_ids':['R03']} for s in CONTRACT['symbols']}}
    return context,draft

def outcome_market(context,sh=1004.,sz=1004.):
    bundle=copy.deepcopy(context['market']);bundle['retrieved_at']=REVIEW.isoformat();bundle['completed_date']='2026-10-28'
    for s,close in zip(CONTRACT['symbols'],[sh,sz]):
        for series in ('primary','secondary'):
            bundle['indices'][s][series]['rows'].append({'date':'2026-10-28','open':1000.,'high':max(1005.,close),'low':min(995.,close),'close':close})
    return bundle

def receipt(f,stamp='2026-10-27T19:55:00+08:00'):
    return {'forecast_sha256':ledger.sha(f),'published_at':stamp,'release':'synthetic-test'}

class Checks(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='liwei-ledger-test-')
        self.root=Path(self.temp.name).resolve()
        self.context,self.draft=fixture()
    def tearDown(self):self.temp.cleanup()
    def freeze(self):return ledger.freeze(self.root,self.draft,self.context,CONTRACT,RUBRIC,CAL,NOW)

    def test_holiday_and_weekend_calendar(self):
        self.assertEqual(CAL.next('2026-09-30'),'2026-10-08')
        self.assertEqual(CAL.next('2026-10-09'),'2026-10-12')
        self.assertEqual(CAL.last_completed(dt.datetime(2026,10,27,11,tzinfo=market.TZ)),'2026-10-26')
        with self.assertRaises(ValueError):CAL.next('2026-12-31')
    def test_threshold_boundaries(self):
        self.assertEqual(ledger.direction(.3,.3),'flat')
        self.assertEqual(ledger.direction(-.3,.3),'flat')
        self.assertEqual(ledger.direction(.30001,.3),'up')
        self.assertEqual(ledger.direction(-.30001,.3),'down')
    def test_snapshot_is_immutable(self):
        f=self.freeze();before=(self.root/'forecasts/2026-10-28.json').read_bytes()
        self.draft['predictions']['000001.SS']['direction']='down'
        with self.assertRaises(ValueError):self.freeze()
        self.assertEqual(before,(self.root/'forecasts/2026-10-28.json').read_bytes())
        self.assertEqual(ledger.sha(ledger.read(self.root/'inputs/2026-10-28.json')),f['context_sha256'])
    def test_cannot_freeze_before_close(self):
        with self.assertRaises(ValueError):ledger.freeze(self.root,self.draft,self.context,CONTRACT,RUBRIC,CAL,NOW.replace(hour=14))
    def test_cannot_backdate_target(self):
        self.draft['target_date']='2026-10-27'
        with self.assertRaises(ValueError):self.freeze()
    def test_reject_future_or_stale_inputs(self):
        for stamp in ('2026-10-27T20:00:00+08:00','2026-10-27T16:00:00+08:00'):
            c=copy.deepcopy(self.context);c['prepared_at']=stamp
            d=copy.deepcopy(self.draft);d['context_sha256']=ledger.sha(c)
            with self.assertRaises(ValueError):ledger.freeze(self.root,d,c,CONTRACT,RUBRIC,CAL,NOW)
    def test_reject_future_bar_and_feature_tampering(self):
        self.context['market']['indices']['000001.SS']['primary']['rows'].append({'date':'2026-10-28','open':1000.,'high':1005.,'low':995.,'close':1000.})
        self.draft['context_sha256']=ledger.sha(self.context)
        with self.assertRaises(ValueError):self.freeze()
        self.context,self.draft=fixture();self.context['features']['000001.SS']['change_pct']=9.
        self.draft['context_sha256']=ledger.sha(self.context)
        with self.assertRaises(ValueError):self.freeze()
    def test_unknown_rules_or_direction_rejected(self):
        self.draft['predictions']['000001.SS']['rule_ids']=['made-up']
        with self.assertRaises(ValueError):self.freeze()
        self.context,self.draft=fixture();self.draft['predictions']['000001.SS']['direction']='probably_up'
        with self.assertRaises(ValueError):self.freeze()
    def test_missing_data_blocks_freeze(self):
        self.context['errors']=['两个来源冲突'];self.draft['context_sha256']=ledger.sha(self.context)
        with self.assertRaises(ValueError):self.freeze()
    def test_prediction_contract_changes_need_new_version(self):
        ledger.write(self.root/'forecasts/2026-10-26.json',{'contract':{'version':CONTRACT['version']},'contract_sha256':'different'})
        with self.assertRaises(ValueError):self.freeze()
    def test_no_intraday_scoring(self):
        f=self.freeze()
        with self.assertRaises(ValueError):ledger.evaluate(f,outcome_market(self.context),receipt(f),CAL,REVIEW.replace(hour=14))
    def test_conflicting_or_missing_outcomes_are_not_losses(self):
        f=self.freeze();m=outcome_market(self.context)
        m['indices']['000001.SS']['secondary']['rows'][-1]['close']+=.1
        with self.assertRaises(ValueError):ledger.evaluate(f,m,receipt(f),CAL,REVIEW)
        m=outcome_market(self.context);m['indices']['399001.SZ']['secondary']['rows'].pop()
        with self.assertRaises(ValueError):ledger.evaluate(f,m,receipt(f),CAL,REVIEW)
    def test_late_publication_and_missing_receipt_not_scored(self):
        f=self.freeze()
        for r in (None,receipt(f,'2026-10-28T09:15:00+08:00')):
            out=ledger.evaluate(f,outcome_market(self.context),r,CAL,REVIEW)
            self.assertTrue(out['joint_correct']);self.assertFalse(out['eligible'])
    def test_joint_accuracy_is_one_day_not_two_correlated_samples(self):
        f=self.freeze();r=receipt(f);o=ledger.evaluate(f,outcome_market(self.context,1004,999),r,CAL,REVIEW)
        stats=ledger.summarize([f],{f['target_date']:o},{f['target_date']:r},CONTRACT,CAL,REVIEW)
        self.assertEqual(stats['count'],1);self.assertEqual(stats['correct'],0)
        self.assertEqual(stats['per_index']['000001.SS']['accuracy'],1)
        self.assertEqual(stats['per_index']['399001.SZ']['accuracy'],0)
        self.assertEqual(stats['baseline_correct']['always_up_correct'],0)
        self.assertEqual(stats['coverage'],1)
    def test_abstention_affects_coverage_not_accuracy(self):
        self.draft['predictions']['399001.SZ']['direction']='abstain'
        f=self.freeze();r=receipt(f);o=ledger.evaluate(f,outcome_market(self.context),r,CAL,REVIEW)
        stats=ledger.summarize([f],{f['target_date']:o},{f['target_date']:r},CONTRACT,CAL,REVIEW)
        self.assertEqual(stats['count'],0);self.assertIsNone(stats['accuracy'])
        self.assertEqual(stats['abstention_days'],1);self.assertEqual(stats['coverage'],0)
        self.assertEqual(stats['per_index']['000001.SS']['count'],1)
    def test_empty_statistics_do_not_claim_zero_percent(self):
        s=ledger.summarize([],{}, {},CONTRACT,CAL,NOW)
        self.assertIsNone(s['accuracy']);self.assertIsNone(s['coverage']);self.assertEqual(s['count'],0)
    def test_repeat_review_does_not_refetch_or_rewrite(self):
        f=self.freeze();ledger.immutable(self.root/'receipts/2026-10-28.json',receipt(f))
        with patch.object(workflow,'fetch_bundle',return_value=outcome_market(self.context)) as fetch:
            self.assertEqual(workflow.review(self.root,REVIEW)['reviewed'],['2026-10-28'])
            raw=(self.root/'evaluations/2026-10-28.json').read_bytes()
            self.assertEqual(workflow.review(self.root,REVIEW+dt.timedelta(hours=1))['status'],'no_due_forecasts')
            self.assertEqual(fetch.call_count,1)
            self.assertEqual(raw,(self.root/'evaluations/2026-10-28.json').read_bytes())
    def test_orphan_review_rejected(self):
        f=self.freeze();o=ledger.evaluate(f,outcome_market(self.context),receipt(f),CAL,REVIEW)
        with self.assertRaises(ValueError):ledger.summarize([],{'2026-10-28':o},{},CONTRACT,CAL,REVIEW)
    def test_public_navigation_preserves_other_topics(self):
        page='<main><a href="another/index.html">其他专题</a><a class="card" href="liwei-personal-model/index.html">旧报告</a></main>'
        updated=publish.portal_navigation(page)
        self.assertIn('<a href="another/index.html">其他专题</a>',updated)
        self.assertEqual(updated,publish.portal_navigation(updated))
        self.assertIn('每日预判与验证',updated)
    def test_incomplete_current_day_is_excluded_before_price_parsing(self):
        rows=[{'date':'2026-10-26','open':1000,'close':1001,'high':1002,'low':999},{'date':'2026-10-27','open':None,'close':None,'high':None,'low':None}]
        result=market.normalize(rows,'2026-10-26')
        self.assertEqual(len(result),1)
    def test_realized_dashboard_renders_saved_judgment_and_escapes_text(self):
        self.draft['headline']='测试文本<script>window.injected=true</script>'
        f=self.freeze();r=receipt(f);o=ledger.evaluate(f,outcome_market(self.context,1004,999),r,CAL,REVIEW)
        stats=ledger.summarize([f],{f['target_date']:o},{f['target_date']:r},CONTRACT,CAL,REVIEW)
        data={'contract':CONTRACT,'stats':stats,'status':{},'history':[{'forecast':f,'evaluation':o,'publication':r}],'latest_features':self.context['features'],'generated_at':REVIEW.isoformat()}
        page=render.render_page(data,CAL,REVIEW)
        self.assertIn('0 天正确 / 1 天可评分',page)
        self.assertIn('1000.00',page)
        self.assertIn('未全部判断正确',page)
        self.assertNotIn('<script>window.injected=true</script>',page)
        self.assertIn('&lt;script&gt;',page)

if __name__=='__main__':unittest.main()
