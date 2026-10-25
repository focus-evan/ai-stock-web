import assert from 'node:assert/strict';
import test from 'node:test';
import {extractedTextResult,hasCompletedAudio} from './corpus.mjs';

const audio={download_status:'ok',transcription_status:'ok',transcript:'原始口播文字',media_bytes:4096,media_sha256:'a'.repeat(64),duration_seconds:52};
const item={source_type:'image_ocr',extraction_kind:'video_frames',source_text:'【口播】原始口播文字\n【视频画面字幕OCR】突破后回踩确认',audio_asr_evidence:audio};

test('adding diagram text preserves completed audio and both distinct sources',()=>{
  const result=extractedTextResult(item,{review_status:'pending'});
  assert.equal(result.transcript,item.source_text);
  assert.equal(result.audio_asr_evidence.transcript,audio.transcript);
  assert.equal(result.media_sha256,audio.media_sha256);
  assert.equal(result.duration_seconds,audio.duration_seconds);
  assert.equal(result.download_status,'ok');
  assert.equal(hasCompletedAudio(result),true);
  assert.equal(result.review_status,'pending');
});

test('captions, image-only text and incomplete media cannot become completed speech',()=>{
  const caption=extractedTextResult({source_type:'published_caption',source_text:'公开发布正文'},{});
  assert.equal(hasCompletedAudio(caption),false);
  assert.throws(()=>extractedTextResult({...item,audio_asr_evidence:{...audio,transcription_status:'failed'}},{}),/Completed audio evidence/);
  assert.throws(()=>extractedTextResult({...item,audio_asr_evidence:{...audio,media_sha256:'not-a-hash'}},{}),/Completed audio evidence/);
  assert.throws(()=>extractedTextResult({...item,audio_asr_evidence:{...audio,media_sha256:'z'.repeat(64)}},{}),/Completed audio evidence/);
  assert.throws(()=>extractedTextResult({...item,source_type:'published_caption'},{}),/Completed audio evidence/);
});
