import UserInfo = WechatMinigame.UserInfo;
import RealtimeListener = DB.RealtimeListener;
import ISnapshot = DB.ISnapshot;
import {Card} from "../card/card";
import {Record} from "./record";

export interface PlayerInfo extends UserInfo {
  openId: string,
  // 目前保持的手牌
  keepCards: Card[],
  // 打出去的牌，等待判定的牌
  playOutCard?: Card,
}

/**
 * 一局游戏，由程序自动创建.
 */
export interface Round {
  _id: string;
  // 创建者的id，如果是邀请创建的游戏，则值为邀请者的id，自动匹配的则有可能是任何一个人
  _openid: string;
  // 两名玩家
  playerInfos: PlayerInfo[];
  // 开始时间
  createAt: Date;
  records: Record[];
  // 状态
  status: 'underway' | 'finished',
  updateAt: Date;
}

export function getRoundCollection(): DB.CollectionReference {
  const db = wx.cloud.database();
  return db.collection('round');
}

export async function findRoundByPlayerOpenId(openId: string): Promise<Round | null> {
  const result = await getRoundCollection().where({
    'playerInfos.openId': openId
  }).get()
  if (result && result.data && result.data.length) {
    return result.data[0] as Round
  }
  return null
}

export async function onInvitation(userInfo: UserInfo, code: string): Promise<string> {
  const event = await wx.cloud.callFunction({
    name: 'on_invitation',
    data: {userInfo, code}
  })
  const result = event.result as any;
  if (result.ok) {
    return result.id;
  }
  // 如果发生异常
  if (result.error) {
    throw result.error;
  }
  throw '参与游戏失败';
}

export async function findRoundById(roundId: string): Promise<Round | null> {
  const result = await getRoundCollection().where({_id: roundId}).get()
  if (!result.data || !result.data.length) {
    return null;
  }
  return result.data[0] as Round
}

export function watchRoundStart(openId: string, callback: (snapshot: ISnapshot) => void, errHandler: (err: any) => void): RealtimeListener {
  return getRoundCollection().where({
    _openid: openId
  }).orderBy('createAt', 'desc')
    .limit(1).watch({
      onChange: callback,
      onError: errHandler
    })
}

export function watchRound(roundId: string, callback: (snapshot: ISnapshot) => void, errHandler: (err: any) => void): RealtimeListener {
  return getRoundCollection().doc(roundId).watch({onChange: callback, onError: errHandler})
}

export async function pushRecord(record: Record): Promise<void> {
  const event = await wx.cloud.callFunction({
    name: 'pvp_push_record',
    data: {record}
  })
  const result = event.result as any;
  if (result.ok) {
    return;
  }
  // 如果发生异常
  if (result.error) {
    throw result.error;
  }
  throw '连线失败';
}

