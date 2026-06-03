/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UltramanForm {
  MULTI = 'MULTI', // 复合型：均衡型性能，蓝色/红色弹幕
  POWER = 'POWER', // 强力型：高攻击力，低攻速，具有小幅群体爆炸效果，亮红色
  SKY = 'SKY',     // 空中型：高攻速，高移动速度，散射子弹，紫色
  GLITTER = 'GLITTER' // 闪耀型：终极形态，全属性提升，追踪光弹，纯金色
}

export interface FormStats {
  name: string;
  color: string;
  accentColor: string;
  speed: number;
  fireRate: number; // 射击间隔（毫秒）
  damage: number;
  description: string;
}

export const FORM_CONFIGS: Record<UltramanForm, FormStats> = {
  [UltramanForm.MULTI]: {
    name: '复合型 (Multi)',
    color: '#3b82f6', // 蓝
    accentColor: '#ef4444', // 红
    speed: 5.5,
    fireRate: 350,
    damage: 15,
    description: '攻守兼备的经典均衡形态，发射标准的斯派修姆光弹。'
  },
  [UltramanForm.POWER]: {
    name: '强力型 (Power)',
    color: '#ef4444', // 红
    accentColor: '#f97316', // 橙
    speed: 4.0,
    fireRate: 600,
    damage: 35,
    description: '牺牲部分射速，发射具有小范围爆炸效果的高伤害重型光弹。'
  },
  [UltramanForm.SKY]: {
    name: '空中型 (Sky)',
    color: '#a855f7', // 紫
    accentColor: '#60a5fa', // 亮蓝
    speed: 7.5,
    fireRate: 200,
    damage: 8,
    description: '极高移动速度及高频弹幕，发射散射光弹压制群敌。'
  },
  [UltramanForm.GLITTER]: {
    name: '闪耀型 (Glitter)',
    color: '#eab308', // 金黄
    accentColor: '#ffffff', // 白
    speed: 7.0,
    fireRate: 150,
    damage: 25,
    description: '消耗大量光能维持的至高形态。发射能够自动追踪目标的璀璨光流。'
  }
};

export enum EnemyType {
  BALTAN = 'BALTAN',     // 巴尔坦星人（普通分身、侧移）
  RED_KING = 'RED_KING', // 雷德王（高血量坦克，直冲）
  ZETTON = 'ZETTON',     // 杰顿（发弹射击，带护盾）
  GOMORA = 'GOMORA',     // 哥莫拉（中等强度，快速横扫）
  BOSS_BELIAL = 'BOSS_BELIAL', // 贝利亚奥特曼（最终Boss：多弹幕、召唤、大范围轰炸）
  BOSS_GATANOTHOR = 'BOSS_GATANOTHOR', // 加坦杰厄（波次巨物，触手横扫）
}

export interface Enemy {
  id: string;
  type: EnemyType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  speedX: number;
  speedY: number;
  scoreValue: number;
  crystalValue: number;
  shootCooldown: number;
  color: string;
  isBoss: boolean;
  angle?: number;
  phase?: number;
  stateTimer?: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  damage: number;
  isPlayer: boolean;
  color: string;
  glow?: boolean;
  isTracking?: boolean;
  isSplash?: boolean; // 是否在击中时产生小范围爆炸
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  glow?: boolean;
}

export interface FlashEffect {
  duration: number; // 剩余帧数
  maxDuration: number;
  color: string;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  level: number;
  maxLevel: number;
  icon: string;
  increaseValue: number;
}

export interface GameStats {
  score: number;
  crystals: number;
  wave: number;
  highScore: number;
  enemiesKilled: number;
  bossesDefeated: number;
}
