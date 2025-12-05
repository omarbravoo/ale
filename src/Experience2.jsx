import {
  useTexture,
  useGLTF,
  Outlines,
  Float,
  CameraControls,
} from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useState, useRef, useEffect } from "react";

function Content({ cameraControlsRef }) {
  const { nodes } = useGLTF("/model/ale3d03_expandido_c.glb");
  const bakedTexture = useTexture("/model/bake.jpg");

  // Estado para rastrear qué sección está seleccionada
  const [selectedSection, setSelectedSection] = useState(null);

  const outlineProps = {
    thickness: 0.02,
    color: "white",
    screenspace: true,
  };

  bakedTexture.flipY = false;

  const focusOnMesh = (geometry, position, sectionName) => {
    if (!cameraControlsRef.current) return;

    // Actualizar la sección seleccionada
    setSelectedSection(sectionName);

    const controls = cameraControlsRef.current;

    const box = new THREE.Box3().setFromBufferAttribute(
      geometry.attributes.position
    );
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    if (position) center.add(position);

    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;

    controls.setLookAt(
      center.x + distance * 0.7,
      center.y + distance * 0.5,
      center.z + distance * 0.7,
      center.x,
      center.y,
      center.z,
      true
    );

    // ⭐ ENFORCE LIMITS AFTER LOOKAT
    if (typeof controls.applyConstraints === "function") {
      controls.applyConstraints();
    } else if (typeof controls.update === "function") {
      try {
        controls.update(0);
      } catch (e) {
        // swallow errors
      }
    }
  };

  return (
    <group name="all" onClick={(e) => {
      // Si se hace clic en el fondo o en un objeto no interactivo, deseleccionar
      if (e.eventObject.name === 'all' || e.eventObject.name === 'scene') {
        setSelectedSection(null);
        e.stopPropagation();
      }
    }}>
      <group name="scene">
        <mesh geometry={nodes.scene_Baked.geometry}>
          <meshBasicMaterial
            map={bakedTexture}
            attach="material"
            side={THREE.DoubleSide}
          />
        </mesh>

        <mesh
          geometry={nodes.vitrina2vidrio.geometry}
          position={nodes.vitrina2vidrio.position}
        >
          <meshBasicMaterial color="white" transparent={true} opacity={0.3} />
        </mesh>

        <mesh
          geometry={nodes.vitrinaRedondaVidrio.geometry}
          position={nodes.vitrinaRedondaVidrio.position}
        >
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
          onClick={(e) => {
            e.stopPropagation();
            focusOnMesh(nodes.clases_Baked.geometry, null, 'clases');
          }}
        >
          <meshBasicMaterial map={bakedTexture} />
          {selectedSection === 'clases' && <Outlines {...outlineProps} />}
        </mesh>

        <mesh
          geometry={nodes.hornoVidrio.geometry}
          position={nodes.hornoVidrio.position}
        >
          <meshBasicMaterial color="white" transparent={true} opacity={0.5} />
        </mesh>

        <mesh geometry={nodes.vaso.geometry} position={nodes.vaso.position}>
          <meshBasicMaterial color="white" transparent={true} opacity={0.5} />
        </mesh>

        <mesh
          geometry={nodes.letreroAleBt.geometry}
          position={nodes.letreroAleBt.position}
        >
          <meshBasicMaterial color="purple" />
        </mesh>
      </group>

      <group name="personalizados">
        <mesh
          geometry={nodes.personalizados_Baked.geometry}
          onClick={(e) => {
            e.stopPropagation();
            focusOnMesh(nodes.personalizados_Baked.geometry, null, 'personalizados');
          }}
        >
          <meshBasicMaterial map={bakedTexture} />
          {selectedSection === 'personalizados' && <Outlines {...outlineProps} />}
        </mesh>
      </group>

      <group name="postres">
        <mesh
          geometry={nodes.postres_Baked.geometry}
          onClick={(e) => {
            e.stopPropagation();
            focusOnMesh(nodes.postres_Baked.geometry, null, 'postres');
          }}
        >
          <meshBasicMaterial map={bakedTexture} />
          {selectedSection === 'postres' && <Outlines {...outlineProps} />}
        </mesh>
      </group>

      <group name="redes">
        <mesh
          geometry={nodes.redes_Baked.geometry}
          onClick={(e) => {
            e.stopPropagation();
            focusOnMesh(nodes.redes_Baked.geometry, null, 'redes');
          }}
        >
          <meshBasicMaterial map={bakedTexture} />
          {selectedSection === 'redes' && <Outlines {...outlineProps} />}
        </mesh>

        <mesh
          geometry={nodes.letreroAle.geometry}
          position={nodes.letreroAle.position}
        >
          <meshBasicMaterial color="purple" />
        </mesh>
      </group>

      <group name="snacks">
        <mesh
          geometry={nodes.snacks_Baked.geometry}
          onClick={(e) => {
            e.stopPropagation();
            focusOnMesh(nodes.snacks_Baked.geometry, null, 'snacks');
          }}
        >
          <meshBasicMaterial map={bakedTexture} />
          {selectedSection === 'snacks' && <Outlines {...outlineProps} />}
        </mesh>
      </group>

      <mesh
        name="tvPantalla"
        geometry={nodes.tvPantalla.geometry}
        position={nodes.tvPantalla.position}
      >
        <meshBasicMaterial color="white" />
      </mesh>
    </group>
  );
}

export default function Experience() {
  const cameraControlsRef = useRef();
  const { size, scene } = useThree();
  const [initialSetupDone, setInitialSetupDone] = useState(false);

  // Initial camera setup and responsive behavior
  useEffect(() => {
    if (cameraControlsRef.current && !initialSetupDone) {
      const controls = cameraControlsRef.current;

      // Calculate scene bounding box for initial fit
      const box = new THREE.Box3();
      scene.traverse((object) => {
        if (object.isMesh && object.geometry) {
          box.expandByObject(object);
        }
      });

      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // Set initial camera position with responsive distance
        const aspect = window.innerWidth / window.innerHeight;
        const distanceMultiplier = aspect < 1 ? 2.2 : 0.8;

        controls.setLookAt(
          center.x + maxDim * distanceMultiplier,
          center.y + maxDim * 0.6,
          center.z + maxDim * distanceMultiplier,
          center.x,
          center.y,
          center.z,
          false
        );

        controls.minPolarAngle = Math.PI * 0.3;
        controls.maxPolarAngle = Math.PI * 0.5;

        controls.minAzimuthAngle = -Math.PI / 17;
        controls.maxAzimuthAngle = Math.PI / 1.9;

        controls.minDistance = maxDim * 0.5;
        controls.maxDistance = maxDim * 4;

        // Pan constraints 
        const expandedBox = box.clone() 
        expandedBox.expandByScalar(maxDim * 0.5) 
        controls.setBoundary(expandedBox)

        setInitialSetupDone(true);
      }
    }
  }, [scene, initialSetupDone]);

  // Handle window resize
  useEffect(() => {
    if (cameraControlsRef.current && initialSetupDone) {
      const controls = cameraControlsRef.current;
      const aspect = window.innerWidth / window.innerHeight;

      // Adjust camera distance on resize for responsiveness
      controls.smoothTime = 0.5; // slower on resize
    }
  }, [size, initialSetupDone]);

  return (
    <>
      <color args={["#252525"]} attach="background" />

      <CameraControls ref={cameraControlsRef} makeDefault />

      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.4}>
        <Content cameraControlsRef={cameraControlsRef} />
      </Float>
    </>
  );
}