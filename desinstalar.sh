#!/bin/sh
# Aurora — desinstalador.
#
#     ./desinstalar.sh <IP-DEL-TELEVISOR>
#
# Quita Aurora y deshace todos los cambios. El televisor vuelve exactamente
# a como estaba: nunca se escribio en las particiones de LG, asi que basta
# con borrar nuestros archivos y desmontar.
#
# Variables opcionales:
#   CLAVE=<ruta>   clave SSH a usar

set -e
IP="$1"
[ -n "$IP" ] || { echo "uso: ./desinstalar.sh <IP-DEL-TELEVISOR>"; exit 1; }

SSH="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
     -o LogLevel=ERROR -o ConnectTimeout=10"
[ -n "${CLAVE:-}" ] && SSH="$SSH -i $CLAVE"

$SSH root@"$IP" 'sh -s' <<'EOF'
D=/var/lib/webosbrew

echo "quitando las apps"
for a in tv.aurora.home tv.aurora.bar; do
    luna-send -n 1 -f luna://com.webos.applicationManager/closeByAppId \
        "{\"id\":\"$a\"}" </dev/null >/dev/null 2>&1
    luna-send -n 1 -f luna://com.webos.appInstallService/dev/remove \
        "{\"id\":\"$a\"}" </dev/null >/dev/null 2>&1
done

echo "quitando la entrada de TV"
luna-send -n 1 -f luna://com.webos.service.eim/deleteDevice \
    '{"id":"MVPD_IP-tv.aurora.home"}' </dev/null >/dev/null 2>&1

echo "quitando los scripts de arranque"
rm -f "$D"/init.d/10-liberar-ram "$D"/init.d/20-teclas \
      "$D"/init.d/30-aurora-input "$D"/init.d/35-aurora-datos \
      "$D"/init.d/45-aurora-arranque

echo "desmontando los parches"
for f in /usr/lib/qt5/qml/KeyFilters/systemUi.js \
         /usr/lib/qt5/qml/KeyFilters/appLaunch.js \
         /etc/configd/layers/base/com.webos.service.preloadmanager.json \
         /etc/configd/layers/distro/*/com.webos.service.preloadmanager.json; do
    [ -e "$f" ] || continue
    i=0
    while mount | grep -q " $f " && [ $i -lt 5 ]; do
        umount "$f" 2>/dev/null || break
        i=$((i+1))
    done
done

echo "borrando los parches y los registros"
rm -f "$D"/systemUi-patched.js "$D"/appLaunch-patched.js \
      "$D"/preloadmanager-disabled.json "$D"/.systemUi.tmp \
      "$D"/.appLaunch.tmp "$D"/.preload.tmp \
      "$D"/teclas.log "$D"/liberar-ram.log "$D"/aurora-input.log \
      "$D"/aurora-datos.log "$D"/aurora-arranque.log

echo
echo "montajes que quedan: $(mount | grep -c 'KeyFilters\|preloadmanager')  (debe ser 0)"
echo "apps que quedan:     $(ls /media/developer/apps/usr/palm/applications/ | tr '\n' ' ')"
EOF

echo
echo "Listo. Reinicia el televisor para volver del todo al estado original:"
echo "  ssh root@$IP reboot"
