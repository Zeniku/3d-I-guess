/* ============================
   CORE SHADERS
   ============================ */
const Shaders = {
  // 2D Shader (Standard SpriteBatch)
  vs2D: `
    attribute vec2 a_pos;
    attribute vec2 a_texCoord;
    attribute vec4 a_color;
    uniform mat4 u_projTrans;
    varying vec2 v_texCoord;
    varying vec4 v_color;
    void main(){
      gl_Position = u_projTrans * vec4(a_pos, 0.0, 1.0);
      v_texCoord = a_texCoord;
      v_color = a_color;
    }
  `,
  fs2D: `
    precision mediump float;
    varying vec2 v_texCoord;
    varying vec4 v_color;
    uniform sampler2D u_texture;
    void main(){
      gl_FragColor = texture2D(u_texture, v_texCoord) * v_color;
    }
  `,

  // 3D Shader (Accepts Z-coordinates)
  vs3D: `
    // Vertex Shader (vs3D)
attribute vec3 a_pos;
attribute vec3 a_normal; // New Attribute!
attribute vec4 a_color;

uniform mat4 u_projTrans;
varying vec3 v_normal;
varying vec3 v_worldPos;
varying vec4 v_color;

void main() {
    v_normal = a_normal;
    v_worldPos = a_pos;
    v_color = a_color;
    gl_Position = u_projTrans * vec4(a_pos, 1.0);
}


  `,
  fs3D: `
    // Fragment Shader (fs3D)
precision mediump float;
varying vec3 v_normal;
varying vec3 v_worldPos;
varying vec4 v_color;

uniform vec3 u_lightDir;
uniform vec3 u_cameraPos;
uniform vec3 u_fogColor;

void main() {
    // 1. Dynamic Lighting
    float diffuse = max(dot(normalize(v_normal), normalize(u_lightDir)), 0.0);
    float ambient = 0.3;
    float light = ambient + (1.0 - ambient) * diffuse;
    
    vec3 litColor = v_color.rgb * light;

    // 2. Exponential Fog
    float dist = distance(v_worldPos, u_cameraPos);
    float fogDensity = 0.0015; // Tweak this!
    float fogFactor = 1.0 - exp(-dist * fogDensity);
    fogFactor = clamp(fogFactor, 0.0, 1.0);

    gl_FragColor = vec4(mix(litColor, u_fogColor, fogFactor), v_color.a);
}

  `,//experimental
    // WebGL 2 Optimized 3D Shader
  vs3D_Opt: `#version 300 es
    in vec3 a_pos;
    in vec2 a_normalPacked; // Two floats: [Yaw, Pitch]
    in vec4 a_color;

    uniform mat4 u_projTrans;
    
    out vec3 v_worldPos;
    out vec2 v_normalPacked;
    out vec4 v_color;

    void main() {
        v_worldPos = a_pos;
        v_normalPacked = a_normalPacked;
        v_color = a_color;
        gl_Position = u_projTrans * vec4(a_pos, 1.0);
    }
  `,

    fs3D_Opt: `#version 300 es
    precision highp float;
    
    in vec3 v_worldPos;
    in vec2 v_normalPacked; // Now contains Octahedral [u, v]
    in vec4 v_color;

    uniform vec3 u_lightDir;
    uniform vec3 u_cameraPos;
    uniform vec3 u_fogColor;
    
    out vec4 fragColor;

    // --- OCTAHEDRAL DECODE ---
    vec3 decodeNormal(vec2 p) {
        p = p * 2.0 - 1.0;
        vec3 n = vec3(p.x, 1.0 - abs(p.x) - abs(p.y), p.y);
        float t = clamp(-n.y, 0.0, 1.0);
        n.x += n.x >= 0.0 ? -t : t;
        n.z += n.z >= 0.0 ? -t : t;
        return normalize(n);
    }

    void main() {
        // Use the new decoder
        vec3 normal = decodeNormal(v_normalPacked);

        // --- LIGHTING ---
        float diffuse = max(dot(normal, normalize(u_lightDir)), 0.0);
        float ambient = 0.3;
        float light = ambient + (1.0 - ambient) * diffuse;
        
        vec3 litColor = v_color.rgb * light;

        // --- FOG ---
        float dist = distance(v_worldPos, u_cameraPos);
        float fogFactor = clamp(1.0 - exp(-dist * 0.0002), 0.0, 1.0);

        fragColor = vec4(mix(litColor, u_fogColor, fogFactor), v_color.a);
    }
  `
};
