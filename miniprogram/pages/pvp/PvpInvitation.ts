import Pager from "../../core/Pager";
import {hideLoading, showLoading, showWarning} from "../../utils/message";
import PagerManager from "../../core/PagerManager";
import {ButtonElement, Element, ImageElement, TextElement} from "../../core/element";
import {deleteInvitationById, findInvitationById, Invitation} from "../../service/invitation";
import Image = WechatMinigame.Image;
import Basis from "../../core/basis";
import {findRoundByPlayerOpenId, watchRoundStart} from "../../service/round";
import {AuthInfo, getAuthInfo} from "../../service/auth";
import ISnapshot = DB.ISnapshot;

export default class PvpInvitation extends Pager {

  private invitation: Invitation | null = null;
  private avatar: Image | null = null;
  private watch: DB.RealtimeListener | null = null;
  private auth: AuthInfo | null = null;

  protected buildElements(): Element[] {
    const elements: Element[] = []
    const bg: Element = {
      backgroundColor: '#996699',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }
    elements.push(bg)
    if (this.invitation) {
      // 头像昵称显示
      if (this.avatar) {
        const avatar: ImageElement = {
          type: 'image',
          image: this.avatar,
          left: this.getWidth() * 0.05,
          top: this.getWidth() * 0.25,
          height: this.getWidth() * 0.08,
          width: this.getWidth() * 0.08,
        }
        elements.push(avatar)
      }
      const nickname: TextElement = {
        type: 'text',
        text: this.invitation.userInfo.nickName,
        left: this.getWidth() * 0.18,
        top: this.getWidth() * 0.25,
        height: this.getWidth() * 0.1,
        width: this.getWidth() * 0.72,
        fontSize: this.getWidth() * 0.05,
        lineHeight: this.getWidth() * 0.1,
        align: 'left',
        color: 'white'
      }
      elements.push(nickname)

      const title: TextElement = {
        type: "text",
        text: `邀请码：${this.invitation.code}`,
        fontSize: this.getWidth() * 0.08,
        left: this.getWidth() * 0.05,
        top: this.getWidth() * 0.4,
        lineHeight: this.getWidth() * 0.1,
        height: this.getWidth() * 0.1,
        width: this.getWidth() * 0.9,
        color: 'white',
        align: 'left',
      }
      elements.push(title)
      const intro: TextElement = {
        type: "text",
        text: "邀请码已经创建成功，正在等待好友的加入...",
        fontSize: this.getWidth() * 0.05,
        left: this.getWidth() * 0.05,
        top: this.getWidth() * 0.6,
        lineHeight: this.getWidth() * 0.07,
        height: this.getWidth() * 0.2,
        width: this.getWidth() * 0.9,
        color: 'white',
        align: 'left',
      }
      elements.push(intro)
      const intro2: TextElement = {
        type: "text",
        text: "操作提示：打开游戏选择在线对战，进入菜单后选择参与游戏，" +
          "输入上方显示的邀请码即可开始游戏。",
        fontSize: this.getWidth() * 0.05,
        left: this.getWidth() * 0.05,
        top: this.getWidth() * 0.8,
        lineHeight: this.getWidth() * 0.07,
        height: this.getWidth() * 0.3,
        width: this.getWidth() * 0.9,
        color: 'white',
        align: 'left',
      }
      elements.push(intro2)

      // 操作按钮，回到首页和取消邀请
      const backButton: ButtonElement = {
        type: "button",
        text: '回到菜单',
        top: this.getWidth() * 1.1,
        right: this.getWidth() * 0.05,
        height: this.getWidth() * 0.1,
        width: this.getWidth() * 0.4,
        fontSize: this.getWidth() * 0.05,
        onclick: () => this.backToIndex()
      }
      elements.push(backButton)
      const cancelButton: ButtonElement = {
        type: 'button',
        text: '取消邀请',
        top: this.getWidth() * 1.1,
        left: this.getWidth() * 0.05,
        height: this.getWidth() * 0.1,
        width: this.getWidth() * 0.4,
        fontSize: this.getWidth() * 0.05,
        onclick: () => this.cancelInvert()
      }
      elements.push(cancelButton)
    }
    return elements;
  }

  protected destroy(): void {
    if (this.watch) {
      this.watch.close().catch(showWarning)
    }
  }

  getId(): string {
    return "pvpInvitation";
  }

  private backToIndex() {
    Promise.resolve().then(async () => {
      const result = await wx.showModal({
        title: '回到首页',
        content: '回到首页后，邀请不会丢失，还可以重新进入，是否要回到首页？',
      })
      if (!result.confirm) {
        return
      }
      PagerManager.getInstance().switchToPager('index')
    }).catch(showWarning)
  }

  private cancelInvert(): void {
    Promise.resolve().then(async () => {
      if (!this.invitation) {
        return
      }
      const result = await wx.showModal({
        title: '取消邀请',
        content: '取消邀请将会删除邀请相关的内容，是否继续？',
      })
      if (!result.confirm) {
        return
      }
      await deleteInvitationById(this.invitation._id)
      PagerManager.getInstance().switchToPager('index')
    }).catch(showWarning)
      .finally(hideLoading)
  }

  protected init(query?: any): void {
    const invitationId = query ? query.invitationId : ''
    if (!invitationId) {
      Promise.resolve().then(async () => {
        await wx.showModal({
          title: '参数错误',
          content: '邀请码信息缺失，将退回到菜单',
          showCancel: false,
          confirmText: '返回菜单'
        })
        PagerManager.getInstance().switchToPager('pvpMenu')
      }).catch(showWarning)
    }
    showLoading()
    Promise.resolve().then(async () => {
      const invitation = await findInvitationById(invitationId)
      if (!invitation) {
        await wx.showModal({
          title: '信息失效',
          content: '邀请信息已经失效',
          showCancel: false,
          confirmText: '返回菜单'
        })
        PagerManager.getInstance().switchToPager('pvpMenu')
        return
      }
      this.auth = await getAuthInfo()
      this.invitation = invitation;
      if (this.invitation.userInfo.avatarUrl) {
        this.avatar = await Basis.getInstance().loadImage(this.invitation.userInfo.avatarUrl)
      }
      this.watch = watchRoundStart(this.auth.openid,
        this.handleRoundChange.bind(this),
        this.handleWatchError.bind(this))
      await this.render()
    }).catch(showWarning)
      .finally(hideLoading)
  }

  private handleRoundChange(snapshot: ISnapshot) {
    if (snapshot.type === 'init') {
      return
    }
    console.log(snapshot);
    Promise.resolve().then(async () => {
      if (!this.auth || !this.invitation) {
        return
      }
      const round = await findRoundByPlayerOpenId(this.auth.openid)
      if (round) {
        PagerManager.getInstance().switchToPager('pvpRound', {roundId: round._id})
      }
    })
  }

  private handleWatchError(err: any) {
    Promise.resolve().then(async () => {
      console.error(err)
      await wx.showModal({
        title: '异常中断',
        content: '失去连接，程序已经掉线，请返回菜单后重新进入',
        showCancel: false,
        confirmText: '返回菜单'
      })
      PagerManager.getInstance().switchToPager('pvpMenu')
    }).catch(showWarning)
  }
}
