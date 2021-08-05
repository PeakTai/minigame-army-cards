import {showWarning} from "./message";

/**
 * 执行定时器
 * @param runnable 运行逻辑
 * @param condition 运行条件，每次运行前都会检查，条件不成文则退出
 * @param period 周期，单位毫秒
 */
export function execTimer(runnable: () => Promise<void>, condition: () => boolean, period: number) {
  runnable().catch((e) => {
    showWarning(e)
  })
  const timerId = setInterval(() => {
    if (!condition()) {
      clearInterval(timerId)
      return
    }
    runnable()
      .catch((e) => {
        showWarning(e)
        clearInterval(timerId)
      })
  }, period)
}