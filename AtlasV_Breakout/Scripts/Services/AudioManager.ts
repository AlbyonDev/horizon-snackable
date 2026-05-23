/**
 * AudioManager — Centralise tous les événements gameplay et joue le son correspondant.
 *
 * Architecture :
 *   - Les entités de la scène portent un SoundComponent + un AudioSource component.
 *   - AudioSource appelle AudioManager.register(soundId, entity) au démarrage.
 *   - AudioManager stocke un Map<string, SoundComponent> et l'utilise pour jouer les sons.
 *
 * Utilisation :
 *   1. Créer une entité dans l'éditeur avec un SoundComponent (asset assigné, autoStart=false).
 *   2. Ajouter un AudioSource component sur cette entité et renseigner soundId = SFX.PADDLE_HIT, etc.
 *   3. Le son est automatiquement routé depuis les événements gameplay.
 */
import { Service, service, subscribe, SoundComponent, SoundPlayInfo, Vec2, WorldService } from 'meta/worlds';
import { NetworkMode, type Entity } from 'meta/worlds';
import {
  Events,
  HUDEvents,
  ComboHUDEvents,
  HeatEvents,
  HighScoreHUDEvents,
} from '../Types';

// ─────────────────────────────────────────────────────────────────────────────
// Sound IDs — utiliser ces constantes dans l'éditeur (champ soundId de AudioSource)
// ─────────────────────────────────────────────────────────────────────────────
export const SFX = {
  // Ball
  PADDLE_HIT:           'sfx_paddle_hit',
  BALL_LAUNCH:          'sfx_ball_launch',
  BALL_LOST:            'sfx_ball_lost',

  // Bricks
  BRICK_HIT:            'sfx_brick_hit',
  BRICK_DESTROYED:      'sfx_brick_destroyed',
  EXPLOSION_CHAIN:      'sfx_explosion_chain',

  // Power-ups
  POWERUP_COLLECTED:    'sfx_powerup_collected',
  STICKY_ACTIVATED:     'sfx_sticky_activated',
  STICKY_DEACTIVATED:   'sfx_sticky_deactivated',

  // Coins / Score
  COIN_COLLECTED:       'sfx_coin_collected',

  // Combos
  COMBO_2:              'sfx_combo_2',
  COMBO_5:              'sfx_combo_5',
  COMBO_10:             'sfx_combo_10',
  COMBO_15:             'sfx_combo_15',

  // Heat milestones
  HEAT_5:               'sfx_heat_5',
  HEAT_10:              'sfx_heat_10',
  HEAT_20:              'sfx_heat_20',

  // Game state
  MUSIC:                'music',
  LEVEL_START:          'sfx_level_start',
  LEVEL_CLEARED:        'sfx_level_cleared',
  GAME_OVER:            'sfx_game_over',
  RESTART:              'sfx_restart',
  MESSAGE_SHOW:         'sfx_message_show',
} as const;

export type SoundId = typeof SFX[keyof typeof SFX];

// ─────────────────────────────────────────────────────────────────────────────
// AudioManager
// ─────────────────────────────────────────────────────────────────────────────

@service()
export class AudioManager extends Service {

  private readonly _sounds = new Map<string, SoundComponent[]>();
  private readonly _soundIndex = new Map<string, number>();

  // Suivi interne pour les sons contextuels
  private _comboLevel: number = 0;
  private _heatLevel: number = 0;

  // ── Registre ───────────────────────────────────────────────────────────────

  /**
   * Enregistre le SoundComponent d'une entité sous un ID donné.
   * Appelé par le component AudioSource au démarrage de l'entité.
   */
  register(soundId: string, entity: Entity): void {
    const sound = entity.getComponent(SoundComponent);
    if (!sound) {
      console.error(`[AudioManager] register("${soundId}") — aucun SoundComponent sur l'entité`);
      return;
    }
    if (!this._sounds.has(soundId)) {
      this._sounds.set(soundId, []);
      this._soundIndex.set(soundId, 0);
    }
    this._sounds.get(soundId)!.push(sound);
    if (soundId == SFX.MUSIC)
      this.playMusic(SFX.MUSIC, 1);
  }

  private nextSound(soundId: string): SoundComponent | undefined {
    const pool = this._sounds.get(soundId);
    if (!pool || pool.length === 0) return undefined;
    const idx = this._soundIndex.get(soundId) ?? 0;
    this._soundIndex.set(soundId, (idx + 1) % pool.length);
    return pool[idx];
  }

  // ── Playback interne ───────────────────────────────────────────────────────

  private playSound(soundId: string, volume?: number, pitch?: number): void {
    const sound = this.nextSound(soundId);
    if (!sound) return;
    sound.loop = false;
    if (volume)
      sound.playVolume = volume;
    if (pitch)
      sound.minMaxPitch = new Vec2(pitch, pitch);
    sound.play();
  }

  private playMusic(soundId: string, fadeIn: number = 0.5): void {
    const sound = this.nextSound(soundId);
    if (!sound) return;
    sound.loop = true;
    const info = new SoundPlayInfo();
    info.fadeInDuration = fadeIn;
    sound.play(info);
  }

  private stopMusic(soundId: string, fadeOut: number = 0.5): void {
    const sound = this.nextSound(soundId);
    if (!sound) return;
    sound.stop(fadeOut);
  }

  // ── BALL ───────────────────────────────────────────────────────────────────

