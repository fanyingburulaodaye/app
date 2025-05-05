Page({
  data: {},
  navigateToInfo: function() {
    wx.navigateTo({
      url: '/pages/information/information'
    });
  },
  navigateToStage: function() {
    wx.navigateTo({
      url: '/pages/stage/stage'
    });
  },
  navigateToCourse: function() {
    wx.navigateTo({
      url: '/pages/course/course'
    });
  },
  navigateToMessage: function() {
    wx.navigateTo({
      url: '/pages/message/message'
    });
  },
  logout: function() {
    wx.removeStorageSync('token'); // 清除本地存储的token
    wx.showToast({
      title: '已退出登录',
      icon: 'success'
    });
    wx.reLaunch({
      url: '/pages/login/login' // 重新启动到登录页面
    });
  }
});