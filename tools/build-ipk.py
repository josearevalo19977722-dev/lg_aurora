#!/usr/bin/env python3
"""Empaqueta src/ como .ipk de webOS.

Se escribe el archivo ar a mano y los tar con tarfile, en vez de usar ar(1)
y tar(1) de macOS: estos ultimos insertan entradas AppleDouble (._archivo) y
cabeceras PaxHeader que el instalador del televisor no entiende.
"""
import io, json, pathlib, sys, tarfile, time

root = pathlib.Path(__file__).resolve().parent.parent
src = root / "src"
VARIANTES = {
    # Tarjeta a pantalla completa: es la que abre el televisor al encender.
    "home": {},
    # Capa superpuesta y transparente: es la que abre el boton HOME.
    # defaultWindowType "overlay" es lo que permite ver lo que hay detras;
    # sin eso la transparencia del CSS no sirve de nada.
    "bar": {
        "id": "tv.aurora.bar",
        "title": "Aurora Barra",
        "transparent": True,
        "defaultWindowType": "overlay",
        "noSplashOnLaunch": True,
        # El sistema pinta bgColor mientras la pagina carga (>1 s): con un
        # color opaco se ve un rectangulo negro a pantalla completa antes de
        # la barra. El panel de Ajustes de LG no declara bgColor, y si
        # usePrerendering, que lo deja listo para aparecer al instante.
        "bgColor": None,
        "usePrerendering": True,
    },
}
variante = sys.argv[1] if len(sys.argv) > 1 else "home"
if variante not in VARIANTES:
    sys.exit(f"variante desconocida: {variante} (usa: {', '.join(VARIANTES)})")

info = json.loads((src / "appinfo.json").read_text())
for k, v in VARIANTES[variante].items():
    if v is None:
        info.pop(k, None)          # None = quitar la clave del manifiesto
    else:
        info[k] = v
app_id, version = info["id"], info["version"]

def tar_gz(añadir):
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz", format=tarfile.USTAR_FORMAT) as t:
        añadir(t)
    return buf.getvalue()

def limpiar(ti):
    ti.uid = ti.gid = 0
    ti.uname = ti.gname = "root"
    ti.mtime = int(time.time())
    return ti

total = sum(f.stat().st_size for f in src.rglob("*") if f.is_file())

def datos(t):
    base = f"usr/palm/applications/{app_id}"
    for f in sorted(src.rglob("*")):
        if f.name.startswith("._") or f.name == ".DS_Store":
            continue
        if f.name == "appinfo.json":
            continue                      # se genera abajo, con la variante
        t.add(f, arcname=f"{base}/{f.relative_to(src)}", filter=limpiar)

    # appinfo.json de esta variante
    blob = (json.dumps(info, indent=2, ensure_ascii=False) + "\n").encode()
    ti = tarfile.TarInfo(f"{base}/appinfo.json")
    ti.size, ti.mode = len(blob), 0o644
    t.addfile(limpiar(ti), io.BytesIO(blob))

    # modo.js: el modo lo fija la variante, no la configuracion del usuario
    modo = "barra" if variante == "bar" else "completo"
    lineas = [f'window.AURORA_MODO = "{modo}";']
    if modo == "barra":
        # Marcar <html> cuanto antes: el CSS del modo barra cuelga de esta
        # clase y debe estar puesta antes del primer pintado.
        lineas.append('document.documentElement.className = "barra";')
    blob = ("\n".join(lineas) + "\n").encode()
    ti = tarfile.TarInfo(f"{base}/modo.js")
    ti.size, ti.mode = len(blob), 0o644
    t.addfile(limpiar(ti), io.BytesIO(blob))
    pkg = json.dumps({"id": app_id, "version": version, "app": app_id},
                     indent=2).encode()
    ti = tarfile.TarInfo(f"usr/palm/packages/{app_id}/packageinfo.json")
    ti.size, ti.mode = len(pkg), 0o644
    t.addfile(limpiar(ti), io.BytesIO(pkg))

def control(t):
    txt = (f"Package: {app_id}\nVersion: {version}\nSection: misc\n"
           f"Priority: optional\nArchitecture: all\nInstalled-Size: {total}\n"
           "Maintainer: N/A <nobody@example.com>\n"
           "Description: This is a webOS application.\n"
           "webOS-Package-Format-Version: 2\nwebOS-Packager-Version: x.y.x\n").encode()
    ti = tarfile.TarInfo("control")
    ti.size, ti.mode = len(txt), 0o644
    t.addfile(limpiar(ti), io.BytesIO(txt))

miembros = [("debian-binary", b"2.0\n"),
            ("control.tar.gz", tar_gz(control)),
            ("data.tar.gz", tar_gz(datos))]

out = root / f"{app_id}_{version}_all.ipk"
with out.open("wb") as fh:
    fh.write(b"!<arch>\n")
    for nombre, blob in miembros:
        fh.write(f"{nombre:<16}{int(time.time()):<12}{0:<6}{0:<6}{'100644':<8}{len(blob):<10}`\n".encode())
        fh.write(blob)
        if len(blob) % 2:
            fh.write(b"\n")
print(f"{out.name} — {out.stat().st_size} bytes")
