"""Run after pnpm build:poki. Requires Python Playwright and a Chromium browser.
Uses a mock SDK in real production-build iframes; does not prove Poki backend ingestion.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
import os
import shutil

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
SDK_URL = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js'
MOCK = '''window.calls=[];
window.PokiSDK={
 init:()=>{calls.push('init');return Promise.resolve();},enableEventTracking:()=>calls.push('tracking'),
 gameLoadingFinished:()=>calls.push('loaded'),gameplayStart:()=>calls.push('start'),gameplayStop:()=>calls.push('stop'),
 measure:()=>{}
};'''
NORMAL_SAVE = dict(version=6, coins=0, groupsCompleted=0, rngState=42,
                   board=[None]*9,
                   customers=[dict(portrait=0, items=[dict(type=0, level=1, done=False)], payment=30, paid=False)],
                   owned=['wall-classic', 'counter-classic', 'nameplate-classic'],
                   equipped=dict(wall='wall-classic', counter='counter-classic', nameplate='nameplate-classic'))


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        if self.path == '/__host':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            self.wfile.write(('''<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="margin:0"><iframe id="game" style="border:0;width:480px;height:860px" src="http://127.0.0.1:%d/"></iframe>''' % getattr(self.server,'game_port',self.server.server_port)).encode())
        else:
            super().do_GET()


def run():
    assert (ROOT/'dist-poki/index.html').exists(), 'Run pnpm build:poki first'
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT/'dist-poki')))
    Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}'
    host_server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT/'dist-poki')))
    host_server.game_port = server.server_port
    Thread(target=host_server.serve_forever, daemon=True).start()
    host = f'http://127.0.0.1:{host_server.server_port}/__host'
    try:
        with sync_playwright() as p:
            options = dict(headless=True, args=['--no-sandbox'])
            executable = os.environ.get('POKI_TEST_CHROMIUM') or shutil.which('chromium')
            if executable:
                options['executable_path'] = executable
            browser = p.chromium.launch(**options)
            context = browser.new_context(viewport=dict(width=480, height=860), has_touch=True, is_mobile=True)
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            # Controlled reproduction: iframe focus is stale and no focus event reaches the game.
            page.add_init_script('''if(location.port===%s){
Object.defineProperty(document,'hasFocus',{value:()=>false});
window.addEventListener('focus',event=>event.stopImmediatePropagation(),true);
localStorage.setItem('merge-serve-v6',%s);
}''' % (json.dumps(str(server.server_port)),json.dumps(json.dumps(NORMAL_SAVE))))
            page.route(SDK_URL, lambda route: route.fulfill(content_type='application/javascript', body=MOCK))
            page.goto(host, wait_until='networkidle')
            frame = page.frame(url=base+'/')
            assert frame, 'Game iframe did not load'
            frame.wait_for_function("!document.getElementById('loading') && window.calls")
            assert frame.evaluate('document.hasFocus()') is False
            assert frame.evaluate('calls') == ['init', 'tracking', 'loaded']
            page.touchscreen.tap(86, 813)
            frame.wait_for_function("calls.includes('start')")
            assert frame.evaluate("JSON.parse(localStorage.getItem('merge-serve-v6')).board[0].type") == 0
            # Duplicate actions/focus events must not duplicate lifecycle notifications.
            page.touchscreen.tap(86, 813)
            assert frame.evaluate("calls.filter(c=>c==='start').length") == 1
            page.touchscreen.tap(107, 39)
            assert frame.evaluate("calls.filter(c=>c==='stop').length") == 1
            frame.evaluate("window.dispatchEvent(new Event('blur'))")
            page.touchscreen.tap(423, 140)
            assert frame.evaluate("calls.filter(c=>c==='start').length") == 2
            frame.evaluate("window.dispatchEvent(new Event('blur'));window.dispatchEvent(new Event('blur'))")
            assert frame.evaluate("calls.filter(c=>c==='stop').length") == 2
            page.touchscreen.tap(240, 813)
            assert frame.evaluate("calls.filter(c=>c==='start').length") == 3
            assert not errors, errors
            context.close()
            print('PASS cross-origin mobile iframe: stale focus, first interaction, menu stop/resume, blur and deduplication')

            context = browser.new_context(viewport=dict(width=480, height=860), has_touch=True)
            page = context.new_page()
            slow = MOCK.replace("return Promise.resolve();", "return new Promise(resolve=>{window.finishInit=resolve;});")
            page.route(SDK_URL, lambda route: route.fulfill(content_type='application/javascript', body=slow))
            page.goto(base, wait_until='networkidle')
            page.wait_for_function("!document.getElementById('loading') && !!window.finishInit")
            page.touchscreen.tap(86, 813)
            assert page.evaluate("JSON.parse(localStorage.getItem('merge-serve-v6')).tutorialStep") == 1
            # Exercise the real production deadline, not a shortened browser-only constant.
            page.wait_for_timeout(8500)
            assert page.evaluate('calls') == ['init']
            page.evaluate("window.dispatchEvent(new Event('blur'));window.finishInit()")
            page.wait_for_function("calls.includes('loaded')")
            assert page.evaluate('calls') == ['init', 'tracking', 'loaded']
            page.touchscreen.tap(157, 488)
            page.wait_for_function("calls.includes('start')")
            assert page.evaluate('calls') == ['init', 'tracking', 'loaded', 'start']
            context.close()
            print('PASS delayed Inspector handshake: playable before SDK ready, late loading, no false background start, subsequent real interaction')
            browser.close()
    finally:
        host_server.shutdown()
        host_server.server_close()
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    run()
