'use strict';

var perspective = {};

engine.onReady(function() {
  var cameraObject;
  var viewFrustumObject;
  var vec3Buf = vec3.create();
  var quatBuf = quat.create();
  var mat4Buf = mat4.create();

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
    var plugin = engine.registerPlugin('Worldspace');
    var cam = camera.create()
    var cameraMatrix = mat4.create();
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

      mat4.perspective(mat4Buf, glMatrix.toRadian(70), plugin.viewWidth() / plugin.viewHeight(), 0.05, 100.0);
      engine.projectionMatrix(mat4Buf);
      engine.viewMatrix(cameraMatrix);
      mat4.identity(mat4Buf);
      engine.modelMatrix(mat4Buf);

      cameraObject.visible(true);

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
      viewFrustumObject.visible(true);
    });

    plugin.on('release', function() {
      cameraObject.visible(false);
      viewFrustumObject.visible(false);
    });

    plugin.on('config_requested', function() {
      return cam.getConfig({});
    });

    plugin.on('config_loaded', function(config) {
      cam = camera.createFromConfig(config);
      cam.update(1);
      cam.cameraMatrix(cameraMatrix);
    });

    return {
      camera: function() {
        return cam;
      },
    };
  })();

  perspective.cameraSpace = (function() {
    var plugin = engine.registerPlugin('Cameraspace');
    var cam = camera.create();
    var cameraMatrix = mat4.create();
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

      mat4.perspective(mat4Buf, glMatrix.toRadian(70), plugin.viewWidth() / plugin.viewHeight(), 0.05, 100.0);
      engine.projectionMatrix(mat4Buf);
      engine.viewMatrix(cameraMatrix);
      if(perspective.finalView.cameraMatrix() !== null)
        engine.modelMatrix(perspective.finalView.cameraMatrix());

      cameraObject.visible(true);
      if(perspective.finalView.inverseCameraMatrix() !== null)
          cameraObject.modelMatrix(perspective.finalView.inverseCameraMatrix());

      viewFrustumObject.visible(true);
      if(!isNaN(perspective.finalView.near()) &&
        perspective.finalView.inverseProjectionMatrix() !== null &&
        perspective.finalView.inverseCameraMatrix() !== null &&
        mat4.mul(mat4Buf, perspective.finalView.inverseCameraMatrix(), perspective.finalView.inverseProjectionMatrix()) !== null)
          viewFrustumObject.modelMatrix(mat4Buf);
    });

    plugin.on('release', function() {
      cameraObject.visible(false);
      viewFrustumObject.visible(false);
    });

    plugin.on('config_requested', function() {
      return cam.getConfig({});
    });

    plugin.on('config_loaded', function(config) {
      cam = camera.createFromConfig(config);
      cam.update(1);
      cam.cameraMatrix(cameraMatrix);
    });

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
          \
          pass_nrm =  eyePos - modelViewMatrix * vec4(in_pos + in_nrm, 1);\
          pass_col = in_col;\
          pass_txc = in_txc;\
      }', gl.VERTEX_SHADER), util.createShader(
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
      }', gl.FRAGMENT_SHADER),
      ['projectionMatrix', 'modelViewMatrix', 'normalMatrix',
        'lightPosition', 'lightAmbient', 'lightDiffuse', 'lightSpecular', 'attenuation',
        'materialEmission', 'materialAmbient', 'materialDiffuse', 'materialSpecular', 'materialShininess'],
      ['in_pos', 'in_col', 'in_nrm', 'in_txc']);

    var plugin = engine.registerPlugin('Normalized Device Coordinates');
    var cam = camera.create()
    var cameraMatrix = mat4.create();
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

      mat4.perspective(mat4Buf, glMatrix.toRadian(70), plugin.viewWidth() / plugin.viewHeight(), 0.05, 50.0);
      engine.projectionMatrix(mat4Buf);
      engine.viewMatrix(cameraMatrix);
      engine.modelMatrix(mat4.mul(mat4Buf, perspective.finalView.projectionMatrix(), perspective.finalView.cameraMatrix()));

      engine.program(program);

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

    plugin.on('config_requested', function() {
      return cam.getConfig({});
    });

    plugin.on('config_loaded', function(config) {
      cam = camera.createFromConfig(config);
      cam.update(1);
      cam.cameraMatrix(cameraMatrix);
    });

    return {
      camera: function() {
        return cam;
      }
    };
  })();

  perspective.finalView = (function() {
    var projectionMatrix = mat4.create();
    var cameraMatrix = mat4.create();
    var inverseProjectionMatrix = mat4.create();
    var inverseCameraMatrix = mat4.create();
    var plugin = engine.registerPlugin('Final View');
    var cam = camera.create()
    var fov = 70, near = 0.05, far = 50.0, as = 1.0;
    var manualFrustumSet = false;

    const KEY_FOV = 'fov';
    const KEY_NEAR = 'near';
    const KEY_FAR = 'far';
    const KEY_ASPECTRATIO = 'as';
    const KEY_MANUAL_FRUSTUM = 'frustum';

    cam.position(vec3.set(vec3Buf, 2, 2, 2));
    cam.azimut(5/4 * PI);
    cam.polar(2/3 * PI);
    cam.update(1);
    cam.cameraMatrix(cameraMatrix);

    plugin.html(
        '<hr/><label>Set simple view frustum</label>\
        <table id="simple_frustum">\
          <tr>\
            <td>Fov</td><td><input type="range" id="fov_slider" min="1" max="179"/></td><td><span id="fov_text"/></td>\
          </tr><tr>\
            <td>Nearplane</td><td><input type="text" id="near_text"/></td>\
          </tr><tr>\
            <td>Farplane</td><td><input type="text" id="far_text"/></td>\
          </tr><tr>\
            <td>Aspect Ratio</td><td><input type="text" id="aspect_ratio_text" value="1.0" /></td>\
          </tr></table>\
        <hr/><label>Set custom projection matrix</label>\
          <table id="manual_frustum">\
            <tr><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td></tr>\
            <tr><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td></tr>\
            <tr><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td></tr>\
            <tr><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td><td><input type="text"/></td></tr>\
          </table>');

    plugin.html().find('#manual_frustum input[type="text"]').css('width', '2em');

    plugin.html().find('#simple_frustum input').css('width', '80px');

    plugin.html().find('#fov_slider').on('mousemove', function() {
        $(this).parent().next().find('#fov_text').html($(this).val());
    }).trigger('mousemove');

    plugin.on('callback', function(delta) {
      if(engine.activePlugin() !== null && engine.activePlugin().id() === plugin.id()) {
        cam.update(delta);
        cam.cameraMatrix(cameraMatrix);
      }

      if(!manualFrustumSet)
        mat4.perspective(projectionMatrix, glMatrix.toRadian(fov), as * plugin.viewWidth() / plugin.viewHeight(), near, far);

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

      mat4.perspective(projectionMatrix, glMatrix.toRadian(fov), as * plugin.viewWidth() / plugin.viewHeight(), near, far);
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

    plugin.html().find('#simple_frustum input').trigger('change');

    plugin.on('config_requested', function() {
      var config = cam.getConfig({});
      config[KEY_FOV] = fov;
      config[KEY_NEAR] = near;
      config[KEY_FAR] = far;
      config[KEY_ASPECTRATIO] = as;

      if(manualFrustumSet) {
        config[KEY_MANUAL_FRUSTUM] = projectionMatrix.toString();
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
      if(config.hasOwnProperty(KEY_MANUAL_FRUSTUM))
        projectionMatrix = util.parseMat4(mat4.create(), config[KEY_MANUAL_FRUSTUM]);

        setState();
    });

    var setState = function() {
      var matrixCells = plugin.html().find('#manual_frustum input');
      for(var i = 0; i < matrixCells.length; i++) {
        $(matrixCells[i]).val(projectionMatrix[4 * (i % 4) + Math.floor(i / 4)]);
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
    };
  })();
});
