import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const project = fileURLToPath(new URL("../", import.meta.url));
const html = `<!doctype html><html><head><style>html,body{margin:0;background:#deedf7;overflow:hidden}canvas{display:block;width:100vw;height:100vh}</style><script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js","three/addons/":"/vendor/three/examples/jsm/"}}</script></head><body><script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
window.scene = new THREE.Scene();
window.renderer = new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.2;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const aspect=innerWidth/innerHeight;
const vertical=Math.max(4.7,4.4/aspect);
window.camera=new THREE.OrthographicCamera(-vertical*aspect/2,vertical*aspect/2,vertical/2,-vertical/2,.1,30);
camera.position.set(0,3.45,9);
camera.lookAt(0,2.95,0);
scene.add(new THREE.HemisphereLight(0xe5f3ff,0x6a7180,2.0));
const key=new THREE.DirectionalLight(0xfff3e7,3.1);
key.position.set(-3,7,6);key.castShadow=true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left=-3;key.shadow.camera.right=3;
key.shadow.camera.top=6;key.shadow.camera.bottom=-1;
key.shadow.normalBias=.035;key.shadow.bias=-.0002;
scene.add(key);
const fill=new THREE.DirectionalLight(0xd3eaff,1.8);fill.position.set(3,4,2);scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,2);rim.position.set(0,6,-4);scene.add(rim);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(12,12),new THREE.ShadowMaterial({color:0x183b50,opacity:.15}));
floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;floor.position.y=.005;scene.add(floor);
const gltf=await new GLTFLoader().loadAsync("/models/dom.glb");
window.dom=gltf.scene;dom.rotation.y=-.12;
dom.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.isSkinnedMesh)o.frustumCulled=false}});
scene.add(dom);
dom.updateWorldMatrix(true,true);
camera.updateMatrixWorld(true);
const bounds=new THREE.Box3().setFromObject(dom,true).applyMatrix4(camera.matrixWorldInverse);
const fittedHeight=Math.max(bounds.max.y-bounds.min.y+.14,4.4/aspect);
const centreX=(bounds.min.x+bounds.max.x)/2;
camera.left=centreX-fittedHeight*aspect/2;camera.right=centreX+fittedHeight*aspect/2;
camera.bottom=bounds.min.y-.035;camera.top=camera.bottom+fittedHeight;
camera.updateProjectionMatrix();
window.mixer=new THREE.AnimationMixer(dom);
window.clips=gltf.animations;
renderer.render(scene,camera);
window.ready=true;
window.render=()=>renderer.render(scene,camera);
</script></body></html>`;
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (pathname === "/") {
        res.setHeader("Content-Type", "text/html");
        res.end(html);
        return;
      }
      let directory, relative;
      if (pathname.startsWith("/vendor/three/")) {
        directory = path.join(project, "node_modules/three");
        relative = pathname.slice("/vendor/three/".length);
      } else if (pathname.startsWith("/models/")) {
        directory = path.join(project, "public/models");
        relative = pathname.slice("/models/".length);
      } else {
        res.writeHead(404);
        res.end();
        return;
      }
      const filename = path.resolve(directory, relative);
      if (!filename.startsWith(path.resolve(directory) + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const data = await readFile(filename);
      res.setHeader(
        "Content-Type",
        filename.endsWith(".js")
          ? "text/javascript"
          : filename.endsWith(".glb")
            ? "model/gltf-binary"
            : "application/octet-stream",
      );
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  })
  .listen(3006, "127.0.0.1", () =>
    console.log("Dom model preview: http://127.0.0.1:3006"),
  );
