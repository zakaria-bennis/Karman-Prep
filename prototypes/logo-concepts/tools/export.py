import sys, json, pickle; sys.path.insert(0,'.')
from concepts import concepts
from svgbuild import build, end_time, timeline_word
from lib import rdp
C=concepts()
pickle.dump(C, open('concepts.pkl','wb'))
out=[]
for i,c in enumerate(C):
    svg=build(c, c['id'].replace('-',''))
    pen=[]
    for L in c['layers']:
        if L['k']=='word':
            for s,(t0,d) in zip(L['w']['strokes'], timeline_word(L['w'],L['t0'],L['dur'])):
                pts=rdp(s['pts'],0.8)
                pen.append([round(t0,3),round(d,3),[[round(x,1),round(y,1)] for x,y in pts]])
    out.append(dict(id=c['id'],n=i+1,name=c['name'],feel=c['feel'],mono=bool(c.get('mono')),vb=c['viewBox'],svg=svg,end=round(end_time(c),2),pen=pen))
    print(c['id'], len(svg)//1024,'KB')
json.dump(out, open('concepts.json','w'), separators=(',',':'))
import os; print('total', os.path.getsize('concepts.json')//1024,'KB')
