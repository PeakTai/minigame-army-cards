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

  public switchToPager(id: string): void {
    const targetPager = this.map.get(id)
    if (!targetPager) {
      showWarning(`找不到要切换的页面：${id}`)
      throw '找不到要切换的页面';
    }
    const basis = Basis.getInstance();
    if (this.currentPager) {
      if (this.currentPager.getId() === id) {
        return
      }
      this.currentPager.destroy()
    }
    // 以后可能做个切换特效
    basis.clearScreen()
    this.currentPager = targetPager;
    this.currentPager.init()
  }
}