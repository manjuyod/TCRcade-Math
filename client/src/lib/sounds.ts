import { Howl } from 'howler';

// Define sound effect types
type SoundEffect = 
  // Basic gameplay
  'correct' | 'incorrect' | 
  // Achievement-related
  'levelUp' | 'gradeUp' | 'tokenEarned' | 'perfectScore' |
  // Session-related
  'sessionComplete' | 'goalComplete' | 
  // Streak-related
  'streak' | 'streak5' | 'streak10' | 'streak20' |
  // Time-related
  'timeAchievement5' | 'timeAchievement10' | 'timeAchievement15' | 'timeAchievement20';

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
  // Basic streak sound (for 3-streak)
  streak: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3'], // magical powerup sound
    volume: 0.7
  }),
  // Medium streak sound (for 5-streak)
  streak5: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/1995/1995-preview.mp3'], // arcade bonus sound
    volume: 0.7
  }),
  // Big streak sound (for 10-streak)
  streak10: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/2002/2002-preview.mp3'], // big achievement sound
    volume: 0.75
  }),
  // Amazing streak sound (for 20-streak)
  streak20: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/1997/1997-preview.mp3'], // epic win sound
    volume: 0.8
  }),
  
  // Grade advancement sound
  gradeUp: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3'], // big achievement
    volume: 0.8
  }),
  
  // Perfect score sound
  perfectScore: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/1995/1995-preview.mp3'], // victory tune
    volume: 0.8
  }),
  
  // Goal completion sound
  goalComplete: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3'], // completion chime
    volume: 0.75
  }),
  
  // Time milestone sounds
  timeAchievement5: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/1980/1980-preview.mp3'], // simple achievement
    volume: 0.6
  }),
  
  timeAchievement10: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/1990/1990-preview.mp3'], // medium achievement
    volume: 0.65
  }),
  
  timeAchievement15: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/1985/1985-preview.mp3'], // bigger achievement
    volume: 0.7
  }),
  
  timeAchievement20: new Howl({
    src: ['https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'], // major achievement
    volume: 0.8
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
