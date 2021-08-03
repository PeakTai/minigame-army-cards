import Basis from "./core/basis";
import PagerManager from "./core/PagerManager";
import Index from "./pages/index";
import Pve from "./pages/pve/pve";

Basis.init().then(() => {
  // 初始化成功后设置页面，切换到首页
  const pagerManager = PagerManager.init([
    new Index(), new Pve()
  ])
  pagerManager.switchToPager('index')
}).catch((error) => {
  const msg = error.msg ? error.msg : `${error}`
  wx.showToast({
    title: `游戏无法正常运行:${msg}`,
    icon: 'none'
  }).catch(() => {
  })
})
