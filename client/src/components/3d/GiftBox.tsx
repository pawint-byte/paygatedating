import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, animated } from '@react-spring/three';
import * as THREE from 'three';

interface GiftBoxProps {
  tier: 'starter' | 'impressive' | 'vip';
  isOpening: boolean;
  onOpenComplete?: () => void;
}

const tierColors = {
  starter: { box: '#E8B4B8', ribbon: '#C77D85', accent: '#FFD700' },
  impressive: { box: '#7B68EE', ribbon: '#9370DB', accent: '#FFD700' },
  vip: { box: '#FFD700', ribbon: '#FFA500', accent: '#FFFFFF' },
};

export function GiftBox({ tier, isOpening, onOpenComplete }: GiftBoxProps) {
  const boxRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Mesh>(null);
  const [hasOpened, setHasOpened] = useState(false);
  const colors = tierColors[tier];

  const { lidRotation, lidPosition, scale } = useSpring({
    lidRotation: isOpening ? -Math.PI / 2 : 0,
    lidPosition: isOpening ? [0, 1.2, -0.6] : [0, 0.55, 0],
    scale: isOpening ? 1.1 : 1,
    config: { mass: 1, tension: 120, friction: 14 },
    onRest: () => {
      if (isOpening && !hasOpened) {
        setHasOpened(true);
        onOpenComplete?.();
      }
    },
  });

  const { floatY } = useSpring({
    from: { floatY: -2 },
    to: { floatY: 0 },
    config: { mass: 2, tension: 80, friction: 20 },
  });

  useFrame((state) => {
    if (boxRef.current && !isOpening) {
      boxRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      boxRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.05;
    }
  });

  return (
    <animated.group ref={boxRef} scale={scale} position-y={floatY}>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={colors.box} metalness={0.3} roughness={0.4} />
      </mesh>

      <mesh position={[0, 0, 0.51]} castShadow>
        <boxGeometry args={[0.15, 1, 0.02]} />
        <meshStandardMaterial color={colors.ribbon} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, -0.51]} castShadow>
        <boxGeometry args={[0.15, 1, 0.02]} />
        <meshStandardMaterial color={colors.ribbon} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0.51, 0, 0]} castShadow>
        <boxGeometry args={[0.02, 1, 0.15]} />
        <meshStandardMaterial color={colors.ribbon} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[-0.51, 0, 0]} castShadow>
        <boxGeometry args={[0.02, 1, 0.15]} />
        <meshStandardMaterial color={colors.ribbon} metalness={0.5} roughness={0.3} />
      </mesh>

      <animated.mesh
        ref={lidRef}
        position={lidPosition as any}
        rotation-x={lidRotation}
        castShadow
      >
        <boxGeometry args={[1.1, 0.1, 1.1]} />
        <meshStandardMaterial color={colors.box} metalness={0.3} roughness={0.4} />
        
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[0.15, 0.02, 1.1]} />
          <meshStandardMaterial color={colors.ribbon} metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[1.1, 0.02, 0.15]} />
          <meshStandardMaterial color={colors.ribbon} metalness={0.5} roughness={0.3} />
        </mesh>

        {tier === 'vip' && (
          <mesh position={[0, 0.15, 0]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color={colors.accent} metalness={0.8} roughness={0.2} />
          </mesh>
        )}
        {tier === 'impressive' && (
          <mesh position={[0, 0.12, 0]} rotation={[0, Math.PI / 4, 0]}>
            <torusGeometry args={[0.08, 0.03, 8, 16]} />
            <meshStandardMaterial color={colors.accent} metalness={0.8} roughness={0.2} />
          </mesh>
        )}
      </animated.mesh>

      {isOpening && (
        <pointLight position={[0, 0.5, 0]} intensity={2} color={colors.accent} distance={3} />
      )}
    </animated.group>
  );
}
