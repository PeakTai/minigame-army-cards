import Basis from "./core/basis";
import PagerManager from "./core/PagerManager";
import Pager from "./core/Pager";
import Index from "./pages/index";

Basis.init().then(() => {
  // 初始化成功后设置页面，切换到首页
  const pagerMap: Map<string, Pager> = new Map<string, Pager>()
  pagerMap.set('index', new Index())
  const pagerManager = PagerManager.init(pagerMap)
  pagerManager.switchToPager('index')
}).catch((error) => {
  const msg = error.msg ? error.msg : `${error}`
  wx.showToast({
    title: `游戏无法正常运行:${msg}`,
    icon: 'none'
  }).catch(() => {
  })
})
