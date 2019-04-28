
'use strict'

var gl;

var engine = (function() {
  const FRAME_COUNT_INTERVAL = 1000;
  const START = true;

  const KEY_VISIBLE = 'visible';
  const KEY_PLUGINS = 'plugins';
  const KEY_ACTIVE_PLUGIN = 'activePlugin'
  const KEY_PAUSED = 'pause';
  const KEY_CONFIG = 'conf';
  const KEY_DEFAULT_OBJECT = 'defaultObject';
  const KEY_MODEL_MATRIX = 'modelMatrix';
  const KEY_AMBIENT = 'ambient';
  const KEY_DIFFUSE = 'diffuse';
  const KEY_SPECUALR = 'specular';
  const KEY_EMISSION = 'emission';
  const KEY_SHININESS = 'shininess';

  var plugins = {};
  var activePlugin = null;
  var readyCallbacks = [];
  var lastLoop =  new Date().getTime();
  var frameCount = 0;
  var lastFrameCount = 0;
  var lastFrameCountTime = 0;
  var lastId = 0;

  var axisProgram = null;
  var objectProgram = null;
  var usedProgram = null;

  var defaultLight = null;
  var usedLight = null;
  var defaultObject = null;

  var objectModelViewMatrix = mat4.create();
  var modelViewMatrix = mat4.create();
  var viewMatrix = mat4.create();
  var modelMatrix = mat4.create();
  var projectionMatrix = mat4.create();
  //Interaction
  var overlay = null;

  var keys = {};

  var mouse = {
    lastMoved: 0,
    down: false,
    lx: 0,
    ly: 0,
    nx: 0,
    ny: 0,
  };

  var axisObject = null;
  var objects = {};

  var buffers = {
    vertexBuf: null,
    indexBuf: null,
  };

  var paused = false;

  var axisVsSrc =
    'precision mediump float;\
    uniform mat4 modelViewMatrix;\
    uniform mat4 projectionMatrix;\
    \
    attribute vec3 in_pos;\
    attribute vec4 in_col;\
    \
    varying vec4 pass_col; \
    \
    void main() {\
        gl_Position = projectionMatrix * modelViewMatrix * vec4(in_pos, 1);\
        pass_col = in_col;\
    }';

  var axisFsSrc =
    'precision mediump float;\
    varying vec4 pass_col;\
    \
    void main() {\
        gl_FragColor = pass_col;\
    }';

  var objectVsSrc =
    'precision highp float;\
    uniform mat4 modelViewMatrix;\
    uniform mat4 projectionMatrix;\
    uniform mat3 normalMatrix;\
    \
    attribute vec3 in_pos;\
    attribute vec4 in_col;\
    attribute vec3 in_nrm;\
    attribute vec2 in_txc;\
    \
    varying vec4 eyePos;\
    varying vec4 pass_col;\
    varying vec4 pass_nrm;\
    varying vec2 pass_txc;\
    \
    void main() {\
        eyePos = modelViewMatrix * vec4(in_pos, 1);\
        gl_Position = projectionMatrix * modelViewMatrix * vec4(in_pos, 1);\
        pass_nrm = vec4(normalMatrix * in_nrm, 1);\
        pass_col = in_col;\
        pass_txc = in_txc;\
    }';

  var objectFsSrc =
    'precision highp float;\
    uniform vec4 lightPosition;\
    uniform vec4 lightAmbient;\
    uniform vec4 lightDiffuse;\
    uniform vec4 lightSpecular;\
    uniform vec3 attenuation;\
    \
    uniform vec4 materialEmission;\
    uniform vec4 materialAmbient;\
    uniform vec4 materialDiffuse;\
    uniform vec4 materialSpecular;\
    uniform float materialShininess;\
    \
    varying vec4 eyePos;\
    varying vec4 pass_col;\
    varying vec4 pass_nrm;\
    varying vec2 pass_txc;\
    \
    void main() {\
    	vec4 color = pass_col;\
    	vec4 nrm = normalize(pass_nrm);\
    	vec4 emission = vec4(0, 0, 0, 0),\
       ambient = vec4(0, 0, 0, 0), \
       specular = vec4(0, 0, 0, 0), \
       diffuse = vec4(0, 0, 0, 0);\
      \
    	emission = materialEmission;\
    	ambient = materialAmbient * lightAmbient;\
    	vec4 L = normalize(lightPosition - eyePos);\
    	float nDotL = dot(nrm, L);\
      float len = length(L);\
      float att = attenuation[0] + attenuation[1] * len + attenuation[2] * len * len;\
      \
    	if(nDotL > 0.0) {\
    		diffuse = lightDiffuse * materialDiffuse * nDotL;\
    		vec4 E = normalize(vec4(0, 0, 0, 1) - eyePos);\
    		vec4 H = normalize(L + E);\
    		float nDotH = dot(nrm, H);\
        \
    		if(nDotH > 0.0)\
    			specular = lightSpecular * materialSpecular * pow(nDotH, materialShininess);\
    	}\
      \
      color = emission + ambient + specular + diffuse;\
    	color.w = materialDiffuse.w;\
    	color = clamp(color, 0.0, 1.0);\
      gl_FragColor = color;\
    }';

  var getNextId = function() {
    return ++lastId;
  }

  var checkGlErrors = function() {
    var error = gl.getError();

    if(error == gl.NO_ERROR)
      return;

    switch (error) {
      case gl.INVALID_ENUM:
        console.error('An unacceptable value has been specified for an enumerated argument. The command is ignored.');
        break;
      case gl.INVALID_VALUE:
        console.error('A numeric argument is out of range. The command is ignored.');
        break;
      case gl.INVALID_OPERATION:
        console.error('The specified command is not allowed for the current state. The command is ignored.');
        break;
      case gl.INVALID_FRAMEBUFFER_OPERATION:
        console.error('The currently bound framebuffer is not framebuffer complete when trying to render to or to read from it.');
        break;
      case gl.OUT_OF_MEMORY:
        console.error('Not enough memory is left to execute the command.');
        break;
      case gl.CONTEXT_LOST_WEBGL:
        console.error('The Webgl-context is lost.');
        break;
      default:
        console.error("Unknown error: " + error);
        break;
    }

    paused = true;
  }

  var loadConfig = function(configText) {
    var config = readConfig(configText);

    if(config.hasOwnProperty(KEY_PAUSED))
      paused = config[KEY_PAUSED] == '1' ? true : false;

    if(config.hasOwnProperty(KEY_DEFAULT_OBJECT)) {
      var defaultObjectConfig = config[KEY_DEFAULT_OBJECT];

      if(defaultObjectConfig.hasOwnProperty(KEY_VISIBLE)) {
        defaultObject.visible(defaultObjectConfig[KEY_VISIBLE] == '0' ? false : true);
      }

      if(defaultObjectConfig.hasOwnProperty(KEY_MODEL_MATRIX)) {
        defaultObject.modelMatrix(util.parseMat4(mat4.create(), defaultObjectConfig[KEY_MODEL_MATRIX]));
      }

      defaultObject.material(util.createMaterialFromConfig(defaultObjectConfig));
    }

    if(config.hasOwnProperty(KEY_PLUGINS)) {
      var pluginConfigs = config[KEY_PLUGINS];

      for (var key in pluginConfigs) {
        if (pluginConfigs.hasOwnProperty(key)) {
          var pluginConfig = pluginConfigs[key];

          for (var id in plugins) {
            if (plugins.hasOwnProperty(id)) {
              var plugin = plugins[id];

              if(plugin.name() != key)
                continue;

              plugin.on('config_loaded')(pluginConfig[KEY_CONFIG]);

              if(pluginConfig.hasOwnProperty(KEY_VISIBLE)) {
                if(pluginConfig[KEY_VISIBLE] == '1')
                  engine.tooglePluginVisibility(id);
              }
              break;
            }
          }
        }
      }
    }

    if(config.hasOwnProperty(KEY_ACTIVE_PLUGIN)) {
      for (var id in plugins) {
        if (plugins.hasOwnProperty(id)) {
          if(plugins[id].name() === config[KEY_ACTIVE_PLUGIN]) {
            activePlugin = plugins[id];
            break;
          }
        }
      }
    }
  }

  const TYPE_STRING = typeof('');
  const TYPE_NUMBER = typeof(1.5);
  const TYPE_BOOLEAN = typeof(true);
  const TYPE_OBJECT = typeof({});

  var writeConfig = function(config) {
    var res = '';

    for(var key in config) {
      if(config.hasOwnProperty(key)) {
        var value = config[key];
        if(value == null)
          break;

        res += key.toString() + '=';

        switch(typeof(value)) {
          case TYPE_STRING:
          case TYPE_NUMBER: res += value.toString(); break;
          case TYPE_BOOLEAN: res += (value ? 1 : 0); break;
          case TYPE_OBJECT: res += '{' + writeConfig(value) +'}'; break;
          default: console.error('Unknown type ' + typeof(value)); break;
        }

        res += ';';
      }
    }

    return res;
  }

  var readConfig = function(config) {
    var start = 0, end = 0, eq = 0;
    var key, value, res = {};

    do {
      eq = config.indexOf('=', start);
      key = config.substring(start, eq);

      if(config.charAt(eq + 1) == '{') {
        var level = 0, i = eq + 1;

        for(; i < config.length; i++) {
          if(config.charAt(i) == '{')
            level++;
          else if(config.charAt(i) == '}')
            level--;

          if(level == 0)
            break;
        }

        end = i + 1;
        value = readConfig(config.substring(eq + 2, end - 1));
      }
      else {
        end = config.indexOf(';', eq);
        value = config.substring(eq + 1, end);
      }

      if(end != -1 && start != -1 && eq != -1 &&
        end < config.length && start < eq && eq <= end)
          res[key] = value;
      else
        break;

      start = end + 1;
    }
    while(true);

    return res;
  }

  var loop = function() {
    checkGlErrors();

    if(paused)
      return;

    var now = new Date().getTime();
    var delta = now - lastLoop;
    lastLoop = now;

    gl.clearColor(1, 0.5, 0, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var glCanvas = $('#glcanvas')[0];
    var totalPluginInCount = Object.keys(plugins).length;
    var activePluginCount = 0;

    for(var key in plugins)
      if(plugins[key].visible())
        activePluginCount += 1;

    var cols = Math.ceil(Math.sqrt(activePluginCount));
    var rows = Math.ceil(activePluginCount / cols);
    var col = 0;
    var row = 0;
    var colWidth = glCanvas.width / cols;
    var rowHeight = glCanvas.height / rows;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indexBuf);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.vertexBuf);

    for(var key in plugins) {
      var plugin = plugins[key];

      if(!plugin.visible())
        continue;

      plugin.on('bind')();

      mat4.identity(projectionMatrix);
      mat4.identity(viewMatrix);
      mat4.identity(modelMatrix);
      usedProgram = objectProgram;

      if(usedLight == null)
        usedLight = defaultLight;

      gl.viewport(col * colWidth, row * rowHeight, colWidth, rowHeight);

      var area = plugin.area(col * colWidth, glCanvas.height - (row + 1) * rowHeight, (col + 1) * colWidth, glCanvas.height - row * rowHeight);

      col++;

      if(col == cols) {
        col = 0;
        row++;
      }

      plugin.on('callback')(delta);

      gl.useProgram(axisProgram.id());
      axisProgram.bufferProjectionMatrix(projectionMatrix);
      axisProgram.bufferModelViewMatrix(viewMatrix);
      axisObject.bind();
      axisProgram.bindAttribPointers();
      axisObject.render();
      axisProgram.releaseAttribPointers();

      gl.useProgram(usedProgram.id());
      usedProgram.bufferProjectionMatrix(projectionMatrix);
      usedProgram.bufferLightSource(usedLight);

      mat4.mul(modelViewMatrix, viewMatrix, modelMatrix);

      for(var okey in objects) {
        var o = objects[okey];

        if(!o.visible())
          continue;

        o.bind();
        usedProgram.bindAttribPointers();
        usedProgram.bufferModelViewMatrix(mat4.mul(objectModelViewMatrix, modelViewMatrix, o.modelMatrix()));
        usedProgram.bufferMaterial(o.material());
        o.render();
      }

      usedProgram.releaseAttribPointers();
      plugin.on('release')();
    }

    overlay.clearRect(0, 0, glCanvas.width, glCanvas.height);
    overlay.strokeStyle = '#000000';
    overlay.lineWidth = 1;
    overlay.globalAlpha = 1;
    overlay.font = "11px Arial";

    for(var i = 1; i < cols; i++) {
      overlay.beginPath();
      overlay.moveTo(i * colWidth, 0);
      overlay.lineTo(i * colWidth, rows * rowHeight);
      overlay.stroke();
    }

    for(var i = 1; i < rows; i++) {
      overlay.beginPath();
      overlay.moveTo(0, i * rowHeight);
      overlay.lineTo(cols * colWidth, i * rowHeight);
      overlay.stroke();
    }

    col = 0;
    row = 0;
    for(var key in plugins) {
      var plugin = plugins[key];

      if(!plugin.visible())
        continue;

      var text = plugin.name();
      var area = plugin.area();

      if(plugin === activePlugin) {
        overlay.strokeStyle = '#00FFAF';
        overlay.lineWidth = 3;
        overlay.strokeRect(area.x0 + 3, area.y0 + 3, area.x1 - area.x0 - 6, area.y1 - area.y0 - 6);

        text += ' (active)';
      }

      overlay.fillText(text, area.x0 + 5, area.y0 + 16);

      if(paused) {
        overlay.fillStyle = '#FFFFFF';
        overlay.globalAlpha = 0.5;
        overlay.fillRect(0, 0, glCanvas.width, glCanvas.height);
      }
    }

    if(now - lastFrameCountTime > FRAME_COUNT_INTERVAL) {
      lastFrameCount = frameCount;
      frameCount = 0;
      lastFrameCountTime = now;
    }

    frameCount += 1;
    var statusText = totalPluginInCount + ' plugins loaded, ' + activePluginCount + ' active, '
      + lastFrameCount + ' fps, mouse at (' + mouse.nx + '/' + mouse.ny + ') ';

    if(activePlugin !== undefined && activePlugin !== null) {
       statusText += activePlugin.name() + ' (' + activePlugin.id() + ') is active';
    }

    $('#status_text').html(statusText);

    mouse.lx = mouse.nx;
    mouse.ly = mouse.ny;
  }

  var initData = function() {
    var axis = quadric.create();
    //vertices as xyz-vectors with 3 values
    axis.vertices = [
      -2, 0, 0,
      2, 0, 0,
      0, -2, 0,
      0, 2, 0,
      0, 0, -2,
      0, 0, 2,

      1.97, 0, 0.03,
      1.97, 0, -0.03,
      0.03, 1.97, 0,
      -0.03, 1.97, 0,
      0.03, 0, 1.97,
      -0.03, 0, 1.97,
    ];

    //draw [0..5] as points -> CoordinateSystem
    axis.indices = [
      0, 1, 2, 3, 4, 5,
      1, 6, 1, 7, 3, 8, 3, 9, 5, 10, 5, 11,
    ];

    //colors as rgba-vector with 4 values in [0, 1)
    axis.colors = [
      1, 0, 0, 1,
      1, 0, 0, 1,
      0, 1, 0, 1,
      0, 1, 0, 1,
      0, 0, 1, 1,
      0, 0, 1, 1,

      1, 0, 0, 1,
      1, 0, 0, 1,
      0, 1, 0, 1,
      0, 1, 0, 1,
      0, 0, 1, 1,
      0, 0, 1, 1,
    ];

    axis.normals = [];
    axis.texCoords = [];

    var mvMat = mat4.create();
    mat4.identity(mvMat);
    axisObject = engine.addObject(axis, gl.LINES);
    axisObject.visible(false);

    mat4.fromScaling(mvMat, vec3.fromValues(0.3, 0.3, 0.3));
    quadric.defaultColor(0.2, 0.4, 0.8, 1.0);
    defaultObject = engine.addObject(quadric.createSimpleBox(), gl.TRIANGLES);
    // defaultObject.modelMatrix(mvMat);

    axisProgram = util.createProgram(
      util.createShader(axisVsSrc, gl.VERTEX_SHADER),
      util.createShader(axisFsSrc, gl.FRAGMENT_SHADER),
      ['projectionMatrix', 'modelViewMatrix'],
      ['in_pos', 'in_col']);

    objectProgram = util.createProgram(
      util.createShader(objectVsSrc, gl.VERTEX_SHADER),
      util.createShader(objectFsSrc, gl.FRAGMENT_SHADER),
      ['projectionMatrix', 'modelViewMatrix', 'normalMatrix',
        'lightPosition', 'lightAmbient', 'lightDiffuse', 'lightSpecular', 'attenuation',
        'materialEmission', 'materialAmbient', 'materialDiffuse', 'materialSpecular', 'materialShininess'],
      ['in_pos', 'in_col', 'in_nrm', 'in_txc']);

    defaultLight = util.createLightSource(
      vec3.create(),
      vec4.create(),
      vec4.create(),
      vec4.create(),
      vec3.create());

    console.log("init complete");
  }

  $(window)
    .on('error', function(e) {
      console.log('error occurred');
      paused = true;
    })

  $(document).ready(function(e) {
    var glCanvas = $('#glcanvas')[0];
    gl = glCanvas.getContext('webgl');

    var overlayCanvas = $('#overlay')[0];
    overlay = overlayCanvas.getContext('2d');

    glCanvas.width = glCanvas.clientWidth;
    glCanvas.height = glCanvas.clientHeight;

    overlayCanvas.width = overlayCanvas.clientWidth;
    overlayCanvas.height = overlayCanvas.clientHeight;

    if(gl === null) {
      alert("The current browser dos not support WebGl!");
      console.error("WebGl not supported");
      return;
    }
    else if(START)
      setInterval(loop, 1000 / 45);

    if(window.File && window.FileReader && window.FileList && window.Blob) {
      console.log('FileApi available');

      $('#load_plugin_button').on('click', function(e) {
        $('#file_picker').click();
      });
    }
    else {
      console.warn('FileApi not or not fully supported');
      $('#load_plugin_button').prop('disabled', true);
    }

    initData();

    $('#camera_speed_slider_div input').on('mousemove', function() {
      $('#camera_speed_slider_div #camera_speed_text').html($(this).val());
    })
    .on('change', function() {
      $('#camera_speed_slider_div #camera_speed_text').html($(this).val());
      camera.movementSpeed(parseInt($(this).val()) * 0.001);
    })
    .trigger('change')
    .trigger('mousemove');

    $('#file_picker').on('change', function(e) {
      var files = e.target.files;
      console.log('loading plugins');
      for(var i = 0, f; f  = files[i]; i++) {
        var reader = new FileReader();
        var fileName = escape(f.name);
        reader.onload = function(e) {
          console.log('loaded plugin: "' + fileName + '"');
          $.globalEval(e.target.result);
        };

        reader.onerror = function(e) {
          console.error('error reading file "' + fileName + '"');
          alert('Could not read plugin file!');
        };

        reader.readAsText(f);
      }
    });

    $(window)
      .on('keydown', function(e) {
        var cc = String.fromCharCode(e.which).toLowerCase();

        keys[cc] = true;
      })
      .on('keyup', function(e) {
        var cc = String.fromCharCode(e.which).toLowerCase();

        keys[cc] = false;

        if(cc == 'p')
          paused = !paused;
      })
      .on('mousedown', function(e) {
        mouse.down = true;
        mouse.lx = mouse.nx;
        mouse.ly = mouse.ny;
      })
      .on('mouseup', function(e) {
        mouse.down = false;
        mouse.lx = mouse.nx;
        mouse.ly = mouse.ny;
      })
      .on('mousemove', function(e) {
        mouse.lx = mouse.nx;
        mouse.ly = mouse.ny;
        mouse.nx = e.pageX;
        mouse.ny = e.pageY;
      })
      .on('dblclick', function(e) {
        for(var key in plugins) {
          var plugin = plugins[key];
          if(plugin.visible() && plugin.isInArea(e.pageX, e.pageY)) {
            if(activePlugin === plugin)
              activePlugin = null;
            else
              activePlugin = plugin;
            break;
          }
        }
      })
      .on('resize', function(e) {
        var glCanvas = $('#glcanvas')[0];

        glCanvas.width = glCanvas.clientWidth;
        glCanvas.height = glCanvas.clientHeight;

        var overlayCanvas = $('#overlay')[0];

        overlayCanvas.width = overlayCanvas.clientWidth;
        overlayCanvas.height = overlayCanvas.clientHeight;

        console.log('resized canvases')
      });

    $('#create_config_link').on('click', function() {
      var config = {};
      config[KEY_ACTIVE_PLUGIN] = activePlugin != null ? activePlugin.name() : '-';
      config[KEY_PAUSED] = paused;
      config[KEY_PLUGINS] = {};

      config[KEY_DEFAULT_OBJECT] = {};
      config[KEY_DEFAULT_OBJECT][KEY_VISIBLE] = defaultObject.visible();
      config[KEY_DEFAULT_OBJECT][KEY_MODEL_MATRIX] = defaultObject.modelMatrix().toString();
      defaultObject.material().getConfig(config[KEY_DEFAULT_OBJECT]);

      for (var id in plugins) {
        if (plugins.hasOwnProperty(id)) {
          var plugin = plugins[id];
          var pluginConfig = {};
          pluginConfig[KEY_VISIBLE] = plugin.visible();
          pluginConfig[KEY_CONFIG] = plugin.on('config_requested')();

          config[KEY_PLUGINS][plugin.name()] = pluginConfig;
        }
      }

      var configUrl = location.protocol + location.hostname + location.pathname + '?' + encodeURIComponent(writeConfig(config));
      prompt('Config-Url (' + configUrl.length + ' chars):', configUrl);
    });

    $('#show_help_button').on('click', function() {
        window.open('help.html');
    });

    var toogleMenu = function(b) {
      if(b) {
        $('#menu').css('right', '100%');
        $(document.activeElement).blur();
      }
      else {
        $('#menu').css('right', '70%');
      }
    };

    $('#toogle_side_menu_button').on('click', function(e) {
      toogleMenu($('#menu').width() > 0.1);
    });

    $(window).bind('mousewheel', function(e) {
      toogleMenu(event.wheelDelta >= 0);
    });

    for(var i = 0; i < readyCallbacks.length; i++) {
      readyCallbacks[i]();
    }
    readyCallbacks = null;

    for(var id in plugins) {
      if(plugins.hasOwnProperty(id)) {
        engine.tooglePluginVisibility(id);
        $('#' + id + ' .item_close_button').prop('disabled', true);
      }
    }

    loadConfig(decodeURIComponent(location.search.substr(1, location.search.length - 1)));
  });

  return {
    onReady: function(f) {
      if(readyCallbacks == null)
        f();
      else
        readyCallbacks.push(f);
    },

    viewMatrix: function(m) {
      if(m !== undefined)
        mat4.copy(viewMatrix, m);

      return viewMatrix;
    },

    modelMatrix: function(m) {
      if(m !== undefined)
        mat4.copy(modelMatrix, m);

      return modelMatrix;
    },

    projectionMatrix: function(m) {
      if(m !== undefined)
        mat4.copy(projectionMatrix, m);

      return projectionMatrix;
    },

    program: function(p) {
      if(p !== undefined)
        usedProgram = p;

      return usedProgram;
    },

    light: function(l) {
      if(l !== undefined)
        usedLight = l;

      return usedLight;
    },

    defaultObject: function() {
      return defaultObject;
    },

    mouseMovement: function() {
      return {
        'dx': mouse.nx - mouse.lx,
        'dy': mouse.ny - mouse.ly,
      };
    },

    mousePos: function() {
      return {
        'x': mouse.nx,
        'y': mouse.ny,
      };
    },

    isKeyDown: function(key) {
      return keys.hasOwnProperty(key) && keys[key];
    },

    isMouseDown: function() {
      return mouse.down;
    },

    activePlugin: function() {
      return activePlugin;
    },

    registerPlugin: function(name) {
      var id = 'p' + getNextId();

      if(name === undefined || name === '')
        name = 'Plugin ' + id;

      var menuItem = '<div id="'
        + id
        + '"><input type="radio" class="menu_item" name="menu_item" id="radio'
        + id
        + '"></input><div class="item_header"><label class="item_label" for="radio'
        + id
        + '">'
        + name
        + '</label><button class="item_hide_button"</button>\
        <button class="item_close_button">X</button>\
        </div><div class="item_body"></div></div>';

      $('#menu').append(menuItem);
      $('#' + id + ' .item_hide_button').on('click', function() {
        var id = $(this).parent().parent().attr('id');
        engine.tooglePluginVisibility(id);
      });
      $('#' + id + ' .item_close_button').on('click', function() {
        var id = $(this).parent().parent().attr('id');
        engine.removePlugin(id);
      });

      var plugin = (function(){
        var mId = id;
        var mName = name;
        var mVisible = true;
        var mCallback = null;
        var mOn = {};
        var mArea = {
          x0: 0,
          y0: 0,
          x1: 0,
          y1: 0,
        };

        return {
          on: function(what, f) {
            if(f != undefined) {
              mOn[what.toString()] = f;
            }

            if(mOn.hasOwnProperty(what.toString())) {
              return mOn[what.toString()];
            }

            return function() {return "";};
          },
          visible: function(val) {
            if(val != undefined)
              mVisible = val;

            return mVisible;
          },
          html: function(html) {
            if(html != undefined)
              $('#' + mId + ' .item_body').html(html);

            return $('#' + mId);
          },
          id: function() {
            return mId;
          },
          name: function() {
            return mName;
          },
          area: function(x0, y0, x1, y1) {
            if(x0 !== undefined && y0 !== undefined && x1 !== undefined && y1 !== undefined) {
              mArea.x0 = x0;
              mArea.y0 = y0;
              mArea.x1 = x1;
              mArea.y1 = y1;
            }

            return mArea;
          },
          isInArea: function(x, y) {
            return mArea.x0 <= x && mArea.x1 >= x &&
              mArea.y0 <= y && mArea.y1 >= y;
          },
          viewWidth: function() {
            return mArea.x1 - mArea.x0;
          },
          viewHeight: function() {
            return mArea.y1 - mArea.y0;
          },
        };
      })();

      console.log('registered plugin ' + id + ' (' + name + ')');
      plugins[id] = plugin;

      if(activePlugin == null)
        activePlugin = plugin;

      return plugin;
    },

    /**
     * @param {String} id The Identifier of the plugin to remove.
     */
    removePlugin: function(id) {
      if(plugins.hasOwnProperty(id)) {
        plugins[id].on('destroy');

        delete plugins[id];
        console.log('removed plugin ' + id);

        $('#' + id).remove();

        if(activePlugin !== undefined && activePlugin.id() == id) {
          activePlugin = undefined;
        }
      }
      else {
        console.log('id ' + id + ' not found');
      }
    },

    /**
     * @param {String} id The Identifier of the plugin to hide.
     */
    tooglePluginVisibility: function(id) {
      if(plugins.hasOwnProperty(id)) {
        var plugin = plugins[id];

        if(plugin.visible(!plugin.visible())) {
          $('#' + id + ' .item_hide_button').css('background-image', 'url(../res/eye_open.png)');
          console.log('plugin ' + id + ' now visible');
          plugin.on('show')();

          if(activePlugin == null)
            activePlugin = plugins[id];
        }
        else {
          $('#' + id + ' .item_hide_button').css('background-image', 'url(../res/eye_closed.png)');
          console.log('plugin ' + id + ' now invisible');
          plugin.on('hide')();

          if(activePlugin != null && activePlugin.id() === id)
            activePlugin = null;
        }
      }
      else {
        console.log('id ' + id + ' not found');
      }
    },

    addObject: function(q, mode) {
      var vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      var interleavedVertexData = [];
      for(var i = 0; i < q.vertices.length / 3; i++) {
        interleavedVertexData.push(q.vertices[i * 3 + 0]);
        interleavedVertexData.push(q.vertices[i * 3 + 1]);
        interleavedVertexData.push(q.vertices[i * 3 + 2]);

        if(q.colors.length > i * 4 + 3) {
          interleavedVertexData.push(q.colors[i * 4 + 0]);
          interleavedVertexData.push(q.colors[i * 4 + 1]);
          interleavedVertexData.push(q.colors[i * 4 + 2]);
          interleavedVertexData.push(q.colors[i * 4 + 3]);
        }
        else {
          interleavedVertexData.push(0);
          interleavedVertexData.push(0);
          interleavedVertexData.push(0);
          interleavedVertexData.push(0);
        }

        if(q.normals.length >= i * 3 + 2) {
          interleavedVertexData.push(q.normals[i * 3 + 0]);
          interleavedVertexData.push(q.normals[i * 3 + 1]);
          interleavedVertexData.push(q.normals[i * 3 + 2]);
        }
        else {
          interleavedVertexData.push(0);
          interleavedVertexData.push(0);
          interleavedVertexData.push(0);
        }

        if(q.texCoords.length >= i * 2 + 1) {
          interleavedVertexData.push(q.texCoords[i * 2 + 0]);
          interleavedVertexData.push(q.texCoords[i * 2 + 1]);
        }
        else {
          interleavedVertexData.push(0);
          interleavedVertexData.push(0);
        }
      }

      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(interleavedVertexData), gl.STATIC_DRAW);
      var indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(q.indices), gl.STATIC_DRAW);

      var id = "o" + getNextId();
      objects[id] = (function() {
        var mModelMatrix = mat4.create();
        var mVisible = true;
        var mId = id;
        var mMaterial = util.createMaterial(
          vec4.fromValues(0.1, 0.1, 0.1, 1),
          vec4.fromValues(0.3, 0.3, 0.3, 1),
          vec4.fromValues(0.5, 0.5, 0.5, 1),
          vec4.fromValues(0.7, 0.7, 0.7, 1),
          1);

        var mVertexBuffer = vertexBuffer;
        var mIndexBuffer = indexBuffer;
        var mMode = mode;
        var mSize = q.indices.length;
        var mDescription = q.description;

        return {
          id: function() {
            return mId;
          },

          mode: function() {
            return mMode;
          },

          bind: function() {
            gl.bindBuffer(gl.ARRAY_BUFFER, mVertexBuffer);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mIndexBuffer);
          },

          render: function() {
            gl.drawElements(mMode, mSize, gl.UNSIGNED_SHORT, 0);
          },

          modelMatrix: function(m) {
            if(m !== undefined)
              mat4.copy(mModelMatrix, m);

            return mModelMatrix;
          },

          material: function(m) {
            if(m !== undefined)
              mMaterial = m;

            return mMaterial;
          },

          visible: function(b) {
            if(b !== undefined)
							mVisible = b;

            return mVisible;
          },

          description: function() {
            return mDescription;
          },

          destroy: function() {
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
            gl.deleteBuffer(mVertexBuffer);
            gl.deleteBuffer(mIndexBuffer);
          },
        };
      })();

      console.log("Added object " + id);

      return objects[id];
    },

    /**
     * Gets the Object defined by id.
     *
     * @param  {String} id The id of the object to get.
     * @return {Object}    The Object defined by id or undefined if there is no object with this id.
     */
    getObject: function(id) {
      if(objects.hasOwnProperty(id))
        return objects[id];

      return null;
    },

    /**
     * Removes the Object defined by the id.
     *
     * @param {String} id The of the object to remove.
     */
    removeObject: function(id) {
      if(objects.hasOwnProperty(id)) {
        objects[id].destroy();
        delete objects[id];
      }
    },
  };
})();
