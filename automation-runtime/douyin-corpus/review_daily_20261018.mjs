import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const rules={
 '7697589237429229440':{
  title:'个人经历与表达边界：从独处到网上分享',category:'个人经历与认知',
  points:['作者回顾童年、亲人离世与成年后的困难，讲述自己逐渐形成依靠自己的生活态度。','他自述现实中害怕社交，而在网上输出知识、获得认可；希望粉丝尊重其个人空间。','回顾三百万粉丝的目标，也谈到公开表达带来的评价、谣言和压力，最后表示希望坚持做好自己。','这是作者对个人经历和感受的自述，没有提出可验证的交易规则或心理诊断；部分句子听辨不清，正文保留标记。'],
  replace:[['六千元钱','六亲缘浅'],['三岸就随','[年龄待听辨：三岸就随]'],['世间反则','世间法则'],['最大的束缚','最大的[用词待听辨：束缚]'],['从话读过','[原句待听辨：从话读过]'],['非常非常社会的人','非常非常[性格用词待听辨：社会]的人'],['手机年载响了','[原句待听辨：手机年载响了]'],['但是我在网上成就了我非常孤独','[原句待听辨：但是我在网上成就了我非常孤独]'],['虽然我要坎坷气态','[原句待听辨：虽然我要坎坷气态]'],['我的现任人物中','我的[原句待听辨：现任人物中]'],['最后我大时候的梦想','最后我[时间用语待听辨：大时候]的梦想'],['因为要这样就上回来了','[原句待听辨：因为要这样就上回来了]'],['公开的录音','公开的[用词待听辨：录音]'],['不敢录音','不敢[用词待听辨：录音]'],['但是我是录音','但是我是[用词待听辨：录音]'],['大家事业中','大家视野中'],['屁股跑弹腿','[原句待听辨：屁股跑弹腿]'],['在北京那抹黑里面','[原句待听辨：在北京那抹黑里面]'],['一个工作人员','一个[称谓待听辨：工作人员]'],['你不能立即开始学会','[原句待听辨：你不能立即开始学会]'],['从后到后','[原句待听辨：从后到后]'],['道德只能虑起','道德只能律己'],['不能虑别人','不能律别人']],
 },
 '7697503444638125350':{
  title:'AI金融工具Top10：原图项目与Star统计',category:'AI',image:true,
  points:['图文按作者所列的GitHub Star数量，介绍OpenBB、daily_stock_analysis、financial-services、Vibe-Trading、AI-Trader、ai-berkshire、a-stock-data、OpenAlice、UZI-Skill和serenity-skill。','作者把这些项目分为金融数据接入、市场分析、策略生成回测、多智能体模拟和投资方法论等用途；这些能力介绍未被本库独立测试。','图内统计日期为2026-10-17，排名含平台项目；原图另有“@格林说”署名，作品发布者按抖音作者区域记录为程序员晓刘。','正文保留十个项目、仓库文字与对应数值。原图的仓库拼写和Star统计未独立核验，不将榜单转成安装或投资指令。'],
  replace:[['Al-Trader','AI-Trader'],['AI交易员台','AI交易员擂台'],['YouTubeShorts','YouTube Shorts']],
 },
 '7697307583401107785':{
  title:'VideoHighlighter：自动筛选精彩片段的作者介绍',category:'AI',image:true,
  points:['图中文字介绍名为VideoHighlighter的开源项目，称其可从较长的视频中选出片段并拼接集锦。','作者声称它综合画面、动作、物体、声音和字幕评分，可展示选择理由、时间轴，并按用户规则寻找事件。','文中“完全本地运行”和“基础分析不需要API密钥”属于作者描述，本库未独立验证项目版本、成本或运行条件。','作者认为AI可以承担第一轮筛选，但精彩程度带有主观性，成片仍应由人检查，审美和表达意图依然重要。'],
  replace:[['26-10-1700:43','26-10-17 00:43'],['视频剪\n辑师','视频剪辑师'],['AI自动\n找出','AI自动找出'],['更离谱的\n是','更离谱的是'],['甚至不\n需要','甚至不需要'],['游\n戏录像','游戏录像'],['监控\n录像','监控录像'],['评分时间\n轴','评分时间轴'],['最\n后导出','最后导出'],['视频剪\n辑从','视频剪辑从'],['四小\n时的','四小时的'],['进度\n条','进度条'],['精彩\n程度','精彩程度'],['未来\n真正','未来真正'],['他究\n竟','他究竟']],
 },
 '7697052727687318818':{
  title:'十个AI视频开源工具：从生成到剪辑与字幕',category:'AI',image:true,
  points:['原图列出MoneyPrinterTurbo、OpenCut、OpenMontage、Remotion、HyperFrames、MoneyPrinterV2、Pixelle-Video、video-use、Hypit和pyVideoTrans。','作者把它们分别用于主题生成短视频、剪辑、串联制作流程、代码动画、网页动画渲染、素材处理以及字幕翻译和配音。','原图说明按整个GitHub仓库的总Star排序，不是某个Skill的安装量；数据截至2026-10-07，作品发布于2026-10-16，保留两个日期的区别。','项目能力、适用性、排名和数值均来自原帖，本库没有独立运行或验证，也没有执行图片中的工具使用建议。'],
  replace:[['AI时倾','AI时倾'],['GitHub上最火的10\n个','GitHub上最火的10个'],['YouTubeShorts','YouTube Shorts'],['Skils','Skills']],
 },
};
for(const run_id of ['daily_20261018','favorites_20261018']){
 const batch=JSON.parse(fs.readFileSync(path.join(root,'inbox',run_id+'.json'),'utf8')),reviews=[];
 for(const item of batch.items){
  const rule=rules[item.aweme_id];if(!rule)throw Error('No review rule '+item.aweme_id);
  const result=JSON.parse(fs.readFileSync(path.join(root,'results',`${item.slug}_${item.aweme_id}.json`),'utf8'));
  if(result.transcription_status!=='ok'||!result.transcript)throw Error('No completed source');
  let transcript=result.transcript;for(const [a,b]of rule.replace)transcript=transcript.replaceAll(a,b);
  if(rule.image){
   if((transcript.match(/【图片 \d+】/g)||[]).length!==item.ocr_images)throw Error('Missing image text');
   transcript+='\n\n[来源说明：已导出并目视核对原图，正文为发布说明与图片OCR。项目能力、仓库拼写、排名和数值是原帖所列内容，未独立测试或核验。]';
  }else transcript+='\n\n[转写说明：依据完整真实音频本地转写，轻整理常见同音词；听辨不清的年龄、词语和句子已标注，未逐句人工听校。原页面发布时间精确到分钟。]';
  const ratio=transcript.length/result.transcript.length;if(ratio<.6||ratio>1.8)throw Error('Unexpected edit size');
  reviews.push({slug:item.slug,aweme_id:item.aweme_id,display_title:rule.title,category:rule.category,points:rule.points,transcript,review_notes:rule.image?'依据作品作者区域的明确昵称和完整主页链接核实作者；未使用评论者或推荐作者。通过pageAssets导出全部1张原图、逐图OCR并目视复核，保留原图统计日期和来源说明。':'核实全能的野人作者主页完整sec_uid及页面发布时间。实际下载并检查完整186.085秒媒体，本地转写后逐条整理；保留存疑语句，不使用抖音AI章节摘要代替原文。'});
 }
 fs.writeFileSync(path.join(root,'inbox',`review-${run_id}.json`),JSON.stringify({run_id,reviews},null,2)+'\n');
 console.log(JSON.stringify({run_id,reviews:reviews.length}));
}
