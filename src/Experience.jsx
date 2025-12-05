import { useTexture, useGLTF, OrbitControls, Bounds, Outlines } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three';
import { useState, useRef, useEffect, useMemo } from 'react'; // Add useEffect here

function Content() {
    const { nodes } = useGLTF('/model/ale3d03_expandido_c.glb')
    const bakedTexture = useTexture('/model/bake.jpg')
    const tvRef = useRef()

    // Prepare a centered clone of the TV geometry so rotation happens around its visual center
    const { centeredTvGeometry, tvCenter, tvMeshPosition } = useMemo(() => {
        const geo = nodes.tvPantalla.geometry
        if (!geo) return { centeredTvGeometry: geo, tvCenter: new THREE.Vector3(), tvMeshPosition: nodes.tvPantalla.position }

        const cloned = geo.clone()
        if (!cloned.boundingBox) cloned.computeBoundingBox()
        const c = new THREE.Vector3()
        cloned.boundingBox.getCenter(c)
        // translate cloned geometry so its center is at the local origin
        cloned.translate(-c.x, -c.y, -c.z)

        // compute mesh position so the visual position remains the same as original
        const originalPos = nodes.tvPantalla.position ? nodes.tvPantalla.position.clone() : new THREE.Vector3()
        const meshPos = originalPos.clone().add(c)

        return { centeredTvGeometry: cloned, tvCenter: c, tvMeshPosition: meshPos }
    }, [nodes.tvPantalla.geometry, nodes.tvPantalla.position])
    const { camera, size } = useThree() // Add size to get viewport dimensions
    const controls = useThree((state) => state.controls)
    const targetPosRef = useRef(new THREE.Vector3())
    const targetLookRef = useRef(new THREE.Vector3())
    const animatingRef = useRef(false)
    const [isTvVertical, setIsTvVertical] = useState(false)

    // Estados individuales para cada sección
    const [hoveredClases, setHoveredClases] = useState(false)
    const [hoveredPersonalizados, setHoveredPersonalizados] = useState(false)
    const [hoveredPostres, setHoveredPostres] = useState(false)
    const [hoveredSnacks, setHoveredSnacks] = useState(false)
    const [hoveredRedes, setHoveredRedes] = useState(false)

    const outlineProps = {
        thickness: 0.02,
        color: 'white',
        screenspace: true,
    }

    bakedTexture.flipY = false

    // Auto-detect orientation based on aspect ratio
    useEffect(() => {
        const aspectRatio = size.width / size.height
        // Use vertical orientation for mobile (aspect ratio < 1) or very narrow screens
        const shouldBeVertical = aspectRatio < 0.8 // Adjust threshold as needed
        setIsTvVertical(shouldBeVertical)
    }, [size.width, size.height])

    const focusTv = () => {
        const obj = tvRef.current
        if (!obj) return

        obj.updateWorldMatrix(true, false)
        const worldQuat = new THREE.Quaternion()
        const worldScale = new THREE.Vector3()
        const worldPosTmp = new THREE.Vector3()
        obj.matrixWorld.decompose(worldPosTmp, worldQuat, worldScale)

        // World-space bounds and center
        const box = new THREE.Box3().setFromObject(obj)
        const sizeVec = new THREE.Vector3() // Renamed to avoid conflict
        const center = new THREE.Vector3()
        box.getSize(sizeVec)
        box.getCenter(center)

        // Compute fit distance by considering projected width/height in camera FOV
        const vFov = (camera.fov * Math.PI) / 180
        const margin = 0.95

        // Determine the TV's up/right in world to reason about width/height regardless of rotation
        const frontNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat).normalize()
        const upWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(worldQuat).normalize()
        const rightWorld = new THREE.Vector3(1, 0, 0).applyQuaternion(worldQuat).normalize()

        // Dimensions along world axes of the oriented box
        const halfX = sizeVec.x / 2
        const halfY = sizeVec.y / 2
        const halfZ = sizeVec.z / 2

        // Build an orthonormal basis for the camera view: forward = frontNormal, then find view up and right
        // When the TV is vertical (rotated 90° around Z), up/right swap relative to viewport, so we always compute both
        const viewForward = frontNormal.clone()
        // choose an arbitrary world up to derive a stable basis
        const worldUpRef = Math.abs(viewForward.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)
        const viewRight = new THREE.Vector3().crossVectors(worldUpRef, viewForward).normalize()
        const viewUp = new THREE.Vector3().crossVectors(viewForward, viewRight).normalize()

        // Effective width/height of the oriented bounding box as seen by the camera basis
        // Project box half-axes onto viewRight/viewUp and sum absolute contributions
        const ex = new THREE.Vector3(1, 0, 0).applyQuaternion(worldQuat).multiplyScalar(halfX)
        const ey = new THREE.Vector3(0, 1, 0).applyQuaternion(worldQuat).multiplyScalar(halfY)
        const ez = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQuat).multiplyScalar(halfZ)

        const width =
            Math.abs(ex.dot(viewRight)) * 2 +
            Math.abs(ey.dot(viewRight)) * 2 +
            Math.abs(ez.dot(viewRight)) * 2
        const height =
            Math.abs(ex.dot(viewUp)) * 2 +
            Math.abs(ey.dot(viewUp)) * 2 +
            Math.abs(ez.dot(viewUp)) * 2

        // Distance so TV fills ~95% of viewport, same formula for horizontal/vertical
        const dHeight = (height / 2) / (Math.tan(vFov / 2) * margin)
        const dWidth = (width / 2) / (Math.tan(vFov / 2) * camera.aspect * margin)
        const distance = Math.max(dHeight, dWidth) * (isTvVertical ? 0.6 : 1.0)

        // Move along the object's front normal
        const desiredPos = center.clone().add(viewForward.multiplyScalar(distance))

        targetPosRef.current.copy(desiredPos)
        targetLookRef.current.copy(center)
        animatingRef.current = true
        if (controls) controls.enableRotate = false
    }

    useFrame((_, delta) => {
        if (!animatingRef.current) return
        const damping = 5
        camera.position.lerp(targetPosRef.current, 1 - Math.exp(-damping * delta))
        if (controls) {
            controls.target.lerp(targetLookRef.current, 1 - Math.exp(-damping * delta))
            controls.update()
        } else {
            camera.lookAt(targetLookRef.current)
        }
        const posDone = camera.position.distanceToSquared(targetPosRef.current) < 1e-4
        const tgtDone = !controls || controls.target.distanceToSquared(targetLookRef.current) < 1e-4
        if (posDone && tgtDone) {
            animatingRef.current = false
            if (controls) controls.enableRotate = true
        }
    })

    

    return (
        <group name="all">
            <group name="scene">
                <mesh geometry={nodes.scene_Baked.geometry}>
                    <meshBasicMaterial map={bakedTexture} attach="material" side={THREE.DoubleSide} />
                </mesh>

                <mesh geometry={nodes.vitrina2vidrio.geometry} position={nodes.vitrina2vidrio.position}>
                    <meshBasicMaterial color="white" transparent={true} opacity={0.3} />
                </mesh>

                <mesh geometry={nodes.vitrinaRedondaVidrio.geometry} position={nodes.vitrinaRedondaVidrio.position}>
                    <meshBasicMaterial
                        attach="material"
                        color="white"
                        transparent={true}
                        opacity={0.3}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            </group>

            <group name="clases">
                <mesh
                    geometry={nodes.clases_Baked.geometry}
                    onPointerOver={() => setHoveredClases(true)}
                    onPointerOut={() => setHoveredClases(false)}
                    onClick={focusTv}
                >
                    <meshBasicMaterial map={bakedTexture} />
                    {hoveredClases && <Outlines {...outlineProps} />}
                </mesh>

                <mesh geometry={nodes.hornoVidrio.geometry} position={nodes.hornoVidrio.position}>
                    <meshBasicMaterial color="white" transparent={true} opacity={0.5} />
                </mesh>

                <mesh geometry={nodes.vaso.geometry} position={nodes.vaso.position}>
                    <meshBasicMaterial color="white" transparent={true} opacity={0.5} />
                </mesh>

                <mesh geometry={nodes.letreroAleBt.geometry} position={nodes.letreroAleBt.position}>
                    <meshBasicMaterial color="purple" />
                </mesh>
            </group>

            <group name="personalizados">
                <mesh
                    geometry={nodes.personalizados_Baked.geometry}
                    onPointerOver={() => setHoveredPersonalizados(true)}
                    onPointerOut={() => setHoveredPersonalizados(false)}
                    onClick={focusTv}
                >
                    <meshBasicMaterial map={bakedTexture} />
                    {hoveredPersonalizados && <Outlines {...outlineProps} />}
                </mesh>
            </group>

            <group name="postres">
                <mesh
                    geometry={nodes.postres_Baked.geometry}
                    onPointerOver={() => setHoveredPostres(true)}
                    onPointerOut={() => setHoveredPostres(false)}
                    onClick={focusTv}
                >
                    <meshBasicMaterial map={bakedTexture} />
                    {hoveredPostres && <Outlines {...outlineProps} />}
                </mesh>
            </group>

            <group name="redes">
                <mesh
                    geometry={nodes.redes_Baked.geometry}
                    onPointerOver={() => setHoveredRedes(true)}
                    onPointerOut={() => setHoveredRedes(false)}
                    onClick={focusTv}
                >
                    <meshBasicMaterial map={bakedTexture} />
                    {hoveredRedes && <Outlines {...outlineProps} />}
                </mesh>

                <mesh geometry={nodes.letreroAle.geometry} position={nodes.letreroAle.position}>
                    <meshBasicMaterial color="purple" />
                </mesh>
            </group>

            <group name="snacks">
                <mesh
                    geometry={nodes.snacks_Baked.geometry}
                    onPointerOver={() => setHoveredSnacks(true)}
                    onPointerOut={() => setHoveredSnacks(false)}
                    onClick={focusTv}
                >
                    <meshBasicMaterial map={bakedTexture} />
                    {hoveredSnacks && <Outlines {...outlineProps} />}
                </mesh>
            </group>

            {/* TV with auto-rotation: use centered cloned geometry and offset mesh so visual position stays identical
                Rotation will then occur around the geometry center without world-position jumps. */}
            <mesh
                name="tvPantalla"
                geometry={centeredTvGeometry}
                position={tvMeshPosition}
                rotation={[0, 0, isTvVertical ? Math.PI / 2 : 0]}
                ref={tvRef}
            >
                <meshBasicMaterial color="white" />
            </mesh>
        </group>
    )
}

