import React, { useEffect, useState } from "react";

import GameEngine from "./components/GameEngine";
import { Audio } from "expo-av";
import { useFonts } from "expo-font";
import { PressStart2P_400Regular } from "@expo-google-fonts/press-start-2p";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

const App = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [bgMusic, setBgMusic] = useState(null);
  const [gameOverSound, setGameOverSound] = useState(null);

  const [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  // Load sound assets inside useEffect
  useEffect(() => {
    const loadMusic = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require("./assets/sounds/soundBG.mp3")
      );
      setBgMusic(sound);
      await sound.setIsLoopingAsync(true);
      await sound.setVolumeAsync(0.5);
    };

    const loadGameOverSound = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require("./assets/sounds/gameOver.mp3")
      );
      setGameOverSound(sound);
      await sound.setVolumeAsync(0.1);
    };

    loadMusic();
    loadGameOverSound();

    //function to unload sounds when the app is closed or component is unmounted
    return () => {
      if (bgMusic) {
        bgMusic.unloadAsync();
      }
      if (gameOverSound) {
        gameOverSound.unloadAsync();
      }
    };
  }, []);

  const startGame = () => {
    if (bgMusic) {
      bgMusic.playAsync();
    }
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
  };

  const endGame = (finalScore) => {
    if (bgMusic) {
      bgMusic.stopAsync();
    }
    if (gameOverSound) {
      gameOverSound.stopAsync();
      gameOverSound.playAsync();
    }
    setGameOver(true);
    setScore(finalScore);
  };

  const restartGame = () => {
    // Restart the game and reload the sounds
    setGameStarted(false);
    setGameOver(false);
    setScore(0);

    // Reinitialize the sounds on restart
    const reloadSounds = async () => {
      if (bgMusic) {
        await bgMusic.stopAsync();
        await bgMusic.playAsync();
      }
      if (gameOverSound) {
        await gameOverSound.stopAsync();
      }
    };

    reloadSounds();
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!gameStarted ? (
        <View style={styles.landing}>
          <Text
            style={[styles.title, { fontFamily: "PressStart2P_400Regular" }]}
          >
            TappyJelly!
          </Text>
          {/* Instruction Image */}
          <Image
            source={require("./assets/img/intro.png")} // Update with the correct image path
            style={styles.instructionImage}
            resizeMode="contain"
          />

          <TouchableOpacity style={styles.button} onPress={startGame}>
            <Text style={styles.buttonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      ) : gameOver ? (
        <View style={styles.gameOver}>
          <Text
            style={[
              styles.title,
              { color: "red", fontFamily: "PressStart2P_400Regular" },
            ]}
          >
            Game Over!
          </Text>
          <Text
            style={[styles.score, { fontFamily: "PressStart2P_400Regular" }]}
          >
            Score: {score}
          </Text>
          <TouchableOpacity style={styles.button} onPress={restartGame}>
            <Text style={styles.buttonText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <GameEngine onGameOver={endGame} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  landing: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#001378",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 60,
    color: "#99a6ee",
  },

  instructionImage: {
    width: "100%",
    height: 200,
    aspectRatio: 2.5,
    marginBottom: 25,
  },
  gameOver: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  score: {
    fontSize: 24,
    marginBottom: 20,
    color: "white",
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 20,
  },
  buttonText: {
    fontSize: 16,
    color: "white",
    fontFamily: "PressStart2P_400Regular",
    textAlign: "center",
  },
});

export default App;
