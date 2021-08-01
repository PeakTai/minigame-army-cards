// 微信的 toast 和 loading 会有冲突，使用这里封装后的方法可以避免冲突

let globalTosatId: number = 0;

export function showWarning(msg: any): void {
  const toastId = new Date().getTime();
  let message = msg;
  if (msg.message) {
    message = msg.message;
  }
  globalTosatId = toastId;
  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2000,
    mask: true,
    success: () => {
      if (toastId === globalTosatId) {
        globalTosatId = 0;
      }
    },
    fail: () => {
      if (toastId === globalTosatId) {
        globalTosatId = 0;
      }
    }
  });
}

export function showSuccess(msg: string): void {
  const toastId = new Date().getTime();
  globalTosatId = toastId;
  wx.showToast({
    title: msg,
    icon: 'success',
    duration: 1000,
    mask: true,
    success: () => {
      if (toastId === globalTosatId) {
        globalTosatId = 0;
      }
    },
    fail: () => {
      if (toastId === globalTosatId) {
        globalTosatId = 0;
      }
    }
  });
}

export function showLoading(title?: string): void {
  wx.showLoading({
    title: title || '加载中...',
    mask: true,
    fail: (res) => console.error(res)
  });
}

export function hideLoading(): void {
  if (globalTosatId) {
    return;
  }
  wx.hideLoading({
    fail: (res) => console.error(res)
  });
}
