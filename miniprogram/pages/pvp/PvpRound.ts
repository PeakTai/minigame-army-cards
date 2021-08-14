import Pager from "../../core/Pager";
import {Element, TextElement} from "../../core/element";
import {hideLoading, showLoading, showWarning} from "../../utils/message";
import {findRoundById, Round} from "../../service/round";
import PagerManager from "../../core/PagerManager";
import {getAuthInfo} from "../../service/auth";

/**
 * 局.
 */
export default class PvpRound extends Pager {

  private round: Round | null = null;

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
    const autoTitle: TextElement = {
      type: "text",
      text: '游戏进行中',
      fontSize: this.getWidth() * 0.08,
      left: this.getWidth() * 0.05,
      top: this.getWidth() * 0.3,
      lineHeight: this.getWidth() * 0.1,
      height: this.getWidth() * 0.1,
      width: this.getWidth() * 0.9,
      color: 'white',
      align: 'left',
    }
    elements.push(autoTitle)
    return elements;
  }

  protected destroy(): void {
  }

  getId(): string {
    return "pvpRound";
  }

  protected init(query?: any): void {
    const roundId = query ? query.roundId : undefined
    showLoading()
    Promise.resolve().then(async () => {
      const auth = await getAuthInfo()
      const round = await findRoundById(roundId)
      if (!round || round.players.map(p => p.openId).indexOf(auth.openid) === -1) {
        await wx.showModal({
          title: '信息失效',
          content: '无法查找到游戏信息',
          showCancel: false,
          confirmText: '返回菜单'
        })
        PagerManager.getInstance().switchToPager('index')
        return
      }
      // 现在正式开始
      this.round = round
      await this.render()
    }).catch(showWarning)
      .finally(hideLoading)
  }

}
