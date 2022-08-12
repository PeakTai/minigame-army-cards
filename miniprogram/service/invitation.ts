/**
 * 邀请.在发出邀请链接后，好友可以点击链接开始一局游戏，然后邀请被删除.同时发起邀请的用户如果开始游戏，那么他发起的邀请也会被删除.
 * 由于小游戏链接分享再进入很难实现，所以只得采用邀请码的形式.
 */
import UserInfo = WechatMinigame.UserInfo;

export interface Invitation {
  _id: string;
  /**
   * 邀请发起人id.
   */
  _openid: string;
  /**
   * 用户信息.
   */
  userInfo: UserInfo;
  /**
   * 邀请码.
   */
  code: string;
  /**
   * 创建时间.
   */
  createAt: Date;
}

export function getInvitationCollection(): DB.CollectionReference {
  const db = wx.cloud.database();
  return db.collection('invitation');
}

export async function createInvitation(code: string, userInfo: UserInfo): Promise<string> {
  const result = await getInvitationCollection().add({
    data: {
      code,
      userInfo,
      createAt: new Date()
    }
  })
  return result._id as string
}

export async function deleteInvitationById(id: string): Promise<void> {
  await getInvitationCollection().doc(id).remove()
}

export async function findInvitationById(id: string): Promise<Invitation | null> {
  const result = await getInvitationCollection().where({_id: id}).get()
  if (!result.data || !result.data.length) {
    return null;
  }
  return result.data[0] as Invitation
}

export async function findInvitationByOpenId(openId: string): Promise<Invitation | null> {
  const result = await getInvitationCollection().where({_openid: openId}).get()
  if (!result.data || !result.data.length) {
    return null;
  }
  return result.data[0] as Invitation
}

export async function findInvitationByCode(code: string): Promise<Invitation | null> {
  const result = await getInvitationCollection().where({code}).get()
  if (!result.data || !result.data.length) {
    return null;
  }
  return result.data[0] as Invitation
}
