'use strict';

var perspective = {};

engine.onReady(function() {
  const KEY_PROJ_MODE = 'projectionMode';
  const KEY_VIEW_MODE = 'viewMode';
  const KEY_CLIP_MODE = 'clipMode';
  const KEY_ORTHO_RANGE = 'orthoRange';
  const PROJ_MODE_PERSPECTIVE = 0;
  const PROJ_MODE_ORTHOGONAL = 1;
  const VIEW_MODE_FREE = 0;
  const VIEW_MODE_FRONT = 1;
  const VIEW_MODE_TOP = 2;
  const VIEW_MODE_RIGHT = 3;
  const VIEW_MODE_AX1 = 4;
  const CLIP_MODE_CLIP = 0;
  const CLIP_MODE_COLOR = 1;
  const CLIP_MODE_NONE = 2;
  const VIEW_MATRIX_MODE_NORMAL = 0;
  const VIEW_MATRIX_MODE_INVERTED = 1;
  var cameraObject;
  var viewFrustumObject;
  var vec3Buf = vec3.create();
  var vec3Buf2 = vec3.create();
  var vec3BufL1 = vec3.create();
  var vec3BufL2 = vec3.create();
  var vec3BufL3 = vec3.create();
  var quatBuf = quat.create();
  var mat4Buf = mat4.create();
  var mat4Buf2 = mat4.create();
  var mat4Buf3 = mat4.create();
  var mat4Buf4 = mat4.create();
  var mat4Buf5 = mat4.create();
  var camMatBuf = mat4.create();

  (function() {
    var viewFrustumModel = quadric.create();
    viewFrustumModel.vertices = [
      -1, -1, -1,
      -1, -1, 1,
      -1, 1, -1,
      -1, 1, 1,
      1, -1, -1,
      1, -1, 1,
      1, 1, -1,
      1, 1, 1
    ];

    viewFrustumModel.colors = [
      0, 0, 0, 1,
      0, 0, 0, 1,
      0, 0, 0, 1,
      0, 0, 0, 1,
      0, 0, 0, 1,
      0, 0, 0, 1,
      0, 0, 0, 1,
      0, 0, 0, 1,
    ];

    viewFrustumModel.indices = [
        0, 1, 0, 2,
        0, 4, 1, 3,
        1, 5, 2, 3,
        2, 6, 3, 7,
        4, 5, 4, 6,
        5, 7, 6, 7,
    ];

    viewFrustumModel.vertexCount = 8;

    viewFrustumObject = engine.addObject(viewFrustumModel, gl.LINES);
    viewFrustumObject.material(util.createMaterial(
      vec4.fromValues(0, 0, 0, 1),
      vec4.fromValues(0, 0, 0, 1),
      vec4.fromValues(0, 0, 0, 1),
      vec4.fromValues(0, 0, 0, 1),
      0));
    viewFrustumObject.visible(false);

    quadric.defaultColor(0.5, 0.4, 0.7, 1.0);
    var cameraModel = quadric.createSimpleCone(4, 4);
    mat4.fromScaling(mat4Buf, vec3.set(vec3Buf, 0.1, 0.1, 0.1));
    cameraModel.transform(mat4Buf);
    cameraObject = engine.addObject(cameraModel, gl.TRIANGLES);
    cameraObject.visible(false);
  })();

  perspective.worldSpace = (function() {
    var plugin = engine.registerPlugin('Worldspace', 'World Space');
    var cam = camera.create()
    var cameraMatrix = mat4.create();
    var projectionMode = PROJ_MODE_PERSPECTIVE;
    var viewMode = VIEW_MODE_FREE;
    var dist = 10;
    var size = 5;
    cam.position(vec3.set(vec3Buf, 1, 3, 4.5));
    cam.polar(5/8 * PI);
    cam.azimut(PI);
    cam.update(1);
    cam.cameraMatrix(cameraMatrix);

    plugin.on('callback', function(delta) {
      if(engine.activePlugin() !== null && engine.activePlugin().id() === plugin.id()) {
        cam.update(delta);
        cam.cameraMatrix(cameraMatrix);
      }

      if (projectionMode == PROJ_MODE_ORTHOGONAL) {
          var aspect=plugin.viewAspect();
	  var xs=1.0;
	  var ys=1.0;
	  if (aspect >= 1.0)
              xs=aspect;
          else
              ys=1.0/aspect;
          mat4.ortho(mat4Buf, -size*xs, size*xs, -size*ys, size*ys, 0, (size+dist<50.0)?50.0:size+dist);
      } else {
          mat4.perspective(mat4Buf, glMatrix.toRadian(70), plugin.viewAspect(), 0.05, 50.0);
      }
      engine.projectionMatrix(mat4Buf);
      switch (viewMode) {
        case(VIEW_MODE_FRONT):
          vec3.set(vec3BufL1, 0,0,dist);
          vec3.set(vec3BufL2, 0,0,0);
          vec3.set(vec3BufL3, 0,1,0);
          mat4.lookAt(camMatBuf, vec3BufL1, vec3BufL2, vec3BufL3);
          break;
        case(VIEW_MODE_TOP):
          vec3.set(vec3BufL1, 0,dist,0);
          vec3.set(vec3BufL2, 0,0,0);
          vec3.set(vec3BufL3, 0,0,-1);
          mat4.lookAt(camMatBuf, vec3BufL1, vec3BufL2, vec3BufL3);
          break;
        case(VIEW_MODE_RIGHT):
          vec3.set(vec3BufL1, dist,0,0);
          vec3.set(vec3BufL2, 0,0,0);
          vec3.set(vec3BufL3, 0,1,0);
          mat4.lookAt(camMatBuf, vec3BufL1, vec3BufL2, vec3BufL3);
          break;
        case(VIEW_MODE_AX1):
          vec3.set(vec3BufL1, 0.25*dist,dist,dist);
          vec3.set(vec3BufL2, 0,0,0);
          vec3.set(vec3BufL3, 0,1,0);
          mat4.lookAt(camMatBuf, vec3BufL1, vec3BufL2, vec3BufL3);
          break;
        default:
          if (projectionMode == PROJ_MODE_ORTHOGONAL) {
              mat4.copy(camMatBuf, cameraMatrix);
              camMatBuf[12]=0.0;
              camMatBuf[13]=0.0;
              camMatBuf[14]=-dist;
	  } else {
              mat4.copy(camMatBuf, cameraMatrix);
	  }
      }
      engine.viewMatrix(camMatBuf);
      mat4.identity(mat4Buf);
      engine.modelMatrix(mat4Buf);

      if(perspective.finalView.inverseCameraMatrix() !== null) {
        cameraObject.modelMatrix(perspective.finalView.inverseCameraMatrix());
      }
      else {
        mat4.identity(mat4Buf);
        cameraObject.modelMatrix(mat4Buf);
      }

      if(perspective.finalView.inverseProjectionMatrix() !== null &&
        perspective.finalView.inverseCameraMatrix() !== null &&
        !isNaN(perspective.finalView.near()) &&
        mat4.mul(mat4Buf, perspective.finalView.inverseCameraMatrix(), perspective.finalView.inverseProjectionMatrix()) !== null)
          viewFrustumObject.modelMatrix(mat4Buf);
      else {
        mat4.identity(mat4Buf);
        viewFrustumObject.modelMatrix(mat4Buf);
      }
      cameraObject.visible(perspective.finalView.isVisible());
      viewFrustumObject.visible(perspective.finalView.isVisible());
    });

    plugin.on('release', function() {
      cameraObject.visible(false);
      viewFrustumObject.visible(false);
    });

    plugin.html('\
      <table id="world_params">\
        <tr><td>Projection mode<label></td><td><select id="world_proj" size="1">\
          <option value="' + PROJ_MODE_PERSPECTIVE + '">perspective</option>\
          <option value="' + PROJ_MODE_ORTHOGONAL + '">orthogonal</option></select></td></tr>\
        <tr><td>View<label></td><td><select id="world_view" size="1">\
          <option value="' + VIEW_MODE_FREE + '">free camera</option>\
          <option value="' + VIEW_MODE_FRONT+ '">front (view xy plane)</option>\
          <option value="' + VIEW_MODE_TOP  + '">top (view xz plane)</option>\
          <option value="' + VIEW_MODE_RIGHT+ '">right (view yz plane)</option>\
          <option value="' + VIEW_MODE_AX1  + '">skewed</option></select></td></tr>\
        <tr><td>Ortho range</td><td><input type="range" id="world_size_slider" min="1" max="100" step="1" value="5"/></td><td><span id="world_size_text"/></td></tr>\
      </table>');
  
    plugin.html().find('#world_size_slider').on('mousemove', function() {
        $(this).parent().next().find('#world_size_text').html($(this).val());
        size=parseFloat($(this).val());
    }).trigger('mousemove');
    plugin.html().find('#world_proj').on('change', function() {
      projectionMode = parseInt($(this).val());
    });
  
    plugin.html().find('#world_view').on('change', function() {
      viewMode = parseInt($(this).val());
    });

    plugin.on('config_requested', function() {
      var config = cam.getConfig({});
      config[KEY_PROJ_MODE] = projectionMode;
      config[KEY_VIEW_MODE] = viewMode;
      config[KEY_ORTHO_RANGE] = size;
      return config;
    });

    plugin.on('config_loaded', function(config) {
      cam = camera.createFromConfig(config);
      cam.update(1);
      cam.cameraMatrix(cameraMatrix);

      if(config.hasOwnProperty(KEY_PROJ_MODE))
        projectionMode = parseInt(config[KEY_PROJ_MODE]);
      if(config.hasOwnProperty(KEY_PROJ_MODE))
        viewMode = parseInt(config[KEY_VIEW_MODE]);
      if(config.hasOwnProperty(KEY_ORTHO_RANGE))
        size = parseFloat(config[KEY_ORTHO_RANGE]);
      setState();
    });

    var setState = function() {
      plugin.html().find('#world_proj').val(projectionMode);
      plugin.html().find('#world_view').val(viewMode);
      plugin.html().find('#world_size_slider').val(size);
      plugin.html().find('#world_size_slider').trigger('mousemove');
    }

    setState();

    return {
      camera: function() {
        return cam;
      },
    };
  })();

  perspective.cameraSpace = (function() {
    var plugin = engine.registerPlugin('Cameraspace','Eye Space');
    var cam = camera.create();
    var cameraMatrix = mat4.create();
    var projectionMode = PROJ_MODE_PERSPECTIVE;
    var viewMode = VIEW_MODE_FREE;
    var dist = 10;
    var size = 5;
    cam.position(vec3.set(vec3Buf, -3.5, 1, 1));
    cam.polar(0.6 * PI);
    cam.azimut(0.7 * PI);
    cam.update(1);
    cam.cameraMatrix(cameraMatrix);

    plugin.on('callback', function(delta) {
      if(engine.activePlugin() !== null && engine.activePlugin().id() === plugin.id()) {
        cam.update(delta);
        cam.cameraMatrix(cameraMatrix);
      }

      if (projectionMode == PROJ_MODE_ORTHOGONAL) {
          var aspect=plugin.viewAspect();
	  var xs=1.0;
	  var ys=1.0;
	  if (aspect >= 1.0)
              xs=aspect;
          else
              ys=1.0/aspect;
          mat4.ortho(mat4Buf, -size*xs, size*xs, -size*ys, size*ys, 0, (size+dist<50.0)?50.0:size+dist);
      } else {
          mat4.perspective(mat4Buf, glMatrix.toRadian(70), plugin.viewAspect(), 0.05, 50.0);
      }
      engine.projectionMatrix(mat4Buf);
      switch (viewMode) {
        case(VIEW_MODE_FRONT):
          vec3.set(vec3BufL1, 0,0,dist);
          vec3.set(vec3BufL2, 0,0,0);
          vec3.set(vec3BufL3, 0,1,0);
          mat4.lookAt(camMatBuf, vec3BufL1, vec3BufL2, vec3BufL3);
          break;
        case(VIEW_MODE_TOP):
          vec3.set(vec3BufL1, 0,dist,0);
          vec3.set(vec3BufL2, 0,0,0);
          vec3.set(vec3BufL3, 0,0,-1);
          mat4.lookAt(camMatBuf, vec3BufL1, vec3BufL2, vec3BufL3);
          break;
        case(VIEW_MODE_RIGHT):
          vec3.set(vec3BufL1, dist,0,0);
          vec3.set(vec3BufL2, 0,0,0);
          vec3.set(vec3BufL3, 0,1,0);
          mat4.lookAt(camMatBuf, vec3BufL1, vec3BufL2, vec3BufL3);
          break;
        case(VIEW_MODE_AX1):
          vec3.set(vec3BufL1, 0.25*dist,dist,dist);
          vec3.set(vec3BufL2, 0,0,0);
          vec3.set(vec3BufL3, 0,1,0);
          mat4.lookAt(camMatBuf, vec3BufL1, vec3BufL2, vec3BufL3);
          break;
        default:
          if (projectionMode == PROJ_MODE_ORTHOGONAL) {
              mat4.copy(camMatBuf, cameraMatrix);
              camMatBuf[12]=0.0;
              camMatBuf[13]=0.0;
              camMatBuf[14]=-dist;
	  } else {
              mat4.copy(camMatBuf, cameraMatrix);
	  }
      }
      engine.viewMatrix(camMatBuf);
      if(perspective.finalView.cameraMatrix() !== null)
        engine.modelMatrix(perspective.finalView.cameraMatrix());

      if(perspective.finalView.inverseCameraMatrix() !== null)
          cameraObject.modelMatrix(perspective.finalView.inverseCameraMatrix());

      if(!isNaN(perspective.finalView.near()) &&
        perspective.finalView.inverseProjectionMatrix() !== null &&
        perspective.finalView.inverseCameraMatrix() !== null &&
        mat4.mul(mat4Buf, perspective.finalView.inverseCameraMatrix(), perspective.finalView.inverseProjectionMatrix()) !== null)
          viewFrustumObject.modelMatrix(mat4Buf);
      cameraObject.visible(perspective.finalView.isVisible());
      viewFrustumObject.visible(perspective.finalView.isVisible());
    });

    plugin.on('release', function() {
      cameraObject.visible(false);
      viewFrustumObject.visible(false);
    });

    plugin.html('\
      <table id="cam_params">\
        <tr><td>Projection mode<label></td><td><select id="cam_proj" size="1">\
          <option value="' + PROJ_MODE_PERSPECTIVE + '">perspective</option>\
          <option value="' + PROJ_MODE_ORTHOGONAL + '">orthogonal</option></select></td></tr>\
        <tr><td>View<label></td><td><select id="cam_view" size="1">\
          <option value="' + VIEW_MODE_FREE + '">free camera</option>\
          <option value="' + VIEW_MODE_FRONT+ '">front (view xy plane)</option>\
          <option value="' + VIEW_MODE_TOP  + '">top (view xz plane)</option>\
          <option value="' + VIEW_MODE_RIGHT+ '">right (view yz plane)</option>\
          <option value="' + VIEW_MODE_AX1  + '">skewed</option></select></td></tr>\
        <tr><td>Ortho range</td><td><input type="range" id="cam_size_slider" min="1" max="100" step="1" value="5"/></td><td><span id="cam_size_text"/></td></tr>\
      </table>');
  
    plugin.html().find('#cam_size_slider').on('mousemove', function() {
        $(this).parent().next().find('#cam_size_text').html($(this).val());
        size=parseFloat($(this).val());
    }).trigger('mousemove');
    plugin.html().find('#cam_proj').on('change', function() {
      projectionMode = parseInt($(this).val());
    });
  
    plugin.html().find('#cam_view').on('change', function() {
      viewMode = parseInt($(this).val());
    });

    plugin.on('config_requested', function() {
      var config = cam.getConfig({});
      config[KEY_PROJ_MODE] = projectionMode;
      config[KEY_VIEW_MODE] = viewMode;
      config[KEY_ORTHO_RANGE] = size;
      return config;
    });

    plugin.on('config_loaded', function(config) {
      cam = camera.createFromConfig(config);
      cam.update(1);
      cam.cameraMatrix(cameraMatrix);

      if(config.hasOwnProperty(KEY_PROJ_MODE))
        projectionMode = parseInt(config[KEY_PROJ_MODE]);
      if(config.hasOwnProperty(KEY_PROJ_MODE))
        viewMode = parseInt(config[KEY_VIEW_MODE]);
      if(config.hasOwnProperty(KEY_ORTHO_RANGE))
        size = parseFloat(config[KEY_ORTHO_RANGE]);
      setState();
    });

    var setState = function() {
      plugin.html().find('#cam_proj').val(projectionMode);
      plugin.html().find('#cam_view').val(viewMode);
      plugin.html().find('#cam_size_slider').val(size);
      plugin.html().find('#cam_size_slider').trigger('mousemove');
    }

    setState();

    return {
      camera: function() {
        return cam;
      },
    };
  })();

  perspective.ndc = (function() {
    var program = util.createProgram(util.createShader(
      'precision highp float;\
      uniform mat4 modelViewMatrix;\
      uniform mat4 projectionMatrix;\
      uniform mat4 correctionMatrix;\
      uniform mat4 invViewMatrix;\
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
      varying vec4 pass_pos;\
      \
      void main() {\
          eyePos = correctionMatrix * modelViewMatrix * vec4(in_pos, 1);\
          gl_Position = projectionMatrix * modelViewMatrix * vec4(in_pos, 1);\
          \
          pass_nrm =  normalize(correctionMatrix * modelViewMatrix * vec4(in_pos + in_nrm, 1) - eyePos);\
          pass_pos = invViewMatrix * modelViewMatrix * vec4(in_pos,1);\
          pass_col = in_col;\
          pass_txc = in_txc;\
      }', gl.VERTEX_SHADER), util.createShader(
      'precision highp float;\
      uniform vec4 lightPosition;\
      uniform vec4 lightAmbient;\
      uniform vec4 lightDiffuse;\
      uniform vec4 lightSpecular;\
      uniform vec3 attenuation;\
      uniform mat4 correctionMatrix;\
      \
      uniform vec4 materialEmission;\
      uniform vec4 materialAmbient;\
      uniform vec4 materialDiffuse;\
      uniform vec4 materialSpecular;\
      uniform float materialShininess;\
      \
      uniform int clipMode;\
      \
      varying vec4 eyePos;\
      varying vec4 pass_col;\
      varying vec4 pass_nrm;\
      varying vec2 pass_txc;\
      varying vec4 pass_pos;\
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
        vec4 L = normalize(correctionMatrix * lightPosition - eyePos);\
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
        if ((pass_pos.w <= 0.0) || any(greaterThan(abs(pass_pos.xyz),vec3(1.0001*pass_pos.w)))) {\
	  if (clipMode == 0)\
            discard;\
          else if (clipMode == 1)\
	    color.rgb=mix(color.rgb,vec3(1),0.8);\
        }\
        gl_FragColor = color;\
      }', gl.FRAGMENT_SHADER),
      ['projectionMatrix', 'correctionMatrix', 'invViewMatrix', 'modelViewMatrix', 'normalMatrix',
        'lightPosition', 'lightAmbient', 'lightDiffuse', 'lightSpecular', 'attenuation',
        'materialEmission', 'materialAmbient', 'materialDiffuse', 'materialSpecular', 'materialShininess'],
      ['in_pos', 'in_col', 'in_nrm', 'in_txc']);

    var plugin = engine.registerPlugin('Normalized Device Coordinates');
    var cam = camera.create()
    var cameraMatrix = mat4.create();
    var projectionMode = PROJ_MODE_PERSPECTIVE;
    var viewMode = VIEW_MODE_FREE;
    var clipMode = CLIP_MODE_CLIP;
    var dist = 3.0;
    var size = 2.0;
    cam.position(vec3.set(vec3Buf, 0, 1, 3));
    cam.azimut(PI);
    cam.polar(0.6 * PI);
    cam.update(1);
    cam.cameraMatrix(cameraMatrix);

    plugin.on('callback', function(delta) {
      if(engine.activePlugin() !== null && engine.activePlugin().id() === plugin.id()) {
        cam.update(delta);
        cam.cameraMatrix(cameraMatrix);
      }

      if (projectionMode == PROJ_MODE_ORTHOGONAL) {
          var aspect=plugin.viewAspect();
	  var xs=1.0;
	  var ys=1.0;
	  if (aspect >= 1.0)
              xs=aspect;
          else
              ys=1.0/aspect;
          mat4.ortho(mat4Buf, -size*xs, size*xs, -size*ys, size*ys, 0, (size+dist<50.0)?50.0:size+dist);
      } else {
          mat4.perspective(mat4Buf, glMatrix.toRadian(70), plugin.viewAspect(), 0.05, 50.0);
      }
      engine.projectionMatrix(mat4Buf);
      vec3.set(vec3Buf2,-1,1,1);
      mat4.fromScaling(mat4Buf4, vec3Buf2);
      switch (viewMode) {
        case(VIEW_MODE_FRONT):
          vec3.set(vec3BufL1, 0,0,-dist);
          vec3.set(vec3BufL2, 0,0,0);
          vec3.set(vec3BufL3, 0,1,0);
          mat4.lookAt(camMatBuf, vec3BufL1, vec3BufL2, vec3BufL3);
          break;
        case(VIEW_MODE_TOP):
          vec3.set(vec3BufL1, 0,dist,0);
          vec3.set(vec3BufL2, 0,0,0);
          vec3.set(vec3BufL3, 0,0,1);
          mat4.lookAt(camMatBuf, vec3BufL1, vec3BufL2, vec3BufL3);
          break;
        case(VIEW_MODE_RIGHT):
          vec3.set(vec3BufL1, -dist,0,0);
          vec3.set(vec3BufL2, 0,0,0);
          vec3.set(vec3BufL3, 0,1,0);
          mat4.lookAt(camMatBuf, vec3BufL1, vec3BufL2, vec3BufL3);
          break;
        case(VIEW_MODE_AX1):
          vec3.set(vec3BufL1, -0.25*dist,dist,-dist);
          vec3.set(vec3BufL2, 0,0,0);
          vec3.set(vec3BufL3, 0,1,0);
          mat4.lookAt(camMatBuf, vec3BufL1, vec3BufL2, vec3BufL3);
          break;
        default:
          if (projectionMode == PROJ_MODE_ORTHOGONAL) {
              mat4.copy(camMatBuf, cameraMatrix);
              camMatBuf[12]=0.0;
              camMatBuf[13]=0.0;
              camMatBuf[14]=-dist;
	  } else {
              mat4.copy(camMatBuf, cameraMatrix);
	  }
      }
      mat4.mul(mat4Buf5, camMatBuf, mat4Buf4);
      mat4.invert(mat4Buf2, perspective.finalView.projectionMatrix());
      mat4.invert(mat4Buf3, mat4Buf5);
      engine.correctionMatrix(mat4.mul(mat4Buf, mat4Buf2, mat4Buf3));
      engine.viewMatrix(mat4Buf5);
      engine.modelMatrix(mat4.mul(mat4Buf, perspective.finalView.projectionMatrix(), perspective.finalView.cameraMatrix()));

      engine.program(program);
      gl.useProgram(program.id());
      program.bufferClipMode(clipMode);

      viewFrustumObject.visible(true);

      if(mat4.invert(mat4Buf, mat4Buf) != null)
        viewFrustumObject.modelMatrix(mat4Buf);
      else
        viewFrustumObject.modelMatrix(mat4.identity(mat4Buf));

      cameraObject.visible(false);
    });

    plugin.on('release', function() {
      cameraObject.visible(false);
      viewFrustumObject.visible(false);
    });

    plugin.html('\
      <table id="ndc_params">\
        <tr><td>Projection mode<label></td><td><select id="ndc_proj" size="1">\
          <option value="' + PROJ_MODE_PERSPECTIVE + '">perspective</option>\
          <option value="' + PROJ_MODE_ORTHOGONAL + '">orthogonal</option></select></td></tr>\
        <tr><td>View<label></td><td><select id="ndc_view" size="1">\
          <option value="' + VIEW_MODE_FREE + '">free camera</option>\
          <option value="' + VIEW_MODE_FRONT+ '">front (view xy plane)</option>\
          <option value="' + VIEW_MODE_TOP  + '">top (view xz plane)</option>\
          <option value="' + VIEW_MODE_RIGHT+ '">right (view yz plane)</option>\
          <option value="' + VIEW_MODE_AX1  + '">skewed</option></select></td></tr>\
        <tr><td>Clipping<label></td><td><select id="ndc_clip" size="1">\
          <option value="' + CLIP_MODE_CLIP + '">visualize clipping</option>\
          <option value="' + CLIP_MODE_COLOR+ '">color clipped regions</option>\
          <option value="' + CLIP_MODE_NONE + '">no clipping</option></select></td></tr>\
        <tr><td>Ortho range</td><td><input type="range" id="ndc_size_slider" min="0.1" max="10.0" value="2.0" step="0.1"/></td><td><span id="ndc_size_text"/></td></tr>\
      </table>');
  
    plugin.html().find('#ndc_size_slider').on('mousemove', function() {
        $(this).parent().next().find('#ndc_size_text').html($(this).val());
        size=parseFloat($(this).val());
    }).trigger('mousemove');

    plugin.html().find('#ndc_proj').on('change', function() {
      projectionMode = parseInt($(this).val());
    });
  
    plugin.html().find('#ndc_view').on('change', function() {
      viewMode = parseInt($(this).val());
    });

    plugin.html().find('#ndc_clip').on('change', function() {
      clipMode = parseInt($(this).val());
    });

    plugin.on('config_requested', function() {
      var config = cam.getConfig({});
      config[KEY_PROJ_MODE] = projectionMode;
      config[KEY_VIEW_MODE] = viewMode;
      config[KEY_CLIP_MODE] = clipMode;
      config[KEY_ORTHO_RANGE] = size;
      return config;
    });

    plugin.on('config_loaded', function(config) {
      cam = camera.createFromConfig(config);
      cam.update(1);
      cam.cameraMatrix(cameraMatrix);

      if(config.hasOwnProperty(KEY_PROJ_MODE))
        projectionMode = parseInt(config[KEY_PROJ_MODE]);
      if(config.hasOwnProperty(KEY_PROJ_MODE))
        viewMode = parseInt(config[KEY_VIEW_MODE]);
      if(config.hasOwnProperty(KEY_CLIP_MODE))
        clipMode = parseInt(config[KEY_CLIP_MODE]);
      if(config.hasOwnProperty(KEY_ORTHO_RANGE))
        size = parseFloat(config[KEY_ORTHO_RANGE]);
      setState();
    });

    var setState = function() {
      plugin.html().find('#ndc_proj').val(projectionMode);
      plugin.html().find('#ndc_view').val(viewMode);
      plugin.html().find('#ndc_clip').val(clipMode);
      plugin.html().find('#ndc_size_slider').val(size);
      plugin.html().find('#ndc_size_slider').trigger('mousemove');
    }

    setState();

    return {
      camera: function() {
        return cam;
      }
    };
  })();

  perspective.finalView = (function() {
    var projectionMatrix = mat4.create();
    var cameraMatrix = mat4.create();
    var overrideViewMatrix = mat4.create();
    var inverseProjectionMatrix = mat4.create();
    var inverseCameraMatrix = mat4.create();
    var plugin = engine.registerPlugin('Final View');
    var cam = camera.create()
    var fov = 70, near = 0.05, far = 50.0, as = 1.0;
    var manualFrustumSet = false;
    var manualViewSet = false;
    var viewMatMode = VIEW_MATRIX_MODE_NORMAL;

    const KEY_FOV = 'fov';
    const KEY_NEAR = 'near';
    const KEY_FAR = 'far';
    const KEY_ASPECTRATIO = 'as';
    const KEY_VIEW_MAT_MODE = 'vmm';
    const KEY_MANUAL_FRUSTUM = 'frustum';
    const KEY_MANUAL_VIEW = 'view';

    cam.position(vec3.set(vec3Buf, 2, 2, 2));
    cam.azimut(5/4 * PI);
    cam.polar(2/3 * PI);
    cam.update(1);
    cam.cameraMatrix(cameraMatrix);

    plugin.html(
        '<label>view matrix: </label>\
          <select id="view_mat_mode" size="1">\
          <option value="' + VIEW_MATRIX_MODE_NORMAL + '">show as-is</option>\
          <option value="' + VIEW_MATRIX_MODE_INVERTED + '">show inverse</option></select>\
          <table id="manual_view">\
            <tr><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td></tr>\
            <tr><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td></tr>\
            <tr><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td></tr>\
            <tr><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td></tr>\
          </table>\
        <hr/><label>Set simple view frustum</label>\
        <table id="simple_frustum">\
          <tr>\
            <td>Fov</td><td><input type="range" id="fov_slider" min="1" max="179"/></td><td><span id="fov_text"/></td>\
          </tr><tr>\
            <td>Nearplane</td><td><input type="text" id="near_text"/></td>\
          </tr><tr>\
            <td>Farplane</td><td><input type="text" id="far_text"/></td>\
          </tr><tr>\
            <td>Aspect Adjust</td><td><input type="text" id="aspect_ratio_text" value="1.0" /></td>\
          </tr></table>\
        <hr/><label>Set custom projection matrix</label>\
          <table id="manual_frustum">\
            <tr><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td></tr>\
            <tr><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td></tr>\
            <tr><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td></tr>\
            <tr><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td></tr>\
          </table>');

    plugin.html().find('#manual_view input[type="text"]').css('width', '4em');
    plugin.html().find('#manual_frustum input[type="text"]').css('width', '4em');

    plugin.html().find('#simple_frustum input').css('width', '80px');

    plugin.html().find('#fov_slider').on('mousemove', function() {
        $(this).parent().next().find('#fov_text').html($(this).val());
        if (!manualFrustumSet)
          plugin.html().find('#simple_frustum input').trigger('change');
    }).trigger('mousemove');

    plugin.on('callback', function(delta) {
      if(engine.activePlugin() !== null && engine.activePlugin().id() === plugin.id()) {
        cam.update(delta);
        if (cam.isDirty()) {
          setViewState();
          manualViewSet=false;
	}
      }
      if (manualViewSet) {
        mat4.copy(cameraMatrix, overrideViewMatrix);
      } else {
        cam.cameraMatrix(cameraMatrix);
      }

      if(!manualFrustumSet)
        mat4.perspective(projectionMatrix, glMatrix.toRadian(fov), as * plugin.viewAspect(), near, far);

      engine.projectionMatrix(projectionMatrix);
      engine.viewMatrix(cameraMatrix);

      mat4.identity(mat4Buf);
      engine.modelMatrix(mat4Buf);

      if(mat4.invert(mat4Buf, projectionMatrix) !== null)
        mat4.copy(inverseProjectionMatrix, mat4Buf);

      if(mat4.invert(mat4Buf, cameraMatrix) !== null)
        mat4.copy(inverseCameraMatrix, mat4Buf);

      cameraObject.visible(false);
      viewFrustumObject.visible(false);
    });
    plugin.on('callback')();

    plugin.on('release', function() {
      cameraObject.visible(false);
      viewFrustumObject.visible(false);
    });

    plugin.html().find('#simple_frustum input').on('change', function() {
      var div = plugin.html();
      var nFov = div.find('#fov_slider').val();
      var nNear = parseFloat(div.find('#near_text').val());
      var nFar = parseFloat(div.find('#far_text').val());
      var nAs = parseFloat(div.find('#aspect_ratio_text').val());

      if(isNaN(nFov) || isNaN(nNear) || isNaN(nFar) || isNaN(nAs)) {
        console.warn('some values are Nan: fov: ' + nFov + ', near: ' + nNear + ', far: ' + nFar + ', as: ' + nAs);
      }
      else {
        fov = nFov;
        near = nNear;
        far = nFar;
        as = nAs;
      }

      mat4.perspective(projectionMatrix, glMatrix.toRadian(fov), as * plugin.viewAspect(), near, far);
      manualFrustumSet = false;

      var matrixCells = plugin.html().find('#manual_frustum input');

      for(var i = 0; i < matrixCells.length; i++) {
        $(matrixCells[i]).val(projectionMatrix[Math.floor(i / 4) + 4 * (i % 4)]);
      }

      plugin.html().find('#simple_frustum input').css('color', 'black');
      matrixCells.css('color', 'lightgrey');
    });

    plugin.html().find('#manual_frustum input').on('change', function() {
      manualFrustumSet = true;

      var matrixCells = plugin.html().find('#manual_frustum input');

      for(var i = 0; i < matrixCells.length; i++) {
        projectionMatrix[Math.floor(i / 4) + 4 * (i % 4)] = parseFloat($(matrixCells[i]).val());
      }

      plugin.html().find('#simple_frustum input').css('color', 'lightgrey');
      matrixCells.css('color', 'black');
    });

    plugin.html().find('#manual_view input').on('change', function() {
      manualViewSet = true;

      var matrixCells = plugin.html().find('#manual_view input');

      for(var i = 0; i < matrixCells.length; i++) {
        mat4Buf[Math.floor(i / 4) + 4 * (i % 4)] = parseFloat($(matrixCells[i]).val());
      }
      if (viewMatMode == VIEW_MATRIX_MODE_INVERTED) {
        mat4.invert(overrideViewMatrix, mat4Buf);
      } else {
        mat4.copy(overrideViewMatrix, mat4Buf);
      }
      cam.setFromMatrix(overrideViewMatrix);
    });

    plugin.html().find('#view_mat_mode').on('change', function() {
      viewMatMode = parseInt($(this).val());
      setViewState();
    });

    plugin.html().find('#simple_frustum input').trigger('change');

    plugin.on('config_requested', function() {
      var config = cam.getConfig({});
      config[KEY_FOV] = fov;
      config[KEY_NEAR] = near;
      config[KEY_FAR] = far;
      config[KEY_ASPECTRATIO] = as;
      config[KEY_VIEW_MAT_MODE] = viewMatMode;

      if(manualFrustumSet) {
        config[KEY_MANUAL_FRUSTUM] = projectionMatrix.toString();
      }
      if(manualViewSet) {
        config[KEY_MANUAL_VIEW] = overrideViewMatrix.toString();
      }

      return config;
    });

    plugin.on('config_loaded', function(config) {
      cam = camera.createFromConfig(config);
      cam.update(1);
      cam.cameraMatrix(cameraMatrix);

      if(config.hasOwnProperty(KEY_FOV))
        fov = parseFloat(config[KEY_FOV]);
      if(config.hasOwnProperty(KEY_NEAR))
        near = parseFloat(config[KEY_NEAR]);
      if(config.hasOwnProperty(KEY_FAR))
        far = parseFloat(config[KEY_FAR]);
      if(config.hasOwnProperty(KEY_ASPECTRATIO))
        as = parseFloat(config[KEY_ASPECTRATIO]);
      if(config.hasOwnProperty(KEY_ASPECTRATIO))
        viewMatMode = parseInt(config[KEY_VIEW_MAT_MODE]);
      var matrixCells = plugin.html().find('#manual_frustum input');
      if(config.hasOwnProperty(KEY_MANUAL_FRUSTUM)) {
        projectionMatrix = util.parseMat4(mat4.create(), config[KEY_MANUAL_FRUSTUM]);
        manualFrustumSet=true;
        matrixCells.css('color', 'black');
      } else {
        manualFrustumSet=false;
        matrixCells.css('color', 'lightgrey');
      }
      if(config.hasOwnProperty(KEY_MANUAL_VIEW)) {
        overrideViewMatrix = util.parseMat4(mat4.create(), config[KEY_MANUAL_VIEW]);
        manualViewSet=true;
        cam.setFromMatrix(overrideViewMatrix);
      } else {
        manualViewSet=false;
      }

      setState();
    });

    var setViewState = function() {
      var viewMatrixCells = plugin.html().find('#manual_view input');
      if (viewMatMode == VIEW_MATRIX_MODE_INVERTED) {
        mat4.invert(mat4Buf, cameraMatrix);
      } else {
        mat4.copy(mat4Buf, cameraMatrix);
      }
      for(var i = 0; i < viewMatrixCells.length; i++) {
        $(viewMatrixCells[i]).val(mat4Buf[4 * (i % 4) + Math.floor(i / 4)].toFixed(3));
      }
    }

    var setState = function() {
      plugin.html().find('#view_mat_mode').val(viewMatMode);
      setViewState();
      var matrixCells = plugin.html().find('#manual_frustum input');
      for(var i = 0; i < matrixCells.length; i++) {
        $(matrixCells[i]).val(projectionMatrix[4 * (i % 4) + Math.floor(i / 4)].toFixed(3));
      }

      plugin.html().find('#fov_slider').val(fov);
      plugin.html().find('#near_text').val(near);
      plugin.html().find('#far_text').val(far);
      plugin.html().find('#aspect_ratio_text').val(as);
      plugin.html().find('#fov_slider').trigger('mousemove');
    }


    setState();

    return {
      projectionMatrix: function() {
        return projectionMatrix;
      },
      cameraMatrix: function() {
        return cameraMatrix;
      },
      inverseProjectionMatrix: function() {
        return inverseProjectionMatrix;
      },
      inverseCameraMatrix: function() {
        return inverseCameraMatrix;
      },
      near: function() {
        return near;
      },
      far: function() {
        return far;
      },
      isVisible: function() {
        return plugin.visible();
      },
    };
  })();
});
