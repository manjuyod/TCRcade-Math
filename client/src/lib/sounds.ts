import { Howl } from 'howler';

// Define sound effect types
type SoundEffect = 'correct' | 'incorrect' | 'levelUp' | 'tokenEarned' | 'sessionComplete' | 'streak';

// Create a cache for sound effects with more engaging sounds
const soundCache: Record<SoundEffect, Howl> = {
  // Exciting rewarding sound for correct answers
  correct: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/2075/2075-preview.mp3'], // cash register "cha-ching" sound
    volume: 0.6
  }),
  // Clear error sound for incorrect answers 
  incorrect: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/131/131-preview.mp3'], // error beep
    volume: 0.4
  }),
  // Celebratory level-up sound
  levelUp: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/1993/1993-preview.mp3'], // achievement unlock sound
    volume: 0.6
  }),
  // Additional rewarding token sound 
  tokenEarned: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/136/136-preview.mp3'], // coin sound
    volume: 0.5
  }),
  // Session complete fanfare
  sessionComplete: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/1991/1991-preview.mp3'], // victory fanfare
    volume: 0.7
  }),
  // Special streak sound
  streak: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3'], // magical powerup sound
    volume: 0.7
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
