#!/usr/bin/env python3
"""Agent Foreman — macOS menu bar app."""
import os
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

try:
    import rumps
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "rumps", "-q"], check=True)
    import rumps

# Path to the server script (bundled alongside this file)
BASE_DIR = Path(__file__).resolve().parent
SERVER_PY = BASE_DIR / "monitor_server.py"
CONFIG_JSON = BASE_DIR / "config.json"
CONFIG_EXAMPLE = BASE_DIR / "config.example.json"
DEFAULT_PORT = 8787
DASHBOARD_URL = f"http://127.0.0.1:{DEFAULT_PORT}"


class ForemanApp(rumps.App):
    def __init__(self):
        super().__init__("🐮", quit_button=None)
        self._server_proc = None
        self._lock = threading.Lock()

        # Menu items
        self.title_item = rumps.MenuItem("Agent Foreman", callback=None)
        self.title_item.set_callback(None)
        self.status_item = rumps.MenuItem("状态: 未启动", callback=None)
        self.open_item = rumps.MenuItem("打开面板", callback=self.open_dashboard)
        self.toggle_item = rumps.MenuItem("启动服务器", callback=self.toggle_server)
        self.port_item = rumps.MenuItem(f"端口: {DEFAULT_PORT}", callback=None)
        self.quit_item = rumps.MenuItem("退出", callback=self.quit_app)

        self.menu = [
            self.title_item,
            None,
            self.status_item,
            self.open_item,
            None,
            self.port_item,
            None,
            self.toggle_item,
            None,
            self.quit_item,
        ]

        # Auto-start server on launch
        self._ensure_config()
        self._start_server()
        # Background status checker
        threading.Thread(target=self._status_loop, daemon=True).start()
    def _ensure_config(self):
        """Copy config.example.json to config.json if not exists."""
        if not CONFIG_JSON.exists() and CONFIG_EXAMPLE.exists():
            import shutil
            shutil.copy(CONFIG_EXAMPLE, CONFIG_JSON)

    def _is_running(self):
        with self._lock:
            return self._server_proc is not None and self._server_proc.poll() is None

    def _start_server(self):
        if self._is_running():
            return
        password = self._get_password()
        if password is None:
            return
        env = os.environ.copy()
        cmd = [
            sys.executable, str(SERVER_PY),
            "--host", "127.0.0.1",
            "--port", str(DEFAULT_PORT),
            "--config", str(CONFIG_JSON),
        ]
        # Pass password via stdin
        with self._lock:
            self._server_proc = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env=env,
            )
            try:
                self._server_proc.stdin.write((password + "\n").encode())
                self._server_proc.stdin.flush()
                self._server_proc.stdin.close()
            except Exception:
                pass

    def _stop_server(self):
        with self._lock:
            if self._server_proc and self._server_proc.poll() is None:
                self._server_proc.terminate()
                try:
                    self._server_proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self._server_proc.kill()
                self._server_proc = None

    def _get_password(self):
        """Get master password from Keychain or prompt user."""
        # Try Keychain first
        try:
            result = subprocess.run(
                ["security", "find-generic-password", "-s", "AgentForeman", "-w"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception:
            pass
        # Prompt user
        response = rumps.Window(
            message="输入 Agent Foreman 的 master password：\n(首次输入后会保存到 Keychain)",
            title="Agent Foreman",
            default_text="",
            ok="确认",
            cancel="取消",
            secure=True,
        ).run()
        if response.clicked and response.text:
            password = response.text.strip()
            # Save to Keychain
            try:
                subprocess.run(
                    ["security", "add-generic-password", "-s", "AgentForeman",
                     "-a", os.environ.get("USER", "user"), "-w", password, "-U"],
                    capture_output=True, timeout=5
                )
            except Exception:
                pass
            return password
        return None

    def _status_loop(self):
        """Update menu status every 2 seconds."""
        while True:
            running = self._is_running()
            if running:
                self.status_item.title = "状态: 运行中 ●"
                self.toggle_item.title = "停止服务器"
                self.title = "🐮"
            else:
                self.status_item.title = "状态: 未启动 ○"
                self.toggle_item.title = "启动服务器"
                self.title = "🐮"
            time.sleep(2)

    @rumps.clicked("打开面板")
    def open_dashboard(self, _):
        webbrowser.open(DASHBOARD_URL)

    def toggle_server(self, sender):
        if self._is_running():
            self._stop_server()
        else:
            self._start_server()
            time.sleep(1)
            if self._is_running():
                webbrowser.open(DASHBOARD_URL)

    def quit_app(self, _):
        self._stop_server()
        rumps.quit_application()


if __name__ == "__main__":
    ForemanApp().run()
