import Pager from "../../core/Pager";
import {ButtonElement, Element, getRealBoundingOfElement, TextElement} from "../../core/element";
import {hideLoading, showLoading, showWarning} from "../../utils/message";
import PagerManager from "../../core/PagerManager";
import {createInvitation, findInvitationByCode, findInvitationByOpenId} from "../../service/invitation";
import {getAuthInfo} from "../../service/auth";
import UserInfo = WechatMinigame.UserInfo;
import {findRoundByPlayerOpenId, onInvitation} from "../../service/round";

/**
 * 在线对战匹配页面.
 */
export default class PvpMenu extends Pager {

  private pvpStatus: 'ready' | 'confirmUserInfo' = 'ready'
  private userInfoCallback: ((userInfo?: UserInfo) => void) | null = null

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
    // 两个菜单，自动匹配，邀请好友
    const autoTitle: TextElement = {
      type: "text",
      text: '自动匹配',
      fontSize: this.getWidth() * 0.08,
      left: this.getWidth() * 0.05,
      top: this.getWidth() * 0.3,
      lineHeight: this.getWidth() * 0.1,
      height: this.getWidth() * 0.1,
      width: this.getWidth() * 0.9,
      color: 'white',
      align: 'left',
      onclick: () => this.handleAutoMatch()
    }
    elements.push(autoTitle)
    const autoIntro: TextElement = {
      type: "text",
      text: "匹配其它正在进行自动匹配玩家，匹配到了就自动开始游戏。",
      fontSize: this.getWidth() * 0.05,
      left: this.getWidth() * 0.05,
      top: this.getWidth() * 0.4,
      lineHeight: this.getWidth() * 0.07,
      height: this.getWidth() * 0.3,
      width: this.getWidth() * 0.9,
      color: 'white',
      align: 'left',
      onclick: () => this.handleAutoMatch()
    }
    elements.push(autoIntro)
    const invertTitle: TextElement = {
      type: 'text',
      text: '邀请好友',
      fontSize: this.getWidth() * 0.08,
      left: this.getWidth() * 0.05,
      top: this.getWidth() * 0.7,
      lineHeight: this.getWidth() * 0.1,
      height: this.getWidth() * 0.1,
      width: this.getWidth() * 0.9,
      color: 'white',
      align: 'left',
      onclick: () => this.handleInvert()
    }
    elements.push(invertTitle)
    const invertIntro: TextElement = {
      type: "text",
      text: '创建一个邀请码（4-8位数字），好友进入游戏后点击下方的参与游戏，输入邀请码和自己一起开始游戏。',
      fontSize: this.getWidth() * 0.05,
      left: this.getWidth() * 0.05,
      top: this.getWidth() * 0.8,
      lineHeight: this.getWidth() * 0.07,
      height: this.getWidth() * 0.3,
      width: this.getWidth() * 0.9,
      color: 'white',
      align: 'left',
      onclick: () => this.handleInvert()
    }
    elements.push(invertIntro)
    const attendTitle: TextElement = {
      type: 'text',
      text: '参与游戏',
      fontSize: this.getWidth() * 0.08,
      left: this.getWidth() * 0.05,
      top: this.getWidth() * 1.1,
      lineHeight: this.getWidth() * 0.1,
      height: this.getWidth() * 0.1,
      width: this.getWidth() * 0.9,
      color: 'white',
      align: 'left',
      onclick: () => this.handleAttend()
    }
    elements.push(attendTitle)
    const attendIntro: TextElement = {
      type: "text",
      text: '应邀对战，输入好友给的邀请码，立即和好友开始一局游戏。',
      fontSize: this.getWidth() * 0.05,
      left: this.getWidth() * 0.05,
      top: this.getWidth() * 1.2,
      lineHeight: this.getWidth() * 0.07,
      height: this.getWidth() * 0.3,
      width: this.getWidth() * 0.9,
      color: 'white',
      align: 'left',
      onclick: () => this.handleAttend()
    }
    elements.push(attendIntro)

