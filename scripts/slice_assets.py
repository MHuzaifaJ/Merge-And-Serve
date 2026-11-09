"""Lossless production slicing: original pixels only, alpha bounds, gutters and pivots.
Run with Pillow installed: python scripts/slice_assets.py. No resampling or repainting.
"""
from PIL import Image
from pathlib import Path
from collections import deque
import json, math
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'art-source'; OUT=ROOT/'public/art'
PAD=4; EXTRUDE=4; GUARD=PAD+EXTRUDE; AA=3

def box_for(im, region):
    a=im.getchannel('A').crop(region)
    b=a.point(lambda v:255 if v>=32 else 0).getbbox()
    assert b,region
    x,y,X,Y=b;rx,ry,rX,rY=region
    return (max(rx,rx+x-AA),max(ry,ry+y-AA),min(rX,rx+X+AA),min(rY,ry+Y+AA))

def food_boxes(im,count):
    w,h=im.size;mask=bytearray(im.getchannel('A').point(lambda v:255 if v>=128 else 0).tobytes());objects=[]
    for start in range(w*h):
        if not mask[start]:continue
        mask[start]=0;q=deque([start]);x0=w;y0=h;x1=y1=area=0
        while q:
            p=q.popleft();y,x=divmod(p,w);area+=1;x0=min(x0,x);y0=min(y0,y);x1=max(x1,x);y1=max(y1,y)
            for n in (p-1 if x else -1,p+1 if x+1<w else -1,p-w if y else -1,p+w if y+1<h else -1):
                if n>=0 and mask[n]:mask[n]=0;q.append(n)
        if area>300:objects.append((x0,y0,x1+1,y1+1))
    assert len(objects)==count,len(objects)
    objects.sort(key=lambda b:(b[1]+b[3])/2)
    for i in range(0,count,4):objects[i:i+4]=sorted(objects[i:i+4])
    return [(max(0,x-AA),max(0,y-AA),min(w,X+AA),min(h,Y+AA)) for x,y,X,Y in objects]

def regions(im,cols,rows):
    w,h=im.size
    return [(round(x*w/cols),round(y*h/rows),round((x+1)*w/cols),round((y+1)*h/rows)) for y in range(rows) for x in range(cols)]

