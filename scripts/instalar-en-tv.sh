#!/bin/sh
# Parte de la instalacion de Aurora que corre EN EL TELEVISOR.
# No se ejecuta a mano: lo llama instalar.sh desde el ordenador.
#
# Genera los archivos parcheados a partir de los del propio televisor y deja
# los scripts de arranque en su sitio. Nunca escribe en las particiones de LG.

set -e
DEST=/var/lib/webosbrew
INITD="$DEST/init.d"
PRELOAD_SRC=/etc/configd/layers/base/com.webos.service.preloadmanager.json
APPLAUNCH_SRC=/usr/lib/qt5/qml/KeyFilters/appLaunch.js
SYSTEMUI_SRC=/usr/lib/qt5/qml/KeyFilters/systemUi.js

di()  { echo "  $*"; }
mal() { echo "  ERROR: $*" >&2; exit 1; }

[ "$(id -u)" = "0" ] || mal "hay que ser root"
[ -d "$DEST" ] || mal "$DEST no existe: ¿esta el televisor rooteado con Homebrew Channel?"
mkdir -p "$INITD"

# ------------------------------------------------------ instalacion previa
# Si Aurora ya estaba instalada, los archivos originales de LG estan tapados
# por nuestros propios parches (mount -o bind). Leerlos daria un parche hecho
# sobre el parche, y en el caso de la precarga es peor: el redireccionamiento
# '> patch' trunca el archivo ANTES de que sed lo lea, y como el original
# apunta al mismo inodo, se queda en cero bytes. Hay que destapar primero.
PRELOAD_DESTINOS="/etc/configd/layers/base/com.webos.service.preloadmanager.json
$(ls /etc/configd/layers/distro/*/com.webos.service.preloadmanager.json 2>/dev/null)"
HABIA=0

despegar() {
    i=0
    while mount | grep -q " $1 " && [ $i -lt 5 ]; do
        umount "$1" 2>/dev/null || break
        HABIA=1; i=$((i+1))
    done
}
for f in $PRELOAD_DESTINOS "$APPLAUNCH_SRC" "$SYSTEMUI_SRC"; do
    [ -e "$f" ] && despegar "$f"
done
[ "$HABIA" = "1" ] && di "instalacion previa destapada para leer los originales de LG"

# Si algo falla a partir de aqui, dejar el televisor como estaba.
reponer() {
    [ "$HABIA" = "1" ] || return 0
    for par in "$DEST/systemUi-patched.js|$SYSTEMUI_SRC" \
               "$DEST/appLaunch-patched.js|$APPLAUNCH_SRC"; do
        p=${par%%|*}; d=${par#*|}
        [ -s "$p" ] && [ -f "$d" ] || continue
        [ "$(wc -l < "$p")" = "$(wc -l < "$d")" ] || continue
        mount | grep -q " $d " || mount -o bind "$p" "$d" 2>/dev/null
    done
    if [ -s "$DEST/preloadmanager-disabled.json" ]; then
        for f in $PRELOAD_DESTINOS; do
            [ -f "$f" ] || continue
            mount | grep -q " $f " || \
                mount -o bind "$DEST/preloadmanager-disabled.json" "$f" 2>/dev/null
        done
    fi
    di "montajes repuestos; entran del todo al reiniciar"
}
trap reponer EXIT

# ---------------------------------------------------------------- precarga
if [ "${SALTAR_RAM:-0}" != "1" ]; then
    [ -f "$PRELOAD_SRC" ] || mal "no existe $PRELOAD_SRC"
    # Siempre a un temporal: ver el comentario de 'despegar' mas arriba.
    sed -e 's/"isEnabled"[[:space:]]*:[[:space:]]*true/"isEnabled" : false/g' \
        "$PRELOAD_SRC" > "$DEST/.preload.tmp"
    [ -s "$DEST/.preload.tmp" ] || mal "la copia de la precarga salio vacia"
    mv "$DEST/.preload.tmp" "$DEST/preloadmanager-disabled.json"
    if grep -q '"maxPreloadApp"' "$DEST/preloadmanager-disabled.json"; then
        sed -i 's/"maxPreloadApp"[[:space:]]*:[[:space:]]*[0-9]*/"maxPreloadApp": 0/' \
            "$DEST/preloadmanager-disabled.json"
    else
        sed -i '1s/^{/{\n    "maxPreloadApp": 0,/' "$DEST/preloadmanager-disabled.json"
    fi
    grep -q '"isEnabled" : true' "$DEST/preloadmanager-disabled.json" \
        && mal "quedan entradas activas en la precarga"
    di "precarga: $(grep -c '"isEnabled" : false' "$DEST/preloadmanager-disabled.json") apps desactivadas"
fi

# ------------------------------------------------- boton HOME -> la barra
[ -f "$SYSTEMUI_SRC" ] || mal "no existe $SYSTEMUI_SRC: ¿esto es webOS 4?"
cp "$SYSTEMUI_SRC" "$DEST/.systemUi.tmp"
[ -s "$DEST/.systemUi.tmp" ] || mal "la copia de systemUi.js salio vacia"
grep -q 'global.goHome();' "$DEST/.systemUi.tmp" \
    || mal "no encuentro 'global.goHome();': firmware inesperado"
sed -i 's|global.goHome();|applicationManager.launch("tv.aurora.bar");|' \
    "$DEST/.systemUi.tmp"
# Tambien al PULSAR, o la barra de LG asoma por debajo. Se sustituye por un
# comentario para no alterar el numero de lineas: 20-teclas aborta si no cuadra.
grep -q 'global.prepareToGoHome();' "$DEST/.systemUi.tmp" \
    || mal "no encuentro 'global.prepareToGoHome();': firmware inesperado"
sed -i 's|global.prepareToGoHome();|/* barra de LG desactivada */;|' \
    "$DEST/.systemUi.tmp"
a=$(wc -l < "$SYSTEMUI_SRC"); b=$(wc -l < "$DEST/.systemUi.tmp")
[ "$a" = "$b" ] || mal "el parche cambio de $a a $b lineas; no se instala"
mv "$DEST/.systemUi.tmp" "$DEST/systemUi-patched.js"
di "boton HOME -> tv.aurora.bar"

# ------------------------------------------- botones Netflix / Amazon
if [ -n "${BOTON_NETFLIX}${BOTON_AMAZON}" ]; then
    [ -f "$APPLAUNCH_SRC" ] || mal "no existe $APPLAUNCH_SRC"
    cp "$APPLAUNCH_SRC" "$DEST/.appLaunch.tmp"
    [ -s "$DEST/.appLaunch.tmp" ] || mal "la copia de appLaunch.js salio vacia"
    for par in "netflix:$BOTON_NETFLIX" "amazon:$BOTON_AMAZON"; do
        orig=${par%%:*}; nuevo=${par#*:}
        [ -n "$nuevo" ] || continue
        grep -q "appId = \"$orig\";" "$DEST/.appLaunch.tmp" \
            || mal "no encuentro 'appId = \"$orig\";'"
        sed -i "s|appId = \"$orig\";|appId = \"$nuevo\";|" "$DEST/.appLaunch.tmp"
        di "boton $orig -> $nuevo"
    done
    a=$(wc -l < "$APPLAUNCH_SRC"); b=$(wc -l < "$DEST/.appLaunch.tmp")
    [ "$a" = "$b" ] || mal "el parche del mando cambio de $a a $b lineas"
    mv "$DEST/.appLaunch.tmp" "$DEST/appLaunch-patched.js"
fi

chmod +x "$INITD"/* 2>/dev/null || true
di "scripts de arranque: $(ls "$INITD" | tr '\n' ' ')"
