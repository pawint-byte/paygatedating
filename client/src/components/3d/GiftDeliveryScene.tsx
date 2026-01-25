import { Suspense, useState, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PresentationControls, Html } from '@react-three/drei';
import { GiftBox } from './GiftBox';
import { Particles, FloatingHearts } from './Particles';
import { Gift, Sparkles, Heart } from 'lucide-react';

function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

interface GiftDeliverySceneProps {
  tier: 'starter' | 'impressive' | 'vip';
  giftTitle: string;
  senderName: string;
  onComplete?: () => void;
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    </Html>
  );
}

function Scene({ tier, isOpening, onOpenComplete }: { 
  tier: 'starter' | 'impressive' | 'vip';
  isOpening: boolean;
  onOpenComplete: () => void;
}) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <spotLight
        position={[5, 5, 5]}
        angle={0.3}
        penumbra={1}
        intensity={1}
        castShadow
        shadow-mapSize={[512, 512]}
      />
      <spotLight
        position={[-5, 5, -5]}
        angle={0.3}
        penumbra={1}
        intensity={0.5}
      />
      
      <PresentationControls
        global
        polar={[-0.4, 0.4]}
        azimuth={[-0.4, 0.4]}
        config={{ mass: 2, tension: 400 }}
        snap={{ mass: 4, tension: 300 }}
      >
        <GiftBox tier={tier} isOpening={isOpening} onOpenComplete={onOpenComplete} />
      </PresentationControls>

      <Particles type="sparkles" active={isOpening} tier={tier} count={60} />
      <FloatingHearts active={isOpening} tier={tier} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <shadowMaterial opacity={0.2} />
      </mesh>

      <Environment preset="sunset" />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2}
      />
    </>
  );
}

function FallbackGiftAnimation({ tier, isOpening, isOpened, giftTitle, onOpen }: {
  tier: 'starter' | 'impressive' | 'vip';
  isOpening: boolean;
  isOpened: boolean;
  giftTitle: string;
  onOpen: () => void;
}) {
  const tierColors = {
    starter: 'from-pink-400 to-rose-500',
    impressive: 'from-purple-400 to-indigo-500',
    vip: 'from-yellow-400 to-amber-500',
  };

  const tierBgColors = {
    starter: 'bg-pink-500',
    impressive: 'bg-purple-500',
    vip: 'bg-yellow-500',
  };

  return (
    <div 
      className="flex flex-col items-center justify-center h-full cursor-pointer"
      onClick={onOpen}
      data-testid="fallback-gift-container"
    >
      <div className={`relative transition-all duration-700 ${isOpening ? 'scale-110' : 'animate-bounce'}`}>
        <div className={`w-32 h-32 rounded-2xl ${tierBgColors[tier]} shadow-2xl flex items-center justify-center relative overflow-hidden`}>
          {isOpening && (
            <>
              <Sparkles className="absolute top-2 left-2 w-6 h-6 text-white/80 animate-pulse" />
              <Heart className="absolute top-2 right-2 w-5 h-5 text-white/80 animate-pulse" />
              <Sparkles className="absolute bottom-2 left-2 w-5 h-5 text-white/80 animate-pulse" />
              <Heart className="absolute bottom-2 right-2 w-6 h-6 text-white/80 animate-pulse" />
            </>
          )}
          <Gift className={`w-16 h-16 text-white transition-transform duration-500 ${isOpening ? 'scale-0' : 'scale-100'}`} />
          {isOpening && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-20 h-20 text-white animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          )}
        </div>
        
        {!isOpening && (
          <div className={`absolute -top-2 left-1/2 -translate-x-1/2 w-36 h-4 rounded-full bg-gradient-to-r ${tierColors[tier]} shadow-lg`} />
        )}
      </div>

      {isOpened && (
        <div className="mt-8 text-center animate-fade-in">
          <p className="text-white/80 text-sm mb-1">You received</p>
          <p className="text-white text-lg font-semibold">{giftTitle}</p>
        </div>
      )}
    </div>
  );
}

export function GiftDeliveryScene({ tier, giftTitle, senderName, onComplete }: GiftDeliverySceneProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [isOpened, setIsOpened] = useState(false);
  const [webGLSupported, setWebGLSupported] = useState(true);

  useEffect(() => {
    setWebGLSupported(checkWebGLSupport());
  }, []);

  const handleOpen = useCallback(() => {
    if (!isOpening && !isOpened) {
      setIsOpening(true);
      if (!webGLSupported) {
        setTimeout(() => setIsOpened(true), 1500);
      }
    }
  }, [isOpening, isOpened, webGLSupported]);

  const handleOpenComplete = useCallback(() => {
    setIsOpened(true);
  }, []);

  const tierLabels = {
    starter: 'A Thoughtful Gift',
    impressive: 'A Special Surprise',
    vip: 'A Premium Gift',
  };

  const tierGradients = {
    starter: 'from-pink-400 to-rose-500',
    impressive: 'from-purple-400 to-indigo-500',
    vip: 'from-yellow-400 to-amber-500',
  };

  return (
    <div className="relative w-full h-full min-h-[400px] bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg overflow-hidden">
      <div className="absolute top-4 left-0 right-0 text-center z-10">
        <span className={`inline-block px-4 py-1 rounded-full text-white text-sm font-medium bg-gradient-to-r ${tierGradients[tier]}`}>
          {tierLabels[tier]}
        </span>
        <h3 className="text-white text-xl font-semibold mt-2" data-testid="text-sender-name">
          From {senderName}
        </h3>
      </div>

      {webGLSupported ? (
        <Canvas
          shadows
          camera={{ position: [0, 1.5, 4], fov: 45 }}
          style={{ cursor: isOpened ? 'default' : 'pointer' }}
          onClick={handleOpen}
          onCreated={({ gl }) => {
            if (!gl.getContext()) {
              setWebGLSupported(false);
            }
          }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <Scene tier={tier} isOpening={isOpening} onOpenComplete={handleOpenComplete} />
          </Suspense>
        </Canvas>
      ) : (
        <FallbackGiftAnimation
          tier={tier}
          isOpening={isOpening}
          isOpened={isOpened}
          giftTitle={giftTitle}
          onOpen={handleOpen}
        />
      )}

      <div className="absolute bottom-4 left-0 right-0 text-center z-10">
        {!isOpening && !isOpened && (
          <button
            onClick={handleOpen}
            className={`px-6 py-3 rounded-full text-white font-semibold shadow-lg transform hover:scale-105 transition-transform bg-gradient-to-r ${tierGradients[tier]}`}
            data-testid="button-open-gift"
          >
            Tap to Open Your Gift
          </button>
        )}
        
        {isOpened && (
          <div className="animate-fade-in">
            <p className="text-white/80 text-sm mb-2" data-testid="text-you-received">You received</p>
            <p className="text-white text-lg font-semibold" data-testid="text-gift-title">{giftTitle}</p>
            <button
              onClick={onComplete}
              className="mt-4 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-full text-white font-medium transition-colors"
              data-testid="button-continue-gift"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
