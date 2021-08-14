export interface AuthInfo {
  openid: string;
  appid: string;
  unionid: string;
}

export async function getAuthInfo(): Promise<AuthInfo> {
  const event = await wx.cloud.callFunction({
    name: 'login'
  })
  return event.result as AuthInfo
}
