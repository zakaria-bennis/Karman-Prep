import sys, html; sys.path.insert(0,'.')
from marks import IDEAS
PICKS={"answer-bubble-b":"my pick","karman-line-a":"second","balloon-a":"most alive"}
L="ABCD"
rows=[]
for n,(id_,name,feel,fs) in enumerate(IDEAS,1):
    cards=[]
    for k,f in enumerate(fs):
        inner=f().replace('id="kl-d"',f'id="kl-d-{k}"').replace('url(#kl-d)',f'url(#kl-d-{k})')
        tag=f"{n}{L[k]}"; vid=f"{id_}-{L[k].lower()}"
        mk=lambda cls: f'<svg viewBox="0 0 100 100" class="{cls}" aria-hidden="true">{inner}</svg>'
        pick=f'<span class="flag">{PICKS[vid]}</span>' if vid in PICKS else ""
        cards.append(f'''<figure class="v" id="{vid}">{pick}
  <div class="art">{mk("big")}</div>
  <figcaption><span class="tag">{tag}</span>
    <span class="lock">{mk("sm")}<span class="wm">Karman Prep</span></span>
    <span class="fav" title="At favicon size">{mk("xs")}</span></figcaption>
</figure>''')
    rows.append(f'''<section class="idea" id="{id_}" aria-labelledby="h-{id_}">
  <div class="ihead"><span class="n">{n}</span><div><h2 id="h-{id_}">{html.escape(name)}</h2><p>{html.escape(feel)}</p></div></div>
  <div class="vs">{"".join(cards)}</div>
</section>''')
page=open('mpage.tpl.html').read().replace('<!--ROWS-->',"\n".join(rows))
open('karman-marks.html','w').write(page)
print(len(page))
