import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticlesProps {
  count?: number;
  type: 'sparkles' | 'hearts' | 'confetti';
  active: boolean;
  tier: 'starter' | 'impressive' | 'vip';
}

const tierParticleColors = {
  starter: ['#FFB6C1', '#FF69B4', '#FFD700'],
  impressive: ['#9370DB', '#7B68EE', '#FFD700'],
  vip: ['#FFD700', '#FFA500', '#FFFFFF'],
};

export function Particles({ count = 50, type, active, tier }: ParticlesProps) {
  const meshRef = useRef<THREE.Points>(null);
  const colors = tierParticleColors[tier];

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const particleColors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = -0.5 + Math.random() * 0.5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = Math.random() * 0.03 + 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;

      const colorHex = colors[Math.floor(Math.random() * colors.length)];
      const color = new THREE.Color(colorHex);
      particleColors[i * 3] = color.r;
      particleColors[i * 3 + 1] = color.g;
      particleColors[i * 3 + 2] = color.b;

      sizes[i] = Math.random() * 0.08 + 0.04;
    }

    return { positions, colors: particleColors, velocities, sizes };
  }, [count, colors]);

  useFrame(() => {
    if (!active || !meshRef.current) return;

    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] += particles.velocities[i * 3];
      positions[i * 3 + 1] += particles.velocities[i * 3 + 1];
      positions[i * 3 + 2] += particles.velocities[i * 3 + 2];

      if (positions[i * 3 + 1] > 3) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.5;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
      }
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

export function FloatingHearts({ active, tier }: { active: boolean; tier: 'starter' | 'impressive' | 'vip' }) {
  const groupRef = useRef<THREE.Group>(null);
  const colors = tierParticleColors[tier];

  const hearts = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 2,
      y: Math.random() * 2,
      z: (Math.random() - 0.5) * 2,
      scale: Math.random() * 0.1 + 0.05,
      speed: Math.random() * 0.01 + 0.005,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, [colors]);

  useFrame((state) => {
    if (!active || !groupRef.current) return;
    
    groupRef.current.children.forEach((child, i) => {
      child.position.y += hearts[i].speed;
      child.rotation.y = state.clock.elapsedTime * 0.5;
      child.rotation.z = Math.sin(state.clock.elapsedTime + i) * 0.2;
      
      if (child.position.y > 3) {
        child.position.y = 0;
        child.position.x = (Math.random() - 0.5) * 2;
        child.position.z = (Math.random() - 0.5) * 2;
      }
    });
  });

  if (!active) return null;

  return (
    <group ref={groupRef}>
      {hearts.map((heart) => (
        <mesh
          key={heart.id}
          position={[heart.x, heart.y, heart.z]}
          scale={heart.scale}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshStandardMaterial
            color={heart.color}
            emissive={heart.color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}
