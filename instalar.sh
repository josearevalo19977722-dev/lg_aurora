#!/bin/sh
# Aurora — instalador de un comando.
#
#     ./instalar.sh <IP-DEL-TELEVISOR>
#
# Se ejecuta en TU ORDENADOR. Copia los paquetes y los scripts al televisor
# por SSH, genera alli los parches a partir de los archivos del propio
# televisor, y lo deja todo listo. Nunca escribe en las particiones de LG.
#
# Variables opcionales:
#   BOTON_NETFLIX=<appId>   el boton Netflix del mando abre esa app
#   BOTON_AMAZON=<appId>    el boton Amazon del mando abre esa app
#   SALTAR_RAM=1            no tocar la precarga de apps
#   SIN_REINICIO=1          no ofrecer el reinicio al final
#   CLAVE=<ruta>            clave SSH a usar

set -e
IP="$1"
CLAVE="${CLAVE:-}"
AQUI=$(cd "$(dirname "$0")" && pwd)

rojo()  { printf '\033[31m%s\033[0m\n' "$*"; }
verde() { printf '\033[32m%s\033[0m\n' "$*"; }
paso()  { printf '\n\033[1m%s\033[0m\n' "$*"; }

[ -n "$IP" ] || { echo "uso: ./instalar.sh <IP-DEL-TELEVISOR>"; exit 1; }

SSH="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
     -o LogLevel=ERROR -o ConnectTimeout=10"
SCP="scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
     -o LogLevel=ERROR -o ConnectTimeout=10"
[ -n "$CLAVE" ] && { SSH="$SSH -i $CLAVE"; SCP="$SCP -i $CLAVE"; }

# ------------------------------------------------------- 1. comprobaciones
paso "1/6  Comprobaciones"
command -v ssh >/dev/null || { rojo "  falta ssh"; exit 1; }

IPKS=$(ls "$AQUI"/tv.aurora.home_*.ipk "$AQUI"/tv.aurora.bar_*.ipk 2>/dev/null | wc -l)
if [ "$IPKS" -lt 2 ]; then
    if command -v python3 >/dev/null; then
        echo "  no encuentro los .ipk; compilandolos"
        python3 "$AQUI/tools/build-ipk.py" home >/dev/null
        python3 "$AQUI/tools/build-ipk.py" bar  >/dev/null
    else
        rojo "  faltan los .ipk y no hay python3 para compilarlos"; exit 1
    fi
fi
echo "  paquetes listos"

$SSH root@"$IP" true 2>/dev/null || {
    rojo "  no puedo conectar por SSH a $IP"
    echo "  activa SSH Server en Homebrew Channel y reinicia el televisor."
    echo "  si la IP cambio, busca el televisor por su MAC:"
    echo "    arp -a | grep -i a8:23:fe"
    exit 1
}
echo "  conexion SSH correcta"

$SSH root@"$IP" '[ -d /var/lib/webosbrew ]' 2>/dev/null || {
    rojo "  /var/lib/webosbrew no existe: el televisor no esta rooteado"
    echo "  mira https://cani.rootmy.tv con tu modelo y firmware."
    exit 1
}
echo "  televisor rooteado con Homebrew Channel"

$SSH root@"$IP" '[ -f /usr/lib/qt5/qml/KeyFilters/systemUi.js ]' 2>/dev/null || {
    rojo "  no encuentro los filtros de teclas: esto no parece webOS 4"
    exit 1
}
echo "  webOS 4 confirmado"

# ------------------------------------------------------------ 2. paquetes
paso "2/6  Instalando Aurora"
for v in home bar; do
    ipk=$(ls "$AQUI"/tv.aurora.${v}_*.ipk 2>/dev/null | head -1)
    [ -n "$ipk" ] || { rojo "  no encuentro el paquete de la variante $v"; exit 1; }
    $SCP "$ipk" root@"$IP":/tmp/aurora-$v.ipk >/dev/null
