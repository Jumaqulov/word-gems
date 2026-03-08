import Phaser from 'phaser';

// Singleton EventEmitter for cross-component communication
const EventBus = new Phaser.Events.EventEmitter();

// Event names
export const EVENTS = {
  // Game state
  LEVEL_START: 'level:start',
  LEVEL_COMPLETE: 'level:complete',
  WORD_FOUND: 'word:found',
  WORD_INVALID: 'word:invalid',
  SELECTION_CHANGE: 'selection:change',
  SELECTION_CLEAR: 'selection:clear',

  // UI
  UPDATE_HUD: 'ui:update_hud',
  UPDATE_WORD_LIST: 'ui:update_word_list',
  SHOW_MODAL: 'ui:show_modal',
  HIDE_MODAL: 'ui:hide_modal',

  // Power-ups
  POWERUP_DETECT: 'powerup:detect',
  POWERUP_UNDO: 'powerup:undo',

  // Economy
  GEMS_CHANGED: 'economy:gems_changed',
  SCORE_CHANGED: 'economy:score_changed',

  // Sound
  PLAY_SOUND: 'sound:play',
  MUTE_CHANGED: 'sound:mute_changed',

  // Daily spin
  SPIN_COMPLETE: 'spin:complete',

  // Save
  SAVE_GAME: 'save:game',
  LOAD_GAME: 'save:load',
};

export default EventBus;
