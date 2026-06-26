from __future__ import annotations

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys


DIST_DIR = Path(__file__).resolve().parent / "dist"


class SpaHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        candidate = Path(path)
        if candidate.exists() and not candidate.is_dir():
            return super().send_head()

        self.path = "/index.html"
        return super().send_head()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    handler = partial(SpaHandler, directory=str(DIST_DIR))
    server = ThreadingHTTPServer(("127.0.0.1", port), handler)
    print(f"Serving {DIST_DIR} at http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