done
$SSH root@"$IP" 'for a in tv.aurora.bar tv.aurora.home; do
      luna-send -n 1 -f luna://com.webos.applicationManager/closeByAppId \
        "{\"id\":\"$a\"}" </dev/null >/dev/null 2>&1
    done
    sleep 3
    for v in home bar; do
      luna-send -n 5 -f luna://com.webos.appInstallService/dev/install \
        "{\"id\":\"com.ares.defaultName\",\"ipkUrl\":\"/tmp/aurora-$v.ipk\",\"subscribe\":true}" \
        </dev/null >/dev/null 2>&1
      sleep 5
    done
    rm -f /tmp/aurora-home.ipk /tmp/aurora-bar.ipk
    ls /media/developer/apps/usr/palm/applications/ | grep -c "^tv.aurora" ' \
  | sed 's/^/  variantes instaladas: /'

# ------------------------------------------------------------- 3. scripts
paso "3/6  Scripts de arranque"
for f in "$AQUI"/scripts/*; do
    n=$(basename "$f")
    case "$n" in instalar-en-tv.sh) continue ;; esac
    $SCP "$f" root@"$IP":/var/lib/webosbrew/init.d/"$n" >/dev/null
    echo "  $n"
done
$SCP "$AQUI/scripts/instalar-en-tv.sh" root@"$IP":/tmp/instalar-en-tv.sh >/dev/null

# ------------------------------------------------------------- 4. parches
paso "4/6  Generando los parches en el televisor"
$SSH root@"$IP" "SALTAR_RAM='${SALTAR_RAM:-0}' BOTON_NETFLIX='${BOTON_NETFLIX:-}' \
                 BOTON_AMAZON='${BOTON_AMAZON:-}' sh /tmp/instalar-en-tv.sh"

# --------------------------------------------------------------- 5. datos
paso "5/6  Precalculando datos, iconos e ilustraciones"
echo "  la primera vez copia unos 30 MB de arte: puede tardar"
$SSH root@"$IP" 'sh /var/lib/webosbrew/init.d/35-aurora-datos
    tail -3 /var/lib/webosbrew/aurora-datos.log' | sed 's/^/  /'

# ----------------------------------------------------------- 6. resultado
paso "6/6  Comprobacion"
$SSH root@"$IP" '
    echo "  apps:      $(ls /media/developer/apps/usr/palm/applications/ | tr "\n" " ")"
    echo "  arranque:  $(ls /var/lib/webosbrew/init.d/ | tr "\n" " ")"
    echo "  datos.js:  $(wc -c < /media/developer/apps/usr/palm/applications/tv.aurora.home/datos.js 2>/dev/null) bytes"
    echo "  iconos:    $(ls /media/developer/apps/usr/palm/applications/tv.aurora.home/iconos 2>/dev/null | wc -l)"
    echo "  arte:      $(ls /media/developer/apps/usr/palm/applications/tv.aurora.home/arte 2>/dev/null | wc -l)"
    echo "  RAM libre: $(free -m | awk "/Mem:/{print \$7}") MB"'

verde ""
verde "Instalado. Hace falta reiniciar: los parches de teclas solo se aplican"
verde "desde un arranque, porque el compositor lee esos archivos al empezar."
echo
if [ "${SIN_REINICIO:-0}" = "1" ]; then
    echo "Reinicia cuando quieras:  ssh root@$IP reboot"
else
    printf "¿Reiniciar el televisor ahora? [s/N] "
    read -r r
    case "$r" in
        s|S|y|Y)
            $SSH root@"$IP" 'nohup sh -c "sleep 2; /sbin/reboot" >/dev/null 2>&1 </dev/null &' || true
            echo "Reiniciando. Aurora aparecera alrededor del segundo 60."
            ;;
        *) echo "De acuerdo. Reinicia cuando quieras:  ssh root@$IP reboot" ;;
    esac
fi
