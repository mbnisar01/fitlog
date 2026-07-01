#!/usr/bin/env python3
"""Generate FitLog PNG icons with no third-party dependencies (stdlib only)."""
import struct
import zlib
import os

BG = (37, 99, 235)      # blue
FG = (255, 255, 255)    # white plus

def write_png(path, size, pixels):
    """pixels: bytearray of size*size*3 RGB bytes."""
    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0 (none)
        start = y * size * 3
        raw.extend(pixels[start:start + size * 3])
    idat = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))

def make_icon(size, inset_frac):
    """Solid background with a centered white plus. inset_frac keeps the plus
    inside a safe zone (use a larger inset for maskable icons)."""
    px = bytearray(size * size * 3)
    # arm thickness and extent of the plus
    half_thick = int(size * 0.09)
    margin = int(size * inset_frac)
    lo, hi = margin, size - margin
    cx = size // 2
    for y in range(size):
        for x in range(size):
            in_v = (cx - half_thick <= x <= cx + half_thick) and (lo <= y <= hi)
            in_h = (cx - half_thick <= y <= cx + half_thick) and (lo <= x <= hi)
            r, g, b = FG if (in_v or in_h) else BG
            i = (y * size + x) * 3
            px[i], px[i + 1], px[i + 2] = r, g, b
    return px

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "icons")
    os.makedirs(out, exist_ok=True)
    write_png(os.path.join(out, "icon-192.png"), 192, make_icon(192, 0.22))
    write_png(os.path.join(out, "icon-512.png"), 512, make_icon(512, 0.22))
    write_png(os.path.join(out, "apple-touch-icon-180.png"), 180, make_icon(180, 0.22))
    # maskable: larger inset so the glyph stays within the ~80% safe zone
    write_png(os.path.join(out, "icon-maskable-512.png"), 512, make_icon(512, 0.30))
    print("Icons written to", os.path.normpath(out))

if __name__ == "__main__":
    main()