    const exitText: TextElement = {
      type: "text",
      text: '返回主菜单',
      fontSize: this.getWidth() * 0.08,
      left: this.getWidth() * 0.05,
      bottom: this.getWidth() * 0.1,
      lineHeight: this.getWidth() * 0.1,
      height: this.getWidth() * 0.1,
      width: this.getWidth() * 0.9,
      color: 'white',
      align: 'left',
      onclick: () => PagerManager.getInstance().switchToPager('index')
    }
    elements.push(exitText)
    // 用户信息确认
    if (this.pvpStatus === "confirmUserInfo") {
      // 一层蒙版，上面是提示信息和确认取消按钮
      const mask: Element = {
        backgroundColor: '#996699',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0
      }
      elements.push(mask)
      const promptText: TextElement = {
        type: "text",
        text: '程序需要读取您的昵称和头像信息才能完成后续的流程，点击确认继续完成操作。',
        fontSize: this.getWidth() * 0.05,
        left: this.getWidth() * 0.05,
        top: this.getWidth() * 0.3,
        lineHeight: this.getWidth() * 0.12,
        height: this.getWidth() * 0.4,
        width: this.getWidth() * 0.9,
        color: 'white',
        align: 'left',
      }
      elements.push(promptText)
      // 两个按钮，一个按钮必须是微信的
      // 微信的用户信息授权按钮
      // 使用系统中的库来确定最终位置
      const virtualElement: Element = {
        top: this.getWidth() * 0.7,
        right: this.getWidth() * 0.05,
        height: this.getWidth() * 0.1,
        width: this.getWidth() * 0.4,
      }
      const bounding = getRealBoundingOfElement(virtualElement)
      const ratio = wx.getSystemInfoSync().pixelRatio
      // 微信给的按钮还没有这么简单，需要再转换下比例，微信强制使用按钮真的恶心
      let userInfoButton = wx.createUserInfoButton({
        type: 'text',
        text: '确认',
        withCredentials: true,
        style: {
          left: bounding.left / ratio,
          top: bounding.top / ratio,
          width: bounding.width / ratio,
          height: bounding.height / ratio,
          lineHeight: (this.getWidth() * 0.1) / ratio,
          backgroundColor: '#339966',
          color: '#ffffff',
          textAlign: 'center',
          fontSize: (this.getWidth() * 0.05) / ratio,
          borderRadius: (bounding.height / ratio / 5),
          borderColor: '#339966',
          borderWidth: 1
        }
      })
      userInfoButton.onTap((res) => {
        console.log('userInfo', res)
        Promise.resolve().then(async () => {
          this.pvpStatus = 'ready'
          userInfoButton.destroy()
          await this.render()
          if (this.userInfoCallback) {
            this.userInfoCallback(res ? res.userInfo : undefined)
            this.userInfoCallback = null
          }
        }).catch(showWarning)
      })
      const cancelButton: ButtonElement = {
        type: "button",
        text: '算了',
        top: this.getWidth() * 0.7,
        left: this.getWidth() * 0.05,
        height: this.getWidth() * 0.1,
        width: this.getWidth() * 0.4,
        fontSize: this.getWidth() * 0.05,
        onclick: () => {
          this.pvpStatus = "ready"
          this.userInfoCallback = null
          userInfoButton.destroy()
          this.render().catch(showWarning)
        }
      }
      elements.push(cancelButton)
    }
    return elements;
  }

  /**
   * 处理自动匹配.
   * @private
   */
  private handleAutoMatch(): void {
    PagerManager.getInstance().switchToPager('pvpAutoMatching')
  }

  /**
   * 处理邀请人的操作.
   * @private
   */
  private handleInvert(): void {
    Promise.resolve().then(async () => {
      showLoading('处理中...')
      const auth = await getAuthInfo()
      let existInvitation = await findInvitationByOpenId(auth.openid)
      if (existInvitation) {
        PagerManager.getInstance().switchToPager('pvpInvitation', {invitationId: existInvitation._id})
        return
      }
      hideLoading()
      const result = await wx.showModal({
        title: '输入自定义邀请码：',
        editable: true,
        confirmText: '创建邀请',
        cancelText: '算了'
      })
      if (!result.confirm) {
        return
      }
      showLoading('处理中...')
      const code = result.content
      // 校验
      if (!/^[0-9]{4,8}$/.test(code)) {
        showWarning('邀请码必须是4到8位数字')
        return
      }
      existInvitation = await findInvitationByCode(code)
      if (existInvitation) {
        wx.vibrateLong().catch(showWarning)
        showWarning('邀请码已经存在，请换一个试试')
        return
      }
      // 读取用户信息，成功后再做后续的处理
      this.pvpStatus = 'confirmUserInfo'
      this.userInfoCallback = (userInfo) => this.goOnWithInvert(code, userInfo)
      await this.render()
    }).catch(showWarning)
      .finally(hideLoading)
  }

  /**
   * 继续邀请的操作，需要在完成用户信息获取之后.
   * @param code
   * @private
   */
  private goOnWithInvert(code: string, userInfo?: UserInfo) {
    if (!userInfo) {
      showWarning('获取不到信息，创建失败')
      return
    }
    Promise.resolve().then(async () => {
      const invitationId = await createInvitation(code, userInfo)
      PagerManager.getInstance().switchToPager('pvpInvitation', {invitationId})
    }).catch(showWarning)
      .finally(hideLoading)
  }

  private handleAttend(): void {
    Promise.resolve().then(async () => {
      this.pvpStatus = 'confirmUserInfo'
      this.userInfoCallback = this.goOnInvitation.bind(this)
      await this.render()
    }).catch(showWarning)
      .finally(hideLoading)
  }

  private goOnInvitation(userInfo?: UserInfo) {
    showLoading()
    Promise.resolve().then(async () => {
      if (!userInfo) {
        throw '获取信息失败'
      }
      const auth = await getAuthInfo()
      const existInvitation = await findInvitationByOpenId(auth.openid)
      if (existInvitation) {
        throw '您自己也创建了邀请，无法应邀，请先取消自己创建的邀请'
      }
      hideLoading()
      const result = await wx.showModal({
        title: '请输入邀请码：',
        editable: true,
        confirmText: '进入游戏',
        cancelText: '放弃'
      })
      if (!result.confirm) {
        return
      }
      const code = result.content
      if (!/^[0-9]{4,8}$/.test(code)) {
        showWarning('邀请码必须是4到8位数字')
        return
      }
      showLoading()
      const roundId = await onInvitation(userInfo, code)
      PagerManager.getInstance().switchToPager('pvpRound', {roundId})
    }).catch(showWarning)
      .finally(hideLoading)
  }


  protected destroy(): void {
  }

  getId(): string {
    return "pvpMenu";
  }

  protected init(): void {
    showLoading()
    Promise.resolve().then(async () => {
      const auth = await getAuthInfo()
      const round = await findRoundByPlayerOpenId(auth.openid)
      console.log(round)
      if (round && round.status === 'underway') {
        // 如果已经有游戏存在了，立即进入游戏
        PagerManager.getInstance().switchToPager('pvpRound', {roundId: round._id})
        return
      }
      await this.render()
    }).catch(showWarning)
      .finally(hideLoading)
  }
}
