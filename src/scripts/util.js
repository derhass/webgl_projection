const PI = 3.1415926535897932384626433832795028841971693993751058209749;
const PI2 = 2 * PI;
const PI_2 = PI / 2;

var axis = {
  'x': vec3.fromValues(1, 0, 0),
  'y': vec3.fromValues(0, 1, 0),
  'z': vec3.fromValues(0, 0, 1),
}

var util = (function() {
  var vec4Buf = vec4.create();
  var mat4Buf = mat4.create();
  var colorMaxVal = vec4.fromValues(1, 1, 1, 1);
  var colorMinVal = vec4.fromValues(0, 0, 0, 0);

  const KEY_AMBIENT = 'ambient';
  const KEY_DIFFUSE = 'diffuse';
  const KEY_SPECULAR = 'specular';
  const KEY_EMISSION = 'emission';
  const KEY_SHININESS = 'shininess';
  const KEY_ATTENUATION = 'attenuation';
  const KEY_POSITION = 'position';

  return {
    createShader: function(src, type) {
        var sId = gl.createShader(type);

        gl.shaderSource(sId, src);
        gl.compileShader(sId);

        if(!gl.getShaderParameter(sId, gl.COMPILE_STATUS))
        {
            console.error("Error compiling shader:");
            console.error(gl.getShaderInfoLog(sId));
            return null;
        }

        return sId;
    },

    createProgram: function(vs, fs, uniformNames, attribNames) {
        if(!vs || !fs) {
            console.error("Missing Shaders");
            return null;
        }

        var pId = gl.createProgram();
        gl.attachShader(pId, vs);
        gl.attachShader(pId, fs);
        gl.linkProgram(pId);

        if(!gl.getProgramParameter(pId, gl.LINK_STATUS)) {
            console.error("Failed to link program");
            console.error(gl.getProgramInfoLog(pId));
            return null;
        }

        return (function() {
          var mId = pId;

          var posAttr = null;
          var colAttr = null;
          var nrmAttr = null;
          var txcAttr = null;

          var projMatLoc = null;
          var correctionMatLoc = null;
          var invViewMatLoc = null;
          var nrmMatLoc = null;
          var modelViewMatLoc = null;

          var lightPositionLoc = null;
          var lightAmbientLoc = null;
          var lightSpecularLoc = null;
          var lightDiffuseLoc = null;
          var lightAttenuationLoc = null;

          var materialEmissionLoc = null;
          var materialAmbientLoc = null;
          var materialSpecularLoc = null;
          var materialDiffuseLoc = null;
          var materialShininessLoc = null;

          var clipModeLoc = null;

          var mat3Buf = mat3.create();

          if(uniformNames !== undefined) {
            if(uniformNames.length >= 3) {
              projMatLoc = gl.getUniformLocation(pId, uniformNames[0]);
              correctionMatLoc = gl.getUniformLocation(pId, uniformNames[1]);
              invViewMatLoc = gl.getUniformLocation(pId, uniformNames[2]);
              modelViewMatLoc =  gl.getUniformLocation(pId, uniformNames[3]);

              if(projMatLoc === null)
                console.warn('Projection matrix location ("' + uniformNames[0] + '") could not be found!');

              if(modelViewMatLoc === null)
                console.warn('World matrix location ("' + uniformNames[3] + '") could not be found!');
            }
            else {
              console.warn('Missing uniform Names for projection and modelview matrix');
            }

            if(uniformNames.length >= 5) {
              nrmMatLoc = gl.getUniformLocation(pId, uniformNames[4]);
            }

            if(uniformNames.length >= 10) {
              lightPositionLoc = gl.getUniformLocation(pId, uniformNames[5]);
              lightAmbientLoc = gl.getUniformLocation(pId, uniformNames[6]);
              lightDiffuseLoc = gl.getUniformLocation(pId, uniformNames[7]);
              lightSpecularLoc = gl.getUniformLocation(pId, uniformNames[8]);
              lightAttenuationLoc = gl.getUniformLocation(pId, uniformNames[9]);
            }

            if(uniformNames.length >= 15) {
              materialEmissionLoc = gl.getUniformLocation(pId, uniformNames[10]);
              materialAmbientLoc = gl.getUniformLocation(pId, uniformNames[11]);
              materialDiffuseLoc = gl.getUniformLocation(pId, uniformNames[12]);
              materialSpecularLoc = gl.getUniformLocation(pId, uniformNames[13]);
              materialShininessLoc = gl.getUniformLocation(pId, uniformNames[14]);
            }
            // fixed uniform names for these special ones
            clipModeLoc = gl.getUniformLocation(pId, 'clipMode');
          }
          else {
            console.warn('No uniforms defined!');
          }

          if(attribNames !== undefined) {
            if(attribNames.length >= 1) {
              posAttr = gl.getAttribLocation(pId, attribNames[0]);
              if(posAttr === null || posAttr == -1)
                console.warn('Position attribute "' + attribNames[0] + '" not found!');
            }

            if(attribNames.length >= 2) {
              colAttr = gl.getAttribLocation(pId, attribNames[1]);
              if(colAttr === null || colAttr == -1)
                console.warn('Color attribute "' + attribNames[1] + '" not found!');
            }

            if(attribNames.length >= 3) {
              nrmAttr = gl.getAttribLocation(pId, attribNames[2]);
              if(nrmAttr === null || nrmAttr == -1)
                console.warn('Normal attribute "' + attribNames[2] + '" not found!');
            }

            if(attribNames.length >= 4) {
              txcAttr = gl.getAttribLocation(pId, attribNames[3]);
              if(txcAttr === null || txcAttr == -1)
                console.warn('Texture coordinate attribute "' + attribNames[3] + '" not found!');
            }
          }
          else {
            console.warn('No attributes defined.');
          }

          return {
            id: function() {
              return mId;
            },
            bufferModelViewMatrix: function(m) {
              if(nrmMatLoc !== null && nrmMatLoc != -1) {
                mat3.normalFromMat4(mat3Buf, m);

                gl.uniformMatrix3fv(nrmMatLoc, false, mat3Buf);
              }

              if(modelViewMatLoc !== null && modelViewMatLoc != -1)
                gl.uniformMatrix4fv(modelViewMatLoc, false, m);
            },
            bufferProjectionMatrix: function(m) {
              if(projMatLoc !== null && projMatLoc != -1)
                gl.uniformMatrix4fv(projMatLoc, false, m);
            },
            bufferInvViewMatrix: function(m) {
              if(invViewMatLoc !== null && invViewMatLoc != -1)
                gl.uniformMatrix4fv(invViewMatLoc, false, m);
            },
            bufferCorrectionMatrix: function(m) {
              if(correctionMatLoc !== null && correctionMatLoc != -1)
                gl.uniformMatrix4fv(correctionMatLoc, false, m);
            },
            bufferMaterial: function(material) {
              if(materialEmissionLoc !== null && materialEmissionLoc != -1)
                gl.uniform4fv(materialEmissionLoc, material.emission());
              if(materialAmbientLoc !== null && materialAmbientLoc != -1)
                gl.uniform4fv(materialAmbientLoc, material.ambient());
              if(materialSpecularLoc !== null && materialSpecularLoc != -1)
                gl.uniform4fv(materialSpecularLoc, material.specular());
              if(materialDiffuseLoc !== null && materialDiffuseLoc != -1)
                gl.uniform4fv(materialDiffuseLoc, material.diffuse());
              if(materialShininessLoc !== null && materialShininessLoc != -1)
                gl.uniform1f(materialShininessLoc, material.shininess());
            },
            bufferLightSource: function(light) {
              if(lightPositionLoc !== null && lightPositionLoc != -1)
                gl.uniform4fv(lightPositionLoc, vec4.transformMat4(vec4Buf, light.position(),
                  mat4.mul(mat4Buf, engine.viewMatrix(), engine.modelMatrix())));
              if(lightAmbientLoc !== null && lightAmbientLoc != -1)
                gl.uniform4fv(lightAmbientLoc, light.ambient());
              if(lightSpecularLoc !== null && lightSpecularLoc != -1)
                gl.uniform4fv(lightSpecularLoc, light.specular());
              if(lightDiffuseLoc !== null && lightDiffuseLoc != -1)
                gl.uniform4fv(lightDiffuseLoc, light.diffuse());
              if(lightAttenuationLoc !== null && lightAttenuationLoc != -1)
                gl.uniform3fv(lightAttenuationLoc, light.attenuation());
            },
            bufferClipMode: function(value) {
              if(clipModeLoc !== null && clipModeLoc != -1)
                gl.uniform1i(clipModeLoc, value);
            },
            bindAttribPointers: function() {
              var stride = (3 + 4 + 3 + 2) * 4;

              if(posAttr !== null && posAttr != -1) {
                gl.vertexAttribPointer(posAttr, 3, gl.FLOAT, false, stride, 0);
                gl.enableVertexAttribArray(posAttr);
              }

            	if(colAttr !== null && colAttr != -1) {
                gl.vertexAttribPointer(colAttr, 4, gl.FLOAT, false, stride, 3 * 4);
                gl.enableVertexAttribArray(colAttr);
              }

              if(nrmAttr !== null && nrmAttr != -1) {
                gl.vertexAttribPointer(nrmAttr, 3, gl.FLOAT, false, stride, (3 + 4) * 4);
                gl.enableVertexAttribArray(nrmAttr);
              }

              if(txcAttr !== null && txcAttr != -1) {
                gl.vertexAttribPointer(txcAttr, 2, gl.FLOAT, false, stride, (3 + 4 + 3) * 4);
                gl.enableVertexAttribArray(txcAttr);
              }
            },
            releaseAttribPointers: function() {
              if(posAttr !== null && posAttr != -1) {
                gl.disableVertexAttribArray(posAttr);
              }

              if(colAttr !== null && colAttr != -1) {
                gl.disableVertexAttribArray(colAttr);
              }

              if(nrmAttr !== null && nrmAttr != -1) {
                gl.disableVertexAttribArray(nrmAttr);
              }

              if(txcAttr !== null && txcAttr != -1) {
                gl.disableVertexAttribArray(txcAttr);
              }
            },
          }
        })();
    },

    createMaterialFromConfig: function(config) {
      var res = this.createMaterial();

      if(config.hasOwnProperty(KEY_EMISSION))
        res.emission(util.parseColor(vec4.create(), config[KEY_EMISSION]));
      if(config.hasOwnProperty(KEY_AMBIENT))
        res.ambient(util.parseColor(vec4.create(), config[KEY_AMBIENT]));
      if(config.hasOwnProperty(KEY_DIFFUSE))
        res.diffuse(util.parseColor(vec4.create(), config[KEY_DIFFUSE]));
      if(config.hasOwnProperty(KEY_SPECULAR))
        res.specular(util.parseColor(vec4.create(), config[KEY_SPECULAR]));
      if(config.hasOwnProperty(KEY_SHININESS))
        res.shininess(parseFloat(config[KEY_SHININESS]));

      return res;
    },

    createMaterial: function(emis, ambi, diff, spec, shine) {
      return (function() {
        var mEmis = vec4.create();
        var mAmbi = vec4.create();
        var mDiff = vec4.create();
        var mSpec = vec4.create();
        var mShine = 1;

        var res = {
          emission: function(val) {
            if(val !== undefined)
              vec4.copy(mEmis, val);

            return mEmis;
          },
          ambient: function(val) {
            if(val !== undefined)
              vec4.copy(mAmbi, val);

            return mAmbi;
          },
          diffuse: function(val) {
            if(val !== undefined)
              vec4.copy(mDiff, val);

            return mDiff;
          },
          specular: function(val) {
            if(val !== undefined)
              vec4.copy(mSpec, val);

            return mSpec;
          },
          shininess: function(val) {
            if(!isNaN(val))
              mShine = val;

            return mShine;
          },
          getConfig: function(parent) {
            parent[KEY_EMISSION] = util.vec4ToHexColor(this.emission());
            parent[KEY_AMBIENT] = util.vec4ToHexColor(this.ambient());
            parent[KEY_DIFFUSE] = util.vec4ToHexColor(this.diffuse());
            parent[KEY_SPECULAR] = util.vec4ToHexColor(this.specular());
            parent[KEY_SHININESS] = this.shininess();

            return parent;
          }
        };

        res.emission(emis);
        res.ambient(ambi);
        res.diffuse(diff);
        res.specular(spec);
        res.shininess(shine);

        return res;
      })();
    },

    createLightSource: function(pos, ambi, diff, spec, atts) {
      return (function() {
        var mPos = vec4.fromValues(0, 0, 0, 1);
        var mAmbi = vec4.create();
        var mDiff = vec4.create();
        var mSpec = vec4.create();
        var mAtts = vec3.create();

        var res = {
          position: function(pos) {
            if(pos !== undefined)
              vec4.copy(mPos, pos);

            return mPos;
          },
          ambient: function(val) {
            if(val !== undefined)
              vec4.copy(mAmbi, val);

            return mAmbi;
          },
          diffuse: function(val) {
            if(val !== undefined)
              vec4.copy(mDiff, val);

            return mDiff;
          },
          specular: function(val) {
            if(val !== undefined)
              vec4.copy(mSpec, val);

            return mSpec;
          },
          attenuation: function(c, l, q) {
            if(!isNaN(c) && !isNaN(l) && !isNaN(q))
              vec3.set(mAtts, c, l, q);

            return mAtts;
          },

          getConfig: function(parent) {
            parent[KEY_POSITION] = this.position().toString();
            parent[KEY_AMBIENT] = util.vec4ToHexColor(this.ambient());
            parent[KEY_DIFFUSE] = util.vec4ToHexColor(this.diffuse());
            parent[KEY_SPECULAR] = util.vec4ToHexColor(this.specular());
            parent[KEY_ATTENUATION] = this.attenuation().toString();

            return parent;
          },
        };

        res.position(pos);
        res.ambient(ambi);
        res.diffuse(diff);
        res.specular(spec);
        res.attenuation(atts);

        return res;
      })();
    },

    createLightSourceFromConfig: function(config) {
      var res = this.createLightSource();

      if(config.hasOwnProperty(KEY_POSITION))
        res.position(util.parseVec4(vec4.create(), config[KEY_POSITION]));
      if(config.hasOwnProperty(KEY_AMBIENT))
        res.ambient(util.parseColor(vec4.create(), config[KEY_AMBIENT]));
      if(config.hasOwnProperty(KEY_DIFFUSE))
        res.diffuse(util.parseColor(vec4.create(), config[KEY_DIFFUSE]));
      if(config.hasOwnProperty(KEY_SPECULAR))
        res.specular(util.parseColor(vec4.create(), config[KEY_SPECULAR]));
      if(config.hasOwnProperty(KEY_ATTENUATION))
        res.attenuation(util.parseVec3(vec3.create(), config[KEY_ATTENUATION]));

      return res;
    },

    parseColor: function(res, col) {
      vec4.set(res, 0, 0, 0, 0);

      if(col == undefined || col == null)
        return col;

      var s = col.toString();
      var n = parseInt(s.substr(1), 16);

      if(s.charAt(0) != '#')
        return res;

      if(s.length == 9) {
        res[0] = ((n & 0xFF000000) >>> 24) / 255.0;
        res[1] = ((n & 0x00FF0000) >>> 16) / 255.0;
        res[2] = ((n & 0x0000FF00) >>> 8) / 255.0;
        res[3] = ((n & 0x000000FF) >>> 0) / 255.0;
      }
      else if(s.length == 7) {
        res[0] = ((n & 0x00FF0000) >>> 16) / 255.0;
        res[1] = ((n & 0x0000FF00) >>> 8) / 255.0;
        res[2] = ((n & 0x000000FF) >>> 0) / 255.0;
        res[3] = 1.0;
      }
      else if(s.length == 5) {
        res[0] = ((n & 0x0000F000) >>> 16) / 16.0;
        res[1] = ((n & 0x00000F00) >>> 8) / 16.0;
        res[2] = ((n & 0x000000F0) >>> 4) / 16.0;
        res[3] = ((n & 0x0000000F) >>> 0) / 16.0;
      }
      else if(s.length == 4) {
        res[0] = ((n & 0x00000F00) >>> 8) / 16.0;
        res[1] = ((n & 0x000000F0) >>> 4) / 16.0;
        res[2] = ((n & 0x0000000F) >>> 0) / 16.0;
        res[3] = 1.0;
      }

      return res;
    },

    parseVec3: function(res, vec) {
      var values = vec.split(',');

      vec3.set(res,
        parseFloat(values[0]),
        parseFloat(values[1]),
        parseFloat(values[2]));

      return res;
    },

    parseVec4: function(res, vec) {
      var values = vec.split(',');

      vec4.set(res,
        parseFloat(values[0]),
        parseFloat(values[1]),
        parseFloat(values[2]),
        parseFloat(values[3]));

      return res;
    },

    parseMat4: function(res, mat) {
      var values = mat.split(',');

      mat4.set(res,
        parseFloat(values[0]),
        parseFloat(values[1]),
        parseFloat(values[2]),
        parseFloat(values[3]),
        parseFloat(values[4]),
        parseFloat(values[5]),
        parseFloat(values[6]),
        parseFloat(values[7]),
        parseFloat(values[8]),
        parseFloat(values[9]),
        parseFloat(values[10]),
        parseFloat(values[11]),
        parseFloat(values[12]),
        parseFloat(values[13]),
        parseFloat(values[14]),
        parseFloat(values[15]),
      );

      return res;
    },

    vec3ToHexColor: function(v) {
      vec4.floor(vec4Buf, vec4.scale(vec4Buf, vec4.max(vec4Buf, colorMinVal, vec4.min(vec4Buf, colorMaxVal, v)), 255));
      var num = (vec4Buf[0] << 16) |
        (vec4Buf[1] << 8) |
        (vec4Buf[2] << 0);
      var str = (num >>> 0).toString(16);////Magic
      if(str.length < 6)
        str = '0'.repeat(6 - str.length).concat(str);

      return '#'.concat( str);
    },

    vec4ToHexColor: function(v) {
      vec4.floor(vec4Buf, vec4.scale(vec4Buf, vec4.max(vec4Buf, colorMinVal, vec4.min(vec4Buf, colorMaxVal, v)), 255));
      var num = (vec4Buf[0] << 24) |
        (vec4Buf[1] << 16) |
        (vec4Buf[2] << 8) |
        (vec4Buf[3] << 0);
      var str = (num >>> 0).toString(16);////Magic
      if(str.length < 8)
        str = '0'.repeat(8 - str.length).concat(str);

      return '#'.concat( str);
    },
  };
})();

