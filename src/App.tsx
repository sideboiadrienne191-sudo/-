/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameStats } from './types';
import GameCanvas from './components/GameCanvas';
import { SoundEffects } from './utils/audio';
import { 
  Shield, 
  HelpCircle, 
  Settings, 
  Info, 
  Compass, 
  Volume2, 
  VolumeX, 
  Sparkles,
  Github,
  Trophy,
  History,
  TrendingUp,
  Target
} from 'lucide-react';

export default function App() {
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    crystals: 0,
    wave: 1,
    highScore: 0,
    enemiesKilled: 0,
    bossesDefeated: 0
  });

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'encyclopedia' | 'how-to-play'>('encyclopedia');
  const [difficulty, setDifficulty] = useState<'EASY' | 'NORMAL' | 'HARD'>('NORMAL');

  // 初始化加载本地历史最高记录
  useEffect(() => {
    const savedHighScore = localStorage.getItem('ultraman_high_score');
    if (savedHighScore) {
      setStats(prev => ({
        ...prev,
        highScore: parseInt(savedHighScore, 10)
      }));
    }
  }, []);

  // 联动修改音效开关
  const handleToggleAudio = () => {
    const nextVal = !audioEnabled;
    setAudioEnabled(nextVal);
    SoundEffects.setEnabled(nextVal);
    SoundEffects.playTransform();
  };

  const handleResetHighscore = () => {
    if (window.confirm('您确定要清除星河历史最高防卫分记录吗？')) {
      localStorage.removeItem('ultraman_high_score');
      setStats(prev => ({ ...prev, highScore: 0 }));
      SoundEffects.playGameOver();
    }
  };

  // 怪兽档案卡数据
  const MONSTER_GUIDES = [
    {
      name: '巴尔坦星人 · 分身型',
      desc: '经典的宇宙忍者。能够在下潜时突然向两侧瞬移闪避，发射绿色中等杀伤极光弹。',
      danger: '★★☆☆☆',
      hp: '一般',
      icon: '👾',
      bg: 'border-cyan-800/30 bg-cyan-950/20 text-cyan-400'
    },
    {
      name: '古代怪兽 · 哥莫拉',
      desc: '擅长在地表进行高频滑翔，并在大屏幕两侧触壁时产生高速反弹攻击，注意走位躲避。',
      danger: '★★★☆☆',
      hp: '中等',
      icon: '🦖',
      bg: 'border-orange-850/30 bg-orange-950/20 text-orange-400'
    },
    {
      name: '雷德王 · 粗暴坦装',
      desc: '拥有庞大吨位的坚挺岩石铠甲，伤害较高。只喜欢沿直线全速往下撞击奥特曼。',
      danger: '★★★☆☆',
      hp: '高血量',
      icon: '🌋',
      bg: 'border-yellow-800/30 bg-yellow-950/20 text-yellow-400'
    },
    {
      name: '宇宙恐龙 · 杰顿',
      desc: '极度危险的防御型怪兽。间歇性生成粉金相间的电磁吸收护盾，护盾期内任何攻击都无效。',
      danger: '★★★★☆',
      hp: '极高',
      icon: '🛸',
      bg: 'border-purple-800/30 bg-purple-950/20 text-purple-400'
    },
    {
      name: '终极邪恶之主 · 贝利亚',
      desc: '第5阶层波次降临的黑暗皇帝！能够释放星环排开的广角弹幕、精准死线追踪流以及黑暗咆哮，突然在战场中央召集多个随从。',
      danger: '★★★★★',
      hp: '首领级',
      icon: '💀',
      bg: 'border-red-900/40 bg-red-950/30 text-red-500 animate-pulse'
    }
  ];

  return (
    <div id="space-operation-root" className="min-h-screen w-full bg-slate-950 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-violet-950/40 via-indigo-950/35 to-slate-950 text-slate-100 flex flex-col p-3 md:p-6 select-none font-sans">
      
      {/* 极简谦逊的顶导航栏 */}
      <header id="ops-header" className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row justify-between items-center bg-slate-900/75 backdrop-blur-xl border-2 border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.15)] px-5 py-4 rounded-3xl mb-4 gap-3 animate-glow-purple">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/45 border border-pink-400/40">
            <Shield className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-pink-400 to-yellow-300 font-display flex items-center gap-2">
              等离子奥特防卫战 <span className="text-[10px] bg-gradient-to-r from-pink-500 to-purple-500 border border-pink-400/40 text-white font-extrabold px-1.5 py-0.5 rounded shadow-[0_0_10px_rgba(244,114,182,0.3)]">全新重制版</span>
            </h1>
            <p className="text-xs text-violet-300/80 font-medium">化身光之巨人 · 变换强力形态 · 抵御怪兽帝国的侵袭</p>
          </div>
        </div>

        {/* 顶部中央快捷统计 */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-400/35 px-3 py-1.5 rounded-xl shadow-[inset_0_0_8px_rgba(234,179,8,0.2)]">
            <Trophy className="w-3.5 h-3.5 text-yellow-400 animate-bounce" />
            <span className="text-yellow-200/80 font-bold">守卫记录:</span>
            <span className="font-mono text-yellow-400 font-extrabold text-sm">{stats.highScore.toLocaleString()}分</span>
          </div>
          
          <button 
            id="header-sound-btn"
            onClick={handleToggleAudio}
            className="p-1.5 px-3 bg-pink-500/10 hover:bg-pink-500/20 active:scale-95 border border-pink-400/30 hover:border-pink-300 rounded-xl text-pink-300 hover:text-pink-100 shadow-[0_0_15px_rgba(244,114,182,0.1)] font-bold transition duration-300 cursor-pointer flex items-center gap-1.5"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-pink-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
            <span>{audioEnabled ? '开启音效' : '静音状态'}</span>
          </button>
        </div>
      </header>

      {/* 核心排版：多端适配的两栏布局 */}
      <main id="ops-main-layout" className="max-w-7xl w-full mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* 左侧大列 (100%全高 - 占比7列或8列)：等离子星际格斗区 */}
        <div id="game-canvas-column" className="lg:col-span-8 flex flex-col h-[520px] md:h-[650px] shadow-2xl border-2 border-cyan-500/30 rounded-3xl overflow-hidden relative animate-glow-cyan shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          <GameCanvas 
            stats={stats} 
            onUpdateStats={setStats}
            audioEnabled={audioEnabled}
            onToggleAudio={handleToggleAudio}
          />
        </div>

        {/* 右侧小列 (占比4列)：控制机能盘、怪兽档案及帮助说明 */}
        <div id="side-dashboard-column" className="lg:col-span-4 flex flex-col gap-4">
          
          {/* A. 实时星河战损统计面板 */}
          <div className="bg-slate-900/60 backdrop-blur-md border-2 border-pink-500/25 shadow-[0_0_20px_rgba(244,114,182,0.1)] p-5 rounded-3xl flex flex-col gap-3 relative animate-glow-pink">
            <h3 className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-300 font-display tracking-wider uppercase flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pink-400" /> 银河特攻数据中心
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div className="bg-cyan-950/40 p-3 rounded-xl border border-cyan-500/25 shadow-[0_0_10px_rgba(6,182,212,0.05)]">
                <p className="text-[10px] text-cyan-300 uppercase leading-none font-bold tracking-widest">消灭怪兽</p>
                <p className="text-2xl font-mono font-black text-cyan-400 mt-1.5 font-display">{stats.enemiesKilled}</p>
                <span className="text-[9px] text-cyan-500/80 font-bold">累计击落量</span>
              </div>
              <div className="bg-rose-950/40 p-3 rounded-xl border border-rose-500/25 shadow-[0_0_10px_rgba(244,63,94,0.05)]">
                <p className="text-[10px] text-rose-300 uppercase leading-none font-bold tracking-widest">击退首领</p>
                <p className="text-2xl font-mono font-black text-rose-400 mt-1.5 font-display">{stats.bossesDefeated}</p>
                <span className="text-[9px] text-rose-500/80 font-bold">Boss级击破</span>
              </div>
              <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.05)]">
                <p className="text-[10px] text-emerald-300 uppercase leading-none font-bold tracking-widest">当前波次</p>
                <p className="text-2xl font-mono font-black text-emerald-400 mt-1.5 font-display">WAVE {stats.wave}</p>
                <span className="text-[9px] text-emerald-500/80 font-bold">防御阶段</span>
              </div>
              <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.05)]">
                <p className="text-[10px] text-amber-300 uppercase leading-none font-bold tracking-widest">获得光晶</p>
                <p className="text-2xl font-mono font-black text-amber-400 mt-1.5 font-display">💎 {stats.crystals}</p>
                <span className="text-[9px] text-amber-500/80 font-bold">可用于升级</span>
              </div>
            </div>
          </div>

          {/* B. Tab 标签切换面板 (怪兽档案 vs 光能指南) */}
          <div className="flex-1 bg-slate-900/60 backdrop-blur-md border-2 border-violet-500/20 shadow-md rounded-3xl flex flex-col overflow-hidden">
            <div className="flex border-b border-violet-950/50 bg-gray-950/40">
              <button
                onClick={() => {
                  setActiveTab('encyclopedia');
                  SoundEffects.playTransform();
                }}
                className={`flex-1 py-3 text-xs font-bold transition duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'encyclopedia'
                    ? 'text-yellow-300 bg-violet-950/40 border-b-2 border-yellow-400 font-display shadow-[inset_0_-5px_15px_rgba(234,179,8,0.1)]'
                    : 'text-violet-300/60 hover:text-violet-100 hover:bg-violet-900/10'
                }`}
              >
                <Compass className="w-3.5 h-3.5" /> 怪兽入侵档案书
              </button>
              <button
                onClick={() => {
                  setActiveTab('how-to-play');
                  SoundEffects.playTransform();
                }}
                className={`flex-1 py-3 text-xs font-bold transition duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'how-to-play'
                    ? 'text-yellow-300 bg-violet-950/40 border-b-2 border-yellow-400 font-display shadow-[inset_0_-5px_15px_rgba(234,179,8,0.1)]'
                    : 'text-violet-300/60 hover:text-violet-100 hover:bg-violet-900/10'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" /> 宇宙光能战术板
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto max-h-[350px]">
              
              {/* TAB 1: 怪物图鉴 */}
              {activeTab === 'encyclopedia' && (
                <div className="flex flex-col gap-3 animate-fade-in animate-duration-300">
                  <p className="text-[11px] text-violet-300/80 leading-normal mb-1 font-medium">
                    以下列出了银河防卫网捕获的最强入侵生命体，了解其特点后有助于奥特曼采取克制手段：
                  </p>
                  
                  {MONSTER_GUIDES.map((mg, i) => (
                    <div key={i} className={`p-3 rounded-2xl border transition duration-300 hover:scale-101 hover:shadow-lg flex gap-3 ${mg.bg} border-violet-500/20`}>
                      <div className="text-2xl pt-1 select-none">{mg.icon}</div>
                      <div>
                        <div className="flex justify-between items-center gap-2">
                          <h4 className="text-xs font-black text-gray-100 font-display tracking-wide">{mg.name}</h4>
                          <span className="text-[10px] text-pink-400 font-mono font-black">危: {mg.danger}</span>
                        </div>
                        <p className="text-[10.5px] text-slate-300 mt-1 leading-normal">{mg.desc}</p>
                        <div className="mt-1 flex items-center gap-2 text-[9px] text-violet-400 font-bold uppercase tracking-wider">
                          <span>生命强度: <b className="text-yellow-400">{mg.hp}</b></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: 光能形态运用方法 */}
              {activeTab === 'how-to-play' && (
                <div className="flex flex-col gap-2.5 animate-fade-in animate-duration-300 text-[11.5px] text-slate-300 leading-relaxed">
                  <h4 className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-xs font-display flex items-center gap-1.5 mb-1 uppercase tracking-wide">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> 切换复合、强力及神话形态：
                  </h4>
                  <ul className="list-disc list-inside flex flex-col gap-2 pl-1">
                    <li>
                      <strong className="text-cyan-400 font-bold">复合型 (Multi Type):</strong> 初始降临状态。火力分散成左右两道激光，兼具优异速度与攻速，对付普通杂兵。
                    </li>
                    <li>
                      <strong className="text-pink-400 font-bold">强力型 (Power Type):</strong> 攻击力翻倍。子弹为高饱和重力爆破光弹，击中后触发<b>小圆形范围溅射爆炸</b>，适合怪兽严重聚集的极端局。
                    </li>
                    <li>
                      <strong className="text-purple-400 font-bold">空中型 (Sky Type):</strong> 速度之王。射击速度加快一倍，同时普通射击变为<b>三向交叉风暴散射</b>，压制灵活型杂兵。
                    </li>
                    <li>
                      <strong className="text-yellow-400 font-bold underline decoration-dotted">闪耀型 (Glitter Type):</strong> 终极奥特。升级期间击碎MiniBoss或在大招商店购买解锁后可随时切换，普通光弹具有<b>自动全天候物理追踪敌人</b>的神威。
                    </li>
                  </ul>

                  <h4 className="font-extrabold text-cyan-400 text-xs font-display flex items-center gap-1.5 mt-4 mb-1 uppercase tracking-wide">
                    ⚡ 斯派修姆超等离子激光：
                  </h4>
                  <p className="pl-1 text-slate-300">
                    当胸下部副能量条达到 10% 以上时，长按键盘 <kbd className="font-mono text-[10px] bg-slate-950 text-white px-1.5 py-0.5 rounded border border-violet-500/30">L</kbd> 键
                    或者手控大招钮，奥特曼双手十字交叉，喷吐毁天灭地的纯白粒子洪流，瞬间融化轨道一切敌人。
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* C. 玩家设置 & 控制选项面板 */}
          <div className="bg-slate-900/70 backdrop-blur-md border border-red-500/20 shadow-lg p-4 rounded-2xl flex items-center justify-between gap-4 text-xs">
            <span className="text-slate-400 font-medium">等离子数据重组选项</span>
            <button
              onClick={handleResetHighscore}
              className="px-3 py-1.5 bg-red-950/30 hover:bg-red-700 hover:text-white border border-red-500/35 hover:border-red-400 text-red-200 rounded-lg shadow-[0_0_10px_rgba(239,68,68,0.15)] transition duration-300 active:scale-95 cursor-pointer shrink-0 font-bold"
            >
              清除防卫最高得分纪录
            </button>
          </div>

        </div>
      </main>

      {/* 极简底部声明 */}
      <footer id="ops-footer" className="max-w-7xl w-full mx-auto text-center mt-5 text-[10px] text-violet-400/60 border-t border-violet-950/50 pt-4 leading-relaxed font-mono">
        <p>奥特曼及相关的宇宙怪兽角色著作权归属于版权方 | 本系统是一部由 React 驱动的等离子模拟互动游戏</p>
        <p className="mt-0.5">等离子时空校准: 2026-06-02T11:37:00Z | 守护地球，誓死抵抗黑暗</p>
      </footer>

    </div>
  );
}
