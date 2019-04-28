'use strict'

engine.onReady(function() {
  const QUADRIC_SIMPLE_CUBE = 'Simple Cube';
  const QUADRIC_CUBE = 'Cube';
  const QUADRIC_UV_SPHERE = 'UV Sphere';
  const QUADRIC_ICO_SPHERE = 'ICO Sphere';
  const QUADRIC_CYLINDER = 'Cylinder';
  const QUADRIC_DISK = 'Disk';
  const QUADRIC_SIMPLE_CONE = 'Simple Cone';
  const QUADRIC_CONE = 'Cone';

  const OBJECT_DEFAULT = 'Default Cube';

  const KEY_LIGHT = 'light';
  const KEY_MATERIAL = 'material';
  const KEY_OBJECT = 'object';
  const KEY_OBJECTS = 'objects';
  const KEY_MODEL_MATRIX = 'modelMatrix';
  const KEY_VISIBLE = 'visible';
  const KEY_SHOW_AXES = 'showAxes';
  const KEY_NAME = 'name';
  const KEY_DESCRIPTION = 'description';
  const KEY_MODE = 'mode'

  var objects = {};
  var selectedObject = null;

  var plugin = engine.registerPlugin('Scene Control');

  var mat4Buf = mat4.create();
  var quatBuf = quat.identity(quat.create());
  var vec3Buf = vec3.create();
  var vec4Buf = vec4.create();

  var cam = camera.create()
  var cameraMatrix = mat4.create();
  cam.update(1);
  cam.cameraMatrix(cameraMatrix);

  var light = util.createLightSource(
    vec3.fromValues(0, 2, 0),
    vec4.fromValues(0.1, 0.1, 0.1, 1.0),
    vec4.fromValues(0.5, 0.5, 0.5, 1.0),
    vec4.fromValues(0.9, 0.9, 1.0, 1.0),
    vec3.fromValues(0, 0, 0));

  vec3.set(vec3Buf, 0.1, 0.1, 0.1);
  quadric.defaultColor(1, 0.8, 0.2, 1);
  var lampObject = engine.addObject(quadric.createIcoSphere(3), gl.TRIANGLES, mat4Buf);
  lampObject.visible(false);
  lampObject.modelMatrix(mat4.fromRotationTranslationScale(mat4Buf, quatBuf, light.position(), vec3Buf));
  lampObject.material(util.createMaterial(
    vec4.fromValues(1, 0.8, 0.2, 1),
    vec4.fromValues(0, 0, 0, 1),
    vec4.fromValues(0, 0, 0, 1),
    vec4.fromValues(0, 0, 0, 1),
    0));

  plugin.on('callback', function(delta) {
    if(engine.activePlugin() !== null && engine.activePlugin().id() === plugin.id()) {
      cam.update(delta);
      cam.cameraMatrix(cameraMatrix);
    }

    engine.viewMatrix(cameraMatrix);
    engine.projectionMatrix(mat4.perspective(mat4Buf, glMatrix.toRadian(70), plugin.viewWidth() / plugin.viewHeight(), 0.05, 100.0));
    engine.modelMatrix(mat4.identity(mat4Buf));
    engine.light(light);
  });

  plugin.on('hide', function() {
    lampObject.visible(false);
  });

  plugin.on('show', function() {
    lampObject.visible(true);
  });

  plugin.on('config_requested', function() {
    var lightConf = {};
    light.getConfig(lightConf);

    var objectsConf = {};

    for (var id in objects) {
      if (objects.hasOwnProperty(id)) {
        var object = objects[id];
        var objectConf = {};
        var description = object.description().toString();

        if(description.length > 0) {
          objectConf[KEY_VISIBLE] = object.visible();
          objectConf[KEY_SHOW_AXES] = object.showAxes();
          objectConf[KEY_MODEL_MATRIX] = object.modelMatrix().toString();
          objectConf[KEY_DESCRIPTION] = description;
          objectConf[KEY_MODE] = object.mode();
          object.material().getConfig(objectConf);

          objectsConf[id] = objectConf;
        }
      }
    }

    var res = {};
    res[KEY_LIGHT] = lightConf;
    res[KEY_OBJECTS] = objectsConf;

    cam.getConfig(res);

    return res;
  });

  plugin.on('config_loaded', function(config) {
    cam = camera.createFromConfig(config);
    cam.update(1);
    cam.cameraMatrix(cameraMatrix);

    if(config.hasOwnProperty(KEY_LIGHT)) {
      light = util.createLightSourceFromConfig(config[KEY_LIGHT]);
      lampObject.modelMatrix(mat4.fromRotationTranslationScale(mat4Buf, quatBuf, light.position(), vec3Buf));
      light.position
      engine.light(light);
    }

    if(config.hasOwnProperty(KEY_OBJECTS)) {
      var objectConfigs = config[KEY_OBJECTS];

      for(var name in objectConfigs) {
        if(objectConfigs.hasOwnProperty(name)) {
          var objectConfig = objectConfigs[name];

          if(!objectConfig.hasOwnProperty(KEY_DESCRIPTION))
            continue;

          var q = quadric.createFromDescription(objectConfig[KEY_DESCRIPTION]);
          var object;

          if(objectConfig.hasOwnProperty(KEY_MODE))
            object = engine.addObject(q, parseInt(objectConfig[KEY_MODE]));
          else
            object = engine.addObject(q, gl.TRIANGLES);

          if(objectConfig.hasOwnProperty(KEY_MODEL_MATRIX))
            object.modelMatrix(util.parseMat4(mat4.create(), objectConfig[KEY_MODEL_MATRIX]));

          if(objectConfig.hasOwnProperty(KEY_VISIBLE))
            object.visible((objectConfig[KEY_VISIBLE] == '0')?false:true);

          if(objectConfig.hasOwnProperty(KEY_SHOW_AXES))
            object.showAxes((objectConfig[KEY_SHOW_AXES] == '0')?false:true);

          addObject(name, object);

          object.material(util.createMaterialFromConfig(objectConfig));
        }
      }
    }

    setState();
  });

  plugin.html('<hr/><label for="light">Lightsource</label>\
    <table id="light">\
      <tr>\
        <td>Position</td><td>\
          <input type="text" id="px" class="pos"/>\
          <input type="text" id="py" class="pos"/>\
          <input type="text" id="pz" class="pos"/></td></tr>\
      <tr>  <td>Ambient</td>  <td><input type="text" id="ambient"/>   </td><td class="color_displayer">   </td></tr>\
      <tr>  <td>Diffuse</td>  <td><input type="text" id="diffuse"/>   </td><td class="color_displayer">   </td></tr>\
      <tr>  <td>Specular</td> <td><input type="text" id="specular"/>  </td><td class="color_displayer">   </td></tr>\
    </table>\
    <hr/><label for="quadric_params">Create new Quadric</label>\
    <table id="quadric_params">\
      <tr><td>Type<label></td><td><select id="quadric_selector" size="1">\
        <option>' + QUADRIC_SIMPLE_CUBE + '</option>\
        <option>' + QUADRIC_CUBE + '</option>\
        <option>' + QUADRIC_UV_SPHERE + '</option>\
        <option>' + QUADRIC_ICO_SPHERE + '</option>\
        <option>' + QUADRIC_CYLINDER + '</option>\
        <option>' + QUADRIC_DISK + '</option>\
        <option>' + QUADRIC_SIMPLE_CONE + '</option>\
        <option>' + QUADRIC_CONE + '</option></select></td></tr>\
      <tr><td>Color</td><td><input type="text" id="qp_color"/></td><td class="color_displayer"></td></tr>\
      <tr><td>Name</td><td><input type="text" id="qp_name"/></td></tr>\
      <tr id="qp1"><td><label></label></td><td><input type="text"/></td></tr>\
      <tr id="qp2"><td><label></label></td><td><input type="text"/></td></tr>\
      <tr id="qp3"><td><label></label></td><td><input type="text"/></td></tr>\
      <tr><td colspan="2"><button id="create_object">Create</button></td></tr>\
    </table>\
    <hr/><label for="object_selection">Edit Object</label>\
    <table id="object_selection"><tr><td>Select</td>\
    <td><select size="1" id="object_selector"><option>' + OBJECT_DEFAULT + '</option></select></td></tr>\
    <tr><td></td><td><button id="delete_object">Delete</button><button id="toogle_object">Hide</button></td><td><button id="toogle_object_axes">CF</button></td></tr></table>\
    <label for="model_matrix">Model Matrix</label>\
    <table id="model_matrix">\
      <tr>  <td><input type="text"></td>  <td><input type="text"></td>  <td><input type="text"></td>  <td><input type="text"></td>  </tr>\
      <tr>  <td><input type="text"></td>  <td><input type="text"></td>  <td><input type="text"></td>  <td><input type="text"></td>  </tr>\
      <tr>  <td><input type="text"></td>  <td><input type="text"></td>  <td><input type="text"></td>  <td><input type="text"></td>  </tr>\
      <tr>  <td><input type="text"></td>  <td><input type="text"></td>  <td><input type="text"></td>  <td><input type="text"></td>  </tr>\
    </table>\
    <br/>\
    <label for="material">Material</label>\
    <table id="material">\
      <tr id="emission">  <td>Emission</td>   <td><input type="text"/>  </td><td class="color_displayer"></td>  </tr>\
      <tr id="ambient">   <td>Ambient</td>    <td><input type="text"/>  </td><td class="color_displayer"></td>  </tr>\
      <tr id="diffuse">   <td>Diffuse</td>    <td><input type="text"/>  </td><td class="color_displayer"></td>  </tr>\
      <tr id="specular">  <td>Specular</td>   <td><input type="text"/>  </td><td class="color_displayer"></td>  </tr>\
      <tr id="shininess"> <td>Shininess</td>  <td><input type="text"/></td>                                     </tr>\
    </table>\
    <input type="color" id="hidden_color_picker"/>');

    var qo = plugin.html().find('#create_object');
    qo.css('border', '2px solid lightgrey');
    qo.css('width', '100%');

    qo = plugin.html().find('input')
    qo.css('width', '100px');

    qo = plugin.html().find('#model_matrix input');
    qo.css('width', '4em');

    qo = plugin.html().find('#color_picker');
    qo.css('width', '20px');

    qo = plugin.html().find('.pos');
    qo.css('width', '20px');
    qo.css('margin-right', '5px');

    qo = plugin.html().find('.color_displayer');
    qo.css('width', '20px');
    qo.css('height', '20px');
    qo.css('margin-top', 'auto');
    qo.css('margin-bottom', 'auto');
    qo.on('click', function() {
      var picker = plugin.html().find('#hidden_color_picker');
      var me = $(this);
      var textInput = me.parent().find('input[type="text"]');
      picker.val(textInput.val());
      picker.trigger('click');
      picker.off();
      picker.on('change', function() {
        textInput.val(picker.val());
        textInput.trigger('change');
      });
    });

    qo = plugin.html().find('#hidden_color_picker');
    qo.css('display', 'none');

    qo = plugin.html().find('#light tr td:first-child, #quadric_params tr td:first-child, #object_selector tr td:first-child, #material tr td:first-child, #object_selection tr td:first-child');
    qo.css('width', '80px');

    qo = plugin.html().find('#quadric_selector, #object_selector');
    qo.css('width', "100px")

    qo = plugin.html().find('#delete_object, #toogle_object, #toogle_object_axes');
    qo.css('width', '50%');

    plugin.html().find('label');
    // qo.css('', '');

  var getObjectIdFromName = function(name) {
    return name.replace(/\s/g, "_").toLowerCase();
  }

  var addObject = function(name, o) {
    var filteredName = getObjectIdFromName(name);
    objects[name] = o;
    plugin.html().find('#object_selector').append($('<option id="' + filteredName + '">' + name + '</option>'));
    plugin.html().find('#quadric_selector').trigger('change');
  };

  plugin.html().find('#create_object').on('click', function() {
    var name = plugin.html().find('#qp_name').val().toString().trim();
    if(objects.hasOwnProperty(name)) {
      alert('Name already exists!');
      return;
    }

    if(name == '') {
      alert('Empty name!');
      return;
    }

    var p1 = parseFloat(plugin.html().find('#quadric_params #qp1 input').val());
    var p2 = parseFloat(plugin.html().find('#quadric_params #qp2 input').val());
    var p3 = parseFloat(plugin.html().find('#quadric_params #qp3 input').val());

    quadric.defaultColor(util.parseColor(plugin.html().find('qp_color')));

    var object;

    switch (plugin.html().find('#quadric_selector').val()) {
      case QUADRIC_SIMPLE_CUBE:
        object = engine.addObject(quadric.createSimpleBox(), gl.TRIANGLES);
        break;
      case QUADRIC_CUBE:
        object = engine.addObject(quadric.createBox(p1, p2, p3), gl.TRIANGLES);
        break;
      case QUADRIC_UV_SPHERE:
        object = engine.addObject(quadric.createUVSphere(p1, p2), gl.TRIANGLES);
        break;
      case QUADRIC_ICO_SPHERE:
        object = engine.addObject(quadric.createIcoSphere(p1), gl.TRIANGLES);
        break;
      case QUADRIC_CYLINDER:
        object = engine.addObject(quadric.createCylinder(p1, p2), gl.TRIANGLES);
        break;
      case QUADRIC_DISK:
        object = engine.addObject(quadric.createDisk(p1, p2), gl.TRIANGLES);
        break;
      case QUADRIC_SIMPLE_CONE:
        object = engine.addObject(quadric.createSimpleCone(p1, p2), gl.TRIANGLES);
        break;
      case QUADRIC_CONE:
        object = engine.addObject(quadric.createCone(p1, p2, p3), gl.TRIANGLES);
        break;
      default:
        console.error('Unknown quadric type "' + $(this).val() + '"');
        break;
    }

    if(object != undefined)
      addObject(name, object);
  });

  plugin.html().find('#delete_object').on('click', function() {
    var name = plugin.html().find('#object_selector').val();
    var filteredName = getObjectIdFromName(name);
    if(!objects.hasOwnProperty(name))
      return;

    engine.removeObject(objects[name].id());
    delete objects[name];
    plugin.html().find('#object_selector #' + filteredName).remove();
    plugin.html().find('#object_selector').trigger('change');
  });

  plugin.html().find('#toogle_object').on('click', function() {
    if(selectedObject.visible(!selectedObject.visible()))
      $(this).html('Hide');
    else
      $(this).html('Show');
  });

  plugin.html().find('#toogle_object_axes').on('click', function() {
    if(selectedObject.showAxes(!selectedObject.showAxes()))
      $(this).html('CF');
    else
      $(this).html('NoCF');
  });

  plugin.html().find('#quadric_selector').on('change', function() {
    var qp1 = plugin.html().find('#quadric_params #qp1');
    var qp2 = plugin.html().find('#quadric_params #qp2');
    var qp3 = plugin.html().find('#quadric_params #qp3');

    var qp1Name = plugin.html().find('#quadric_params #qp1 label');
    var qp2Name = plugin.html().find('#quadric_params #qp2 label');
    var qp3Name = plugin.html().find('#quadric_params #qp3 label');

    plugin.html().find('#quadric_params #qp1 input').val('1');
    plugin.html().find('#quadric_params #qp2 input').val('1');
    plugin.html().find('#quadric_params #qp3 input').val('1');

    var qNameBase = $(this).val();
    var qName = qNameBase;
    var i = 0;
    while(objects.hasOwnProperty(qName))
      qName = qNameBase + ' ' + (++i).toString();

    plugin.html().find('#quadric_params #qp_name').val(qName);

    switch (qNameBase) {
      case QUADRIC_SIMPLE_CUBE:
        qp1.hide();
        qp2.hide();
        qp3.hide();
        break;
      case QUADRIC_CUBE:
        qp1.show();
        qp2.show();
        qp3.show();

        qp1Name.html('x-Slices');
        qp2Name.html('y-Slices');
        qp3Name.html('z-Slices');
        break;
      case QUADRIC_UV_SPHERE:
        qp1.show();
        qp2.show();
        qp3.hide();

        qp1Name.html('Slices');
        qp2Name.html('Stacks');
        break;
      case QUADRIC_ICO_SPHERE:
        qp1.show();
        qp2.hide();
        qp3.hide();

        qp1Name.html('Subdivides');
        break;
      case QUADRIC_CYLINDER:
        qp1.show();
        qp2.show();
        qp3.hide();

        qp1Name.html('Slices');
        qp2Name.html('Stacks');
        break;
      case QUADRIC_DISK:
        qp1.show();
        qp2.show();
        qp3.hide();

        qp1Name.html('Slices');
        qp2Name.html('Loops');
        break;
      case QUADRIC_SIMPLE_CONE:
        qp1.show();
        qp2.show();
        qp3.hide();

        qp1Name.html('Slices');
        qp2Name.html('Stacks');
        break;
      case QUADRIC_CONE:
        qp1.show();
        qp2.show();
        qp3.show();

        qp1Name.html('Max. Height');
        qp2Name.html('Slices');
        qp3Name.html('Stacks');
        break;
      default:
        console.error('Unknown quadric type "' + qNameBase + '"');
        break;
    }
  });

  plugin.html().find('#light input').on('change', function() {
    var vec4Buf = vec4.create();

    light.position(vec4.set(vec4Buf,
      parseFloat(plugin.html().find('#light #px').val()),
      parseFloat(plugin.html().find('#light #py').val()),
      parseFloat(plugin.html().find('#light #pz').val()), 1));

    light.ambient(util.parseColor(vec4Buf, plugin.html().find('#light #ambient').val()));
    light.diffuse(util.parseColor(vec4Buf, plugin.html().find('#light #diffuse').val()));
    light.specular(util.parseColor(vec4Buf, plugin.html().find('#light #specular').val()));

    lampObject.modelMatrix(mat4.fromRotationTranslationScale(mat4Buf, quatBuf, light.position(), vec3Buf));
    light.position
    engine.light(light);

    $(this).parent().parent().find('.color_displayer').css('background-color', $(this).val());
  });

  plugin.html().find('#material input').on('change', function() {
    var m = selectedObject.material();
    m.emission(util.parseColor(vec4Buf, plugin.html().find('#emission input').val()));
    m.ambient(util.parseColor(vec4Buf, plugin.html().find('#ambient input').val()));
    m.diffuse(util.parseColor(vec4Buf, plugin.html().find('#diffuse input').val()));
    m.specular(util.parseColor(vec4Buf, plugin.html().find('#specular input').val()));
    m.shininess(parseFloat(plugin.html().find('#shininess input').val()));

    $(this).parent().parent().find('.color_displayer').css('background-color', $(this).val());
  });

  plugin.html().find('#model_matrix input').on('change', function() {
    var matrix = mat4.create();
    var matrixCells = plugin.html().find('#model_matrix input');

    for(var i = 0; i < matrixCells.length; i++) {
      matrix[4 * (i % 4) + Math.floor(i / 4)] = parseFloat($(matrixCells[i]).val());
    }

    selectedObject.modelMatrix(matrix);
  });

  plugin.html().find('#object_selector').on('change', function() {
    if($(this).val() === OBJECT_DEFAULT) {
      plugin.html().find('#delete_object').prop('disabled', true);
      selectedObject = engine.defaultObject();
    }
    else {
      var objId = $(this).val();
      if(!objects.hasOwnProperty(objId)) {
        console.warn('Unknown object: ' + $(this).val());
        return;
      }
      else {
        plugin.html().find('#delete_object').prop('disabled', false);
        selectedObject = objects[objId];
      }
    }

    plugin.html().find('#toogle_object').html(selectedObject.visible() ? 'Hide' : 'Show')
    plugin.html().find('#toogle_object_axes').html(selectedObject.showAxes() ? 'CF' : 'NoCF')

    setObjectState();
  });

  plugin.html().find('#qp_color').on('change', function() {
    quadric.defaultColor(util.parseColor($(this).val()));
    $(this).parent().parent().find('.color_displayer').css('background-color', $(this).val());
  });

  var setState = function() {
    setLightState();
    setObjectState();
  }

  var setLightState = function() {
    var lightDiv = plugin.html().find('#light');

    lightDiv.find('#px').val(light.position()[0]);
    lightDiv.find('#py').val(light.position()[1]);
    lightDiv.find('#pz').val(light.position()[2]);

    lightDiv.find('#ambient').val(util.vec3ToHexColor(light.ambient()));
    lightDiv.find('#diffuse').val(util.vec3ToHexColor(light.diffuse()));
    lightDiv.find('#specular').val(util.vec3ToHexColor(light.specular()));

    var colorDisplayers = plugin.html().find('#light .color_displayer');
    for (var i = 0; i < colorDisplayers.length; i++) {
      var cd = $(colorDisplayers[i]);
      cd.css('background-color', cd.parent().find('input[type="text"]').val());
    }
  }

  var setObjectState = function() {
    if(!selectedObject)
      return;

    var obj = selectedObject;
    var matrix = obj.modelMatrix();
    var material = obj.material();

    var matrixCells = plugin.html().find('#model_matrix input');
    for(var i = 0; i < matrixCells.length; i++) {
      $(matrixCells[i]).val(matrix[4 * (i % 4) + Math.floor(i / 4)]);
    }

    var materialDiv = plugin.html().find('#material');
    materialDiv.find('#emission input').val(util.vec3ToHexColor(material.emission()));
    materialDiv.find('#ambient input').val(util.vec3ToHexColor(material.ambient()));
    materialDiv.find('#diffuse input').val(util.vec3ToHexColor(material.diffuse()));
    materialDiv.find('#specular input').val(util.vec3ToHexColor(material.specular()));
    materialDiv.find('#shininess input').val(material.shininess());

    var colorDisplayers = materialDiv.find('.color_displayer');
    for (var i = 0; i < colorDisplayers.length; i++) {
      var cd = $(colorDisplayers[i]);
      cd.css('background-color', cd.parent().find('input[type="text"]').val());
    }
  }

  setState();
  plugin.html().find('#object_selector').trigger('change');
  plugin.html().find('#quadric_selector').trigger('change');
  plugin.html().find('#light input').trigger('change');
  plugin.html().find('#material input').trigger('change');
  plugin.html().find('#qp_color').val(util.vec3ToHexColor(quadric.defaultColor()));
  plugin.html().find('#qp_color').trigger('change');

  return {
    // TODO: Interaktionsfuntktionen
  }
});
