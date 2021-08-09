import InnerAudioContext = WechatMinigame.InnerAudioContext;
const audioMap: Map<string, InnerAudioContext> = new Map();

// 云存储文件映射，key是文件ID，value是临时文件地址
const cloudFileMap: Map<string, string> = new Map<string, string>();

export function playAudio(url: string): InnerAudioContext {
  let audioContext = audioMap.get(url)
  if (audioContext) {
    audioContext.play()
    return audioContext
  }
  audioContext = wx.createInnerAudioContext()
  audioContext.src = url // src 可以设置 http(s) 的路径，本地文件路径或者代码包文件路径
  audioContext.play()
  return audioContext;
}

export function buildAudio(url: string): InnerAudioContext {
  const audio = wx.createInnerAudioContext()
  audio.src = url // src 可以设置 http(s) 的路径，本地文件路径或者代码包文件路径
  return audio;
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