var quadric = (function() {
  var cos = Math.cos;
  var sin = Math.sin;
  var sqrt = Math.sqrt;

  var defaultColor = vec4.fromValues(0.5, 0.5, 0.5, 1);

  var addTriangle = function(q,
    x0, y0, z0, nx0, ny0, nz0,
    x1, y1, z1, nx1, ny1, nz1,
    x2, y2, z2, nx2, ny2, nz2) {
    q.vertices.push(x0);
    q.vertices.push(y0);
    q.vertices.push(z0);

    q.vertices.push(x1);
    q.vertices.push(y1);
    q.vertices.push(z1);

    q.vertices.push(x2);
    q.vertices.push(y2);
    q.vertices.push(z2);

    q.normals.push(nx0);
    q.normals.push(ny0);
    q.normals.push(nz0);

    q.normals.push(nx1);
    q.normals.push(ny1);
    q.normals.push(nz1);

    q.normals.push(nx2);
    q.normals.push(ny2);
    q.normals.push(nz2);

    for(var i = 0; i < 3; i++) {
      q.colors.push(defaultColor[0]);
      q.colors.push(defaultColor[1]);
      q.colors.push(defaultColor[2]);
      q.colors.push(defaultColor[3]);

      q.texCoords.push(0);
      q.texCoords.push(0);

      q.indices.push(q.vertices.length / 3 + i - 3);
    }
  };

  var addQuad = function(q,
    x0, y0, z0, nx0, ny0, nz0,
    x1, y1, z1, nx1, ny1, nz1,
    x2, y2, z2, nx2, ny2, nz2,
    x3, y3, z3, nx3, ny3, nz3) {
    addTriangle(q, x0, y0, z0, nx0, ny0, nz0,
  		x1, y1, z1, nx1, ny1, nz1,
  		x2, y2, z2, nx2, ny2, nz2);
  	addTriangle(q, x0, y0, z0, nx0, ny0, nz0,
  		x2, y2, z2, nx2, ny2, nz2,
  		x3, y3, z3, nx3, ny3, nz3);
  };

  var subdivideTriangle = function(
    q, subdiv, r, g, b,
    x0, y0, z0,
    x1, y1, z1,
    x2, y2, z2) {
    if (subdiv > 0) {
      //subdivide further
      subdiv -= 1;
      var x3, y3, z3, x4, y4, z4, x5, y5, z5;
      //1. calculate new positions
      x3 = 0.5 * x0 + 0.5 * x1;    //            v2                //
      y3 = 0.5 * y0 + 0.5 * y1;    //           /  \               //
      z3 = 0.5 * z0 + 0.5 * z1;    //          /    \              //
                                   //         /      \             //
      x4 = 0.5 * x1 + 0.5 * x2;    //        /        \            //
      y4 = 0.5 * y1 + 0.5 * y2;    //       v5---------v4          //
      z4 = 0.5 * z1 + 0.5 * z2;    //      / \        / \          //
                                   //     /   \      /   \         //
      x5 = 0.5 * x2 + 0.5 * x0;    //    /     \    /     \        //
      y5 = 0.5 * y2 + 0.5 * y0;    //   /       \  /       \       //
      z5 = 0.5 * z2 + 0.5 * z0;    // v0---------v3---------v1     //
      //2. normalize them
      var l;
      l = sqrt(x3 * x3 + y3 * y3 + z3 * z3);
      x3 /= l; y3 /= l; z3 /= l;
      l = sqrt(x4 * x4 + y4 * y4 + z4 * z4);
      x4 /= l; y4 /= l; z4 /= l;
      l = sqrt(x5 * x5 + y5 * y5 + z5 * z5);
      x5 /= l; y5 /= l; z5 /= l;
      subdivideTriangle(q, subdiv, r, g, b,
        x0, y0, z0,
        x3, y3, z3,
        x5, y5, z5);
      subdivideTriangle(q, subdiv, r, g, b,
        x3, y3, z3,
        x1, y1, z1,
        x4, y4, z4);
      subdivideTriangle(q, subdiv, r, g, b,
        x5, y5, z5,
        x3, y3, z3,
        x4, y4, z4);
      subdivideTriangle(q, subdiv, r, g, b,
        x2, y2, z2,
        x5, y5, z5,
        x4, y4, z4);
    }
    else {
      addTriangle(q, x0, y0, z0, x0, y0, z0,
        x1, y1, z1, x1, y1, z1,
        x2, y2, z2, x2, y2, z2);
    }

    return q;
  };

  return {
    defaultColor: function(r, g, b, a) {
      if(r !== undefined && g !== undefined && b !== undefined && a !== undefined)
        vec4.set(defaultColor, r, g, b, a);

      return defaultColor;
    },

    create: function() {
      return {
        vertices: [],
        normals: [],
        colors: [],
        texCoords: [],
        indices: [],
        description: '',

        concat: function(q) {
          var res = quadric.craete();
          var indexOffset = this.vertices.length / 3;
          res.vertices = this.vertices.concat(q.vertices);
          res.colors = this.colors.concat(q.colors);
          res.normals = this.normals.concat(q.normals);
          res.texCoords = this.texCoords.concat(q.texCoords);
          res.indices = this.indices;

          for(var index in q.indices) {
            res.indices.push(index + indexOffset);
          }
        },

        transform: function(m) {
          var vm = m;
          var nm = mat3.normalFromMat4(mat3.create(), m);
          var vec3Buf = vec3.create();

          for(var i = 0; i < this.vertices.length; i += 3) {
            vec3Buf[0] = this.vertices[i + 0];
            vec3Buf[1] = this.vertices[i + 1];
            vec3Buf[2] = this.vertices[i + 2];

            vec3.transformMat4(vec3Buf, vec3Buf, vm);

            this.vertices[i + 0] = vec3Buf[0];
            this.vertices[i + 1] = vec3Buf[1];
            this.vertices[i + 2] = vec3Buf[2];

            vec3Buf[0] = this.normals[i + 0];
            vec3Buf[1] = this.normals[i + 1];
            vec3Buf[2] = this.normals[i + 2];

            vec3.transformMat3(vec3Buf, vec3Buf, nm);

            this.normals[i + 0] = vec3Buf[0];
            this.normals[i + 1] = vec3Buf[1];
            this.normals[i + 2] = vec3Buf[2];
          }
        },
      }
    },

    createFromDescription: function(description) {
      var args = description.split(':');
      // args[0] -> name
      // args[i] -> p{i} /mit i >= i

      util.parseVec4(defaultColor, args[1]);

      switch (args[0]) {
        case 'box': return this.createBox(args[2], args[3], args[4]);
        case 'uv': return this.createUVSphere(args[2], args[3]);
        case 'ico': return this.createIcoSphere(args[2]);
        case 'cylinder': return this.createCylinder(args[2], args[3]);
        case 'disk': return this.createDisk(args[2], args[3]);
        case 'cone': return this.createCone(args[2], args[3], args[4]);
        default:
          console.error('unknown name for quadric: ' + args[0]);
          break;
      }
    },

    createSimpleBox: function() {
      return this.createBox(1, 1, 1)
    },

    createBox: function(slicesX, slicesY, slicesZ) {
      var q = this.create();
      q.description = 'box:' + util.vec4ToHexColor(defaultColor) + ':' + slicesX + ':' + slicesY  + ':' + slicesZ;
      var left, right, bottom, top, front, back;

    	for (var iX = 0; iX < slicesX; iX++) {
    		for (var iY = 0; iY < slicesY; iY++) {
    		  left = iX / slicesX * 2.0 - 1.0;
    			right = (iX + 1) / slicesX * 2.0 - 1.0;
    			bottom = iY / slicesY * 2.0 - 1.0;
    			top = (iY + 1) / slicesY * 2.0 - 1.0;
    			back = -1;
    			front = 1;
    			addQuad(q, left, bottom, front, 0, 0, 1,
    				right, bottom, front, 0, 0, 1,
    				right, top, front, 0, 0, 1,
    				left, top, front, 0, 0, 1);
    			addQuad(q, left, bottom, back, 0, 0, -1,
    				left, top, back, 0, 0, -1,
    				right, top, back, 0, 0, -1,
    				right, bottom, back, 0, 0, -1);
    		}
    	}

    	for (var iY = 0; iY < slicesY; iY++) {
    		for (var iZ = 0; iZ < slicesZ; iZ++) {
    			left = -1;
    			right = 1;
    			bottom = iY / slicesY * 2.0 - 1.0;
    			top = (iY + 1) / slicesY * 2.0 - 1.0;
    			back = iZ / slicesZ * 2.0 - 1.0;
    			front = (iZ + 1) / slicesZ * 2.0 - 1.0;
    			addQuad(q, left, bottom, back, -1, 0, 0,
    				left, bottom, front, -1, 0, 0,
    				left, top, front, -1, 0, 0,
    				left, top, back, -1, 0, 0);
    			addQuad(q, right, bottom, back, 1, 0, 0,
    				right, top, back, 1, 0, 0,
    				right, top, front, 1, 0, 0,
    				right, bottom, front, 1, 0, 0);
    		}
    	}

    	for (var iZ = 0; iZ < slicesZ; iZ++) {
    		for (var iX = 0; iX < slicesX; iX++) {
    			left = iX / slicesX * 2.0 - 1.0,
    			right = (iX + 1) / slicesX * 2.0 - 1.0,
    			bottom = -1;
    			top = 1;
    			back = iZ / slicesZ * 2.0 - 1.0,
    			front = (iZ + 1) / slicesZ * 2.0 - 1.0;
    			addQuad(q, left, top, front, 0, 1, 0,
    				right, top, front, 0, 1, 0,
    				right, top, back, 0, 1, 0,
    				left, top, back, 0, 1, 0);
    			addQuad(q, left, bottom, front, 0, -1, 0,
    				left, bottom, back, 0, -1, 0,
    				right, bottom, back, 0, -1, 0,
    				right, bottom, front, 0, -1, 0);
    		}
    	}

      return q;
    },

    createUVSphere: function(slices, stacks) {
      var q = this.create();
      q.description = 'uv:' + util.vec4ToHexColor(defaultColor) + ':' + slices + ':' + stacks;

    	var x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3;
    	var slr = 2 * PI / slices;
    	var str = PI / stacks;
    	for (var iSt = 0; iSt < stacks; ++iSt) {
    		var rho = -PI / 2.0 + PI * iSt / stacks;
    		for (var iSl = 0; iSl < slices; ++iSl) {
    			var phi = 2.0 * PI * iSl / slices;
    			x0 = cos(rho)*cos(phi);
    			y0 = cos(rho)*sin(phi);
    			z0 = sin(rho);
    			x1 = cos(rho)*cos(phi + slr);
    			y1 = cos(rho)*sin(phi + slr);
    			z1 = sin(rho);
    			x2 = cos(rho + str)*cos(phi + slr);
    			y2 = cos(rho + str)*sin(phi + slr);
    			z2 = sin(rho + str);
    			x3 = cos(rho + str)*cos(phi);
    			y3 = cos(rho + str)*sin(phi);
    			z3 = sin(rho + str);
    			if (iSt == 0)
    				addTriangle(q, 0, 0, -1, 0, 0, -1,
    					x2, y2, z2, x2, y2, z2,
    					x3, y3, z3, x3, y3, z3);
    			else if (iSt == stacks - 1)
    				addTriangle(q, x0, y0, z0, x0, y0, z0,
    					x1, y1, z1, x1, y1, z1,
    					0, 0, 1, 0, 0, 1);
    			else
    				addQuad(q, x0, y0, z0, x0, y0, z0,
    					x1, y1, z1, x1, y1, z1,
    					x2, y2, z2, x2, y2, z2,
    					x3, y3, z3, x3, y3, z3);
    		}
    	}

      return q;
    },

    createIcoSphere: function(subdiv) {
      var q = this.create();
      q.description = 'ico:' + util.vec4ToHexColor(defaultColor) + ':' + subdiv;

    	subdivideTriangle(q, subdiv, 1, 1, 1,
    		1, 0, 0,
    		0, 0, -1,
    		0, 1, 0);
    	subdivideTriangle(q, subdiv, 1, 1, 1,
    		0, 0, -1,
    		-1, 0, 0,
    		0, 1, 0);
    	subdivideTriangle(q, subdiv, 1, 1, 1,
    		-1, 0, 0,
    		0, 0, 1,
    		0, 1, 0);
    	subdivideTriangle(q, subdiv, 1, 1, 1,
    		0, 0, 1,
    		1, 0, 0,
    		0, 1, 0);
    	//lower part
    	subdivideTriangle(q, subdiv, 1, 1, 1,
    		0, 0, -1,
    		1, 0, 0,
    		0, -1, 0);
    	subdivideTriangle(q, subdiv, 1, 1, 1,
    		-1, 0, 0,
    		0, 0, -1,
    		0, -1, 0);
    	subdivideTriangle(q, subdiv, 1, 1, 1,
    		0, 0, 1,
    		-1, 0, 0,
    		0, -1, 0);
    	subdivideTriangle(q, subdiv, 1, 1, 1,
    		1, 0, 0,
    		0, 0, 1,
    		0, -1, 0);

      return q;
    },

    createCylinder: function(slices, stacks) {
      var q = this.create();
      q.description = 'cylinder:' + util.vec4ToHexColor(defaultColor) + ':' + slices + ':' + stacks;

    	for (var iSt = 0; iSt < stacks; iSt++) {
    		var zb = iSt / stacks;
    		var zt = (iSt + 1) / stacks;

    		for (var iSl = 0; iSl < slices; iSl++) {
    			var sliceRatioL = iSl / slices;
    			var sliceRatioR = (iSl + 1) / slices;
    			var cl = cos(sliceRatioL * PI * 2.0), sl = sin(sliceRatioL * PI * 2.0),
    				cr = cos(sliceRatioR * PI * 2.0), sr = sin(sliceRatioR * PI * 2.0);
    			addQuad(q, cl, sl, zb, cl, sl, 0,
    				cr, sr, zb, cr, sr, 0,
    				cr, sr, zt, cr, sr, 0,
    				cl, sl, zt, cl, sl, 0);
    		}
    	}

      return q;
    },

    createDisk: function(slices, loops) {
      var q = this.create();
      q.description = 'disk:' + util.vec4ToHexColor(defaultColor) + ':' + slices + ':' + loops;

    	for (var iL = 0; iL < loops; iL++) {
    		var ro = (1.0 - iL) / loops; // outer radius
    		var ri = (1.0 - iL + 1) / loops; // inner radius

    		for (var iSl = 0; iSl < slices; iSl++) {
    			var sliceRatioL = iSl / slices;
    			var sliceRatioR = (iSl + 1) / slices;
    			var cl = cos(sliceRatioL * PI * 2.0), sl = sin(sliceRatioL * PI * 2.0),
    				cr = cos(sliceRatioR * PI * 2.0), sr = sin(sliceRatioR * PI * 2.0);
    			if (iL == loops - 1)
    				addTriangle(q, cl * ro, sl * ro, 0, 0, 0, 1,
    					cr*ro, sr*ro, 0, 0, 0, 1,
    					0, 0, 0, 0, 0, 1);
    			else
    				addQuad(q, cl * ro, sl * ro, 0, 0, 0, 1,
    					cr*ro, sr*ro, 0, 0, 0, 1,
    					cr*ri, sr*ri, 0, 0, 0, 1,
    					cl*ri, sl*ri, 0, 0, 0, 1);
    		}
    	}

      return q;
    },

    createSimpleCone: function(slices, stacks) {
    	return this.createCone(1.0, slices, stacks);
    },

    createCone: function(maxHeight, slices, stacks) {
      var q = this.create();
      q.description = 'cone:' + util.vec4ToHexColor(defaultColor) + ':' + maxHeight + ':' + slices + ':' + stacks;

    	var n = [ 1, 0, 1 ];
    	var len = sqrt(n[0] * n[0] + n[2] * n[2]);
    	n[0] /= len; n[2] /= len;

    	for (var iSt = 0; iSt < maxHeight; iSt += maxHeight / stacks) {
    		br = 1.0 - iSt; // bottom radius
    		tr = 1.0 - iSt - (maxHeight / stacks); // top radius
    		bz = iSt;
    		tz = iSt + (maxHeight / stacks);

    		for (var iSl = 0; iSl < slices; iSl++) {
    			var sliceRatioL = iSl / slices;
    			var sliceRatioR = (iSl + 1) / slices;
    			var cl = cos(sliceRatioL * PI * 2.0), sl = sin(sliceRatioL * PI * 2.0),
    				cr = cos(sliceRatioR * PI * 2.0), sr = sin(sliceRatioR * PI * 2.0);
    			var nlx = cl * n[0], nly = sl * n[0], nlz = n[2],
    				nrx = cr * n[0], nry = sr * n[0], nrz = n[2];
            if (iSt < 1.0 - maxHeight / stacks)
    				addQuad(q, cl * br, sl * br, bz, nlx, nly, nlz,
    					cr * br, sr * br, bz, nrx, nry, nrz,
    					cr * tr, sr * tr, tz, nrx, nry, nrz,
    					cl * tr, sl * tr, tz, nlx, nly, nlz);
    			else
    				addTriangle(q, cl * br, sl * br, bz, nlx, nly, nlz,
    					cr * br, sr * br, bz, nrx, nry, nrz,
    					0, 0, tz, nrx, nry, nrz);
    		}
    	}

      return q;
    },
  }
})();

