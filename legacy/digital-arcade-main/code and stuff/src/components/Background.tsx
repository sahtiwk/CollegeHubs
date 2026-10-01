import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { useLocation } from 'react-router-dom';

export default function Background() {
  const sphereRef = useRef<THREE.Mesh>(null);
  const location = useLocation();

  useEffect(() => {
    if (sphereRef.current) {
      sphereRef.current.rotation.x = 0;
      sphereRef.current.rotation.y = 0;
    }
  }, [location]);

  useFrame(({ clock }) => {
    if (sphereRef.current) {
      sphereRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.2) * 0.1;
      sphereRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.1;
    }
  });

  return (
    <Sphere ref={sphereRef} args={[30, 64, 64]}>
      <meshPhongMaterial
        side={THREE.BackSide}
        color="#2a0845"
        emissive="#6441A5"
        specular="#ffffff"
        shininess={50}
      />
    </Sphere>
  );
}