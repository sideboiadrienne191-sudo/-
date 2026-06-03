/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private continuousOsc: OscillatorNode | null = null;
  private continuousGain: GainNode | null = null;

  constructor() {
    // Lazy initialize to avoid blocking page load or triggering browser audio blocks
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioCtx();
      } catch (e) {
        console.error('Web Audio API not supported', e);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    if (!enabled) {
      this.stopContinuous();
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  // 1. 发射斯派修姆普通单发子弹
  public playLaser(freq = 880, duration = 0.15, type: OscillatorType = 'triangle') {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    // 快速降频效果，经典的激光射击声
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // 2. 蓄力音效（准备大招斯派修姆光线）
  public playCharge(duration = 1.0) {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // 频率从低逐步升到高，产生聚集能量的史诗感
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // 3. 释放斯派修姆光线（持续震荡能量束）
  public startSpeciumRay() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;
    if (this.continuousOsc) return; // 已经在播放

    const osc = this.ctx.createOscillator();
    const oscMod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const gain = this.ctx.createGain();

    // 双震荡器：主音采用锯齿波，辅音低频震荡加剧爆裂感
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);

    oscMod.type = 'square';
    oscMod.frequency.setValueAtTime(45, this.ctx.currentTime);
    modGain.gain.setValueAtTime(80, this.ctx.currentTime); // 频率调偏度数

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    // 连接频率调制
    oscMod.connect(modGain);
    modGain.connect(osc.frequency);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    oscMod.start();
    osc.start();

    this.continuousOsc = osc;
    this.continuousGain = gain;
  }

  public stopContinuous() {
    if (this.continuousOsc) {
      try {
        this.continuousOsc.stop();
      } catch (e) {}
      this.continuousOsc = null;
    }
    this.continuousGain = null;
  }

  // 4. 普通受击音效
  public playHit() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // 5. 怪兽死亡炸裂音效
  public playExplosion(isLarge = false) {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const duration = isLarge ? 0.6 : 0.35;
    const osc = this.ctx.createOscillator();
    const noise = this.ctx.createGain();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + duration);

    // 制造白噪音氛围或深红振荡
    gain.gain.setValueAtTime(isLarge ? 0.25 : 0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  // 6. 转换形态/升级音效
  public playTransform() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25, 783.99, 1046.50]; // 经典升起和弦 C -> E -> G -> C -> G -> C
    notes.forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + index * 0.06);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.08, now + index * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.06 + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + index * 0.06);
      osc.stop(now + index * 0.06 + 0.25);
    });
  }

  // 7. 彩色计时器警报音（能量不足30%）
  public playColorTimerBeep() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // 经典的 叮咚！ 警报
    osc.frequency.setValueAtTime(1100, this.ctx.currentTime);
    osc.frequency.setValueAtTime(880, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  // 8. 游戏成功/波次通关旋律
  public playVictory() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const melody = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // C5, E5, G5, C6, E6, G6
    melody.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.1, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.12 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.3);
    });
  }

  // 9. 失败死亡旋律
  public playGameOver() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const melody = [392.00, 349.23, 311.13, 261.63, 196.00]; // G4, F4, Eb4, C4, G3 缓缓降调
    melody.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.18);

      gain.gain.setValueAtTime(0, now);
      gain.gain.setValueAtTime(0.12, now + idx * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.18 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(now + idx * 0.18);
      osc.stop(now + idx * 0.18 + 0.4);
    });
  }
}

export const SoundEffects = new SoundEffectsManager();
