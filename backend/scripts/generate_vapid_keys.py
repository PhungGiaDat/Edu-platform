# One-shot VAPID key generator for Web Push (kid-friendly reminders).
# Run ONCE from backend/:  python -X utf8 scripts/generate_vapid_keys.py
#
# Outputs:
#   - scripts/vapid_private.pem   (keep OFF-repo — add to .gitignore)
#   - stdout: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY env values to paste into
#     Render environment variables (NEVER commit these).
#
# Claims sub must be a mailto: or https: contact URL — we use the PWA origin.
import base64
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid


def main() -> None:
    v = Vapid()
    v.generate_keys()

    # Private key PEM (for pywebpush server-side signing)
    pem = v.private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode()

    # Application Server Key = base64url of the uncompressed P-256 point (65 bytes)
    pub = v.public_key.public_numbers()
    raw = b"\x04" + pub.x.to_bytes(32, "big") + pub.y.to_bytes(32, "big")
    app_server_key = base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    out_path = os.path.join(os.path.dirname(__file__), "vapid_private.pem")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(pem)

    print(f"private PEM saved to: {out_path}  (gitignore it!)")
    print(f"VAPID_PUBLIC_KEY={app_server_key}")
    print(f"VAPID_PRIVATE_KEY=<contents of {out_path}, single PEM block>")
    print("VAPID_CLAIM_SUB=https://learnvocab.pages.dev")


if __name__ == "__main__":
    main()
