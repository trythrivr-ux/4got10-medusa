"use client";

import { Canvas } from "@react-three/fiber";
import { Loader } from "@react-three/drei";
import { Suspense } from "react";
import { Experience } from "@/components/Experience";
import * as THREE from "three";

export default function RootPage() {
  // Only show the first step (open animation)
  // Pass currentState={0} to Experience, which should trigger only the opening phase
  return (
    <>
      {/* No UI or state controls, just the scene */}
      <Loader />
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1,
          outputColorSpace: THREE.SRGBColorSpace,
          powerPreference: "high-performance",
        }}
        camera={{
          position: [0.03, -0.5, -0.05],
          fov: 50,
          up: [0, 0, 1],
        }}
      >
        <group position-y={0}>
          <Suspense fallback={null}>
            <Experience currentState={0} />
          </Suspense>
        </group>
      </Canvas>
    </>
  );
}
