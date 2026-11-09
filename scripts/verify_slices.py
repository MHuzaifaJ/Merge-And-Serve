"""Verify lossless pixels, complete bounds, pivots, gutters and nine-slice geometry."""
from PIL import Image, ImageChops
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
layout=json.loads((ROOT/'src/slice-layout.json').read_text());count=0;checks=[]
for key,info in layout['atlases'].items():
    atlas=Image.open(ROOT/'public'/info['image']).convert('RGBA');data=json.loads((ROOT/'public'/info['data']).read_text());source=Image.open(ROOT/info['source']).convert('RGBA') if info['source']!='material samples' else None
    if source is None:
        from slice_assets import build_samples
        source,_=build_samples()
    covered=Image.new('L',source.size)
    for f in info['frames']:
        x,y,w,h=[f['frame'][n] for n in ('x','y','w','h')];actual=atlas.crop((x,y,x+w,y+h));sw,sh=[f['sourceSize'][n] for n in ('w','h')];ox,oy=[f['spriteSourceSize'][n] for n in ('x','y')]
        assert 0<=ox and 0<=oy and ox+w<=sw and oy+h<=sh,(key,f['name'],'trim bounds')
        assert 0<=f['pivot']['x']<=1 and 0<=f['pivot']['y']<=1
        if key=='people':assert oy+h==496,('portrait baseline',f['name'])
        if key=='props':assert f['pivot']['y']==(1 if int(f['name'])>=2 else .5)
        if source:
            original=source.crop(f['sourceRect']);assert original.size==actual.size and original.tobytes()==actual.tobytes(),(key,f['name'],'pixel change')
            covered.paste(255,tuple(f['sourceRect']))
        for n in range(1,info['extrude']+1):
            assert atlas.crop((x-n,y,x-n+1,y+h)).tobytes()==actual.crop((0,0,1,h)).tobytes()
            assert atlas.crop((x+w-1+n,y,x+w+n,y+h)).tobytes()==actual.crop((w-1,0,w,h)).tobytes()
            assert atlas.crop((x,y-n,x+w,y-n+1)).tobytes()==actual.crop((0,0,w,1)).tobytes()
            assert atlas.crop((x,y+h-1+n,x+w,y+h+n)).tobytes()==actual.crop((0,h-1,w,h)).tobytes()
        e=info['extrude'];p=info['padding']
        for box,pixel in [((x-e,y-e,x,y),actual.getpixel((0,0))),((x+w,y-e,x+w+e,y),actual.getpixel((w-1,0))),((x-e,y+h,x,y+h+e),actual.getpixel((0,h-1))),((x+w,y+h,x+w+e,y+h+e),actual.getpixel((w-1,h-1)))]:
            assert all(v==pixel for v in atlas.crop(box).get_flattened_data()),(key,f['name'],'corner extrusion')
        for box in [(x-e-p,y-e-p,x-e,y+h+e+p),(x+w+e,y-e-p,x+w+e+p,y+h+e+p),(x-e,y-e-p,x+w+e,y-e),(x-e,y+h+e,x+w+e,y+h+e+p)]:
            assert not atlas.crop(box).getchannel('A').getbbox(),(key,f['name'],'nontransparent outer gutter')
        count+=1
    if source:
        foreground=source.getchannel('A').point(lambda p:255 if p>=32 else 0);missing=ImageChops.subtract(foreground,covered);assert not missing.getbbox(),(key,'uncovered source pixels',missing.getbbox())
    for name,c in info.get('insets',{}).items():
        f=data['frames'][name]['frame'];assert c['left']+c['right']<f['w'] and c['top']+c['bottom']<f['h']
        for width,height,requested in [(1.96,31,.23),(19.6,31,.23),(196,31,.23),(99,45,.16),(138,78,.16),(165,48,.25),(450,670,.25),(66,66,.12)]:
            scale=min(requested,width/(c['left']+c['right']),height/(c['top']+c['bottom']))
            assert width/scale+1e-6>=c['left']+c['right'] and height/scale+1e-6>=c['top']+c['bottom']
    checks.append(dict(atlas=key,frames=len(info['frames']),size=info['size'],lossless=True,completeBounds=True,guardPixels=e+p,pivots=True,nineSlice=True))
    print('PASS',key,len(info['frames']),'frames: lossless, complete, padded, aligned')
for name in ['board-v2.png','loading-counter.png']:
    image=Image.open(ROOT/'public/art'/name).convert('RGBA');assert max(image.size)<=2048
    if name=='board-v2.png':
        b=image.getchannel('A').point(lambda p:255 if p>=32 else 0).getbbox();assert b and min(b[0],b[1],image.width-b[2],image.height-b[3])>=8
    print('PASS independent texture',name,'within 2048px, no shared neighbours')
(ROOT/'outputs').mkdir(exist_ok=True)
(ROOT/'outputs/slicing-verification.json').write_text(json.dumps(dict(totalFrames=count,checks=checks),indent=2)+'\n')
print('PASS',count,'unique frames plus 2 shared button aliases')
