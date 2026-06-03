/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  UltramanForm, 
  FORM_CONFIGS, 
  Enemy, 
  EnemyType, 
  Bullet, 
  Particle, 
  GameStats, 
  Upgrade,
  FlashEffect
} from '../types';
import { SoundEffects } from '../utils/audio';
import { 
  Shield, 
  Flame, 
  Zap, 
  Heart, 
  Award, 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Play, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface GameCanvasProps {
  stats: GameStats;
  onUpdateStats: (updater: (prev: GameStats) => GameStats) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
}

export default function GameCanvas({ 
  stats, 
  onUpdateStats, 
  audioEnabled, 
  onToggleAudio 
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // 游戏物理状态
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'WAVE_CLEAR' | 'GAMEOVER' | 'VICTORY'>('START');
  
  // 玩家状态
  const [playerHp, setPlayerHp] = useState(100);
  const [maxPlayerHp, setMaxPlayerHp] = useState(100);
  const [playerEnergy, setPlayerEnergy] = useState(100); // 用于终极大招：斯派修姆光线 (0 - 100)
  const [currentForm, setCurrentForm] = useState<UltramanForm>(UltramanForm.MULTI);
  const [isFiringSpecium, setIsFiringSpecium] = useState(false);
  
  // 升级商店是否打开
  const [shopOpen, setShopOpen] = useState(false);

  // 实体列表引用，由 Canvas 渲染引擎高频读取/更新
  const playerRef = useRef({
    x: 300,
    y: 500,
    width: 50,
    height: 70,
    isInvulnerable: 0, // 帧计数
    speciumCooldown: 0
  });

  const entitiesRef = useRef<{
    enemies: Enemy[];
    bullets: Bullet[];
    particles: Particle[];
  }>({
    enemies: [],
    bullets: [],
    particles: []
  });

  // 控制按键
  const keysPressed = useRef<Record<string, boolean>>({});
  
  // 屏幕震动
  const screenShakeRef = useRef(0);
  // 低生命警报计时器
  const beepTimerRef = useRef(0);
  // 各技能等级
  const [upgrades, setUpgrades] = useState<Upgrade[]>([
    { id: 'dmg', name: '宇宙光能威力', description: '提高全形态普通激光造成的杀伤力', cost: 15, level: 1, maxLevel: 10, icon: 'Zap', increaseValue: 5 },
    { id: 'hp', name: '等离子生命增幅', description: '提升奥特曼最大生命值上限并补满血量', cost: 10, level: 1, maxLevel: 8, icon: 'Heart', increaseValue: 20 },
    { id: 'rate', name: '奥特核心充能速率', description: '缩减子弹发射的间隔，增加射速', cost: 20, level: 1, maxLevel: 6, icon: 'Flame', increaseValue: 15 },
    { id: 'shield', name: '斯派修姆蓄能池', description: '增加大招斯派修姆能量的最大上限，减缓消耗速度', cost: 25, level: 1, maxLevel: 5, icon: 'Shield', increaseValue: 20 },
  ]);

  // 闪屏特效 (用于受击或释放大招时的屏幕震撼闪烁)
  const [flashEffect, setFlashEffect] = useState<FlashEffect | null>(null);

  // 金色闪耀形态是否解锁 (通关/打败第一个Boss，或使用100光晶解锁)
  const [glitterUnlocked, setGlitterUnlocked] = useState(false);

  // 上一次发射子弹的时间
  const lastShootTime = useRef(0);
  const speedMultiplier = useRef(1);

  // 手机虚拟按键控制
  const [isMobile, setIsMobile] = useState(false);
  const [touchMovement, setTouchMovement] = useState({ x: 0, y: 0 });

  // 检查是否为移动端
  useEffect(() => {
    const checkMobile = () => {
      const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      setIsMobile(isTouch);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 响应窗口大小调整画布
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const container = containerRef.current;
      const canvas = canvasRef.current;
      
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // 调整玩家到安全位置
      if (playerRef.current.x > rect.width) playerRef.current.x = rect.width / 2;
      if (playerRef.current.y > rect.height) playerRef.current.y = rect.height - 100;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    // 初始化位置
    if (canvasRef.current) {
      playerRef.current.x = canvasRef.current.width / 2;
      playerRef.current.y = canvasRef.current.height - 130;
    }

    return () => window.removeEventListener('resize', handleResize);
  }, [gameState]);

  // 按键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      // 防御浏览器按键滚动页面
      if (['space', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.code.toLowerCase())) {
        e.preventDefault();
      }

      // 形态切换便捷按键
      if (key === '1') handleFormChange(UltramanForm.MULTI);
      if (key === '2') handleFormChange(UltramanForm.POWER);
      if (key === '3') handleFormChange(UltramanForm.SKY);
      if (key === '4') handleFormChange(UltramanForm.GLITTER);

      // 大招按键
      if (key === 'l' || key === 'u') {
        triggerSpeciumRay(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
      if (key === 'l' || key === 'u') {
        triggerSpeciumRay(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [glitterUnlocked, playerEnergy, currentForm]);

  // 修改形态
  const handleFormChange = (form: UltramanForm) => {
    if (form === UltramanForm.GLITTER && !glitterUnlocked) {
      return; // 未解锁
    }
    if (gameState !== 'PLAYING') return;
    
    setCurrentForm(form);
    SoundEffects.playTransform();
    triggerFlash('#ffffff', 6);
    
    // 增加变身炫光粒子
    const pX = playerRef.current.x;
    const pY = playerRef.current.y;
    const config = FORM_CONFIGS[form];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      entitiesRef.current.particles.push({
        x: pX,
        y: pY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: config.color,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.03,
        glow: true
      });
    }
  };

  // 斯派修姆大招触发
  const triggerSpeciumRay = (active: boolean) => {
    if (gameState !== 'PLAYING') return;
    if (active) {
      if (playerEnergy > 10) {
        if (!isFiringSpecium) {
          SoundEffects.startSpeciumRay();
          setIsFiringSpecium(true);
          triggerFlash('#38bdf8', 12);
          screenShakeRef.current = 15;
        }
      } else {
        setIsFiringSpecium(false);
        SoundEffects.stopContinuous();
      }
    } else {
      setIsFiringSpecium(false);
      SoundEffects.stopContinuous();
    }
  };

  // 震动与闪屏设置
  const triggerFlash = (color: string, duration: number) => {
    setFlashEffect({ color, duration, maxDuration: duration });
  };

  // 生成粒子爆炸效果
  const createExplosionParticles = (x: number, y: number, color: string, count = 15, isBoss = false) => {
    const range = isBoss ? 45 : 15;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (isBoss ? 2 : 1) + Math.random() * (isBoss ? 8 : 4);
      entitiesRef.current.particles.push({
        x: x + (Math.random() - 0.5) * range,
        y: y + (Math.random() - 0.5) * range,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * (isBoss ? 6 : 3),
        color: color,
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        glow: Math.random() > 0.4
      });
    }
  };

  // 初始化关卡怪兽
  const generateWaveEnemies = (waveNum: number) => {
    if (!canvasRef.current) return;
    const width = canvasRef.current.width || 800;
    const list: Enemy[] = [];

    // 普通怪兽基础属性按波次递增
    const healthMultiplier = 1 + (waveNum - 1) * 0.35;
    const speedMultiplierVal = Math.min(1.0 + (waveNum - 1) * 0.1, 2.0);

    // 第5波次或5的倍数是终极贝利亚/巨型Boss战
    const isBossWave = waveNum % 5 === 0;

    if (isBossWave) {
      // 贝利亚降临！
      const bossHp = Math.round(1500 * healthMultiplier);
      list.push({
        id: `boss-${waveNum}-${Date.now()}`,
        type: EnemyType.BOSS_BELIAL,
        name: `暗黑邪恶之主 · 贝利亚 (终极Boss)`,
        x: width / 2,
        y: 110,
        width: 100,
        height: 120,
        hp: bossHp,
        maxHp: bossHp,
        speedX: 2.2,
        speedY: 0.5,
        scoreValue: 1000,
        crystalValue: 120,
        shootCooldown: 0,
        color: '#ef4444',
        isBoss: true,
        angle: 0,
        phase: 1,
        stateTimer: 0
      });

      // 伴随2个保镖巴尔坦
      for (let i = 0; i < 2; i++) {
        list.push({
          id: `minion-${i}-${Date.now()}`,
          type: EnemyType.BALTAN,
          name: '邪恶巴尔坦护卫',
          x: i === 0 ? width * 0.25 : width * 0.75,
          y: 180,
          width: 44,
          height: 60,
          hp: Math.round(100 * healthMultiplier),
          maxHp: Math.round(100 * healthMultiplier),
          speedX: 3,
          speedY: 0,
          scoreValue: 120,
          crystalValue: 10,
          shootCooldown: Math.random() * 1000,
          color: '#3b82f6',
          isBoss: false
        });
      }
    } else {
      // 普通波次配比
      const enemyCount = 4 + waveNum * 2;
      
      for (let i = 0; i < enemyCount; i++) {
        const pct = (i + 0.5) / enemyCount;
        const startX = width * 0.1 + pct * (width * 0.8) + (Math.random() - 0.5) * 50;
        const startY = -60 - Math.random() * 250;
        
        // 分配不同的怪兽类型
        let type = EnemyType.BALTAN;
        let hp = 40;
        let speedY = 1.3 + Math.random() * 0.8;
        let speedX = (Math.random() - 0.5) * 2;
        let color = '#38bdf8';
        let name = '巴尔坦星人';
        let size = { w: 45, h: 55 };

        const r = Math.random();
        if (r < 0.3) {
          // 雷德王 - 肉盾直冲
          type = EnemyType.RED_KING;
          name = '雷德王-粗暴型';
          hp = 110;
          speedY = 1.0 + Math.random() * 0.4;
          speedX = (Math.random() - 0.5) * 0.5;
          color = '#f59e0b';
          size = { w: 55, h: 70 };
        } else if (r < 0.6) {
          // 哥莫拉 - 横向飞行扫射
          type = EnemyType.GOMORA;
          name = '古代怪兽 · 哥莫拉';
          hp = 70;
          speedY = 1.5;
          speedX = Math.random() > 0.5 ? 2.5 : -2.5;
          color = '#f97316';
          size = { w: 48, h: 62 };
        } else if (r < 0.85 && waveNum >= 2) {
          // 积顿 - 能够进行火力反弹和护盾
          type = EnemyType.ZETTON;
          name = '宇宙恐龙 · 杰顿';
          hp = 150;
          speedY = 0.8;
          speedX = (Math.random() - 0.5) * 1.5;
          color = '#1f2937';
          size = { w: 50, h: 66 };
        }

        // 应用等级难度增幅比例
        hp = Math.round(hp * healthMultiplier);
        speedY *= speedMultiplierVal;
        speedX *= speedMultiplierVal;

        list.push({
          id: `enemy-${i}-${Date.now()}`,
          type,
          name,
          x: startX,
          y: startY,
          width: size.w,
          height: size.h,
          hp,
          maxHp: hp,
          speedX,
          speedY,
          scoreValue: Math.round(30 * healthMultiplier),
          crystalValue: Math.round(5 + waveNum * 1.5),
          shootCooldown: Math.random() * 1500 + 500,
          color,
          isBoss: false
        });
      }
    }

    entitiesRef.current.enemies = list;
  };

  // 开始游戏
  const handleStartGame = () => {
    SoundEffects.playTransform();
    setGameState('PLAYING');
    setPlayerHp(100);
    setMaxPlayerHp(100);
    setPlayerEnergy(100);
    setCurrentForm(UltramanForm.MULTI);
    setIsFiringSpecium(false);
    
    // 初始化数值
    onUpdateStats(() => ({
      score: 0,
      crystals: 0,
      wave: 1,
      highScore: Number(localStorage.getItem('ultraman_high_score') || 0),
      enemiesKilled: 0,
      bossesDefeated: 0
    }));

    if (canvasRef.current) {
      playerRef.current.x = canvasRef.current.width / 2;
      playerRef.current.y = canvasRef.current.height - 130;
      playerRef.current.isInvulnerable = 90; // 获得90帧无敌护盾
    }

    // 重置实体列表
    entitiesRef.current = {
      enemies: [],
      bullets: [],
      particles: []
    };

    generateWaveEnemies(1);
  };

  // 继续下一波次
  const handleNextWave = () => {
    const nextWave = stats.wave + 1;
    SoundEffects.playTransform();
    onUpdateStats(prev => ({ ...prev, wave: nextWave }));
    setGameState('PLAYING');
    setIsFiringSpecium(false);
    setShopOpen(false);

    // 回复一些生命值
    setPlayerHp(prev => Math.min(prev + 30 + upgrades.find(u=>u.id==='hp')!.level * 5, maxPlayerHp));
    setPlayerEnergy(100);

    // 重新规划位置
    if (canvasRef.current) {
      playerRef.current.x = canvasRef.current.width / 2;
      playerRef.current.y = canvasRef.current.height - 130;
      playerRef.current.isInvulnerable = 100;
    }

    generateWaveEnemies(nextWave);
  };

  // 购买升级
  const handleUpgrade = (id: string) => {
    const up = upgrades.find(u => u.id === id);
    if (!up || up.level >= up.maxLevel) return;
    if (stats.crystals < up.cost) return;

    // 扣减晶体，更新等级
    onUpdateStats(prev => ({ ...prev, crystals: prev.crystals - up.cost }));
    SoundEffects.playTransform();

    setUpgrades(prevUps => prevUps.map(u => {
      if (u.id === id) {
        const nextLevel = u.level + 1;
        const nextCost = Math.round(u.cost * 1.5);
        return { ...u, level: nextLevel, cost: nextCost };
      }
      return u;
    }));

    // 联动属性修改
    if (id === 'hp') {
      const addedHp = 20;
      setMaxPlayerHp(prev => prev + addedHp);
      setPlayerHp(prev => prev + addedHp); // 直属加血
    }
  };

  // 解锁金色闪耀形態
  const handleUnlockGlitter = () => {
    if (stats.crystals >= 120 && !glitterUnlocked) {
      onUpdateStats(prev => ({ ...prev, crystals: prev.crystals - 120 }));
      setGlitterUnlocked(true);
      SoundEffects.playTransform();
      triggerFlash('#eab308', 25);
    }
  };

  // 渲染与核心引擎帧更新
  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      if (gameState === 'PLAYING' && !shopOpen) {
        updateGameFrame(delta);
      }
      
      renderFrame();
      
      animationId = requestAnimationFrame(loop);
    };

    // 真正的逻辑更新逻辑
    const updateGameFrame = (delta: number) => {
      if (!canvasRef.current) return;
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      // 1. 无敌时间帧递减
      if (playerRef.current.isInvulnerable > 0) {
        playerRef.current.isInvulnerable--;
      }

      // 2. 玩家移动控制
      const currentConfig = FORM_CONFIGS[currentForm];
      // 综合考虑键盘和手机触控
      let moveX = 0;
      let moveY = 0;

      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) moveX = -1;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) moveX = 1;
      if (keysPressed.current['w'] || keysPressed.current['arrowup']) moveY = -1;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) moveY = 1;

      // 手机按键叠加
      if (isMobile) {
        moveX += touchMovement.x;
        moveY += touchMovement.y;
        // 限制在 -1 到 1 之间
        moveX = Math.max(-1, Math.min(1, moveX));
        moveY = Math.max(-1, Math.min(1, moveY));
      }

      // 计算技能加权速度
      const currentSpeed = currentConfig.speed;
      playerRef.current.x += moveX * currentSpeed;
      playerRef.current.y += moveY * currentSpeed;

      // 玩家不出界限制
      const halfW = playerRef.current.width / 2;
      const halfH = playerRef.current.height / 2;
      if (playerRef.current.x < halfW) playerRef.current.x = halfW;
      if (playerRef.current.x > width - halfW) playerRef.current.x = width - halfW;
      if (playerRef.current.y < halfH) playerRef.current.y = halfH;
      if (playerRef.current.y > height - halfH) playerRef.current.y = height - halfH;

      // 3. 自动射击管理 (如果按下Space/J，或者在手机端处于游戏进行时自动按周期射击)
      const fireInterval = currentConfig.fireRate * (1 - (upgrades.find(u=>u.id==='rate')!.level - 1) * 0.08); // 射速提速
      const curTime = Date.now();
      
      // 如果按着空格、J，或者手机端一直处于自动射击
      const shootPressed = keysPressed.current[' '] || keysPressed.current['j'] || isMobile || keysPressed.current['k'];

      if (shootPressed && !isFiringSpecium && curTime - lastShootTime.current >= fireInterval) {
        lastShootTime.current = curTime;
        fireLaser();
      }

      // 4. 斯派修姆大招维护气能机制
      const shieldUpgrade = upgrades.find(u=>u.id==='shield')!.level;
      const energyDepletionRate = 0.45 * (1 - (shieldUpgrade - 1) * 0.12); // 等级高消耗慢
      
      if (isFiringSpecium) {
        if (playerEnergy > 0) {
          setPlayerEnergy(prev => Math.max(0, prev - energyDepletionRate));
          screenShakeRef.current = Math.max(screenShakeRef.current, 5);
          
          // 大招对敌群持续造成毁灭撞击伤害
          const laserLeft = playerRef.current.x - 30;
          const laserRight = playerRef.current.x + 30;
          
          entitiesRef.current.enemies.forEach(enemy => {
            // 斯派修姆大招是贯穿整条竖线的等离子光束
            if (enemy.y > -50 && enemy.x + enemy.width/2 > laserLeft && enemy.x - enemy.width/2 < laserRight) {
              // 持续打中
              enemy.hp -= 2.2 + (upgrades.find(u=>u.id==='dmg')!.level * 0.3); // 巨量多段伤害
              SoundEffects.playHit();
              
              // 在撞击处产生反重力量子火星
              createExplosionParticles(enemy.x, Math.max(enemy.y, 40), currentConfig.color, 2);
            }
          });
        } else {
          setIsFiringSpecium(false);
          SoundEffects.stopContinuous();
        }
      } else {
        // 缓慢充能
        const rechargeRate = 0.12 * (1 + (shieldUpgrade - 1) * 0.15);
        setPlayerEnergy(prev => Math.min(100, prev + rechargeRate));
      }

      // 5. 彩色计时器警报嘟嘟声 (当生命低于30%时触发)
      if (playerHp / maxPlayerHp <= 0.3) {
        beepTimerRef.current++;
        if (beepTimerRef.current > 42) { // 约0.7秒提醒一次
          beepTimerRef.current = 0;
          SoundEffects.playColorTimerBeep();
        }
      }

      // 6. 子弹更新
      let bullets = entitiesRef.current.bullets;
      bullets.forEach(bullet => {
        // 金色闪耀形态追踪光弹修正
        if (bullet.isPlayer && bullet.isTracking) {
          const targets = entitiesRef.current.enemies.filter(e => e.y > -10);
          if (targets.length > 0) {
            // 简单物理寻路：寻找最近的敌人
            let closest = targets[0];
            let minDist = Infinity;
            targets.forEach(t => {
              const d = Math.hypot(t.x - bullet.x, t.y - bullet.y);
              if (d < minDist) {
                minDist = d;
                closest = t;
              }
            });
            // 微调子弹速度矢量
            const angle = Math.atan2(closest.y - bullet.y, closest.x - bullet.x);
            bullet.speedX = bullet.speedX * 0.8 + Math.cos(angle) * 11 * 0.2;
            bullet.speedY = bullet.speedY * 0.8 + Math.sin(angle) * 11 * 0.2;
          }
        }

        bullet.x += bullet.speedX;
        bullet.y += bullet.speedY;
      });

      // 移出边界的子弹清除
      entitiesRef.current.bullets = bullets.filter(b => b.x > -50 && b.x < width + 50 && b.y > -50 && b.y < height + 50);

      // 7. 敌群状态更新（怪兽AI动作）
      let enemies = entitiesRef.current.enemies;
      enemies.forEach(enemy => {
        enemy.x += enemy.speedX;
        enemy.y += enemy.speedY;
        
        // 1. 巴尔坦星人在y到指定范围后进行鬼魅分身或横向位移
        if (enemy.type === EnemyType.BALTAN) {
          if (Math.random() < 0.01) {
            enemy.speedX = (Math.random() - 0.5) * 5; // 左右乱晃闪避
          }
        }

        // 2. 哥莫拉碰到边缘横向反弹
        if (enemy.type === EnemyType.GOMORA) {
          if (enemy.x < 30 || enemy.x > width - 30) {
            enemy.speedX *= -1;
          }
        }

        // 3. 杰顿(Zetton)自带一个受损吸收护盾逻辑 + 直线下潜
        if (enemy.type === EnemyType.ZETTON) {
          if (!enemy.stateTimer) enemy.stateTimer = 0;
          enemy.stateTimer++;
          // 间歇性开启粉色能量盾
          if (enemy.stateTimer % 200 === 0) {
            enemy.phase = 1; // 护盾开启
          } else if (enemy.stateTimer % 200 === 70) {
            enemy.phase = 0; // 护盾关闭
          }
        }

        // 4. Boss贝利亚多阶段邪恶攻击策略
        if (enemy.type === EnemyType.BOSS_BELIAL) {
          if (!enemy.angle) enemy.angle = 0;
          if (!enemy.stateTimer) enemy.stateTimer = 0;
          
          enemy.angle += 0.02;
          enemy.stateTimer++;

          // 保持徘徊在屏幕上方
          if (enemy.x < 80 || enemy.x > width - 80) {
            enemy.speedX *= -1;
          }
          if (enemy.y < 50 || enemy.y > 180) {
            enemy.speedY *= -1;
          }

          // 贝利亚弹幕控制周期
          const cycle = enemy.stateTimer % 400;
          if (cycle < 150) {
            // 第一阶段：环形多弹头发射
            if (enemy.stateTimer % 24 === 0) {
              const numBullets = 8;
              for (let i = 0; i < numBullets; i++) {
                const ang = (i / numBullets) * Math.PI * 2 + enemy.angle;
                entitiesRef.current.bullets.push({
                  id: `b-boss-ring-${Date.now()}-${i}`,
                  x: enemy.x,
                  y: enemy.y + 15,
                  radius: 5,
                  speedX: Math.cos(ang) * 3.5,
                  speedY: Math.sin(ang) * 3.5,
                  damage: 12,
                  isPlayer: false,
                  color: '#ef4444' // 邪恶极光红
                });
              }
              SoundEffects.playLaser(330, 0.2, 'sawtooth');
            }
          } else if (cycle > 180 && cycle < 320) {
            // 第二阶段：斯派修姆死线追踪激光扫射
            if (enemy.stateTimer % 5 === 0) {
              const playerDx = playerRef.current.x - enemy.x;
              const playerDy = playerRef.current.y - enemy.y;
              const angleToPlayer = Math.atan2(playerDy, playerDx);
              
              entitiesRef.current.bullets.push({
                id: `b-boss-track-${Date.now()}-${enemy.stateTimer}`,
                x: enemy.x + (Math.random() - 0.5) * 30,
                y: enemy.y + 40,
                radius: 4,
                speedX: Math.cos(angleToPlayer) * 5.5,
                speedY: Math.sin(angleToPlayer) * 5.5,
                damage: 8,
                isPlayer: false,
                color: '#ef4444'
              });
            }
          } else if (cycle === 350) {
            // 贝利亚黑暗咆哮，突然召两个重型保镖
            triggerFlash('#ef4444', 8);
            SoundEffects.playExplosion(true);
            
            // 快速召唤突袭
            entitiesRef.current.enemies.push({
              id: `summon-${Date.now()}`,
              type: EnemyType.RED_KING,
              name: '贝利亚召唤的精锐雷德王',
              x: enemy.x,
              y: enemy.y + 50,
              width: 50,
              height: 65,
              hp: 120,
              maxHp: 120,
              speedX: 0,
              speedY: 3.5, // 直往下冲
              scoreValue: 50,
              crystalValue: 10,
              shootCooldown: 99999,
              color: '#dc2626',
              isBoss: false
            });
          }
        }

        // 怪兽发射子弹
        if (enemy.y > 0 && !enemy.isBoss) {
          enemy.shootCooldown -= delta;
          if (enemy.shootCooldown <= 0) {
            enemy.shootCooldown = Math.random() * 2000 + 1000; // 重置1至3秒发射一次
            fireEnemyBullet(enemy);
          }
        }

        // 超出底部边缘的怪兽惩罚性清除（导致奥特曼扣血）
        if (enemy.y > height + 40) {
          if (!enemy.isBoss) {
            // 没守住怪物，扣除生命
            setPlayerHp(prev => Math.max(0, prev - 12));
            triggerFlash('rgba(239, 68, 68, 0.4)', 6);
            screenShakeRef.current = 6;
            SoundEffects.playHit();
          }
          enemy.hp = -999; // 标记清除
        }
      });

      // 清除死去的或者是越界处理的敌机
      const killedCount = enemies.filter(e => e.hp <= 0 && e.hp !== -999).length;
      const bossKilled = enemies.filter(e => e.hp <= 0 && e.hp !== -999 && e.isBoss).length;

      if (killedCount > 0) {
        onUpdateStats(prev => ({ 
          ...prev, 
          enemiesKilled: prev.enemiesKilled + killedCount,
          bossesDefeated: prev.bossesDefeated + bossKilled
        }));
      }

      // 如果加起来死去的怪兽贡献晶体
      enemies.forEach(enemy => {
        if (enemy.hp <= 0) {
          if (enemy.hp !== -999) { // 是被奥特曼打死的
            onUpdateStats(prev => ({ 
              ...prev, 
              score: prev.score + enemy.scoreValue,
              crystals: prev.crystals + enemy.crystalValue
            }));
            createExplosionParticles(enemy.x, enemy.y, enemy.color, enemy.isBoss ? 50 : 15, enemy.isBoss);
            SoundEffects.playExplosion(enemy.isBoss);
            
            // 如果打败了第一个Boss，立刻解锁闪耀形態的购买资格
            if (enemy.isBoss) {
              setGlitterUnlocked(true);
              triggerFlash('#eab308', 30);
            }
          }
        }
      });

      // 过滤活着的人
      entitiesRef.current.enemies = enemies.filter(e => e.hp > 0);

      // 8. 碰撞检测 Collision Check (子弹 vs 敌人)
      bullets = entitiesRef.current.bullets;
      enemies = entitiesRef.current.enemies;

      bullets.forEach(bullet => {
        if (bullet.isPlayer) {
          // 友好方子弹打怪兽
          enemies.forEach(enemy => {
            if (enemy.y > -20 && bullet.y < enemy.y + enemy.height/2 + 10 && bullet.y > enemy.y - enemy.height/2 - 10) {
              const dx = bullet.x - enemy.x;
              const dy = bullet.y - enemy.y;
              const distance = Math.hypot(dx, dy);
              const hitRadius = (enemy.width + enemy.height) / 4;
              
              if (distance < hitRadius + bullet.radius) {
                // 撞到了！
                bullet.y = -999; // 标记子弹毁灭
                
                // 杰顿开启圆圈护盾时免疫普通攻击并回敬粒子！
                if (enemy.type === EnemyType.ZETTON && enemy.phase === 1) {
                  createExplosionParticles(bullet.x, bullet.y, '#f472b6', 5);
                  SoundEffects.playHit();
                  return;
                }

                // 造成真实伤害
                enemy.hp -= bullet.damage;
                SoundEffects.playHit();

                // 子弹是否有爆炸效果（强力形态）
                if (bullet.isSplash) {
                  createExplosionParticles(bullet.x, bullet.y, '#f97316', 10);
                  // 溅射周围其它敌人
                  enemies.forEach(other => {
                    if (other.id !== enemy.id) {
                      const dist = Math.hypot(other.x - bullet.x, other.y - bullet.y);
                      if (dist < 100) {
                        other.hp -= bullet.damage * 0.5; // 半数溅射伤害
                      }
                    }
                  });
                } else {
                  createExplosionParticles(bullet.x, bullet.y, bullet.color, 3);
                }
              }
            }
          });
        } else {
          // 敌方子弹打奥特曼
          if (playerRef.current.isInvulnerable <= 0) {
            const dx = bullet.x - playerRef.current.x;
            const dy = bullet.y - playerRef.current.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < bullet.radius + 18) {
              // 奥特曼被子弹射中！
              bullet.y = -999; // 彻底清除
              // 承受伤害加上全形态减免加成
              const damageTaken = bullet.damage;
              setPlayerHp(prev => Math.max(0, prev - damageTaken));
              triggerFlash('rgba(239, 68, 68, 0.45)', 7);
              screenShakeRef.current = 8;
              SoundEffects.playHit();
              playerRef.current.isInvulnerable = 22; // 短无敌
            }
          }
        }
      });

      // 过滤毁坏的子弹
      entitiesRef.current.bullets = bullets.filter(b => b.y !== -999);

      // 9. 生死判定：奥特曼撞击敌机（对撞伤害）
      if (playerRef.current.isInvulnerable <= 0) {
        enemies.forEach(enemy => {
          const dx = enemy.x - playerRef.current.x;
          const dy = enemy.y - playerRef.current.y;
          const dist = Math.hypot(dx, dy);
          const crashRadius = (enemy.width + enemy.height) / 4 + 18;

          if (dist < crashRadius) {
            // 对撞伤害
            setPlayerHp(prev => Math.max(0, prev - 25));
            enemy.hp -= 50; // 也重创怪兽
            triggerFlash('rgba(239, 68, 68, 0.65)', 10);
            screenShakeRef.current = 14;
            SoundEffects.playHit();
            playerRef.current.isInvulnerable = 45; // 无敌防护罩
          }
        });
      }

      // 10. 判断失败胜负
      if (playerHp <= 0) {
        SoundEffects.playGameOver();
        SoundEffects.stopContinuous();
        setGameState('GAMEOVER');
        // 保存高分
        if (stats.score > stats.highScore) {
          localStorage.setItem('ultraman_high_score', stats.score.toString());
          onUpdateStats(prev => ({ ...prev, highScore: stats.score }));
        }
      }

      // 11. 关卡波次清除通关判定
      // 只有在敌人全部消灭 & 并且上一位死透了
      if (entitiesRef.current.enemies.length === 0) {
        SoundEffects.playVictory();
        setGameState('WAVE_CLEAR');
        setShopOpen(true); // 自动打开关卡升级商店，以便休整
        // 通关波次有额外加成
        onUpdateStats(prev => {
          const waveBonus = prev.wave * 15;
          return {
            ...prev,
            crystals: prev.crystals + waveBonus
          };
        });
      }

      // 12. 粒子运动更新
      entitiesRef.current.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
      });
      entitiesRef.current.particles = entitiesRef.current.particles.filter(p => p.alpha > 0);

      // 13. 屏幕抖动衰减
      if (screenShakeRef.current > 0) {
        screenShakeRef.current *= 0.9;
        if (screenShakeRef.current < 0.5) screenShakeRef.current = 0;
      }
    };

    // 形态对应的弹幕开火函数
    const fireLaser = () => {
      const p = playerRef.current;
      const currentConfig = FORM_CONFIGS[currentForm];
      
      const dmgUpgrade = (upgrades.find(u => u.id === 'dmg')!.level - 1) * 3; // 额外普攻伤害
      const bulletDmg = currentConfig.damage + dmgUpgrade;

      SoundEffects.playLaser(
        currentForm === UltramanForm.POWER ? 520 : currentForm === UltramanForm.SKY ? 900 : 700, 
        currentForm === UltramanForm.POWER ? 0.22 : 0.12
      );

      if (currentForm === UltramanForm.MULTI) {
        // 复合型：前发双线平衡斯派修姆量子光弹
        entitiesRef.current.bullets.push({
          id: `b-${Date.now()}-1`,
          x: p.x - 10,
          y: p.y - 30,
          radius: 5,
          speedX: 0,
          speedY: -10,
          damage: bulletDmg,
          isPlayer: true,
          color: '#3b82f6',
          glow: true
        });
        entitiesRef.current.bullets.push({
          id: `b-${Date.now()}-2`,
          x: p.x + 10,
          y: p.y - 30,
          radius: 5,
          speedX: 0,
          speedY: -10,
          damage: bulletDmg,
          isPlayer: true,
          color: '#ef4444',
          glow: true
        });
      } else if (currentForm === UltramanForm.POWER) {
        // 强力形式：发出巨型爆裂火流弹
        entitiesRef.current.bullets.push({
          id: `b-${Date.now()}-heavy`,
          x: p.x,
          y: p.y - 35,
          radius: 12,
          speedX: 0,
          speedY: -7,
          damage: bulletDmg,
          isPlayer: true,
          color: '#f97316',
          glow: true,
          isSplash: true
        });
      } else if (currentForm === UltramanForm.SKY) {
        // 空中型：散射疾风三发激光
        const angles = [-0.15, 0, 0.15];
        angles.forEach((ang, i) => {
          entitiesRef.current.bullets.push({
            id: `b-${Date.now()}-sky-${i}`,
            x: p.x + (i - 1) * 8,
            y: p.y - 30,
            radius: 4,
            speedX: Math.sin(ang) * 11,
            speedY: -Math.cos(ang) * 11,
            damage: bulletDmg,
            isPlayer: true,
            color: '#a855f7',
            glow: true
          });
        });
      } else if (currentForm === UltramanForm.GLITTER) {
        // 闪耀型：射速狂飙、自带追踪极光流
        const offsets = [-15, 0, 15];
        offsets.forEach((ox, i) => {
          entitiesRef.current.bullets.push({
            id: `b-${Date.now()}-glitter-${i}`,
            x: p.x + ox,
            y: p.y - 35,
            radius: 4,
            speedX: (i - 1) * 1.5,
            speedY: -12,
            damage: bulletDmg,
            isPlayer: true,
            color: '#fbbf24',
            glow: true,
            isTracking: true
          });
        });
      }
    };

    // 敌机开火发射器
    const fireEnemyBullet = (enemy: Enemy) => {
      const p = playerRef.current;
      const waveDmgFactor = 1 + (stats.wave - 1) * 0.15;

      switch(enemy.type) {
        case EnemyType.BALTAN:
          // 巴尔坦星人反射两个分身光尾
          entitiesRef.current.bullets.push({
            id: `eb-${Date.now()}-bal`,
            x: enemy.x,
            y: enemy.y + 15,
            radius: 4.5,
            speedX: 0,
            speedY: 4.5,
            damage: Math.round(10 * waveDmgFactor),
            isPlayer: false,
            color: '#34d399'
          });
          break;

        case EnemyType.RED_KING:
          // 雷德王粗野型，概率发射陨石爆炸弹（无子弹，主要以高血正面撞击为主）
          if (Math.random() > 0.4) {
            entitiesRef.current.bullets.push({
              id: `eb-${Date.now()}-rk`,
              x: enemy.x,
              y: enemy.y + 18,
              radius: 6,
              speedX: (Math.random() - 0.5) * 2,
              speedY: 3.5,
              damage: Math.round(18 * waveDmgFactor),
              isPlayer: false,
              color: '#fb923c'
            });
          }
          break;

        case EnemyType.GOMORA:
          // 哥莫拉：两道斜交叉的光流弹
          [-1.5, 1.5].forEach((vx, index) => {
            entitiesRef.current.bullets.push({
              id: `eb-${Date.now()}-gom-${index}`,
              x: enemy.x,
              y: enemy.y + 15,
              radius: 4,
              speedX: vx,
              speedY: 5,
              damage: Math.round(12 * waveDmgFactor),
              isPlayer: false,
              color: '#ea580c'
            });
          });
          break;

        case EnemyType.ZETTON:
          // 杰顿：标志性的一兆度一字排开三连火球！
          [-2.5, 0, 2.5].forEach((vx, index) => {
            entitiesRef.current.bullets.push({
              id: `eb-${Date.now()}-zet-${index}`,
              x: enemy.x,
              y: enemy.y + 15,
              radius: 5,
              speedX: vx,
              speedY: 5.5,
              damage: Math.round(16 * waveDmgFactor),
              isPlayer: false,
              color: '#ef4444'
            });
          });
          SoundEffects.playLaser(350, 0.15, 'sawtooth');
          break;
      }
    };

    // 2D 画布高帧渲染逻辑
    const renderFrame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      ctx.save();
      
      // 应用屏幕震动位移
      if (screenShakeRef.current > 0) {
        const dx = (Math.random() - 0.5) * screenShakeRef.current;
        const dy = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(dx, dy);
      }

      // 1. 清空画布，绘制深邃太空格局与网格尘埃
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // 绘制流逝的宇宙繁星背景
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 60; i++) {
        const starX = (Math.sin(i * 313) * 0.5 + 0.5) * width;
        const starY = ((time: number) => {
          const speed = (Math.sin(i * 123) * 0.5 + 0.7) * 0.08;
          return (time * speed + i * 44) % height;
        })(performance.now());
        const size = (Math.sin(i * 9) * 0.5 + 0.5) * 1.5 + 0.5;
        ctx.fillRect(starX, starY, size, size);
      }

      // 2. 绘制斯派修姆贯穿毁灭激光 (大招)
      if (isFiringSpecium && playerEnergy > 0) {
        const px = playerRef.current.x;
        const py = playerRef.current.y;
        const beamWidth = 55 + Math.sin(performance.now() * 0.1) * 8;

        // 绘制蓄力及斯派修姆量子横扫光束
        const grad = ctx.createLinearGradient(px - beamWidth/2, 0, px + beamWidth/2, 0);
        const formConfig = FORM_CONFIGS[currentForm];
        
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.05)');
        grad.addColorStop(0.3, formConfig.color);
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(0.7, formConfig.accentColor);
        grad.addColorStop(1, 'rgba(56, 189, 248, 0.05)');

        // 外层等离子光晕
        ctx.shadowBlur = 40;
        ctx.shadowColor = formConfig.color;
        
        ctx.fillStyle = grad;
        ctx.fillRect(px - beamWidth/2, 0, beamWidth, py - 30);
        
        // 核心最亮等离子束
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(px - 10, 0, 20, py - 30);
        
        ctx.shadowBlur = 0; // 重置
      }

      // 3. 绘制好坏双方子弹
      entitiesRef.current.bullets.forEach(bullet => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        
        if (bullet.glow) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = bullet.color;
        }

        ctx.fillStyle = bullet.color;
        ctx.fill();

        // 额外亮心
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
      });

      // 4. 绘制敌方怪兽（结合 Canvas 手绘风与科技感矢量）
      entitiesRef.current.enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);

        // 绘制血条进度挂载顶部
        if (enemy.hp < enemy.maxHp) {
          const hpBarW = enemy.width;
          ctx.fillStyle = '#374151';
          ctx.fillRect(-hpBarW/2, -enemy.height/2 - 12, hpBarW, 4);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-hpBarW/2, -enemy.height/2 - 12, hpBarW * Math.max(0, enemy.hp / enemy.maxHp), 4);
        }

        // 绘制怪兽细节
        ctx.fillStyle = enemy.color;
        ctx.shadowBlur = enemy.isBoss ? 25 : 5;
        ctx.shadowColor = enemy.color;

        if (enemy.type === EnemyType.BALTAN) {
          // 巴尔坦星人特色：大型红蓝甲、大巨剪、昆虫般复眼
          // 头部
          ctx.beginPath();
          ctx.moveTo(0, -enemy.height/2);
          ctx.lineTo(15, -15);
          ctx.lineTo(5, 10);
          ctx.lineTo(-5, 10);
          ctx.lineTo(-15, -15);
          ctx.closePath();
          ctx.fill();

          // 绘制巨大的黄金色复眼
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.arc(-8, -18, 5, 0, Math.PI*2);
          ctx.arc(8, -18, 5, 0, Math.PI*2);
          ctx.fill();

          // 手部大钢剪 (Claws)
          ctx.fillStyle = '#9ca3af';
          ctx.beginPath();
          // 左剪刀
          ctx.arc(-22, 5, 12, 0, Math.PI*2);
          ctx.fill();
          ctx.beginPath();
          // 右剪刀
          ctx.arc(22, 5, 12, 0, Math.PI*2);
          ctx.fill();

          // 剪刀中心月形内圈
          ctx.fillStyle = '#111827';
          ctx.beginPath();
          ctx.arc(-25, 5, 5, 0, Math.PI*2);
          ctx.arc(25, 5, 5, 0, Math.PI*2);
          ctx.fill();

        } else if (enemy.type === EnemyType.RED_KING) {
          // 雷德王：浑身粗壮条纹重盔甲、小脑袋小胳膊
          ctx.fillStyle = '#f59e0b';
          // 粗壮三角形叠块身板
          ctx.beginPath();
          ctx.moveTo(0, -enemy.height/2);
          ctx.lineTo(24, 25);
          ctx.lineTo(-24, 25);
          ctx.closePath();
          ctx.fill();

          // 绘制横着的雷德王斑纹状肌肉段
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 3;
          for (let py = -10; py <= 15; py += 10) {
            ctx.beginPath();
            ctx.moveTo(-18, py);
            ctx.lineTo(18, py);
            ctx.stroke();
          }

          // 小红眼
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(-4, -enemy.height/3, 2.5, 0, Math.PI*2);
          ctx.arc(4, -enemy.height/3, 2.5, 0, Math.PI*2);
          ctx.fill();

        } else if (enemy.type === EnemyType.GOMORA) {
          // 哥莫拉：头上突起两片大刀状巨角
          ctx.fillStyle = '#ea580c';
          // 身体
          ctx.beginPath();
          ctx.arc(0, 0, enemy.width/2.2, 0, Math.PI * 2);
          ctx.fill();

          // 新月双头角
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(-25, -25);
          ctx.quadraticCurveTo(0, -5, 25, -25);
          ctx.quadraticCurveTo(0, -15, -25, -25);
          ctx.closePath();
          ctx.fill();

          // 头核
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(0, -28);
          ctx.lineTo(4, -12);
          ctx.lineTo(-4, -12);
          ctx.closePath();
          ctx.fill();
        } else if (enemy.type === EnemyType.ZETTON) {
          // 积顿(Zetton)黑色胸前有两个黄色发光能量槽！
          ctx.fillStyle = '#1f2937';
          // 胸腹椭圆身段
          ctx.beginPath();
          ctx.ellipse(0, 0, enemy.width/2, enemy.height/2, 0, 0, Math.PI*2);
          ctx.fill();

          // 两根发光带
          ctx.fillStyle = '#facc15';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#eab308';
          ctx.fillRect(-10, -18, 5, 25);
          ctx.fillRect(5, -18, 5, 25);
          ctx.shadowBlur = 0;

          // 杰顿念力护盾开启绘制外包罩
          if (enemy.phase === 1) {
            ctx.strokeStyle = '#f472b6';
            ctx.lineWidth = 3;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, enemy.width * 0.8, 0, Math.PI*2);
            ctx.stroke();
            ctx.setLineDash([]); // 重设为非虚线
          }

        } else if (enemy.type === EnemyType.BOSS_BELIAL) {
          // 最终Boss 贝利亚(Belial)！
          // 暗黑巨型狂暴奥特形态
          ctx.fillStyle = '#0f172a'; // 全黑邪恶
          ctx.beginPath();
          ctx.arc(0, 10, enemy.width/2.5, 0, Math.PI*2);
          ctx.fill();

          // 邪意标志性的月牙修长血色邪恶双眼
          ctx.fillStyle = '#dc2626';
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#dc2626';
          ctx.beginPath();
          // 左斜邪眼
          ctx.moveTo(-18, -25);
          ctx.quadraticCurveTo(-10, -22, -2, -35);
          ctx.quadraticCurveTo(-10, -15, -18, -25);
          ctx.closePath();
          ctx.fill();

          // 右斜邪眼
          ctx.beginPath();
          ctx.moveTo(18, -25);
          ctx.quadraticCurveTo(10, -22, 2, -35);
          ctx.quadraticCurveTo(10, -15, 18, -25);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;

          // 邪恶贝利亚双肩荆棘棘刺
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          // 左肩刺
          ctx.moveTo(-25, 5);
          ctx.lineTo(-45, -18);
          ctx.lineTo(-15, 15);
          // 右肩刺
          ctx.moveTo(25, 5);
          ctx.lineTo(45, -18);
          ctx.lineTo(15, 15);
          ctx.closePath();
          ctx.fill();

          // 胸口暗星计时器（暗紫色裂纹）
          ctx.fillStyle = '#c084fc';
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(6, -10);
          ctx.lineTo(0, -15);
          ctx.lineTo(-6, -10);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      });

      // 5. 绘制奥特曼玩家（纯 Vector 精细绘制，包含彩色指示器计时器和护盾面罩）
      const p = playerRef.current;
      const formConfig = FORM_CONFIGS[currentForm];

      ctx.save();
      ctx.translate(p.x, p.y);

      // 如果闪耀形态 渲染金光太史神环或背光羽翼
      if (currentForm === UltramanForm.GLITTER) {
        ctx.save();
        ctx.shadowBlur = 30 + Math.sin(performance.now() * 0.02) * 8;
        ctx.shadowColor = '#f59e0b';
        ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
        ctx.beginPath();
        ctx.arc(0, 5, p.width * 1.1, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

      // 如果处于受击无敌状态 则一闪一闪
      if (p.isInvulnerable <= 0 || Math.floor(p.isInvulnerable / 3) % 2 === 0) {
        
        // A. 绘制头部、发光双眼和红蓝斑纹
        // 绘制肩膀和装甲轮廓
        ctx.fillStyle = formConfig.color;
        ctx.beginPath();
        ctx.moveTo(-18, 15);
        ctx.lineTo(-32, 28);
        ctx.lineTo(-12, 45);
        ctx.lineTo(0, 18);
        ctx.lineTo(12, 45);
        ctx.lineTo(32, 28);
        ctx.lineTo(18, 15);
        ctx.closePath();
        ctx.fill();

        // 绘制主核心银白主体（胸腹）
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(-15, 15);
        ctx.lineTo(15, 15);
        ctx.lineTo(12, 50);
        ctx.lineTo(-12, 50);
        ctx.closePath();
        ctx.fill();

        // 各种形态独具的彩色身体条纹
        ctx.fillStyle = formConfig.accentColor;
        ctx.beginPath();
        // V型肩带
        ctx.moveTo(-16, 16);
        ctx.lineTo(0, 36);
        ctx.lineTo(16, 16);
        ctx.lineTo(10, 16);
        ctx.lineTo(0, 28);
        ctx.lineTo(-10, 16);
        ctx.closePath();
        ctx.fill();

        // 绘制头部 (椭圆)
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.ellipse(0, -15, p.width * 0.44, p.height * 0.38, 0, 0, Math.PI * 2);
        ctx.fill();

        // 头部正中经典红底金色突起能量骨柱 (Ultraman Ridge)
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-2.5, -34, 5, 23);

        // B. 绘制一双巨大的鸭蛋状乳黄色发光眼睛 (Eyes)
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#fccd34';
        
        // 眼睛径向感
        const eyeGradL = ctx.createRadialGradient(-9, -15, 1, -9, -15, 8);
        eyeGradL.addColorStop(0, '#ffffff');
        eyeGradL.addColorStop(1, '#facc15');

        const eyeGradR = ctx.createRadialGradient(9, -15, 1, 9, -15, 8);
        eyeGradR.addColorStop(0, '#ffffff');
        eyeGradR.addColorStop(1, '#facc15');

        ctx.fillStyle = eyeGradL;
        ctx.beginPath();
        ctx.ellipse(-9, -14, 7, 5, Math.PI/9, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = eyeGradR;
        ctx.beginPath();
        ctx.ellipse(9, -14, 7, 5, -Math.PI/9, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();

        // C. 经典胸前红蓝彩色计时器 Color Timer
        ctx.save();
        const lowHealth = (playerHp / maxPlayerHp) <= 0.3;
        
        if (lowHealth) {
          // 低生命（彩色计时器变成警报红，并高频爆闪）
          const flash = Math.floor(performance.now() * 0.008) % 2 === 0;
          ctx.fillStyle = flash ? '#ef4444' : '#7f1d1d';
          ctx.shadowBlur = flash ? 20 : 2;
          ctx.shadowColor = '#ef4444';
        } else {
          // 能量健康，显示为高饱和电光蓝
          ctx.fillStyle = '#38bdf8';
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#06b6d4';
        }

        ctx.beginPath();
        ctx.arc(0, 18, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // 亮光点反射
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-1.5, 16.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 如果有无敌保护，则在外围套上一层华丽的半透蓝色防护壁垒罩
      if (p.isInvulnerable > 0) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 10, p.height * 0.72, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();

      // 6. 渲染所有火花和碎裂粒子特效
      entitiesRef.current.particles.forEach(pt => {
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        
        if (pt.glow) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = pt.color;
        }

        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      ctx.restore(); // 重叠震动效果
    };

    // 真正的请求渲染激活
    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
      SoundEffects.stopContinuous(); // 离屏时优雅止息
    };
  }, [gameState, currentForm, playerHp, maxPlayerHp, playerEnergy, shopOpen, glitterUnlocked, upgrades, isMobile, touchMovement]);

  return (
    <div id="game-arena-root" className="relative w-full h-full flex flex-col items-center bg-slate-950 rounded-3xl overflow-hidden font-sans select-none shadow-[0_0_35px_rgba(139,92,246,0.15)] border-2 border-violet-500/25">
      
      {/* 顶部游戏基本HUD面板 */}
      <div id="hud-top-bar" className="absolute top-0 inset-x-0 bg-gradient-to-b from-slate-900/90 via-slate-900/40 to-transparent p-4 flex justify-between items-center z-20 text-white select-none pointer-events-none">
        
        {/* 左侧：奥特曼基础生命与形态 */}
        <div id="hud-left-stats" className="flex flex-col gap-1 md:gap-2 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gradient-to-r from-pink-500 to-rose-600 border border-pink-400/30 px-2 py-0.5 rounded-lg font-black uppercase tracking-wider text-white shadow-[0_0_8px_rgba(244,114,182,0.4)]">
              {FORM_CONFIGS[currentForm].name}
            </span>
            <span className="text-xs font-display font-black text-violet-300">WAVE {stats.wave}</span>
          </div>
          
          {/* 血条 */}
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-500 fill-pink-500 shrink-0 select-none animate-pulse" />
            <div className="w-36 md:w-56 h-3.5 bg-slate-950 rounded-full overflow-hidden border border-red-500/35 p-0.5 shadow-[0_0_10px_rgba(239,68,68,0.1)]">
              <div 
                className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-red-500 rounded-full transition-all duration-100 ease-out shadow-[0_0_8px_rgba(236,72,153,0.5)]"
                style={{ width: `${Math.max(0, (playerHp / maxPlayerHp) * 100)}%` }}
              />
            </div>
            <span className="text-xs font-mono font-extrabold text-pink-300 w-12">{Math.round(playerHp)}/{maxPlayerHp}</span>
          </div>

          {/* 斯派修姆大招蓄力槽 */}
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400 shrink-0 select-none animate-pulse" />
            <div className="w-36 md:w-56 h-2 or h-3 bg-slate-950 rounded-full overflow-hidden border border-cyan-500/35 p-0.5 shadow-[0_0_10px_rgba(6,182,212,0.1)]">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 via-sky-450 to-blue-500 rounded-full transition-all duration-100 ease-out shadow-[0_0_8px_#06b6d4]"
                style={{ width: `${playerEnergy}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-cyan-300 font-extrabold w-12">
              {isFiringSpecium ? '释放中' : `${Math.round(playerEnergy)}%`}
            </span>
          </div>
        </div>

        {/* 右侧：光能晶体、分数汇总以及操作栏 */}
        <div id="hud-right-stats" className="flex flex-col items-end gap-1.5 md:gap-2 pointer-events-auto text-right">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-400/25 px-2.5 py-0.5 rounded-lg shadow-[0_0_8px_rgba(234,179,8,0.15)]">
              <span className="text-sm text-yellow-400 font-black font-display drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]">💎 {stats.crystals}</span>
              <span className="text-[10px] text-yellow-200/70 font-semibold">光晶</span>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-violet-300/80 uppercase tracking-widest leading-none font-bold">SCORE</p>
              <p className="text-base font-display font-extrabold text-cyan-400 tracking-wider drop-shadow-[0_0_10px_#22d3ee]">
                {stats.score.toLocaleString()}
              </p>
            </div>
          </div>

          {/* 音量等基础静音开关 */}
          <div className="flex items-center gap-2">
            <button 
              id="btn-toggle-sound"
              onClick={onToggleAudio}
              className="p-1 px-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 hover:text-white border border-violet-500/30 transition-all duration-300 cursor-pointer flex items-center gap-1 text-xs shadow-[0_0_10px_rgba(139,92,246,0.15)]"
              title={audioEnabled ? "关闭声音" : "开启声音"}
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-red-400" />}
              <span className="text-[10px] font-bold">{audioEnabled ? '已开音效' : '已静音'}</span>
            </button>
            <button
              id="btn-open-shop"
              onClick={() => {
                if (gameState === 'PLAYING') {
                  setShopOpen(!shopOpen);
                  SoundEffects.playTransform();
                }
              }}
              className="p-1 px-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 border border-orange-400/40 text-white font-extrabold transition-all duration-300 scale-100 hover:scale-105 active:scale-95 text-xs cursor-pointer shadow-[0_0_15px_rgba(249,115,22,0.35)] font-display tracking-wide"
            >
              {shopOpen ? '返回游戏' : '暂停/升级'}
            </button>
          </div>
        </div>
      </div>

      {/* 核心 Canvas 视窗 */}
      <div ref={containerRef} className="w-full flex-1 relative bg-black">
        <canvas 
          ref={canvasRef} 
          className="block w-full h-full cursor-crosshair"
        />

        {/* 顶部红色受击警示发光框 */}
        {playerHp / maxPlayerHp <= 0.3 && gameState === 'PLAYING' && (
          <div className="absolute inset-0 border-4 border-red-600/40 animate-pulse pointer-events-none shadow-[inset_0_0_50px_rgba(220,38,38,0.35)]" />
        )}
      </div>

      {/* 1. 关卡准备 / 升级休整面板 overlays */}
      {shopOpen && gameState === 'PLAYING' && (
        <div id="shop-overlay" className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col items-center justify-center p-4 z-30 animate-fade-in">
          <div className="w-full max-w-xl bg-slate-900/95 border-2 border-violet-500/30 rounded-3xl p-6 shadow-[0_0_40px_rgba(139,92,246,0.25)] relative animate-glow-purple">
            <div className="flex justify-between items-center border-b border-violet-950/50 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 flex items-center gap-2 font-display uppercase tracking-wider">
                  <Award className="w-6 h-6 text-orange-400" /> 等离子核心升级仓
                </h2>
                <p className="text-xs text-violet-300/80 mt-1 font-medium">使用在战斗中收集的“光晶”升级奥特曼的宇宙神力，升级后即刻生效</p>
              </div>
              <button 
                onClick={() => setShopOpen(false)}
                className="px-3 py-1.5 bg-violet-950 hover:bg-violet-900 text-yellow-300 border border-violet-800 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
              >
                回到战斗
              </button>
            </div>

            {/* 拥有晶体通报 */}
            <div className="bg-slate-950/80 border border-violet-500/20 px-4 py-2.5 rounded-2xl flex justify-between items-center mb-4 text-xs font-semibold shadow-inner">
              <span className="text-violet-300">您当前拥有等离子光能晶体：</span>
              <span className="text-lg text-yellow-400 font-display font-black drop-shadow-[0_0_6px_rgba(234,179,8,0.4)]">💎 {stats.crystals} 个</span>
            </div>

            {/* 升级池 */}
            <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-1">
              {upgrades.map(u => {
                const isMax = u.level >= u.maxLevel;
                const canAfford = stats.crystals >= u.cost;
                return (
                  <div key={u.id} className="bg-slate-950/90 border border-violet-500/15 p-3 rounded-2xl flex items-center justify-between gap-4 hover:border-violet-400/30 transition duration-300">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-900 rounded-xl text-orange-400 border border-violet-500/15">
                        {u.id === 'dmg' && <Zap className="w-5 h-5 text-yellow-450" />}
                        {u.id === 'hp' && <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />}
                        {u.id === 'rate' && <Flame className="w-5 h-5 text-orange-500" />}
                        {u.id === 'shield' && <Shield className="w-5 h-5 text-cyan-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-gray-150 font-display">{u.name}</h4>
                          <span className="text-[10px] bg-violet-950 text-yellow-400 px-1.5 py-0.5 rounded-full font-mono font-bold">
                            LV {u.level}/{u.maxLevel}
                          </span>
                        </div>
                        <p className="text-xs text-violet-400/80 mt-0.5">{u.description}</p>
                      </div>
                    </div>
                    
                    <button
                      disabled={isMax || !canAfford}
                      onClick={() => handleUpgrade(u.id)}
                      className={`px-4 py-2 rounded-xl font-black text-xs shrink-0 flex flex-col items-center gap-0.5 w-[85px] transition duration-300 cursor-pointer ${
                        isMax 
                          ? 'bg-slate-800 text-gray-500 cursor-not-allowed'
                          : canAfford
                            ? 'bg-yellow-400 hover:bg-yellow-350 text-gray-950 hover:shadow-[0_0_12px_rgba(250,204,21,0.4)] active:scale-95'
                            : 'bg-slate-850 text-slate-500 border border-slate-700/30 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? (
                        <span>已满级</span>
                      ) : (
                        <>
                          <span>强化 LV{u.level + 1}</span>
                          <span className="text-[10px] font-mono leading-none font-black text-yellow-950">💎{u.cost}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}

              {/* 特别栏目：闪耀形態解锁 */}
              <div className="bg-gradient-to-r from-yellow-950/50 to-amber-950/50 border border-yellow-500/30 p-3 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-900/30 rounded-xl text-yellow-400 border border-yellow-500/40">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-yellow-300 font-display">闪耀形态 (Glitter Ultraman)</h4>
                    <p className="text-xs text-yellow-450/80 leading-normal">解锁极致传说形态，高攻速追踪群敌（打败Boss免费送，或花费120晶体快速体验）</p>
                  </div>
                </div>
                {glitterUnlocked ? (
                  <span className="text-xs bg-yellow-450/20 text-yellow-300 font-black border border-yellow-500/30 px-3 py-1.5 rounded-xl shrink-0">
                    已获得资格
                  </span>
                ) : (
                  <button
                    disabled={stats.crystals < 120}
                    onClick={handleUnlockGlitter}
                    className={`px-4 py-2 rounded-xl font-black text-xs shrink-0 flex flex-col items-center gap-0.5 w-[85px] transition duration-300 cursor-pointer ${
                      stats.crystals >= 120
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-550 hover:from-yellow-300 hover:to-amber-450 text-gray-950 hover:shadow-[0_0_15px_rgba(250,204,21,0.5)] active:scale-95'
                        : 'bg-slate-850 text-slate-500 border border-slate-700/30 cursor-not-allowed'
                    }`}
                  >
                    <span>立刻买</span>
                    <span className="text-[10px] font-mono font-black text-yellow-950">💎120</span>
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 text-center">
              <p className="text-[10.5px] text-violet-300/60">按 <kbd className="px-1.5 py-0.5 bg-slate-950 rounded border border-violet-900/30">ESC</kbd> 键也可以切换暂停/重返战场状态</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. 开始大厅界面 START STATE */}
      {gameState === 'START' && (
        <div id="start-lobby-overlay" className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 z-30 select-none text-white font-sans animate-fade-in">
          {/* 星空闪耀背景氛围，高品高对比配色 */}
          <div className="w-full max-w-lg bg-slate-900/90 border-2 border-violet-500/30 p-8 rounded-3xl shadow-[0_0_50px_rgba(139,92,246,0.25)] text-center relative overflow-hidden animate-glow-purple">
            
            {/* 顶框装饰 */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-pink-500 to-yellow-400 shadow-[0_2px_15px_#f472b6]" />

            <div className="flex justify-center mb-3">
              <span className="bg-pink-900/40 text-pink-300 font-black border border-pink-500/40 px-3 py-1 text-xs rounded-full uppercase tracking-wider flex items-center gap-1.5 font-display shadow-[0_0_10px_rgba(244,114,182,0.2)]">
                <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" /> 宇宙射击大作
              </span>
            </div>

            {/* 精美炫目中文字体标题 */}
            <h1 className="text-4xl md:text-5xl font-black tracking-widest bg-gradient-to-r from-cyan-300 via-pink-400 to-yellow-300 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(34,211,238,0.2)] leading-tight font-display py-2">
              奥特曼：光之卫士
            </h1>
            <p className="text-sm text-slate-350 mt-2 max-w-md mx-auto leading-relaxed">
              邪恶的巴尔坦星人、雷德王及暗黑主宰贝利亚大举突入银河防线！化身光之战士，保卫地球的和平。
            </p>

            {/* 简易说明卡 */}
            <div className="my-6 bg-slate-950 border border-violet-950/60 p-4 rounded-2xl text-left text-xs text-slate-300 flex flex-col gap-2.5 shadow-inner">
              <p className="text-orange-400 font-extrabold mb-1 border-b border-violet-950 pb-1.5 font-display flex items-center gap-1.5">🕹️ 战术动作与控制：</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-slate-300 font-medium">
                <p>🚀 <strong className="text-white">移动</strong>: W, A, S, D 或 ↑, ↓, ←, →</p>
                <p>💫 <strong className="text-white">射击</strong>: 自动连射 / 按住 Space键</p>
                <p>✨ <strong className="text-cyan-400">复合型 1</strong>: 均衡性能 (普攻双线)</p>
                <p>🔥 <strong className="text-pink-400">强力型 2</strong>: 重力伤害爆破</p>
                <p>⚡ <strong className="text-purple-400">空中型 3</strong>: 散射极速穿梭</p>
                <p>🏆 <strong className="text-yellow-400">闪耀型 4</strong>: 追踪星弹 (需解锁)</p>
              </div>
              <p className="text-cyan-400 font-extrabold mt-1.5 border-t border-violet-950 pt-1.5 font-display">
                🌟 终极秘技 (斯派修姆超量子激光)：
              </p>
              <p className="text-slate-400 leading-normal pl-0.5">
                按住键盘 <kbd className="px-1.5 py-0.5 bg-slate-900 border border-cyan-850 text-cyan-300 font-mono rounded">L</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-900 border border-cyan-850 text-cyan-300 font-mono rounded">U</kbd> 键（或手机<b>大招按钮</b>），瞬间倾泻斯派修姆能量，吞噬横扫一整条线上的全部怪兽！
              </p>
            </div>

            {/* 历史最高分统计 */}
            {stats.highScore > 0 && (
              <div className="mb-6 flex justify-center items-center gap-2 text-sm text-yellow-400">
                <Award className="w-5 h-5 text-yellow-400 animate-bounce" />
                <span>等离子星河防卫高分记录：<strong className="font-display font-bold">{stats.highScore.toLocaleString()} 分</strong></span>
              </div>
            )}

            {/* 启动主控大按钮 */}
            <button
              onClick={handleStartGame}
              className="w-full md:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white font-extrabold text-base transition duration-300 shadow-lg shadow-purple-500/40 hover:shadow-[0_0_25px_rgba(168,85,247,0.7)] hover:scale-103 active:scale-97 cursor-pointer flex items-center justify-center gap-2 mx-auto font-display uppercase tracking-widest"
            >
              <Play className="w-5 h-5 fill-white" /> 接受召唤 · 登场！
            </button>
          </div>
        </div>
      )}

      {/* 3. 关卡中场休息 / 通关通告 WAVE CLEAR PANEL */}
      {gameState === 'WAVE_CLEAR' && (
        <div id="wave-clear-overlay" className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 z-30 select-none animate-fade-in text-white text-center">
          <div className="w-full max-w-md bg-slate-900/90 border-2 border-emerald-500/35 p-8 rounded-3xl shadow-[0_0_45px_rgba(16,185,129,0.3)] animate-glow-cyan">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 uppercase tracking-widest flex justify-center items-center gap-2 font-display">
              🏆 光芒胜利！WAVE {stats.wave} 守御成功
            </h2>
            <p className="text-xs text-emerald-350 mt-1 font-bold">此波战役已全部扫清，怪兽舰队暂时撤退</p>

            <div className="my-6 bg-slate-950 border border-violet-950/50 p-4 rounded-2xl text-left flex flex-col gap-3 shadow-inner">
              <p className="text-yellow-400 font-extrabold border-b border-violet-950 pb-1 text-sm font-display uppercase tracking-wider">🌌 阶段清算统计：</p>
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>当前累计分数:</span>
                <span className="font-mono font-black text-white text-sm">{stats.score}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>此波退敌奖励晶体:</span>
                <span className="text-yellow-400 font-bold font-mono">💎 +{stats.wave * 15} 个</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>总计持有等离子光晶:</span>
                <span className="text-yellow-400 font-bold font-mono">💎 {stats.crystals} 个</span>
              </div>
            </div>

            {/* 提示使用升级 */}
            <p className="text-xs text-orange-400 mb-6 bg-orange-950/20 border border-orange-500/30 p-2 rounded-xl leading-relaxed font-medium">
              小建议：您可以点击右侧上方的<b>“暂停/升级”</b>，或者在下方购买核心装甲技能，有助于硬撼下个波次的强横首领！
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  SoundEffects.playTransform();
                  setShopOpen(true);
                }}
                className="flex-1 py-3 bg-slate-950 hover:bg-violet-950 text-violet-300 hover:text-white border border-violet-850/60 rounded-2xl text-xs font-black transition duration-300 active:scale-97 cursor-pointer"
              >
                强化奥特核心
              </button>
              <button
                onClick={handleNextWave}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 via-teal-550 to-cyan-550 hover:from-emerald-400 hover:to-cyan-455 text-slate-950 rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/20 hover:shadow-[0_0_20px_rgba(52,211,153,0.5)] hover:scale-103 transition duration-300 active:scale-97 cursor-pointer font-display uppercase tracking-widest"
              >
                迈向第 {stats.wave + 1} 波次 ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 战损 GAME OVER PANEL */}
      {gameState === 'GAMEOVER' && (
        <div id="game-over-overlay" className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 z-30 select-none animate-fade-in text-white text-center">
          <div className="w-full max-w-md bg-slate-900/90 border-2 border-pink-500/35 p-8 rounded-3xl shadow-[0_0_45px_rgba(236,72,153,0.3)] animate-glow-pink">
            <div className="w-16 h-16 bg-red-950/30 text-red-500 border border-red-500/40 rounded-full flex items-center justify-center mx-auto mb-4 font-black text-xl animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]">
              !
            </div>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-pink-500 to-rose-450 uppercase tracking-widest font-display">
              彩色计时器彻底熄灭
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">光之能量已经耗尽，守护大地的光明终究消散...</p>

            <div className="my-6 bg-slate-950 border border-violet-950/50 p-4 rounded-2xl text-left flex flex-col gap-2.5 shadow-inner">
              <p className="text-slate-400 font-extrabold border-b border-violet-950 pb-1 text-xs font-display uppercase tracking-wider">📊 战绩通报：</p>
              <div className="flex justify-between text-xs font-medium text-slate-350">
                <span>抵御怪兽波次:</span>
                <span className="text-white font-black font-mono">WAVE {stats.wave}</span>
              </div>
              <div className="flex justify-between text-xs font-medium text-slate-350">
                <span>消灭入侵怪兽:</span>
                <span className="text-white font-black font-mono">{stats.enemiesKilled} 只</span>
              </div>
              <div className="flex justify-between text-xs font-medium text-slate-355">
                <span>终局累计得分:</span>
                <span className="text-cyan-400 text-sm font-black font-mono drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">{stats.score.toLocaleString()}</span>
              </div>
              {stats.score >= stats.highScore && stats.score > 0 && (
                <div className="text-center font-bold text-xs text-yellow-400 mt-2 bg-yellow-950/30 p-1.5 border border-yellow-500/20 rounded-xl">
                  🎉 创造了守护星系的全新记录！
                </div>
              )}
            </div>

            <button
              onClick={handleStartGame}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-600 via-rose-600 to-red-500 hover:from-pink-500 hover:to-red-400 text-white font-black text-sm shadow-md shadow-pink-600/30 hover:shadow-[0_0_20px_rgba(244,114,182,0.5)] active:scale-97 hover:scale-103 transition duration-300 cursor-pointer flex items-center justify-center gap-2 font-display uppercase tracking-widest"
            >
              <RotateCcw className="w-4 h-4" /> 能量充能 · 重新复苏
            </button>
          </div>
        </div>
      )}

      {/* 5. 手机移动端虚拟操作杆 (仅当检测或手动标记为移动触控时渲染) */}
      {isMobile && gameState === 'PLAYING' && (
        <div id="mobile-joystick-hud" className="absolute bottom-6 inset-x-0 px-6 flex justify-between items-end z-20 pointer-events-none select-none">
          
          {/* 左侧：虚拟方向圆盘 */}
          <div className="w-32 h-32 bg-white/5 border border-cyan-500/20 rounded-full pointer-events-auto flex items-center justify-center relative touch-none shadow-[inset_0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-sm"
               onTouchStart={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect();
                 const centerX = rect.left + rect.width / 2;
                 const centerY = rect.top + rect.height / 2;
                 const handleTouch = (evt: TouchEvent) => {
                   const touch = evt.touches[0];
                   const dx = touch.clientX - centerX;
                   const dy = touch.clientY - centerY;
                   const dist = Math.hypot(dx, dy);
                   const maxDist = rect.width / 2;
                   
                   // 归一化移动物理距离
                   const rawX = dx / maxDist;
                   const rawY = dy / maxDist;
                   
                   // 限幅并设定灵敏度
                   const clampedX = Math.max(-1, Math.min(1, rawX * 1.5));
                   const clampedY = Math.max(-1, Math.min(1, rawY * 1.5));
                   
                   setTouchMovement({ x: clampedX, y: clampedY });
                 };
                 
                 const handleEnd = () => {
                   setTouchMovement({ x: 0, y: 0 });
                   document.removeEventListener('touchmove', handleTouch);
                   document.removeEventListener('touchend', handleEnd);
                 };
                 
                 document.addEventListener('touchmove', handleTouch);
                 document.addEventListener('touchend', handleEnd);
               }}
          >
            {/* 内核小摇杆 */}
            <div className="w-12 h-12 bg-cyan-400/20 border border-cyan-400/45 rounded-full transition duration-75 shadow-[0_0_15px_rgba(34,211,238,0.4)] shrink-0 pointer-events-none"
                 style={{ 
                   transform: `translate(${touchMovement.x * 25}px, ${touchMovement.y * 25}px)` 
                 }} 
             />
            <span className="absolute bottom-1.5 text-[8px] text-cyan-400/70 font-black uppercase tracking-widest leading-none font-display">
              滑动摇杆
            </span>
          </div>

          {/* 右侧：奥特曼特技及大招按键 */}
          <div className="flex flex-col gap-3 pointer-events-auto items-end select-none">
            
            {/* 形态选择条 */}
            <div className="flex gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border-2 border-violet-550/30 shadow-[0_0_15px_rgba(139,92,246,0.15)] shrink-0">
              <button 
                onClick={() => handleFormChange(UltramanForm.MULTI)}
                className={`w-9 h-9 rounded-xl font-black text-[10px] border transition duration-300 uppercase tracking-widest font-display cursor-pointer ${
                  currentForm === UltramanForm.MULTI 
                    ? 'bg-cyan-500 border-cyan-300 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]' 
                    : 'bg-slate-950 border-slate-800 text-cyan-400/70'
                }`}
              >
                均衡
              </button>
              <button 
                onClick={() => handleFormChange(UltramanForm.POWER)}
                className={`w-9 h-9 rounded-xl font-black text-[10px] border transition duration-300 uppercase tracking-widest font-display cursor-pointer ${
                  currentForm === UltramanForm.POWER 
                    ? 'bg-pink-500 border-pink-300 text-white shadow-[0_0_10px_rgba(244,114,182,0.4)]' 
                    : 'bg-slate-950 border-slate-800 text-pink-400/70'
                }`}
              >
                强力
              </button>
              <button 
                onClick={() => handleFormChange(UltramanForm.SKY)}
                className={`w-9 h-9 rounded-xl font-black text-[10px] border transition duration-300 uppercase tracking-widest font-display cursor-pointer ${
                  currentForm === UltramanForm.SKY 
                    ? 'bg-purple-500 border-purple-300 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]' 
                    : 'bg-slate-950 border-slate-800 text-purple-400/70'
                }`}
              >
                空中
              </button>
              {glitterUnlocked && (
                <button 
                  onClick={() => handleFormChange(UltramanForm.GLITTER)}
                  className={`w-9 h-9 rounded-xl font-black text-[10px] border transition duration-300 uppercase tracking-widest font-display cursor-pointer ${
                    currentForm === UltramanForm.GLITTER 
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-400 border-yellow-300 text-gray-950 shadow-[0_0_12px_rgba(250,204,21,0.5)]' 
                      : 'bg-slate-950 border-slate-800 text-yellow-400/70'
                  }`}
                >
                  闪耀
                </button>
              )}
            </div>

            {/* 大招斯派修姆量子炮按钮 */}
            <button
              onTouchStart={() => triggerSpeciumRay(true)}
              onTouchEnd={() => triggerSpeciumRay(false)}
              className={`w-20 h-20 rounded-full font-black text-xs uppercase shadow-2xl transition-all duration-75 flex flex-col items-center justify-center text-white border-2 select-none active:scale-90 cursor-pointer ${
                isFiringSpecium
                  ? 'bg-cyan-450 border-cyan-300 text-slate-950 shadow-[0_0_35px_#22d3ee] scale-95'
                  : playerEnergy > 10
                    ? 'bg-cyan-600 border-cyan-400 shadow-md shadow-cyan-500/40 animate-pulse'
                    : 'bg-slate-850 border-slate-750 text-slate-600 cursor-not-allowed shadow-none'
              }`}
            >
              <Zap className="w-5 h-5 mb-1 text-white fill-current animate-bounce" />
              <span className="font-display text-[9px] font-black tracking-wider text-center">大招斯派</span>
            </button>
          </div>

        </div>
      )}

      {/* 各种快捷形态切换提醒板 (主要用于PC玩家提示) */}
      {!isMobile && gameState === 'PLAYING' && (
        <div id="pc-shortcuts-reminder" className="absolute bottom-4 left-4 bg-slate-900/80 border border-violet-500/25 px-4 py-2.5 rounded-2xl text-[10px] text-violet-300 flex flex-col gap-1 z-20 pointer-events-none backdrop-blur-md shadow-lg">
          <p className="text-white font-extrabold mb-0.5 font-display uppercase tracking-wider">🚀 太空快捷操控 (PC键盘)：</p>
          <p><span className="text-white font-mono font-bold px-1.5 py-0.5 bg-slate-950 border border-violet-900/30 rounded-lg">1</span> / <span className="text-white font-mono font-bold px-1.5 py-0.5 bg-slate-950 border border-violet-900/30 rounded-lg">2</span> / <span className="text-white font-mono font-bold px-1.5 py-0.5 bg-slate-950 border border-violet-900/30 rounded-lg">3</span> / <span className="text-white font-mono font-bold px-1.5 py-0.5 bg-slate-950 border border-violet-900/30 rounded-lg">4</span> : 形态切换</p>
          <p><span className="text-white font-mono font-bold px-1.5 py-0.5 bg-slate-950 border border-violet-900/30 rounded-lg">L</span> / <span className="text-white font-mono font-bold px-1.5 py-0.5 bg-slate-950 border border-violet-900/30 rounded-lg">U</span> : 长按连发大招量子激光</p>
          <p><span className="text-white font-mono font-bold px-1.5 py-0.5 bg-slate-950 border border-violet-900/30 rounded-lg">J</span> / <span className="text-white font-mono font-bold px-2 py-0.5 bg-slate-950 border border-violet-900/30 rounded-lg">Space</span> : 长按自动疯狂普通连射</p>
        </div>
      )}

    </div>
  );
}
