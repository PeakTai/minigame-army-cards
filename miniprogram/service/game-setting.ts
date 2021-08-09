/**
 * 游戏设置.
 */
export interface GameSetting {
  bgmEnabled: boolean;
  soundEffectEnabled: boolean;
}

const key = 'army-cards-game-setting';

export function getGameSetting(): GameSetting {
  const data = wx.getStorageSync(key)
  if (!data) {
    return {bgmEnabled: true, soundEffectEnabled: true}
  }
  try {
    return JSON.parse(data)
  } catch (e) {
    console.error(e)
    return {bgmEnabled: true, soundEffectEnabled: true}
  }
}

export function setGameSetting(setting: GameSetting): void {
  wx.setStorageSync(key, JSON.stringify(setting))
}

