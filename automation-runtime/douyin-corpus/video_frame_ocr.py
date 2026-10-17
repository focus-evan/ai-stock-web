"""Extract visible subtitles from already downloaded, browser-observed video media."""
import pathlib, sys, re, json
import av
import cv2
from rapidocr_onnxruntime import RapidOCR

root = pathlib.Path(__file__).parent
slug, aweme_id = sys.argv[1:3]
if not re.fullmatch(r'[a-z0-9-]+', slug) or not re.fullmatch(r'\d{16,22}', aweme_id):
    raise ValueError('Invalid corpus key')
media = root / 'media' / f'{slug}_{aweme_id}.m4a'
folder = root / 'images' / f'{slug}_{aweme_id}_video_frames'
folder.mkdir(parents=True, exist_ok=True)
engine = RapidOCR(intra_op_num_threads=4, inter_op_num_threads=2)
output = []
next_second = 1.0
with av.open(str(media)) as container:
    if not container.streams.video:
        raise ValueError('Observed media has no video stream')
    for frame in container.decode(video=0):
        second = float(frame.time or 0)
        if second < next_second:
            continue
        next_second += 2.0
        pixels = frame.to_ndarray(format='bgr24')
        destination = folder / f'{len(output)+1:02d}_{second:.2f}.png'
        cv2.imwrite(str(destination), pixels)
        rows, elapsed = engine(pixels)
        text = '\n'.join(row[1] for row in rows or [])
        output.append({'seconds': second, 'image': str(destination), 'text': text, 'rows': [{'text': row[1], 'confidence': float(row[2])} for row in rows or []]})
        print(json.dumps({'frame': len(output), 'seconds': round(second, 2), 'chars': len(text)}, ensure_ascii=False), flush=True)
(folder / 'ocr.json').write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'status': 'video_frame_ocr_complete', 'frames': len(output), 'output': str(folder/'ocr.json')}), flush=True)
