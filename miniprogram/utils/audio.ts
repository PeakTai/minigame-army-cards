import InnerAudioContext = WechatMinigame.InnerAudioContext;
import {sleep} from "./sleep";

let soundEffectContext: InnerAudioContext | null = null;

let audioContext: InnerAudioContext | null = null;
// 云存储文件映射，key是文件ID，value是临时文件地址
const cloudFileMap: Map<string, string> = new Map<string, string>();

export function playAudio(url: string): void {
  pauseAudio()
  audioContext = wx.createInnerAudioContext()
  audioContext.src = url // src 可以设置 http(s) 的路径，本地文件路径或者代码包文件路径
  audioContext.play()
}

export function pauseAudio(): void {
  if (audioContext) {
    audioContext.pause()
  }
}


export function playCloudAudio(fileID: string): Promise<void> {
  const tempPath = cloudFileMap.get(fileID);
  if (tempPath) {
    playAudio(tempPath)
    return Promise.resolve()
  }
  return wx.cloud.downloadFile({
    fileID: fileID
  }).then(res => {
    cloudFileMap.set(fileID, res.tempFilePath)
    playAudio(res.tempFilePath)
  })
}

export function playSoundEffect(url: string) {
  if (soundEffectContext) {
    soundEffectContext.pause()
  }
  soundEffectContext = wx.createInnerAudioContext()
  soundEffectContext.src = url;
  soundEffectContext.play()
}

export function playSuccessAudio(): void {
  playSoundEffect('audio/success.mp3')
}

export async function playCloudAudioAfterSuccessAudio(fileId: string): Promise<void> {
  playSoundEffect('audio/success.mp3')
  await sleep(300)
  return playCloudAudio(fileId)
}

export function playFailAudio(): void {
  playSoundEffect('audio/fail.mp3')
}



