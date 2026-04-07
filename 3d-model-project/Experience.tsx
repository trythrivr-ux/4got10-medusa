"use client";

import { OrbitControls, Sky } from "@react-three/drei";
import { Physics } from "@react-three/cannon";
import { Paper } from "./Paper";

interface ExperienceProps {
  currentState?: number; // 0-4, undefined = auto-animate
}

export const Experience = ({ currentState }: ExperienceProps) => {
  return (
    <>
      {/* Blue sky with realistic atmosphere */}
      <Sky
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0}
        azimuth={0.25}
        turbidity={10}
        rayleigh={3}
        mieCoefficient={0.005}
        mieDirectionalG={0.7}
      />
      
      <Physics gravity={[0, -9.81, 0]} iterations={10}>
        <Paper currentState={currentState} />
      </Physics>
      <OrbitControls target={[0, 0.5, 0]} enablePan={true} makeDefault />
      
      {/* Enhanced lighting setup */}
      {/* Key light - main directional light from sun */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={3}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0001}
      />
      
      {/* Fill light - softer light from opposite side */}
      <directionalLight
        position={[-3, 4, -3]}
        intensity={1.5}
        color="#b3d9ff"
      />
      
      {/* Rim light - highlights edges */}
      <directionalLight
        position={[0, 2, -5]}
        intensity={1}
        color="#ffffff"
      />
      
      {/* Ambient light for overall illumination */}
      <ambientLight intensity={0.4} color="#ffffff" />
      
      {/* Hemisphere light for sky/ground color blend */}
      <hemisphereLight
        args={["#87CEEB", "#ffffff", 0.6]}
        position={[0, 10, 0]}
      />
      
      {/* Main directional light from above - creates shadows */}
      <directionalLight
        position={[0, 3, 2]}
        intensity={4}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
        shadow-camera-near={0.1}
        shadow-camera-far={10}
        shadow-bias={-0.0001}
      />
      
      {/* Additional side light for better shadow definition */}
      <directionalLight
        position={[-2, 2, 1]}
        intensity={1.5}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      
      {/* Very low ambient light - let shadows show */}
      <ambientLight intensity={0.2} />
    </>
  );
};
