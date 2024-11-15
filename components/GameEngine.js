import {
  Canvas,
  useImage,
  Image,
  Group,
  Text,
  matchFont,
} from "@shopify/react-native-skia";
import { Platform, useWindowDimensions } from "react-native";
import {
  useSharedValue,
  withTiming,
  Easing,
  withSequence,
  useAnimatedReaction,
  useDerivedValue,
  interpolate,
  Extrapolation,
  useFrameCallback,
  runOnJS,
  cancelAnimation,
} from "react-native-reanimated";
import { useEffect, useState } from "react";
import {
  GestureHandlerRootView,
  GestureDetector,
  Gesture,
} from "react-native-gesture-handler";

const GRAVITY = 1000;
const JUMP_FORCE = -500;

const GameEngine = (props) => {
  const { width, height } = useWindowDimensions();
  const [score, setScore] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Load images
  const bg = useImage(require("../assets/img/sea-bg.png"));
  const pipeBottom = useImage(require("../assets/img/rock.png"));
  const pipeTop = useImage(require("..//assets/img/rock.png"));
  const base = useImage(require("../assets/img/basedark.png"));
  const fishUpFlap = useImage(require("../assets/img/playerup.png"));
  const fishMidFlap = useImage(require("../assets/img/playerright.png"));
  const fishDownFlap = useImage(require("../assets/img/playerdown.png"));

  // Game state variables
  const gameOver = useSharedValue(false);
  const fishY = useSharedValue(height / 4);
  const fishX = width / 4;
  const fishYVelocity = useSharedValue(100);
  const pipeX = useSharedValue(width);
  const pipeWidth = 104;
  const pipeHeight = 640;
  const pipeOffset = useSharedValue(0);
  const topPipeY = useDerivedValue(() => pipeOffset.value - 320);
  const bottomPipeY = useDerivedValue(() => height - 320 + pipeOffset.value);

  // Pipes speed increases with score
  const pipesSpeed = useDerivedValue(() => {
    return interpolate(score, [0, 20], [1, 2]);
  });

  // Obstacles for collision detection
  const obstacles = useDerivedValue(() => [
    { x: pipeX.value, y: bottomPipeY.value, h: pipeHeight, w: pipeWidth },
    { x: pipeX.value, y: topPipeY.value, h: pipeHeight, w: pipeWidth },
  ]);

  // React state for current fish image (added to avoid `value` access in render)
  const [displayedFishImage, setDisplayedFishImage] = useState(fishMidFlap);

  useEffect(() => {
    moveTheMap();
  }, []);

  useEffect(() => {
    if (
      bg &&
      pipeBottom &&
      pipeTop &&
      base &&
      fishUpFlap &&
      fishMidFlap &&
      fishDownFlap
    ) {
      setImagesLoaded(true);
      moveTheMap();
    }
  }, [bg, pipeBottom, pipeTop, base, fishUpFlap, fishMidFlap, fishDownFlap]);

  // Function to animate pipes across the screen
  const moveTheMap = () => {
    pipeX.value = withSequence(
      withTiming(width, { duration: 0 }),
      withTiming(-150, {
        duration: 3000 / pipesSpeed.value,
        easing: Easing.linear,
      }),
      withTiming(width, { duration: 0 })
    );
  };

  // Scoring system with animated reaction for pipeX position
  useAnimatedReaction(
    () => pipeX.value,
    (currentValue, previousValue) => {
      const middle = fishX;

      if (previousValue && currentValue < -100 && previousValue > -100) {
        pipeOffset.value = Math.random() * 400 - 200;
        cancelAnimation(pipeX);
        runOnJS(moveTheMap)();
      }

      if (
        currentValue !== previousValue &&
        previousValue &&
        currentValue <= middle &&
        previousValue > middle
      ) {
        runOnJS(setScore)(score + 1);
      }
    }
  );

  const isPointCollidingWithRect = (point, rect) => {
    "worklet";
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.w &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.h
    );
  };

  // Collision detection
  useAnimatedReaction(
    () => fishY.value,
    (currentValue, previousValue) => {
      const center = { x: fishX + 58, y: fishY.value + 33 };

      if (currentValue > height - 100 || currentValue < 0) {
        gameOver.value = true;
      }

      const isColliding = obstacles.value.some((rect) =>
        isPointCollidingWithRect(center, rect)
      );
      if (isColliding) {
        gameOver.value = true;
      }
    }
  );

  // Listen for game over state
  useAnimatedReaction(
    () => gameOver.value,
    (currentValue, previousValue) => {
      if (currentValue && !previousValue) {
        cancelAnimation(pipeX);
        runOnJS(props.onGameOver)(score);
      }
    }
  );

  // Update fish's position on each frame
  useFrameCallback(({ timeSincePreviousFrame: dt }) => {
    if (!dt || gameOver.value) return;
    fishY.value = fishY.value + (fishYVelocity.value * dt) / 1000;
    fishYVelocity.value = fishYVelocity.value + (GRAVITY * dt) / 1000;
  });

  const restartGame = () => {
    "worklet";
    fishY.value = height / 3;
    fishYVelocity.value = 0;
    gameOver.value = false;
    pipeX.value = width;
    runOnJS(moveTheMap)();
    runOnJS(setScore)(0);
  };

  const gesture = Gesture.Tap().onStart(() => {
    if (gameOver.value) {
      restartGame();
    } else {
      fishYVelocity.value = JUMP_FORCE;
    }
  });

  // Use a derived value to select the fish image based on velocity
  const currentfishImage = useDerivedValue(() => {
    if (fishYVelocity.value < -100) return fishUpFlap;
    if (fishYVelocity.value > 100) return fishDownFlap;
    return fishMidFlap;
  });

  // Update displayedFishImage state when currentfishImage changes
  useAnimatedReaction(
    () => currentfishImage.value,
    (currentValue) => {
      runOnJS(setDisplayedFishImage)(currentValue);
    }
  );

  const fishTranform = useDerivedValue(() => {
    return [
      {
        rotate: interpolate(
          fishYVelocity.value,
          [-500, 500],
          [-0.5, 0.5],
          Extrapolation.CLAMP
        ),
      },
    ];
  });

  const fishOrigin = useDerivedValue(() => {
    return { x: width / 4 + 74, y: fishY.value + 88 };
  });

  const fontFamily = Platform.select({ ios: "Helvetica", default: "serif" });
  const fontStyle = { fontFamily, fontSize: 40, fontWeight: "bold" };
  const font = matchFont(fontStyle);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={gesture}>
        <Canvas style={{ width, height }}>
          {/* Background */}
          <Image image={bg} width={width} height={height} fit={"cover"} />

          {/* Pipes */}
          <Image
            image={pipeTop}
            y={topPipeY}
            x={pipeX}
            width={pipeWidth}
            height={pipeHeight}
          />
          <Image
            image={pipeBottom}
            y={bottomPipeY}
            x={pipeX}
            width={pipeWidth}
            height={pipeHeight}
          />

          {/* Base */}
          <Image
            image={base}
            y={height - 75}
            x={0}
            width={width}
            height={150}
          />

          {/* Fish with dynamic image based on movement */}
          <Group transform={fishTranform} origin={fishOrigin}>
            <Image
              image={displayedFishImage}
              y={fishY}
              x={fishX}
              width={65}
              height={47}
            />
          </Group>

          {/* Score Text */}
          <Text
            x={width / 2 - 30}
            y={100}
            text={score.toString()}
            font={font}
          />
        </Canvas>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

export default GameEngine;
