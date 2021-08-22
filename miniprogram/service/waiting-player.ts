/**
 * 选手.
 */
import UserInfo = WechatMinigame.UserInfo;
import ISnapshot = DB.ISnapshot;
import RealtimeListener = DB.RealtimeListener;

/**
 * 等待中的玩家.
 */
export interface WaitingPlayer {
  _id: string;
  _openid: string;
  userInfo: UserInfo;
  createAt: number;
}

export function getWaitingPlayerCollection(): DB.CollectionReference {
  const db = wx.cloud.database();
  return db.collection('waiting-player');
}

export async function createWaitingPlayer(userInfo: UserInfo): Promise<WaitingPlayer> {
  const result = await getWaitingPlayerCollection().add({
    data: {
      userInfo,
      createAt: new Date()
    }
  })
  const id = result._id as string
  const getResult = await getWaitingPlayerCollection().doc(id).get()
  return getResult.data as WaitingPlayer
}

export function watchCurrentPlayer(openId: string, callback: (snapshot: ISnapshot) => void, errHandler: (err: any) => void): RealtimeListener {
  return getWaitingPlayerCollection().where({_openid: openId})
    .watch({
      onChange: callback,
      onError: errHandler
    })
}

export async function findTop10Players(): Promise<WaitingPlayer[]> {
  const result = await getWaitingPlayerCollection()
    .where({})
    .orderBy('createAt', 'desc')
    .limit(10)
    .get()
  if (result.data && result.data.length) {
    return result.data as WaitingPlayer[]
  }
  return []
}

export async function findWaitingPlayerByOpenId(openId: string): Promise<WaitingPlayer | null> {
  const result = await getWaitingPlayerCollection()
    .where({_openid: openId})
    .get()
  if (result.data && result.data.length) {
    return result.data[0] as WaitingPlayer
  }
  return null
}

export async function deleteWaitingPlayer(id: string): Promise<void> {
  const result = await getWaitingPlayerCollection().doc(id).get()
  if (!result.data) {
    return
  }
  await getWaitingPlayerCollection().doc(id).remove()
}

export async function createRoundByWaitingPlayer(): Promise<string> {
  const event = await wx.cloud.callFunction({
    name: 'finish_auto_match',
  })
  const result = event.result as any;
  if (result.ok) {
    return result.roundId;
  }
  // 如果发生异常
  if (result.error) {
    throw result.error || '未知异常';
  }
  throw '参与游戏失败';
}
