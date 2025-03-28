import { Howl } from 'howler';

// Define sound effect types
type SoundEffect = 'correct' | 'incorrect' | 'levelUp' | 'tokenEarned';

// Create a cache for sound effects
const soundCache: Record<SoundEffect, Howl> = {
  correct: new Howl({
    src: ['https://assets.codepen.io/21542/howler-push.mp3'],
    volume: 0.5
  }),
  incorrect: new Howl({
    src: ['https://assets.codepen.io/21542/howler-shot.mp3'],
    volume: 0.5
  }),
  levelUp: new Howl({
    src: ['https://assets.codepen.io/21542/howler-coin.mp3'],
    volume: 0.5
  }),
  tokenEarned: new Howl({
    src: ['https://assets.codepen.io/21542/howler-ding.mp3'],
    volume: 0.5
  })
};

// Play a sound effect
export function playSound(effect: SoundEffect): void {
  try {
    const sound = soundCache[effect];
    if (sound) {
      sound.play();
    }
  } catch (error) {
    console.error("Failed to play sound effect:", error);
  }
}

// Preload all sounds
export function preloadSounds(): void {
  Object.values(soundCache).forEach(sound => {
    sound.load();
  });
}
