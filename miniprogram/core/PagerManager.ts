/**
 * 页面管理器.
 */
import Basis from "./basis";
import Pager from "./Pager";

export default class PagerManager {

  private static instance: PagerManager | null = null;

  private currentPager: Pager | null = null;
  private map: Map<string, Pager> = new Map<string, Pager>()

  public static init(pagerMap: Map<string, Pager>): PagerManager {
    this.instance = new PagerManager();
    const keys = pagerMap.keys()
    const keyIter = keys.next()
    if (!keyIter.done) {
      const key = keyIter.value
      const value = pagerMap.get(key)
      if (value) {
        this.instance.map.set(key, value)
      }
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

  public switchToPager(id: string): void {
    const targetPager = this.map.get(id)
    if (!targetPager) {
      throw '找不到要切换的页面';
    }
    const basis = Basis.getInstance();
    if (this.currentPager) {
      this.currentPager.destroy()
    }
    // 以后可能做个切换特效
    basis.clearScreen()
    this.currentPager = targetPager;
    this.currentPager.init()
  }
}