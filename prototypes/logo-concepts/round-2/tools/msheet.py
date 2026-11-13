import sys; sys.path.insert(0,'.')
from marks import IDEAS, flat, LIGHT, DARK
from rend import render
from PIL import Image, ImageDraw, ImageFont
font=ImageFont.truetype('fonts/HankenGrotesk%5Bwght%5D.ttf',16)
mode=sys.argv[1] if len(sys.argv)>1 else 'light'
col=LIGHT if mode=='light' else DARK
bg=(255,250,243) if mode=='light' else (13,16,36)
T=170; W=4*T+180; H=T+10
sh=Image.new('RGB',(W, H*len(IDEAS)),bg); d=ImageDraw.Draw(sh)
for r,(id_,name,_,fs) in enumerate(IDEAS):
    d.text((8,r*H+T//2-8),f"{r+1} {name}",fill=(128,128,128),font=font)
    for c,f in enumerate(fs):
        s=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="150" height="150">{flat(f(),col)}</svg>'
        im=render(s,150,bg); sh.paste(im,(180+c*T, r*H+5))
        sm=render(s,28,bg); sh.paste(sm,(180+c*T+150-28, r*H+5+150-28))
sh.save(f'msheet_{mode}.png')