  @subscribe(Events.PaddleHit)
  onPaddleHit(p: Events.PaddleHitPayload): void {
    // Pitch variable selon la vitesse verticale de la balle
    const pitch = Math.min(0.9 + Math.abs(p.ballVelocityY) * 0.02, 1.3);
    this.playSound(SFX.PADDLE_HIT, 1, pitch);
    this._comboLevel = 0;
  }

  @subscribe(Events.ReleaseBall)
  onReleaseBall(_p: Events.ReleaseBallPayload): void {
    this.playSound(SFX.BALL_LAUNCH);
  }

  @subscribe(Events.BallLost)
  onBallLost(_p: Events.BallLostPayload): void {
    this.playSound(SFX.BALL_LOST);
    this._comboLevel = 0;
    this._heatLevel = 0;
  }

  // ── BRICKS ────────────────────────────────────────────────────────────────

  @subscribe(Events.BrickHit)
  onBrickHit(_p: Events.BrickHitPayload): void {
    this.playSound(SFX.BRICK_HIT, 0.7);
  }

  @subscribe(Events.BrickDestroyed)
  onBrickDestroyed(_p: Events.BrickDestroyedPayload): void {
    const pitch = 0.85 + Math.random() * 0.3;
    this.playSound(SFX.BRICK_DESTROYED, 1, pitch);
  }

  @subscribe(Events.ExplosionChain)
  onExplosionChain(p: Events.ExplosionChainPayload): void {
    const volume = Math.min(0.8 + p.chainSize * 0.05, 1.4);
    const pitch  = Math.min(0.8 + p.chainSize * 0.03, 1.2);
    this.playSound(SFX.EXPLOSION_CHAIN, volume, pitch);
  }

  // ── POWER-UPS ─────────────────────────────────────────────────────────────

  @subscribe(Events.PowerUpCollected)
  onPowerUpCollected(_p: Events.PowerUpCollectedPayload): void {
    this.playSound(SFX.POWERUP_COLLECTED);
  }

  @subscribe(Events.StickyPaddleActivated)
  onStickyActivated(_p: Events.StickyPaddleActivatedPayload): void {
    this.playSound(SFX.STICKY_ACTIVATED);
  }

  @subscribe(Events.StickyPaddleDeactivated)
  onStickyDeactivated(_p: Events.StickyPaddleDeactivatedPayload): void {
    this.playSound(SFX.STICKY_DEACTIVATED);
  }

  // ── COINS ─────────────────────────────────────────────────────────────────

  @subscribe(Events.CoinCollected)
  onCoinCollected(_p: Events.CoinCollectedPayload): void {
    // Pitch aléatoire pour varier les collectes rapides
    //const pitch = 0.9 + Math.random() * 0.2;
    this.playSound(SFX.COIN_COLLECTED, 0.6);  }

  // ── COMBOS ────────────────────────────────────────────────────────────────

  @subscribe(ComboHUDEvents.IncrementCombo)
  onComboIncrement(_p: ComboHUDEvents.IncrementComboPayload): void {
    this._comboLevel++;
    if      (this._comboLevel >= 15) this.playSound(SFX.COMBO_15);
    else if (this._comboLevel >= 10) this.playSound(SFX.COMBO_10);
    else if (this._comboLevel >= 5)  this.playSound(SFX.COMBO_5);
    else if (this._comboLevel >= 2)  this.playSound(SFX.COMBO_2, 0.8);
  }

  @subscribe(ComboHUDEvents.ResetCombo)
  onComboReset(_p: ComboHUDEvents.ResetComboPayload): void {
    this._comboLevel = 0;
  }

  // ── HEAT ──────────────────────────────────────────────────────────────────

  @subscribe(HeatEvents.IncrementHeat)
  onHeatIncrement(_p: HeatEvents.IncrementHeatPayload): void {
    this._heatLevel++;
    if      (this._heatLevel === 20) this.playSound(SFX.HEAT_20);
    else if (this._heatLevel === 10) this.playSound(SFX.HEAT_10);
    else if (this._heatLevel === 5)  this.playSound(SFX.HEAT_5);
  }

  @subscribe(HeatEvents.ResetHeat)
  onHeatReset(_p: HeatEvents.ResetHeatPayload): void {
    this._heatLevel = 0;
  }

  // ── GAME STATE ────────────────────────────────────────────────────────────

  @subscribe(Events.LoadLevel)
  onLoadLevel(_p: Events.LoadLevelPayload): void {
    this.playSound(SFX.LEVEL_START);
    this.stopMusic(SFX.MUSIC, 1);
  }

  @subscribe(Events.LevelCleared)
  onLevelCleared(_p: Events.LevelClearedPayload): void {
    this.playSound(SFX.LEVEL_CLEARED);
  }

  @subscribe(Events.Restart)
  onRestart(_p: Events.RestartPayload): void {
    this.playSound(SFX.RESTART);
  }

  @subscribe(HighScoreHUDEvents.ShowHighScores)
  onGameOver(_p: HighScoreHUDEvents.ShowHighScoresPayload): void {
    this.playSound(SFX.GAME_OVER);
    this.playMusic(SFX.MUSIC, 1);
  }

  @subscribe(HUDEvents.ShowMessage)
  onShowMessage(_p: HUDEvents.ShowMessagePayload): void {
    this.playSound(SFX.MESSAGE_SHOW, 0.5);
  }
}
