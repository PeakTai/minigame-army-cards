/**
 * 页面管理器.
 */
import Basis from "./basis";
import Pager from "./Pager";
import {showWarning} from "../utils/message";

export default class PagerManager {

  private static instance: PagerManager | null = null;

  private currentPager: Pager | null = null;
  private map: Map<string, Pager> = new Map<string, Pager>()

  public static init(pagers: Pager[]): PagerManager {
    this.instance = new PagerManager();
    for (let pager of pagers) {
      this.instance.map.set(pager.getId(), pager)
    }
    return this.instance;
  }

  public static getInstance(): PagerManager {
    if (!this.instance) {
      throw '尚未初始化'
    }
    return this.instance
  }

  private constructor() {
  }

  public switchToPager(id: string, query?: any): void {
    const targetPager = this.map.get(id)
    if (!targetPager) {
      showWarning(`找不到要切换的页面：${id}`)
      throw '找不到要切换的页面';
    }
    const basis = Basis.getInstance();
    if (this.currentPager) {
      // 带参数的一定要刷新
      if (this.currentPager.getId() === id && !query) {
        return
      }
      this.currentPager.preDestroy()
    }

    basis.clearScreen()
    this.currentPager = targetPager;
    this.currentPager.preInit(query)
    // // 以后可能做个切换特效
    // // todo 实现切换特效
    // Promise.resolve().then(async () => {
    //   const context = basis.getRenderContext();
    //   const area = basis.getAvailableArea()
    //   const width = basis.getAvailableArea().width
    //   for (let i = 0; i < 60; i++) {
    //     const x = width * i / 60
    //     context.fillStyle = 'white'
    //     context.fillRect(Math.floor(area.left + x), area.top, Math.ceil(width / 60), basis.getAvailableArea().height)
    //     await sleep(5)
    //   }
    //   basis.clearScreen()
    //   this.currentPager = targetPager;
    //   this.currentPager.preInit()
    // }).catch(showWarning)
  }
}