def frame_info(name,box,kind):
    x,y,X,Y=box;w=X-x;h=Y-y
    if kind=='food':
        v=math.ceil(max(w,h)/.86);size=(v,v);dest=((v-w)//2,(v-h)//2)
    elif kind=='icon':
        v=math.ceil(max(w,h)/.84);size=(v,v);dest=((v-w)//2,(v-h)//2)
    elif kind=='customer':size=(512,512);dest=((512-w)//2,496-h)
    elif kind=='control':size=(512,512);dest=((512-w)//2,(512-h)//2)
    elif kind=='prop':size=(w+32,h+32);dest=(16,16)
    else:size=(w,h);dest=(0,0)
    pivot={'x':.5,'y':1 if kind=='prop' and int(name)>=2 else .5}
    return dict(name=str(name),box=box,size=size,dest=dest,pivot=pivot,kind=kind)

def make_atlas(key,im,entries,aliases=None,insets=None):
    aliases=aliases or {};insets=insets or {};width=1600 if key=='walls' else 1536 if key in ('panels','counters','nameplates') else 1024
    x=y=rowh=0;placements=[]
    for e in entries:
        bx,by,bX,bY=e['box'];w=bX-bx;h=bY-by;pw=w+2*GUARD;ph=h+2*GUARD
        if x+pw>width:x=0;y+=rowh;rowh=0
        placements.append((x+GUARD,y+GUARD,e));x+=pw;rowh=max(rowh,ph)
    height=math.ceil((y+rowh)/32)*32
    atlas=Image.new('RGBA',(width,height));frames={};audit=[]
    for x,y,e in placements:
        crop=im.crop(e['box']);w,h=crop.size;atlas.paste(crop,(x,y))
        # Duplicate edge texels into an internal guard, with a transparent outer gutter.
        for n in range(1,EXTRUDE+1):
            atlas.paste(crop.crop((0,0,1,h)),(x-n,y));atlas.paste(crop.crop((w-1,0,w,h)),(x+w-1+n,y))
            atlas.paste(crop.crop((0,0,w,1)),(x,y-n));atlas.paste(crop.crop((0,h-1,w,h)),(x,y+h-1+n))
        for dx,dy,sx,sy in [(-EXTRUDE,-EXTRUDE,0,0),(w,-EXTRUDE,w-1,0),(-EXTRUDE,h,0,h-1),(w,h,w-1,h-1)]:
            atlas.paste(crop.getpixel((sx,sy)),(x+dx,y+dy,x+dx+EXTRUDE,y+dy+EXTRUDE))
        sw,sh=e['size'];ox,oy=e['dest'];trimmed=(sw,sh)!=(w,h) or (ox,oy)!=(0,0)
        frame={'frame':dict(x=x,y=y,w=w,h=h),'rotated':False,'trimmed':trimmed,'spriteSourceSize':dict(x=ox,y=oy,w=w,h=h),'sourceSize':dict(w=sw,h=sh),'pivot':e['pivot']}
        frames[e['name']]=frame
        audit.append(dict(name=e['name'],sourceRect=list(e['box']),kind=e['kind'],frame=frame['frame'],sourceSize=frame['sourceSize'],spriteSourceSize=frame['spriteSourceSize'],pivot=frame['pivot']))
        for alias,target in aliases.items():
            if target==e['name']:
                frames[alias]={**frame,'trimmed':False,'spriteSourceSize':dict(x=0,y=0,w=w,h=h),'sourceSize':dict(w=w,h=h),'pivot':dict(x=.5,y=.5)}
    assert width<=2048 and height<=2048,(key,width,height)
    data={'frames':frames,'meta':{'app':'Merge & Serve lossless slicer','version':'1','image':f'sliced-{key}.png','format':'RGBA8888','size':dict(w=width,h=height),'scale':'1','padding':PAD,'extrude':EXTRUDE}}
    atlas.save(OUT/f'sliced-{key}.png',optimize=True)
    (OUT/f'sliced-{key}.json').write_text(json.dumps(data,indent=2)+'\n')
    for name,v in insets.items():
        f=frames[name]['frame'];assert v['left']+v['right']<f['w'] and v['top']+v['bottom']<f['h'],(key,name,f,v)
    return dict(image=f'art/sliced-{key}.png',data=f'art/sliced-{key}.json',size=[width,height],frames=audit,aliases=aliases,insets=insets,padding=PAD,extrude=EXTRUDE)

def build_samples():
    samples=Image.new('RGBA',(2048,256));entries=[]
    for row,(group,file) in enumerate([('wall','walls-v1.png'),('counter','counters-v1.png')]):
        im=Image.open(SRC/file).convert('RGBA')
        for i,(x,y,X,Y) in enumerate(regions(im,2,2)):
            px=x+(X-x-256)//2;py=y+round((Y-y)*(.1 if group=='wall' else .25))
            crop=im.crop((px,py,px+256,py+256));j=row*4+i;samples.paste(crop,(j*256,0))
            entries.append(frame_info(f'{group}-{i}',(j*256,0,(j+1)*256,256),'sample'))
    return samples,entries

def main():
    OUT.mkdir(exist_ok=True,parents=True);layout={'version':1,'atlases':{}}
    specs=[('foods','fast-food-v1.png',4,3,'food'),('people','customers-v1.png',3,2,'customer'),('controls','controls-v2.png',3,2,'control'),('icons','icons-v3.png',3,3,'icon'),('walls','walls-v1.png',2,2,'material'),('counters','counters-v1.png',2,2,'material'),('nameplates','nameplates-v1.png',2,2,'panel'),('binzone','bin-zone-v1.png',1,1,'panel'),('panels','panels-v3.png',3,2,'panel')]
    for key,file,cols,rows,kind in specs:
        im=Image.open(SRC/file).convert('RGBA');boxes=food_boxes(im,cols*rows) if key=='foods' else [box_for(im,r) for r in regions(im,cols,rows)]
        names=['cream','wood','card','bubble','track','fill'] if key=='panels' else list(range(len(boxes)))
        entries=[frame_info(n,b,kind) for n,b in zip(names,boxes)]
        ins={}
        if key=='panels':
            for name,border in [('cream',90),('wood',105),('card',90)]:ins[name]=dict(left=border,right=border,top=border,bottom=border)
            ins['track']=dict(left=70,right=70,top=60,bottom=60);ins['fill']=dict(left=65,right=65,top=56,bottom=56)
        if key=='nameplates':
            for name in ['0','1','2','3']:ins[name]=dict(left=80,right=80,top=50,bottom=50)
        if key=='controls':
            for name in ['green','gold']:ins[name]=dict(left=140,right=140,top=125,bottom=125)
        info=make_atlas(key,im,entries,{'green':'3','gold':'4'} if key=='controls' else None,ins);info['source']=f'art-source/{file}';layout['atlases'][key]=info
        if key=='icons':
            first=entries[0];crop=im.crop(first['box']);v=max(crop.size)+24;coin=Image.new('RGBA',(v,v));coin.paste(crop,((v-crop.width)//2,(v-crop.height)//2));coin.save(OUT/'loading-coin.png',optimize=True)
        print(key,len(entries),'frames',info['size'])
    samples,entries=build_samples()
    info=make_atlas('swatches',samples,entries);info['source']='material samples';layout['atlases']['swatches']=info
    counters=Image.open(SRC/'counters-v1.png').convert('RGBA');counters.crop(regions(counters,2,2)[0]).save(OUT/'loading-counter.png',optimize=True)
    board=Image.open(OUT/'board-v2.png').convert('RGBA');layout['boardFrame']=list(box_for(board,(0,0,*board.size)))
    (ROOT/'src/slice-layout.json').write_text(json.dumps(layout,indent=2)+'\n')

if __name__=='__main__':main()
