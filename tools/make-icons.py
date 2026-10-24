#!/usr/bin/env python3
"""Genera icon.png y largeIcon.png sin dependencias externas."""
import math, pathlib, struct, sys, zlib

def png(w, h, rows):
    raw = b"".join(b"\x00" + r for r in rows)
    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9))
            + chunk(b"IEND", b""))

def icono(size):
    cx = cy = size / 2.0
    r_out, r_in = size * 0.33, size * 0.22
    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            # fondo oscuro con resplandor rojo arriba a la izquierda
            d = math.hypot(x - size * 0.22, y - size * 0.20) / (size * 0.85)
            g = max(0.0, 1.0 - d) ** 2
            r_, g_, b_ = 13 + 150 * g, 6 + 20 * g, 9 + 30 * g
            # anillo blanco centrado
            dist = math.hypot(x - cx, y - cy)
            if r_in <= dist <= r_out:
                edge = min(dist - r_in, r_out - dist)
                a = min(1.0, edge / 2.0)
                r_ = r_ * (1 - a) + 255 * a
                g_ = g_ * (1 - a) + 255 * a
                b_ = b_ * (1 - a) + 255 * a
            row += bytes((int(r_), int(g_), int(b_), 255))
        rows.append(bytes(row))
    return png(size, size, rows)

out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
(out / "icon.png").write_bytes(icono(80))
(out / "largeIcon.png").write_bytes(icono(130))
print("icon.png (80x80) y largeIcon.png (130x130) generados en", out)
