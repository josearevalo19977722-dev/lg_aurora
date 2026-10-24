# Aurora

Una pantalla de inicio propia para televisores LG con webOS 4 (2018), pensada
para televisores lentos. Sustituye a la barra de LG, arranca en unos 2
segundos y no trae publicidad, ni recomendaciones, ni filas patrocinadas.

Se instala con **un solo comando** y no escribe nada en las particiones de LG:
todo son archivos nuestros montados por encima. Se desinstala igual de fácil.

> 🇬🇧 [English version](README.md)

![Aurora con la aplicación enfocada](docs/aurora-arte.png)

---

## Índice

- [Qué es](#qué-es)
- [Las dos variantes](#las-dos-variantes)
- [Compatibilidad](#compatibilidad)
- [Versiones probadas](#versiones-probadas)
- [Requisitos](#requisitos)
- [Descargar](#descargar)
- [Instalar](#instalar)
- [Opciones del instalador](#opciones-del-instalador)
- [Comprobar que funcionó](#comprobar-que-funcionó)
- [Cómo se usa](#cómo-se-usa)
- [Personalizar la fila](#personalizar-la-fila)
- [Desinstalar](#desinstalar)
- [Qué se instala y dónde](#qué-se-instala-y-dónde)
- [Rendimiento medido](#rendimiento-medido)
- [Cómo funciona por dentro](#cómo-funciona-por-dentro)
- [Compilar desde el código](#compilar-desde-el-código)
- [Problemas frecuentes](#problemas-frecuentes)
- [Créditos](#créditos)

---

## Qué es

Un televisor LG de 2018 con 1,5 GB de RAM dedica buena parte de ella a
precargar aplicaciones que quizá no vas a abrir, y la pantalla de inicio de LG
tarda en responder porque carga publicidad y recomendaciones de red antes de
dibujarse.

Aurora es una aplicación web normal, empaquetada como app de usuario, que hace
tres cosas:

1. **Se dibuja antes de pedir nada.** El fondo, el reloj y la fila de apps
   aparecen en el primer fotograma. Los iconos y los datos ya están en el disco
   (los precalcula un script en el arranque), así que no hay ni una petición de
   red para pintar la pantalla.
2. **No tiene publicidad.** No hay nada que pedir a ningún servidor.
3. **Reacciona a lo que enfocas.** El resplandor del fondo toma el color de la
   aplicación enfocada y, si hay ilustración, se funde por la derecha.

Junto a Aurora se instalan cinco scripts de arranque que son, de hecho, la
mitad de la mejora: liberan RAM, reasignan los botones del mando y hacen que el
televisor entre en Aurora al encender.

---

## Las dos variantes

Se instalan las dos. Son la misma aplicación con una presentación distinta y
conviven sin estorbarse.

| | `tv.aurora.home` | `tv.aurora.bar` |
|---|---|---|
| Qué es | Pantalla de inicio a pantalla completa | Barra inferior superpuesta |
| Cuándo aparece | Al encender el televisor | Al pulsar el botón **HOME** |
| Para qué | Elegir qué ver cuando no estás viendo nada | Cambiar de app sin salir de lo que estás viendo |
| Primer foco | La primera app de la fila | El icono de casa, que abre la pantalla completa |

**Pantalla completa** — el reloj, el saludo y la fila de aplicaciones:

![Aurora al abrirse](docs/aurora-inicio.png)

**Barra** — se superpone a lo que estés viendo; aquí sobre fondo negro para que
se vean bien los iconos:

![La barra de Aurora](docs/aurora-barra.png)

---

## Compatibilidad

| | |
|---|---|
| **Funciona en** | LG webOS **4.x** (televisores de 2018) con root |
| **Probado en** | LG 43UK6300PSB, firmware 05.50.70, webOS 4.4.3 |
| **Requiere root** | Sí — [Homebrew Channel](https://github.com/webosbrew/webos-homebrew-channel) |
| **No probado en** | webOS 3 (2017) y anteriores, webOS 5+ (2020 y posteriores) |

webOS 5 y posteriores cambian la ruta de los filtros de teclas, así que los
parches del botón HOME y de los botones del mando no se aplicarán. El
instalador lo detecta y se detiene antes de tocar nada.

Para saber si **tu** televisor se puede rootear, mira
[cani.rootmy.tv](https://cani.rootmy.tv) con tu modelo y tu versión de firmware
exactos.

---

## Versiones probadas

| Componente | Versión | Nota |
|---|---|---|
| webOS TV Lite | 4.4.3 (`goldilocks-gorongosa`) | SDK 4.4.0 |
| Firmware LG | 05.50.70 | modelo 43UK6300PSB |
| Núcleo Linux | 4.4.84 | `Rockhopper` 4.4.3-22 |
| Homebrew Channel | 0.7.3 | el root y el puente para ejecutar como root |
| dejavuln-autoroot | 0.0.10 | para rootear desde un USB, sin modo desarrollador |
| Navegador del televisor | Chrome 53 | marca el límite de lo que se puede usar en el código |
| Aurora | 0.1.0 | este repositorio |

El navegador es Chrome 53, de 2016. **No** hay CSS Grid, ni `gap`, ni
`backdrop-filter`, ni `position: sticky`, ni `aspect-ratio`, ni encadenamiento
opcional (`?.`). Sí hay flexbox, variables CSS, `filter: blur()`,
`object-fit`, `-webkit-mask-image`, `fetch`, `Promise`, `async` y plantillas de
texto. Si tocas el código, tenlo presente: un `?.` despistado deja la pantalla
en negro sin decir nada.

---

## Requisitos

**En el televisor**

- webOS 4.x **rooteado** con Homebrew Channel.
- **SSH activado**: Homebrew Channel → *Settings* → **SSH Server** → encendido.
  Después, reinicia el televisor una vez.
- El televisor y el ordenador en la misma red.

**En tu ordenador** (macOS o Linux; en Windows, WSL)

- `ssh` y `scp` — vienen de serie.
- `python3` — solo para compilar los paquetes. El instalador lo hace solo si
  los `.ipk` no están. macOS lo trae con las *Command Line Tools*.

No hace falta instalar nada más, ni el SDK de LG, ni `ares-cli`, ni Node.

---

## Descargar

```bash
git clone https://github.com/josearevalo19977722-dev/lg_aurora.git
cd lg_aurora
```

O descarga el ZIP desde *Code → Download ZIP* y descomprímelo.

Hace falta saber la **IP del televisor**: *Ajustes → Red → Conexión wifi →
Configuración avanzada*. Si cambia, búscala por el prefijo MAC de LG:

```bash
arp -a | grep -i a8:23:fe
```

---

## Instalar

Un comando. Tarda unos tres minutos, casi todo en copiar las ilustraciones.

```bash
./instalar.sh 192.168.1.50
```

Cambia la IP por la de tu televisor. El instalador va diciendo lo que hace:

```
1/6  Comprobaciones
  paquetes listos
  conexion SSH correcta
  televisor rooteado con Homebrew Channel
  webOS 4 confirmado

2/6  Instalando Aurora
  variantes instaladas: 2

3/6  Scripts de arranque
  10-liberar-ram
  20-teclas
  30-aurora-input
  35-aurora-datos
  45-aurora-arranque

4/6  Generando los parches en el televisor
  precarga: 9 apps desactivadas
  boton HOME -> tv.aurora.bar
  boton netflix -> youtube.leanback.v4
  boton amazon -> com.disney.disneyplus-prod

5/6  Precalculando datos, iconos e ilustraciones
  datos.js (172649 bytes) y 75 iconos
  arte ancho: 20 copiados (30368 KB)

6/6  Comprobacion
  RAM libre: 362 MB
```

Al final ofrece reiniciar. **Hay que reiniciar**: los parches de teclas solo
entran desde un arranque, porque el compositor lee esos archivos al empezar.

Volver a ejecutarlo es seguro: detecta la instalación anterior, la destapa para
leer los archivos originales de LG y la vuelve a poner. No se duplica nada.

---

## Opciones del instalador

Se pasan como variables delante del comando:

```bash
BOTON_NETFLIX=youtube.leanback.v4 \
BOTON_AMAZON=com.disney.disneyplus-prod \
./instalar.sh 192.168.1.50
```

| Variable | Qué hace |
|---|---|
| `BOTON_NETFLIX=<appId>` | el botón Netflix del mando abre esa app |
| `BOTON_AMAZON=<appId>` | el botón Amazon del mando abre esa app |
| `SALTAR_RAM=1` | no tocar la precarga de apps de LG |
| `SIN_REINICIO=1` | no preguntar por el reinicio al terminar |
| `CLAVE=<ruta>` | clave SSH concreta, si no usas la del agente |

Para saber el `appId` de una aplicación, mira la lista que ya tiene el
televisor después de instalar:

```bash
ssh root@<IP> 'ls /media/cryptofs/apps/usr/palm/applications /usr/palm/applications'
```

Ejemplos reales: `netflix`, `amazon`, `com.disney.disneyplus-prod`,
`com.wbd.stream` (HBO Max), `youtube.leanback.v4`,
`tv.twitch.tv.starshot.lg`, `spotify-beehive`, `com.webos.app.livetv`.

---

## Comprobar que funcionó

Después de reiniciar:

```bash
# los cinco scripts de arranque, en su sitio
ssh root@<IP> 'ls /var/lib/webosbrew/init.d/'

# los montajes: 5 de precarga y 2 de teclas
ssh root@<IP> 'mount | grep -c "preloadmanager\|KeyFilters"'   # debe dar 7

# el compositor arrancó DESPUÉS de montarse los parches, o no los leyó:
# este número tiene que ser mayor que ~45
ssh root@<IP> 'expr $(awk "{print \$22}" /proc/$(pgrep -x surface-manager)/stat) / 100'

# RAM disponible
ssh root@<IP> 'free -m | awk "/Mem:/{print \$7\" MB\"}"'
```

Y los registros de cada script, que dicen exactamente qué hicieron:

```bash
ssh root@<IP> 'tail -5 /var/lib/webosbrew/*.log'
```

---

## Cómo se usa

| Botón del mando | Qué hace |
|---|---|
| **HOME** | abre la barra de Aurora sobre lo que estés viendo |
| **HOME** en la barra, sobre el icono de casa | abre la pantalla completa |
| **ATRÁS** | cierra Aurora y vuelve a lo anterior |
| **Netflix** / **Amazon** | la app que hayas puesto en las opciones |
| ◀ ▶ | moverse por la fila |
| ▲ | subir a *Entradas*, *Cable* y *Ajustes* |
| **OK** | abrir |

*Entradas* abre la lista de HDMI y demás entradas del televisor; *Cable* vuelve
a la televisión en directo; *Ajustes* abre los ajustes de LG.

Al encender, el televisor entra solo en Aurora. Si prefieres que no lo haga,
no hace falta desinstalar nada:

```bash
ssh root@<IP> 'touch /media/internal/aurora-no-arrancar'
```

Borra ese archivo para volver a activarlo.

---

## Personalizar la fila

Copia `aurora.ejemplo.json` al televisor como `aurora.json` y elige el orden y
lo que no quieres ver:

```bash
scp aurora.ejemplo.json root@<IP>:/media/internal/aurora.json
```

```json
{
  "orden": [
    "youtube.leanback.v4",
    "netflix",
    "com.disney.disneyplus-prod",
    "com.webos.app.livetv"
  ],
  "ocultar": [
    "com.webos.app.browser"
  ]
}
```

Lo que no aparezca en `orden` se coloca detrás, por orden alfabético. Los
cambios se ven al volver a abrir Aurora.

---

## Desinstalar

```bash
./desinstalar.sh 192.168.1.50
```

Quita las dos aplicaciones, la entrada de TV, los cinco scripts de arranque,
desmonta los parches y borra los registros. Después, reinicia:

```bash
ssh root@<IP> reboot
```

El televisor queda **exactamente** como estaba. Nunca se escribió en las
particiones de LG, así que no hay nada que restaurar: solo archivos nuestros
que se borran y montajes que se deshacen.

---

## Qué se instala y dónde

Todo vive en dos sitios, los dos nuestros:

```
/media/developer/apps/usr/palm/applications/
├── tv.aurora.home/          la pantalla completa
│   ├── index.html  app.css  app.js  modo.js
│   ├── datos.js             generado: la lista de apps del televisor
│   ├── iconos/              generado: 75 iconos copiados del sistema
│   ├── arte/                generado: 20 ilustraciones anchas (~30 MB)
│   └── fonts/               Inter 200/300/400/600, local, sin red
└── tv.aurora.bar/           la barra, los mismos archivos

/var/lib/webosbrew/
├── init.d/
│   ├── 10-liberar-ram       apaga la precarga, AirPlay y HomeKit
│   ├── 20-teclas            monta los parches del compositor
│   ├── 30-aurora-input      registra Aurora como entrada de TV
│   ├── 35-aurora-datos      precalcula datos.js, iconos y arte
│   └── 45-aurora-arranque   abre Aurora al encender
├── preloadmanager-disabled.json   generado del archivo del propio televisor
├── systemUi-patched.js            generado del archivo del propio televisor
├── appLaunch-patched.js           generado del archivo del propio televisor
└── *.log                          qué hizo cada script, con hora
```

Los tres archivos `-patched` **no** vienen en este repositorio: se generan en
el televisor a partir de sus propios archivos. Así el parche encaja con tu
firmware y no con el de otro.

---

## Rendimiento medido

Medido en el televisor de pruebas, no estimado.

| | Antes | Después |
|---|---|---|
| RAM disponible | ~183 MB (con swap) | **362–379 MB** |
| Apps precargadas por LG | 9 | 0 |
| Publicidad en la pantalla de inicio | sí | no |

**Lo que Aurora consume por sí misma** es prácticamente lo mismo que cualquier
otro lanzador: **61 MB** de RSS, frente a los 59–60 MB de
[Hearth](https://github.com/webosbrew/hearth). La diferencia de RAM de arriba
no viene de Aurora, sino de apagar la precarga de LG.

> Una advertencia por si lo mides tú: comparar la *memoria libre* antes y
> después no sirve, porque incluye las cachés del sistema. Hay que mirar el RSS
> del proceso (`ps` dentro del televisor). La primera comparación que hice de
> esta forma daba 57 MB contra 137 MB, y era ruido.

**Arranque**, cronometrado desde que se enciende:

| Segundo | Qué pasa |
|---|---|
| ~43 s | es lo antes que webOS deja correr los scripts de `init.d` |
| ~50 s | `20-teclas` reinicia el compositor para que lea los parches |
| ~62 s | aparece Aurora |

Los 60 segundos son el suelo con estos parches puestos: el compositor tiene que
reiniciarse para leer los archivos de teclas, y cualquier app abierta antes se
va con él. Por eso `45-aurora-arranque` espera a que el compositor renazca en
vez de esperar un número fijo de segundos.

---

## Cómo funciona por dentro

Esta parte es la que cuesta averiguar. Si vas a tocar el código, o a adaptarlo
a otro televisor, empieza por aquí.

### Nunca se escribe en las particiones de LG

`/etc` y `/usr` son de solo lectura, y aunque se pudieran escribir, una
actualización de firmware los dejaría a medias. Todo son **montajes de enlace**
(`mount -o bind`) de archivos nuestros por encima de los de LG. Al desmontar,
el original vuelve a estar ahí, intacto. No hay copias de seguridad que
restaurar porque no se ha tocado nada.

### Los parches se generan en el televisor, no vienen hechos

Cada firmware trae sus archivos. Un parche hecho para otro televisor se monta
igual de bien y rompe cosas en silencio. Por eso `instalar-en-tv.sh` corre
**en el televisor**, lee los archivos de ese televisor y les aplica un `sed`.

Además comprueba el **número de líneas** antes y después: si el `sed` no
encontró lo que buscaba, o encontró de más, el recuento cambia y se aborta.
`20-teclas` repite la comprobación en cada arranque, así que si una
actualización de LG cambia el archivo original, el parche simplemente no se
monta.

### Una instalación previa se tapa a sí misma

Esto fue el fallo más difícil de ver. En la segunda instalación, el archivo
original de LG ya está tapado por nuestro parche. Leerlo da un parche hecho
sobre el parche.

Con la precarga era peor: la redirección `sed original > parche` trunca el
archivo de salida **antes** de que `sed` lea la entrada, y como el montaje hace
que los dos sean el mismo inodo, el original se queda en cero bytes. El
resultado era un JSON vacío montado sobre la configuración de `configd`.

La solución es doble: desmontar todo antes de leer nada
(`despegar`), y escribir siempre a un temporal que se mueve al final.

### La precarga vive en una configuración de solo lectura

`com.webos.service.preloadmanager.json` decide qué aplicaciones se cargan en
memoria al arrancar. Está en `/etc/configd/layers/`, y hay **cinco** copias: la
base y una por cada perfil de pantalla (`hd1080-lite`, `hd1080-normal`,
`hd2160-lite`, `hd2160-normal`). Hay que montar el parche sobre las cinco, o
`configd` elige la que no tocaste.

### HomeKit vuelve si solo lo paras

`stop airplay-adaptor` funciona. Con `homekit` no basta, porque lo levanta
`ls-hubd` bajo demanda: hay que matarlo. Y el arranque sigue levantando cosas
después del segundo 43, así que `10-liberar-ram` repite la limpieza a los 90
segundos.

### Los botones del mando están en un archivo JavaScript

Los botones Netflix y Amazon no pasan por el bus de servicios: están escritos
tal cual en `/usr/lib/qt5/qml/KeyFilters/appLaunch.js`, como
`appId = "netflix";`. Cambiar esa cadena cambia el botón.

### El botón HOME no se puede interceptar desde una app

En webOS 4 la barra de LG no es una aplicación que pase a primer plano: es una
capa del compositor. `getForegroundAppInfo` nunca la reporta, así que una app
no puede saber que se ha abierto, ni cerrarla. Hay que tocar la tecla en su
origen, en `systemUi.js`, y hay que parchear **las dos** llamadas:

- `global.goHome();` → `applicationManager.launch("tv.aurora.bar");`
- `global.prepareToGoHome();` → un comentario

Si solo cambias la primera, la barra de LG asoma por debajo durante un
instante al pulsar. Se sustituye por un comentario, y no por nada, para no
cambiar el número de líneas y que la comprobación siga cuadrando.

### Montar los parches no basta

`surface-manager` lee esos archivos cuando arranca, alrededor del segundo 2.
Los scripts de `init.d` no corren hasta el segundo 43. Así que montar no hace
nada hasta el siguiente arranque, salvo que reinicies el compositor — que es lo
que hace `20-teclas`, y solo si montó algo nuevo en esa pasada.

### Registrar una entrada de TV necesita una bandera que nadie menciona

`luna://com.webos.service.eim/addDevice` devuelve `returnValue: true` y no
aparece ninguna entrada, a menos que el `appinfo.json` de la app declare
`"supportGIP": true`.

### "Arrancar en mi lanzador" en realidad es "retomar la última entrada"

webOS no tiene una opción de aplicación de inicio: al encender vuelve a la
entrada que usabas al apagar. Si apagaste viendo el PS5, al encender vuelves al
PS5. Registrar Aurora como entrada consigue que *sea* una entrada, no que sea
la elegida. Por eso `45-aurora-arranque` la lanza a mano, después de esperar a
que el compositor renazca.

### `luna-send` falla en silencio sin entrada estándar

Dentro de un script de arranque no hay terminal. `luna-send` se queda esperando
y no devuelve nada. Todas las llamadas llevan `</dev/null`. Y como devuelve
JSON en varias líneas, hay que pasarlo por `tr -d '\n'` antes de un `sed`, o el
registro sale partido.

### El intérprete de órdenes es busybox

`sleep 0.7` no funciona: solo acepta enteros. `timeout 45 orden` tampoco: aquí
es `timeout -t 45`. Y cuidado con `pgrep -f`, que puede encontrar tu propia
sesión SSH y matarla.

### Hacer capturas limpias

El televisor expone el protocolo de DevTools de Chrome en el puerto 9998:

```bash
ssh -N -L 19998:127.0.0.1:9998 root@<IP> &
curl -s http://127.0.0.1:19998/json      # saca el id de la página
# y pide Page.captureScreenshot por WebSocket a esa página
```

Las capturas de este repositorio salen de ahí: 1920×1080 reales, sin reflejos
ni moiré. Antes de reinstalar un paquete, cierra la app con `closeByAppId` o te
quedan instancias fantasma en la lista del inspector.

### Inyectar teclas del mando para probar

Se escriben eventos de 16 bytes en `/dev/input/event1`:

```python
struct.pack("<llHHi", 0, 0, tipo, codigo, valor)
```

Códigos útiles: ◀ 105, ▶ 106, ▲ 103, ▼ 108, **OK** 28. El botón **ATRÁS** no
es `KEY_BACK` (158): en este mando es **412** (`KEY_PREVIOUS`). Perdí un buen
rato convencido de que el manejador estaba roto cuando lo que estaba mal era
mi prueba.

---

## Compilar desde el código

Los `.ipk` no están en el repositorio: se generan. El instalador lo hace solo,
pero puedes hacerlo a mano:

```bash
python3 tools/build-ipk.py home   # -> tv.aurora.home_0.1.0_all.ipk
python3 tools/build-ipk.py bar    # -> tv.aurora.bar_0.1.0_all.ipk
```

El empaquetador está escrito en Python puro a propósito. El `.ipk` es un
archivo `ar` con `debian-binary`, `control.tar.gz` y `data.tar.gz`, y las
versiones de `ar` y `tar` de macOS meten entradas `AppleDouble` y `PaxHeader`
que el televisor rechaza sin explicar por qué.

Para instalar un solo paquete a mano:

```bash
scp tv.aurora.home_0.1.0_all.ipk root@<IP>:/tmp/
ssh root@<IP> 'luna-send -n 5 -f luna://com.webos.appInstallService/dev/install \
  "{\"id\":\"com.ares.defaultName\",\"ipkUrl\":\"/tmp/tv.aurora.home_0.1.0_all.ipk\",\"subscribe\":true}"'
```

Para ver la consola de la app mientras la desarrollas, abre
`http://127.0.0.1:19998` en tu navegador con el túnel SSH de arriba levantado.

---

## Problemas frecuentes

**No conecta por SSH.** Comprueba que *SSH Server* está encendido en Homebrew
Channel y que reiniciaste el televisor después. Si la IP cambió, búscala con
`arp -a | grep -i a8:23:fe`.

**Dice que el televisor no está rooteado.** El instalador busca
`/var/lib/webosbrew`. Si no existe, Homebrew Channel no está instalado. Mira
[cani.rootmy.tv](https://cani.rootmy.tv) con tu modelo y firmware.

**Dice que no es webOS 4.** Busca `/usr/lib/qt5/qml/KeyFilters/systemUi.js`. En
webOS 5 y posteriores no está ahí, y los parches de teclas no se pueden
aplicar.

**El botón HOME sigue abriendo la barra de LG.** Casi siempre es que no has
reiniciado. Comprueba que el compositor arrancó después de montarse el parche:
el número de la sección [Comprobar que funcionó](#comprobar-que-funcionó) tiene
que ser mayor que ~45.

**Al encender entra en HDMI y no en Aurora.** Es lo normal durante los primeros
60 segundos: `45-aurora-arranque` espera a que el compositor renazca antes de
lanzarla. Mira `tail /var/lib/webosbrew/aurora-arranque.log`, que dice a qué
segundo la lanzó y de dónde venía.

**Una app no tiene ilustración de fondo.** No todas la traen. Aurora comprueba
el tamaño real de la imagen antes de mostrarla, así que si falta no verás un
rectángulo negro: verás solo el resplandor de color.

**Faltan iconos o la fila está vacía.** Vuelve a lanzar el script que
precalcula los datos:

```bash
ssh root@<IP> 'sh /var/lib/webosbrew/init.d/35-aurora-datos; tail -3 /var/lib/webosbrew/aurora-datos.log'
```

**Quiero volver atrás ya.** `./desinstalar.sh <IP>` y reinicia.

---

## Créditos

- [webosbrew](https://github.com/webosbrew) — Homebrew Channel y el puente que
  permite ejecutar como root desde una app.
- [dejavuln-autoroot](https://github.com/throwaway96/dejavuln-autoroot) — el
  root por USB que no necesita modo desarrollador.
- [Hearth](https://github.com/webosbrew/hearth) — el lanzador que usé de
  referencia para medir si Aurora iba sobrada de memoria.
- [RootMy.TV](https://rootmy.tv) y [cani.rootmy.tv](https://cani.rootmy.tv).
- [Inter](https://github.com/rsms/inter) — la tipografía, de Rasmus Andersson,
  bajo licencia SIL Open Font License 1.1
  ([el texto completo](src/fonts/LICENSE.txt) va junto a los archivos).

Las mejoras de sistema por separado, sin el lanzador, están en
[lg-webos4-tweaks](https://github.com/josearevalo19977722-dev/lg-webos4-tweaks).

Esto no está relacionado con LG de ninguna manera. Úsalo bajo tu
responsabilidad: no toca las particiones de LG, pero rootear un televisor es
cosa tuya.

## Licencia

MIT — mira [LICENSE](LICENSE). La tipografía Inter va bajo su propia
licencia, SIL OFL 1.1, en [src/fonts/LICENSE.txt](src/fonts/LICENSE.txt).
