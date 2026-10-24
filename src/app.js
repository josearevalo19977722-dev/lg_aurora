/* Aurora — pantalla de inicio para LG webOS 4 rooteado.
   Objetivo: Chrome 53. Sin grid, sin gap, sin optional chaining. */
(function () {
  'use strict';

  /* ---------------------------------------------------------- puente luna

     El bridge nativo existe, pero el sistema deniega los servicios
     privilegiados: listApps responde "Denied method call". La via que si
     funciona en un televisor rooteado es el exec de Homebrew Channel, que
     corre como root; desde ahi se invoca luna-send sin restricciones.
     (luna-send necesita siempre stdin redirigido o falla en silencio.) */

  function exec(cmd) {
    return new Promise(function (resolve, reject) {
      var bridge;
      try { bridge = new PalmServiceBridge(); }
      catch (e) { return reject(new Error('PalmServiceBridge no disponible')); }
      var done = false;
      bridge.onservicecallback = function (raw) {
        if (done) return;
        done = true;
        var r;
        try { r = JSON.parse(raw); } catch (e) { return reject(e); }
        if (!r || r.returnValue === false) return reject(r);
        resolve(r.stdoutString || r.stdout || '');
      };
      bridge.call('luna://org.webosbrew.hbchannel.service/exec',
                  JSON.stringify({ command: cmd }));
      setTimeout(function () {
        if (!done) { done = true; reject(new Error('timeout')); }
      }, 20000);
    });
  }

  function lunaCmd(uri, params) {
    var json = JSON.stringify(params || {}).replace(/'/g, "'\\''");
    return "luna-send -n 1 -f " + uri + " '" + json + "' </dev/null";
  }

  function luna(uri, params) {
    return exec(lunaCmd(uri, params)).then(function (out) {
      try { return JSON.parse(out); } catch (e) { return {}; }
    });
  }

  var $ = function (id) { return document.getElementById(id); };

  /* El id sale de la propia ruta del archivo, asi vale para las dos
     variantes sin tener que inyectarlo en el build. */
  var MI_ID = (/applications\/([^\/]+)\//.exec(location.href) || [])[1] || 'tv.aurora.bar';

  function cerrarse() {
    /* window.close() es inmediato cuando el sistema lo permite; la llamada
       por luna es la red de seguridad, pero tarda un segundo largo. */
    try { window.close(); } catch (e) {}
    exec(lunaCmd('luna://com.webos.applicationManager/closeByAppId', { id: MI_ID }));
  }

  /* ------------------------------------------------------- reloj y saludo */
  var MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO',
               'AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  var DIAS  = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];

  function tick() {
    var d = new Date(), h = d.getHours();
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    $('clock').textContent = h12 + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    $('ampm').textContent = h < 12 ? 'AM' : 'PM';
    $('date').textContent = DIAS[d.getDay()] + ' ' + d.getDate() + ' DE ' + MESES[d.getMonth()];
    $('greeting').textContent =
      h < 6  ? 'BUENAS NOCHES' :
      h < 12 ? 'BUENOS DÍAS'   :
      h < 20 ? 'BUENAS TARDES' : 'BUENAS NOCHES';
  }

  /* ------------------------------------------------------------- estado */
  var apps = [], inputs = [], zone = 'rail', iApp = 0, iPill = 0, iRow = 0;
  var panelOpen = false;

  /* Fuera por defecto: paneles de sistema y utilidades que no son "apps de
     ver cosas". La LG Content Store (com.webos.app.discovery) si se deja. */
  var OCULTAR = /^(tv\.aurora\.(home|bar)|com\.palm\.app\.|com\.webos\.service|com\.webos\.app\.(external|factory|inputcommon|voice|tips|self|connectionwizard|notification|notificationcenter|home|livemenu|recordings|tvuserguide|dvrpopup|voiceview|installation|channeledit|channelsetting|remotesetting|membership|customersupport|acrcomponent|mediadiscovery|screensaver|systemmusic|photovideo|music|accessibility|btspeakerapp|miracast|scheduler))/;

  var conf = { orden: [], ocultar: [] };


  /* ------------------------------------------------------------- tinte */
  /* El color de marca que publica cada app sirve como identidad, pero no
     como fondo: varios declaran blanco (YouTube, Netflix) y algunos casi
     negro. Se conserva el TONO y se fuerza luminosidad y saturacion a un
     rango utilizable; si el color es practicamente gris, no hay tono que
     conservar y se usa el carmesi por defecto. */
  var CARMESI = [190, 24, 40];
  var capaViva = 1;

  function aRgb(hex) {
    if (!hex) return null;
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [parseInt(h.slice(0, 2), 16),
            parseInt(h.slice(2, 4), 16),
            parseInt(h.slice(4, 6), 16)];
  }

  function normaliza(rgb) {
    if (!rgb) return CARMESI;
    var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var l = (max + min) / 2, d = max - min, h = 0, s = 0;
    if (d !== 0) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else                h = ((r - g) / d + 4) / 6;
    }
    if (s < 0.12) return CARMESI;          /* gris: sin tono que conservar */
    s = Math.min(0.85, Math.max(0.55, s)); /* saturado, pero no fluorescente */
    l = 0.42;                              /* luminosidad fija: fondo oscuro */

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
    function canal(tt) {
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return pp + (q - pp) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return pp + (q - pp) * (2 / 3 - tt) * 6;
      return pp;
    }
    return [Math.round(canal(h + 1 / 3) * 255),
            Math.round(canal(h) * 255),
            Math.round(canal(h - 1 / 3) * 255)];
  }

  function teñir(hex) {
    var c = normaliza(aRgb(hex));
    var rgba = function (a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
    var grad = 'radial-gradient(ellipse at 34% 32%,' +
               rgba(0.52) + ' 0%,' + rgba(0.30) + ' 24%,' +
               rgba(0.13) + ' 44%, rgba(4,3,8,0) 62%)';

    /* Se pinta en la capa dormida y luego se intercambian opacidades. */
    var dormida = $(capaViva === 1 ? 'glow2' : 'glow1');
    var viva    = $(capaViva === 1 ? 'glow1' : 'glow2');
    if (!dormida || !viva) return;
    dormida.style.background = grad;
    dormida.className = 'glow on';
    viva.className = 'glow';
    capaViva = capaViva === 1 ? 2 : 1;

    /* En modo barra el resplandor no se ve: el tono va al panel de la fila. */
    var raiz = document.documentElement.style;
    raiz.setProperty('--dock-1', 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.26)');
    raiz.setProperty('--dock-2', 'rgba(4,3,6,0.95)');
  }

  /* --------------------------------------------------------------- apps */
  function recibirApps(r) {
    {
      apps = (r.apps || []).filter(function (a) {
        return a.id && a.visible !== false && !OCULTAR.test(a.id) && a.title;
      }).map(function (a) {
        return {
          id: a.id,
          title: a.title,
          folder: a.folderPath || '',
          icon: a.largeIcon || a.icon || '',
          color: a.iconColor || ''
        };
      });

      /* La configuración manda sobre la denylist, en los dos sentidos. */
      if (conf.ocultar && conf.ocultar.length) {
        apps = apps.filter(function (a) { return conf.ocultar.indexOf(a.id) === -1; });
      }
      if (conf.orden && conf.orden.length) {
        var pos = {};
        conf.orden.forEach(function (id, i) { pos[id] = i; });
        apps.sort(function (x, y) {
          var a = pos[x.id], b = pos[y.id];
          if (a === undefined && b === undefined) return 0;   /* sin listar: al final */
          if (a === undefined) return 1;
          if (b === undefined) return -1;
          return a - b;
        });
      }
      /* En la barra, un atajo a la vista completa delante de todo. */
      if ((window.AURORA_MODO || 'completo') === 'barra') {
        apps.unshift({ id: 'tv.aurora.home', title: 'Inicio', casa: true });
        /* El foco arranca en la casa: es lo que pidio el usuario. */
      }
      pintarRail();
    }
  }

  var BARRA = (window.AURORA_MODO || 'completo') === 'barra';

  function pintarRail() {
    var rail = $('rail');
    if (!apps.length) { rail.innerHTML = '<div class="loading">Sin aplicaciones</div>'; return; }
    rail.innerHTML = '';
    apps.forEach(function (a, n) {
      var puesto = (zone === 'rail' && n === iApp);
      rail.appendChild(BARRA ? tarjeta(a, puesto) : circulo(a, puesto));
    });
    centrar();
    if (!BARRA) pintarEscena();
    else if (apps[iApp]) teñir(apps[iApp].color);
  }

  /* Tarjeta ancha: la fila de la barra. */
  function tarjeta(a, puesto) {
    var t = document.createElement('div');
    t.className = 'tile' + (puesto ? ' on' : '');
    if (a.color && /^#[0-9a-fA-F]{3,8}$/.test(a.color)) t.style.background = a.color;
    if (a.casa) {
      t.className += ' casa';
      var gl = document.createElement('div'); gl.className = 'glifo';
      t.appendChild(gl);
      return t;
    }
    t.appendChild(iconoImg(a, function (im) {
      var f = document.createElement('div');
      f.className = 'fallback'; f.textContent = a.title;
      if (im.parentNode) { im.parentNode.appendChild(f); im.parentNode.removeChild(im); }
    }));
    return t;
  }

  /* Circulo con el nombre debajo: la tira de la vista completa. */
  function circulo(a, puesto) {
    var u = document.createElement('div');
    u.className = 'u' + (puesto ? ' on' : '');
    var b = document.createElement('div');
    b.className = 'bola';
    if (a.color && /^#[0-9a-fA-F]{3,8}$/.test(a.color)) b.style.background = a.color;
    b.appendChild(iconoImg(a, function (im) {
      /* Sin icono: la inicial, que al menos distingue. */
      var ini = document.createElement('div');
      ini.className = 'ini'; ini.textContent = (a.title || '?').charAt(0);
      if (im.parentNode) { im.parentNode.appendChild(ini); im.parentNode.removeChild(im); }
    }));
    var et = document.createElement('div');
    et.className = 'et'; et.textContent = a.title;
    u.appendChild(b); u.appendChild(et);
    return u;
  }

  function iconoImg(a, alFallar) {
    var im = document.createElement('img');
    im.src = 'iconos/' + a.id + '.png';
    im.onerror = function () { alFallar(im); };
    return im;
  }

  /* Escenario: nombre grande e ilustracion de la app enfocada. */
  function pintarEscena() {
    var a = apps[iApp];
    if (!a) return;
    $('titulo').textContent = a.title;
    $('meta').textContent = '';
    teñir(a.color);

    var caja = $('artePanel'), img = $('arteImg');
    if (a.casa) { caja.className = 'arte'; return; }
    /* El arte lo deja el script de arranque en arte/<id>.png. Muchas apps
       no lo traen: entonces no se muestra panel y manda el degradado. */
    var ruta = 'arte/' + a.id + '.png';
    if (img.getAttribute('src') === ruta) {
      /* Mismo src: no recargar, pero comprobar igualmente que decodifico.
         Algunas apps traen un bgImage que no es una imagen valida. */
      caja.className = img.naturalWidth > 1 ? 'arte on' : 'arte';
      return;
    }
    caja.className = 'arte';
    /* En file:// un archivo ausente no siempre dispara onerror: la imagen
       "carga" con 0 px. Hay que mirar naturalWidth o se queda un rectangulo
       negro en pantalla. */
    img.onload = function () {
      caja.className = img.naturalWidth > 1 ? 'arte on' : 'arte';
    };
    img.onerror = function () { caja.className = 'arte'; };
    img.setAttribute('src', ruta);
  }

  /* Desplaza la fila para que el elemento enfocado quede a la izquierda. */
  function centrar() {
    var ANCHO = BARRA ? (248 + 28) : (118 + 30);
    var VISIBLES = BARRA ? 2 : 5;
    var off = Math.max(0, iApp - VISIBLES) * ANCHO;
    $('rail').style.transform = 'translateX(' + (-off) + 'px)';
    $('rail').style.transition = 'transform .22s ease-out';
  }

  /* ------------------------------------------------------------ entradas */
  function recibirInputs(r) {
    inputs = (r.devices || []).map(function (d) {
      return { id: d.appId, label: d.label || d.id, conectado: !!d.connected };
    });
  }

  function pintarPanel() {
    var p = $('panel');
    if (!panelOpen) { p.hidden = true; return; }
    p.hidden = false;
    p.innerHTML = '';
    inputs.forEach(function (d, n) {
      var row = document.createElement('div');
      row.className = 'row' + (n === iRow ? ' on' : '');
      var l = document.createElement('span'); l.textContent = d.label;
      var t = document.createElement('span'); t.className = 'tag';
      if (d.conectado) { t.innerHTML = '<span class="dot"></span>Conectado'; }
      row.appendChild(l); row.appendChild(t);
      p.appendChild(row);
    });
  }

  /* ---------------------------------------------------------------- red */
  function recibirRed(r) {
    var etiqueta = 'Sin red';
    if (r.wired && r.wired.state === 'connected') etiqueta = 'Cable';
    else if (r.wifi && r.wifi.state === 'connected') etiqueta = r.wifi.ssid || 'Wi-Fi';
    $('netlabel').textContent = etiqueta;
  }


  /* ------------------------------------------------------------- fondo */
  /* Busca aurora-wallpaper.* en el almacenamiento interno o en un USB y lo
     copia junto a la app, para poder cargarlo por ruta relativa. */
  var APPDIR = '/media/developer/apps/usr/palm/applications/tv.aurora.home';

  function cargarFondo() {
    var cmd =
      'F=$(ls -1 /media/internal/aurora-wallpaper.* /tmp/usb/*/aurora-wallpaper.* ' +
      '/media/multimedia/aurora-wallpaper.* 2>/dev/null | head -1); ' +
      'if [ -n "$F" ]; then E="${F##*.}"; rm -f ' + APPDIR + '/wallpaper.*; ' +
      'cp "$F" ' + APPDIR + '/wallpaper.$E && echo "OK:wallpaper.$E"; else echo NONE; fi';
    return exec(cmd).then(function (out) {
      var m = /OK:(\S+)/.exec(out || '');
      if (!m) return;
      var img = new Image();
      img.onload = function () {
        document.getElementById('wall').style.backgroundImage = "url('" + m[1] + "')";
        document.getElementById('wall').className = 'wall on';
        document.getElementById('scrim').className = 'scrim on';
        if (document.body.className !== 'barra') document.body.className = 'conFondo';
      };
      img.src = m[1] + '?t=' + Date.now();
    }, function () {});
  }

  /* ------------------------------------------------------------ acciones */
  function lanzar(id) { luna('luna://com.webos.applicationManager/launch', { id: id }); }

  function activar() {
    if (panelOpen) {
      if (inputs[iRow]) lanzar(inputs[iRow].id);
      panelOpen = false; pintarPanel(); pintarPills();
      return;
    }
    if (zone === 'pills') {
      var act = $('pills').children[iPill].getAttribute('data-act');
      if (act === 'inputs') { panelOpen = true; iRow = 0; pintarPanel(); }
      else if (act === 'settings') lanzar('com.palm.app.settings');
      else if (act === 'net') lanzar('com.palm.app.settings');
      return;
    }
    if (apps[iApp]) lanzar(apps[iApp].id);
  }

  function pintarPills() {
    var hijos = $('pills').children;
    for (var i = 0; i < hijos.length; i++) {
      hijos[i].className = 'pill' + (zone === 'pills' && i === iPill ? ' on' : '');
    }
  }

  /* ------------------------------------------------------------- teclado */
  /* Defensa contra los saltos de foco vistos justo tras reinstalar: se
     descartan las teclas sinteticas y las que llegan mientras la pagina
     todavia se esta montando. */
  var nacida = Date.now();
  document.addEventListener('keydown', function (e) {
    if (e.isTrusted === false) return;
    if (Date.now() - nacida < 1200) { e.preventDefault(); return; }
    var k = e.keyCode;
    if (panelOpen) {
      if (k === 38) { iRow = (iRow - 1 + inputs.length) % inputs.length; pintarPanel(); }
      else if (k === 40) { iRow = (iRow + 1) % inputs.length; pintarPanel(); }
      else if (k === 13) activar();
      else if (k === 461 || k === 27 || k === 37) { panelOpen = false; pintarPanel(); }
      e.preventDefault();
      return;
    }
    if (k === 37) {
      if (zone === 'rail') { iApp = Math.max(0, iApp - 1); pintarRail(); }
      else { iPill = Math.max(0, iPill - 1); pintarPills(); }
    } else if (k === 39) {
      if (zone === 'rail') { iApp = Math.min(apps.length - 1, iApp + 1); pintarRail(); }
      else { iPill = Math.min($('pills').children.length - 1, iPill + 1); pintarPills(); }
    } else if (k === 38) {
      zone = 'pills'; pintarPills(); pintarRail();
    } else if (k === 40) {
      zone = 'rail'; pintarPills(); pintarRail();
    } else if (k === 13) {
      activar();
    } else if (k === 461 || k === 27) {
      /* Back: en modo barra cierra la app. En pantalla completa no se toca,
         porque ahi es la pantalla de inicio y no hay adonde volver. */
      if ((window.AURORA_MODO || 'completo') === 'barra') cerrarse();
      else return;
    } else { return; }
    e.preventDefault();
  });

  /* --------------------------------------------------------------- inicio */
  /* El modo se aplica de inmediato, antes de consultar nada. */
  if ((window.AURORA_MODO || 'completo') === 'barra') {
    document.documentElement.className = 'barra';
    document.body.className = 'barra';
  }

  tick(); setInterval(tick, 10000);
  pintarPills();

  function aplicar(raw) {
    var c = raw.conf || {};
    conf = { orden: c.orden || [], ocultar: c.ocultar || [],
             modo: window.AURORA_MODO || 'completo' };
    recibirApps(raw.apps || {});
    recibirInputs(raw.entradas || {});
    recibirRed(raw.red || {});
  }

  /* 1) Pintado inmediato: datos.js los dejo el script de arranque, asi que
        no hay que esperar al bus para el primer dibujado. */
  if (window.AURORA_RAW) aplicar(window.AURORA_RAW);

  /* 2) Refresco en segundo plano, para recoger apps instaladas despues o
        cambios de red. Si no habia datos precalculados, esta es la via
        normal y la fila muestra "Cargando aplicaciones..." mientras tanto. */
  exec([
    'echo @@APPS',   lunaCmd('luna://com.webos.applicationManager/listApps', {}),
    'echo @@INPUTS', lunaCmd('luna://com.webos.service.eim/getAllInputStatus', {}),
    'echo @@NET',    lunaCmd('luna://com.webos.service.connectionmanager/getStatus', {}),
    'echo @@CONF',   'cat /media/internal/aurora.json 2>/dev/null || echo {}'
  ].join('; ')).then(function (out) {
    var trozos = {};
    out.split(/@@(APPS|INPUTS|NET|CONF)/).forEach(function (parte, i, arr) {
      if (i % 2 === 1) { try { trozos[parte] = JSON.parse(arr[i + 1]); } catch (e) {} }
    });
    aplicar({ apps: trozos.APPS, entradas: trozos.INPUTS,
              red: trozos.NET, conf: trozos.CONF });
    if (iApp >= apps.length) iApp = Math.max(0, apps.length - 1);
    pintarRail();
    cargarFondo();
  }).catch(function (e) {
    if (!apps.length) {
      document.getElementById('rail').innerHTML =
        '<div class="loading">Error: ' + (e && e.message ? e.message : 'sin datos') + '</div>';
    }
  });
})();
