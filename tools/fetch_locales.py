import subprocess,re,html,json,os
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
apps=["com.secondact.pocketarcade","com.purplusnow.adrevenuecontrol","com.purplusnow.facelapse","com.koreanblog.fxwebview","com.purplusnow.private_camera","com.koreanblog.btcreport","com.purplusnow.secondactlife"]
# site locale -> (play hl, gl)
locales={"en":("en","US"),"ko":("ko","KR"),"ja":("ja","JP"),"zh":("zh-TW","TW"),"es":("es","ES"),
"pt":("pt-BR","BR"),"fr":("fr","FR"),"de":("de","DE"),"it":("it","IT"),"ru":("ru","RU"),
"id":("id","ID"),"vi":("vi","VN"),"th":("th","TH"),"hi":("hi","IN"),"ar":("ar","EG"),"tr":("tr","TR")}
def fetch(pkg,hl,gl):
    url=f"https://play.google.com/store/apps/details?id={pkg}&hl={hl}&gl={gl}"
    r=subprocess.run(["curl","-sL","-A",UA,url],capture_output=True,text=True)
    return r.stdout
def extract(t):
    name=""
    m=re.search(r'<meta property="og:title" content="(.*?)(?: - .*?)?"',t)
    if m: name=html.unescape(m.group(1))
    d=""
    m=re.search(r'data-g-id="description"[^>]*>(.*?)</div>',t,re.S)
    if m:
        d=re.sub(r'<br\s*/?>','\n',m.group(1)); d=re.sub(r'<[^>]+>','',d); d=html.unescape(d).strip()
    # short description: itemprop or meta
    sd=""
    m=re.search(r'<meta name="description" content="(.*?)"',t)
    if m: sd=html.unescape(m.group(1))
    return name,sd,d
data={}
for pkg in apps:
    data[pkg]={}
    for loc,(hl,gl) in locales.items():
        t=fetch(pkg,hl,gl)
        name,sd,d=extract(t)
        data[pkg][loc]={"name":name,"short":sd,"desc":d}
        print(f"{pkg} {loc}: name='{name[:30]}' desc={len(d)}",flush=True)
json.dump(data,open("all_locales.json","w"),ensure_ascii=False,indent=1)
print("SAVED all_locales.json")
