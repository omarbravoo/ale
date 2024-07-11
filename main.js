import * as THREE from 'three'
import { WebGL } from 'three/examples/jsm/Addons.js'
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
// import { element } from 'three/examples/jsm/nodes/Nodes.js'

// Scene
const scene = new THREE.Scene()

const gltfLoader = new GLTFLoader()

const canvas = document.querySelector('.webgl')
const left = document.querySelector('.left')
const hero = document.querySelector('.hero')

// Camera
const sizes = {
    width: canvas.clientWidth,
    height: canvas.clientHeight
}
// window.addEventListener('resize', () =>
// {
//     // Update sizes
//     sizes.width = window.innerWidth
//     sizes.height = window.innerHeight

//     // Update camera
//     camera.aspect = sizes.width / sizes.height
//     camera.updateProjectionMatrix()

//     // Update renderer
//     renderer.setSize(sizes.width, sizes.height)
//     renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
// })


const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height)
camera.position.x = 0
camera.position.y = 1.2
camera.position.z = 1

// camera.lookAt(gltfLoader) // This line seems incorrect, should be a target
scene.add(camera)



// const controls = new OrbitControls(camera, canvas)
// controls.enableDamping = false


/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6)
// directionalLight.castShadow = true
// directionalLight.shadow.mapSize.set(1024, 1024)
// directionalLight.shadow.camera.far = 15
// directionalLight.shadow.camera.left = - 7
// directionalLight.shadow.camera.top = 7
// directionalLight.shadow.camera.right = 7
// directionalLight.shadow.camera.bottom = - 7
// directionalLight.position.set(- 5, 5, 0)
scene.add(directionalLight)



//Load GLTF

let mixer = null


gltfLoader.load(
    '/static/3d/pastry chef animated.glb',
    (gltf) =>
    {
        //const children = [...gltf.scene.children]

        //for (const child of children)
        //{
        //    scene.add(child)
        //}
        mixer = new THREE.AnimationMixer(gltf.scene)
        const action = mixer.clipAction(gltf.animations[0])
        action.play()

        gltf.scene.scale.set(1.5, 1.5, 1.5)

        scene.add(gltf.scene)
       
        // // Calculate the center of the model's bounding box
        // const box = new THREE.Box3().setFromObject(gltf.scene)
        // const center = box.getCenter(new THREE.Vector3())

        // // Position the camera to look at the center of the model
        // camera.position.set(center.x, center.y, center.z + 3) // Adjust the distance as needed
        // camera.lookAt(center)
         
    }
)




// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
    
})
renderer.setSize(sizes.width, sizes.height)
renderer.setClearColor(0x000000, 0); // Set the clear color and alpha to 0
renderer.premultiplyAlpha = false;



// Animate
const clock = new THREE.Clock()
let previousTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    // Update objects
    //mesh.rotation.y = elapsedTime;

    //update camera
    //camera.position.x = cursor.x * 10
    //camera.position.y = cursor.y * 10
    //camera.lookAt(mesh.position)
    
    //Update mixer
    if(mixer !== null){
    mixer.update(deltaTime)
    }
//    controls.update()


    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()


const scrollers = document.querySelectorAll(".diplomas");

if(!window.matchMedia("(prefers-reduced-motion: reduce)").matches){
    addAnimation();
}

function addAnimation(){
    scrollers.forEach((diplomas) => {
        diplomas.setAttribute('data-animated', true);
        const dipin = diplomas.querySelector('.dipin');
        const scrollerContent = Array.from(dipin.children);
        

        scrollerContent.forEach((item) => {
            const duplicatedItem = item.cloneNode(true);
            duplicatedItem.setAttribute('aria-hidden', true);
            dipin.appendChild(duplicatedItem);
        })
    })
}
