"use client";

import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
// Removed gsap

const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71;
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;
const NUM_PAGES = 20;

// Create page geometry with bones for page curl effect
const createPageGeometry = () => {
  const geometry = new THREE.BoxGeometry(
    PAGE_WIDTH,
    PAGE_HEIGHT,
    PAGE_DEPTH,
    PAGE_SEGMENTS,
    1,
    1
  );
  geometry.translate(PAGE_WIDTH / 2, 0, 0); // Pivot at spine

  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  const skinIndexes: number[] = [];
  const skinWeights: number[] = [];

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const x = vertex.x;
    const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH));
    const skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;
    skinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
    skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
  }

  geometry.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndexes, 4));
  geometry.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeights, 4));

  return geometry;
};

interface PaperProps {
  currentState?: number;
}

export const Paper = ({ currentState }: PaperProps) => {
    // Removed unused prevState
  const groupRef = useRef<THREE.Group>(null);
  const pagesRef = useRef<THREE.Group[]>([]);
  
  // Animation progress value: { main, curve }
  const [animProgress, setAnimProgress] = React.useState<{ main: number; curve: number }>({ main: 0, curve: 0 });
  // Removed unused swirllProgress

  // Create pages with textures (images or placeholders)
  const pages = useMemo(() => {
    return Array.from({ length: NUM_PAGES }, (_, i) => {
      // Determine which texture to load based on page position
      let texturePath: string;
      if (i === 0) {
        // First page is left side of front cover
        texturePath = '/textures/left-page.jpg';
      } else if (i === NUM_PAGES - 1) {
        // Last page is right side of back cover
        texturePath = '/textures/right-page.jpg';
      } else {
        // Regular pages
        texturePath = `/textures/page-${i + 1}.jpg`;
      }
      
      // Try to load image, fallback to placeholder
      const texture = new THREE.TextureLoader().load(
        texturePath,
        undefined,
        undefined,
        () => {
          // On error, create placeholder
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 512, 512);
            ctx.fillStyle = '#333333';
            ctx.font = '32px Arial';
            ctx.textAlign = 'center';
            const label = i === 0 ? 'Left Cover' : i === NUM_PAGES - 1 ? 'Right Cover' : `Page ${i + 1}`;
            ctx.fillText(label, 256, 256);
          }
          const placeholderTexture = new THREE.CanvasTexture(canvas);
          placeholderTexture.colorSpace = THREE.SRGBColorSpace;
          // Replace the failed texture
          if (material.map) {
            material.map = placeholderTexture;
            material.needsUpdate = true;
          }
        }
      );
      texture.colorSpace = THREE.SRGBColorSpace;
      
      // Create bones for page curl
      const bones: THREE.Bone[] = [];
      for (let j = 0; j <= PAGE_SEGMENTS; j++) {
        const bone = new THREE.Bone();
        bones.push(bone);
        if (j === 0) {
          bone.position.x = 0;
        } else {
          bone.position.x = SEGMENT_WIDTH;
        }
        if (j > 0) {
          bones[j - 1].add(bone);
        }
      }
      
      const skeleton = new THREE.Skeleton(bones);
      const geometry = createPageGeometry();
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        roughness: 0.4, // Lower = more reflective (was 0.6)
        metalness: 0.05, // Slight metalness for subtle reflections (was 0)
        envMapIntensity: 0.3, // Reflect environment subtly
      });
      
      const mesh = new THREE.SkinnedMesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.add(skeleton.bones[0]);
      mesh.bind(skeleton);
      
      return { mesh, skeleton };
    });
  }, []);

  // Custom animation loop
  useEffect(() => {
    let start = performance.now();
    let phase = 0;
    let rafId: number;

    // Animation phases: [duration, start, end]
    // Last phase: magazine closes, then curves and moves position
    const phases = [
      { duration: 2500, from: 0, to: 1 },    // open
      { duration: 5000, from: 1, to: 0 },    // close
      { duration: 3000, from: 0, to: 0.32 }, // swirl
      { duration: 3000, from: 0.32, to: 0.18 }, // closed
      { duration: 2500, from: 0.18, to: 0 }, // reset
      { duration: 3500, from: 0, to: 1 },    // magazine curve & move (0=normal, 1=curved/moved)
    ];

    function animate(now: number) {
      const elapsed = now - start;
      const { duration, from, to } = phases[phase];
      let t = Math.min(elapsed / duration, 1);
      // Ease in-out
      t = 0.5 * (1 - Math.cos(Math.PI * t));
      const animState = { main: 0, curve: 0 };
      if (phase < phases.length - 1) {
        animState.main = from + (to - from) * t;
        animState.curve = 0;
      } else {
        animState.main = 0;
        animState.curve = t;
      }
      setAnimProgress(animState);
      if (elapsed >= duration) {
        phase = (phase + 1) % phases.length;
        start = now;
      }
      rafId = requestAnimationFrame(animate);
    }
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [currentState]);

  // Update pages each frame
  useFrame(() => {
    // animProgress is now an object: { main, curve }
    const mainProgress = animProgress.main;
    const curveMoveProgress = animProgress.curve;

    if (groupRef.current) {
      // Animate along a much longer arc path and curve the book
      // Extended path: from (0,0.5) to (2.5,2.2) to (-2.0,-0.8)
      // Use quadratic Bezier for position, and curve rotation in sync
      const p0 = { x: 0, y: 0.5 };
      const p1 = { x: 2.5, y: 2.2 };
      const p2 = { x: -2.0, y: -0.8 };
      if (curveMoveProgress > 0) {
        // Quadratic Bezier interpolation
        const t = curveMoveProgress;
        const oneMinusT = 1 - t;
        // Bezier position
        const bx = oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x;
        const by = oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y;
        // Curve/rotation: curve more at mid, less at ends
        const curveAmount = Math.sin(t * Math.PI) * 0.18; // peak at mid
        groupRef.current.position.x = bx;
        groupRef.current.position.y = by;
        groupRef.current.rotation.x = -curveAmount;
        groupRef.current.rotation.z = curveAmount;
      } else {
        groupRef.current.position.x = p0.x;
        groupRef.current.position.y = p0.y;
        groupRef.current.rotation.x = 0;
        groupRef.current.rotation.z = 0;
      }

      pages.forEach((page, index) => {
        const group = pagesRef.current[index];
        if (!group) return;
        group.position.x = 0;
        group.position.z = -index * PAGE_DEPTH;

        // Animation mapping: mainProgress 0-1
        let rotationY = 0;
        if (mainProgress >= 0 && mainProgress <= 1) {
          rotationY = mainProgress * (Math.PI / 2) * ((index - (NUM_PAGES - 1) / 2) / ((NUM_PAGES - 1) / 2));
        } else if (mainProgress > 0 && mainProgress <= 0.32) {
          rotationY = 0.8 * mainProgress;
        } else if (mainProgress > 0.32 && mainProgress <= 0.18) {
          rotationY = 0.8 * mainProgress;
        }
        group.rotation.y = rotationY;

        let pageOpenAmount = 0;
        if (mainProgress >= 0 && mainProgress <= 1) {
          pageOpenAmount = mainProgress * 0.5;
        } else if (mainProgress > 0 && mainProgress <= 0.32) {
          pageOpenAmount = mainProgress * 0.16;
        } else if (mainProgress > 0.32 && mainProgress <= 0.18) {
          pageOpenAmount = mainProgress * 0.16;
        }
        const bones = page.skeleton.bones;
        for (let i = 0; i < PAGE_SEGMENTS; i++) {
          const segmentProgress = i / PAGE_SEGMENTS;
          const curveAmount = Math.sin(segmentProgress * Math.PI) * pageOpenAmount * 0.3;
          bones[i].rotation.y = curveAmount;
        }
      });
    }
  });

  return (
    <>
      {/* Ground plane */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#888888" />
      </mesh>

      {/* Book */}
      <group ref={groupRef} position={[0, 0.5, 0]}>
        {pages.map((page, index) => {
          // Add extra spacing for front and back covers to prevent overlap
          let zOffset = -index * PAGE_DEPTH;
          if (index === 0) {
            // Front cover: push forward significantly
            zOffset += PAGE_DEPTH * 10;
          } else if (index === 1) {
            // Page 2: slight extra spacing from front cover
            zOffset += PAGE_DEPTH * 2;
          } else if (index === NUM_PAGES - 2) {
            // Page 19: slight extra spacing from back cover
            zOffset -= PAGE_DEPTH * 2;
          } else if (index === NUM_PAGES - 1) {
            // Back cover: push backward significantly
            zOffset -= PAGE_DEPTH * 10;
          }
          
          return (
            <group
              key={index}
              ref={(el) => {
                if (el) pagesRef.current[index] = el;
              }}
              position={[0, 0, zOffset]}
            >
              <primitive object={page.mesh} />
            </group>
          );
        })}
      </group>
    </>
  );
};
