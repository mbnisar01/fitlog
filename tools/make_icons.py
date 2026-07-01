#!/usr/bin/env python3
"""Generate FitLog PNG icons with no third-party dependencies (stdlib only)."""
import struct
import zlib
import os

BG = (255, 255, 255)    # white background
FG = (0, 0, 0)          # black dumbbell

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

def make_icon(size):
    """White background with a simple centered black dumbbell: a tall weight at
    each end, a thin collar, and a slim handle across the middle."""
    S = size
    # Start all-white; only the dumbbell's pixels get painted black.
    px = bytearray(bytes(BG) * (S * S))
    cy = S / 2.0

    def band(x0f, x1f, half_h):
        # Absolute pixel bounds of one rectangle, centered vertically.
        return (x0f * S, x1f * S, cy - half_h * S, cy + half_h * S)

    parts = [
        band(0.18, 0.26, 0.17),   # left weight (tall, outer)
        band(0.26, 0.32, 0.09),   # left collar
        band(0.32, 0.68, 0.05),   # handle
        band(0.68, 0.74, 0.09),   # right collar
        band(0.74, 0.82, 0.17),   # right weight (tall, outer)
    ]

    for y in range(S):
        row = [(x0, x1) for (x0, x1, y0, y1) in parts if y0 <= y <= y1]
        if not row:
            continue
        for x in range(S):
            if any(x0 <= x <= x1 for (x0, x1) in row):
                i = (y * S + x) * 3
                px[i], px[i + 1], px[i + 2] = FG
    return px

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "..", "icons")
    os.makedirs(out, exist_ok=True)
    write_png(os.path.join(out, "icon-192.png"), 192, make_icon(192))
    write_png(os.path.join(out, "icon-512.png"), 512, make_icon(512))
    write_png(os.path.join(out, "apple-touch-icon-180.png"), 180, make_icon(180))
    # maskable: same art; the dumbbell already sits within the ~80% safe zone
    write_png(os.path.join(out, "icon-maskable-512.png"), 512, make_icon(512))
    print("Icons written to", os.path.normpath(out))

if __name__ == "__main__":
    main()