export default function Experience() {
    // Ensure azimuthal limits are applied directly to the controls instance.
    // Some helpers (like Bounds) can reconfigure or replace controls; to be robust
    // we both assign the props once and also clamp the camera azimuth each frame.
    const controls = useThree((s) => s.controls)
    const _spherical = useRef(new THREE.Spherical())
    const { camera } = useThree()
    // Don't forcibly overwrite controls.min/max here — props on <OrbitControls /> or
    // other helpers (Bounds) may set them. We'll read the live values each frame and
    // clamp to whatever is currently configured on the controls instance.

    // Per-frame clamp: compute camera spherical coordinates around controls.target
    // and force azimuth into our range. This guarantees the constraint at runtime.
    useFrame(() => {
        if (!controls || !controls.target || !camera) return

        // Read the live values from the controls instance so changing props
        // on <OrbitControls /> (or other code) is respected immediately.
        const rawMin = controls.minAzimuthalAngle
        const rawMax = controls.maxAzimuthalAngle
        const hasMin = typeof rawMin === 'number' && isFinite(rawMin)
        const hasMax = typeof rawMax === 'number' && isFinite(rawMax)

        // If no finite azimuth limits are configured, skip clamping.
        if (!hasMin && !hasMax) return

        const minA = hasMin ? rawMin : -Infinity
        const maxA = hasMax ? rawMax : Infinity

        const vec = new THREE.Vector3().subVectors(camera.position, controls.target)
        const sph = _spherical.current
        sph.setFromVector3(vec)
        let changed = false
        if (sph.theta < minA) {
            sph.theta = minA
            changed = true
        } else if (sph.theta > maxA) {
            sph.theta = maxA
            changed = true
        }
        if (changed) {
            vec.setFromSpherical(sph)
            camera.position.copy(controls.target).add(vec)
            controls.update()
        }
    })

    return (
        <>
            <color args={['#252525']} attach="background" />
            
            <Bounds fit once margin={1}>
                <Content />
            </Bounds>
            
            <OrbitControls 
                makeDefault 
                minPolarAngle={Math.PI / 6}      // Limit vertical rotation (45° from top)
                maxPolarAngle={Math.PI / 1.9}    // Limit vertical rotation (120° from top)
                    minAzimuthalAngle={-Math.PI / 18} // Limit horizontal rotation (-60°)
                    maxAzimuthalAngle={Math.PI / 1.9}  // Limit horizontal rotation (60°)
                enablePan={true}                 // Optional: disable panning
                maxDistance={70}                  // Optional: limit zoom out
                minDistance={2}                   // Optional: limit zoom in
                 // Panning limits (adjust based on your scene bounds)
                minTargetRadius={0}               // Minimum distance from origin
                maxTargetRadius={10}              // Maximum distance from origin (prevents panning too far)
                onContextMenu={(e) => e.preventDefault()}
            />
            
        </>
    )
}