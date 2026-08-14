import React, { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { COLORS, FONT, RADIUS, SPACING } from '../../design/tokens';
import type { Pet } from '../../types/pet';
import { glbCache } from '../../utils/glbCache';

interface PetModelViewerProps {
  pet: Pet;
  size?: number;
}

interface ModelBoundaryProps {
  children: React.ReactNode;
  onError: () => void;
}

interface ModelBoundaryState {
  hasError: boolean;
}

class ModelBoundary extends Component<ModelBoundaryProps, ModelBoundaryState> {
  state: ModelBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ModelBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('Pet model viewer failed to render', error.message);
    this.props.onError();
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function AnimatedModel({ uri }: { uri: string }) {
  const gltf = useLoader(GLTFLoader, uri);
  const model = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  useLayoutEffect(() => {
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const largestDimension = Math.max(size.x, size.y, size.z);

    model.position.sub(center);
    if (largestDimension > 0) {
      model.scale.setScalar(1.65 / largestDimension);
    }

    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    if (gltf.animations.length === 0) {
      return undefined;
    }

    const mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(gltf.animations[0]).reset().play();
    mixerRef.current = mixer;

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      mixerRef.current = null;
    };
  }, [gltf.animations, model]);

  useFrame((state, delta) => {
    model.rotation.y = state.clock.elapsedTime * 0.28;
    mixerRef.current?.update(delta);
  });

  return <primitive object={model} position={[0, -0.15, 0]} />;
}

function ModelScene({ uri }: { uri: string }) {
  return (
    <Canvas camera={{ position: [0, 0.25, 3.2], fov: 42 }}>
      <ambientLight intensity={1.2} />
      <directionalLight castShadow intensity={1.6} position={[3, 4, 4]} />
      <pointLight color={COLORS.primary} intensity={0.7} position={[-3, 2, 2]} />
      <Suspense fallback={null}>
        <AnimatedModel uri={uri} />
      </Suspense>
    </Canvas>
  );
}

function ModelFallback({ pet, size }: { pet: Pet; size: number }) {
  return (
    <View style={[styles.fallback, { height: size }]}>
      {pet.thumbnail_url ? (
        <Image accessibilityLabel={pet.name} source={{ uri: pet.thumbnail_url }} style={styles.thumbnail} />
      ) : (
        <Text accessibilityLabel={pet.name} accessibilityRole="image" style={styles.fallbackEmoji}>
          {'\uD83D\uDC3E'}
        </Text>
      )}
      <Text style={styles.fallbackLabel}>3D model unavailable</Text>
    </View>
  );
}

export function PetModelViewer({ pet, size = 220 }: PetModelViewerProps) {
  const [modelUri, setModelUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setModelUri(null);
    setFailed(false);

    if (!pet.model_url) {
      setFailed(true);
      return undefined;
    }

    void glbCache
      .downloadGLB(pet.model_url)
      .then((uri) => {
        if (!cancelled) {
          setModelUri(uri);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pet.model_url, pet.pet_id]);

  if (failed) {
    return <ModelFallback pet={pet} size={size} />;
  }

  if (!modelUri) {
    return (
      <View style={[styles.loading, { height: size }]} accessibilityLabel={`Loading ${pet.name} model`}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.viewer, { height: size }]} accessibilityLabel={`${pet.name} 3D model`}>
      <ModelBoundary onError={() => setFailed(true)}>
        <ModelScene uri={modelUri} />
      </ModelBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  viewer: {
    overflow: 'hidden',
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundBase,
    marginBottom: SPACING.md,
  },
  loading: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundBase,
    marginBottom: SPACING.md,
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.backgroundBase,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  fallbackEmoji: {
    fontSize: 64,
  },
  fallbackLabel: {
    position: 'absolute',
    bottom: SPACING.sm,
    fontSize: FONT.sizes.xs,
    color: COLORS.textMuted,
  },
});

export default PetModelViewer;
