import Basis from "./core/basis";
import PagerManager from "./core/PagerManager";
import Index from "./pages/index";
import About from "./pages/about";
import Pve from "./pages/pve";
import Setting from "./pages/setting";
import PvpMenu from "./pages/pvp/PvpMenu";
import PvpInvitation from "./pages/pvp/PvpInvitation";
import PvpRound from "./pages/pvp/PvpRound";
import PvpAutoMatching from "./pages/pvp/PvpAutoMatching";

Basis.init().then(() => {
  wx.cloud.init({
    traceUser: true,
  })
  if (!Promise.prototype.finally) {
    Promise.prototype.finally = function (callback: () => void) {
      let P = this.constructor as any;
      return this.then(
        value => {
          P.resolve(callback()).then(() => value)
        },
        reason => {
          P.resolve(callback()).then(() => {
            throw reason
          })
        }
      )
    }
  }
  // 初始化成功后设置页面，切换到首页
  const pagerManager = PagerManager.init([
    new Index(),
    new Pve(),
    new About(),
    new Setting(),
    new PvpMenu(),
    new PvpInvitation(),
    new PvpRound(),
    new PvpAutoMatching()
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
