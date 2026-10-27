"""Capture real UI with fictional data. Run only against an isolated local backend.

Optional tooling: pip install playwright; playwright install chromium
The script creates a demo account and community post in the supplied LOCAL backend.
"""
import argparse
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--url',default='http://127.0.0.1:5431')
parser.add_argument('--api',default='http://127.0.0.1:4317/api')
parser.add_argument('--cover-only',action='store_true')
parser.add_argument('--existing-demo',action='store_true',help='Reuse only this script\'s fictional account on its isolated backend')
args=parser.parse_args()
for address in [args.url,args.api]:
    if urlparse(address).hostname not in ['127.0.0.1','localhost']:
        raise SystemExit('Screenshots may only create data on isolated localhost services.')
root=Path(__file__).resolve().parents[1]
out=root/'docs/assets'
out.mkdir(parents=True,exist_ok=True)
def capture_cover(page):
    page.set_viewport_size({'width':1280,'height':640})
    page.set_content('<!doctype html><html><body style="margin:0;width:1280px;height:640px;overflow:hidden">'+(out/'hero.svg').read_text(encoding='utf-8')+'</body></html>',wait_until='load')
    page.screenshot(path=str(out/'social-preview.png'))
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':960},device_scale_factor=1)
    page.add_init_script("localStorage.setItem('lesheng-onboarding-complete','1');['plaza','create','connect','universe'].forEach(k=>sessionStorage.setItem('lesheng-section-guide:'+k,'1'));")
    if args.cover_only:
        try:
            capture_cover(page)
        finally:
            browser.close()
        raise SystemExit(0)
    try:
        response=page.request.get(args.api+'/health')
        assert response.ok and response.json()['users']==(2 if args.existing_demo else 1),'Use only the isolated demo backend, never existing account data.'
        page.goto(args.url,wait_until='networkidle')
        page.screenshot(path=str(out/'home.png'))
        registration=page.request.post(args.api+('/auth/login' if args.existing_demo else '/auth/register'),data={'name':'星河来信','email':'showcase@example.invalid','password':'local-only-showcase-pass'})
        assert registration.ok,registration.status
        account=registration.json()
        headers={'Authorization':'Bearer '+account['token']}
        draft={'story':'毕业那天，把朋友的留言折成纸飞机。想去远方，也想把温柔的歌分享给新的朋友。','mbti':'ENFP','goal':'去远方看看','song':'那些年','songId':'song_001','emotion':'期待','variantSeed':'open-source-showcase'}
        profile=page.evaluate("async draft => (await import('/src/character/generation.js')).buildCharacterProfile(draft)",draft)
        saved=page.request.put(args.api+'/characters/me',headers=headers,data={**profile,'name':'星河来信','songId':'song_001'})
        assert saved.ok,saved.status
        character=saved.json()
        post=page.request.post(args.api+'/community',headers=headers,data={'content':'把今天的勇气，装进一首歌里。','emotion':'期待'})
        assert post.ok
        page.evaluate("value=>{localStorage.setItem('lesheng-auth-token',value.account.token);localStorage.setItem('lesheng-auth-user',JSON.stringify(value.account.user));localStorage.setItem('lesheng-auth-character',value.character.id);sessionStorage.setItem('characterDraft',JSON.stringify(value.draft));}",{'account':account,'character':character,'draft':draft})
        page.set_viewport_size({'width':1440,'height':1180})
        for route,name in [('/create/photo','create.png'),('/social/send-song','send-song.png')]:
            page.goto(args.url+route,wait_until='networkidle')
            page.screenshot(path=str(out/name))
        page.goto(args.url+'/plaza',wait_until='networkidle')
        page.locator('.stage-play').click()
        page.wait_for_function("document.querySelector('.plaza-map').classList.contains('stage-active')")
        page.screenshot(path=str(out/'plaza.png'))
        page.set_viewport_size({'width':390,'height':844})
        page.locator('.stage-play').scroll_into_view_if_needed()
        page.screenshot(path=str(out/'mobile-plaza.png'))
        capture_cover(page)
        print('Saved original cover and local-seed UI screenshots without production data.')
    finally:
        browser.close()