var camera = (function() {
  var vec3Buf = vec3.create();

  const KEY_AZIMUT = 'azimut';
  const KEY_POLAR = 'polar';
  const KEY_POSITION = 'position';

  var mSpeed = 0.005;
  var rSpeed = PI / 75;
  var keys = {
    left: 'a',
    right: 'd',
    front: 'w',
    back: 's',
  };

  return {
    create: function() {
        var right = vec3.create();
        var front = vec3.create();
        var up = vec3.create();
        var mat4Buf = mat4.create();

        var mPos = vec3.fromValues(0, 2, 3);
        var mPolar = 2/3 * PI;
        var mAzimut = PI;

        var dirty = true;

        return {
          update: function(delta) {
            var mx = 0, mz = 0;

            dirty=false;
            if(engine.isKeyDown(keys.front)) {
              mz += 1;
              dirty=true;
            }
            if(engine.isKeyDown(keys.back)) {
              mz -= 1;
              dirty=true;
            }
            if(engine.isKeyDown(keys.left)) {
              mx -= 1;
              dirty=true;
            }
            if(engine.isKeyDown(keys.right)) {
              mx += 1;
              dirty=true;
            }
            if(engine.isMouseDown()) {
              var mm = engine.mouseMovement();
              this.rotateBy(mm.dy * rSpeed, -mm.dx * rSpeed);
              dirty=true;
            }

            // MH: replaced the old lookAt-related code by simple rotations
            // this is basically front = Ry * Rx * (0,1,0) and the others
            // accordingly. These conventions were already in the initial code
            var s=Math.sin(mAzimut);
            var t=Math.sin(mPolar);
            var c=Math.cos(mAzimut);
            var d=Math.cos(mPolar);
            vec3.set(front, s*t, d, c*t);
            vec3.set(up, -d*s, t, -c*d);
            vec3.set(right, -c, 0, s);

            vec3.add(mPos, mPos, vec3.scale(vec3Buf, front, mz * mSpeed));
            vec3.add(mPos, mPos, vec3.scale(vec3Buf, right, mx * mSpeed));
          },

          isDirty: function() {
            return dirty;
          },

          position: function(v) {
            if(v !== undefined)
              vec3.copy(mPos, v);

            return mPos;
          },

          polar: function(val) {
            if(val !== undefined) {
              mPolar = val;

              if(mPolar < 0 )
                mPolar = 0;
              if(mPolar > PI)
                mPolar = PI;
            }

            return mPolar;
          },

          azimut: function(val) {
            if(val !== undefined) {
              mAzimut = val;

              while(mAzimut > PI2)
                mAzimut -= PI2;
            }

            return mAzimut;
          },

          moveBy: function(v) {
              vec3.add(mPos, mPos, v);
          },

          rotateBy: function(p, a) {
            this.polar(mPolar + p);
            this.azimut(mAzimut + a);
          },

          cameraMatrix: function(out) {
            var f = front;
            var u = up;
            var s = right;

            mat4.set(out,
              s[0], u[0], -f[0], 0,
              s[1], u[1], -f[1], 0,
              s[2], u[2], -f[2], 0,
              0, 0, 0, 1);

            mat4.translate(out, out, vec3.scale(vec3Buf, mPos, -1));
          },

          setFromMatrix: function(m) {
            mat4.invert(mat4Buf, m);
            vec3.set(mPos,mat4Buf[12],mat4Buf[13],mat4Buf[14]);
            vec3.set(front,-mat4Buf[8],-mat4Buf[9],-mat4Buf[10]);
            vec3.set(up,mat4Buf[4],mat4Buf[5],mat4Buf[6]);
            vec3.set(right,mat4Buf[0],mat4Buf[1],mat4Buf[2]);
            vec3.normalize(front,front);
            vec3.normalize(right,right);
            vec3.normalize(up,up);
            var cosY=(front[1]);
            if (cosY > 1.0) {
              cosY = 1.0;
            } else if (cosY < -1.0) {
              cosY = -1.0;
            }
            var angleY=Math.acos(cosY);
            mPolar = angleY;
            if ( (front[0]*front[0]+front[2]*front[2]) > 0.0001) {
              var angleX=Math.atan2(front[0],front[2]);
              if (angleX < 0.0)
                angleX +- PI2;
              mAzimut=angleX;
	    } else {
              var angleX=Math.atan2(right[2],-right[0]);
              if (angleX < 0.0)
                angleX +- PI2;
              mAzimut=angleX;
	    }
          },

          getConfig: function(parent) {
            parent[KEY_AZIMUT] = mAzimut;
            parent[KEY_POLAR] = mPolar;
            parent[KEY_POSITION] = mPos.toString();

            return parent;
          }
        };
    },

    createFromConfig: function(config) {
      var res = camera.create();

      if(config.hasOwnProperty(KEY_AZIMUT))
        res.azimut(parseFloat(config[KEY_AZIMUT]));

      if(config.hasOwnProperty(KEY_POLAR))
        res.polar(parseFloat(config[KEY_POLAR]));

      if(config.hasOwnProperty(KEY_POSITION)) {
        res.position(util.parseVec4(vec4.create(), config[KEY_POSITION]));
      }

      return res;
    },

    keys: function(l, r, f, b) {
      if(l != undefined && r != undefined &&
        f != undefined && b != undefined) {
          keys.left = l;
          keys.right = r;
          keys.front = f;
          keys.back = b;
      }

      return keys;
    },

    movementSpeed: function(val) {
      if(val != undefined)
        mSpeed = val;

      return mSpeed;
    },

    rotationSpeed: function(val) {
      if(val != undefined)
        rSpeed = val;

      return rSpeed;
    },
  };
})();
