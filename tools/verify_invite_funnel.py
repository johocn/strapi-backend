# -*- coding: utf-8 -*-
"""TAdmin 邀请漏斗页真机验证：登录 → 控制台菜单 → 漏斗页数据截图（390x844 dpr=2）。"""
import sys
from playwright.sync_api import sync_playwright

BASE = "https://h.joho.cn"
USER, PWD = "zhao", "a963963"
OUT = r"d:\zhao\strapi-backend\docs\shots"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            user_agent=("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
                        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"),
        )
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        # 1. 登录
        page.goto(BASE, wait_until="domcontentloaded")
        page.wait_for_timeout(3000)
        print("[1] url:", page.url[:80])
        inputs = page.locator("input:visible")
        n = inputs.count()
        print("[1] visible inputs:", n)
        if n >= 2:
            inputs.nth(0).fill(USER)
            inputs.nth(1).fill(PWD)
        else:
            # 未跳登录页则手动导航
            page.goto(f"{BASE}/#/pages/login/index", wait_until="domcontentloaded")
            page.wait_for_timeout(2500)
            inputs = page.locator("input:visible")
            inputs.nth(0).fill(USER)
            inputs.nth(1).fill(PWD)
        clicked = False
        for sel in ["button:has-text('登录')", "text=登录", ".login-btn", "button:has-text('登 录')"]:
            try:
                page.locator(sel).first.click(timeout=2000)
                clicked = True
                break
            except Exception:
                continue
        if not clicked:
            page.keyboard.press("Enter")
        page.wait_for_timeout(3500)
        print("[2] after login:", page.url[:80])
        page.screenshot(path=f"{OUT}/01-login-dashboard.png")

        # 2. 进入邀请漏斗
        page.goto(f"{BASE}/#/pages/sso/invite-funnel/list", wait_until="domcontentloaded")
        page.wait_for_timeout(4000)
        print("[3] funnel url:", page.url[:90])
        page.screenshot(path=f"{OUT}/02-invite-funnel.png")
        body = page.inner_text("body")[:500].replace("\n", " | ")
        print("[4] page text:", body)
        print("[5] page errors:", errors or "none")
        browser.close()


if __name__ == "__main__":
    sys.exit(main())
