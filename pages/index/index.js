// 引入缓存管理工具
const cacheManager = require('../../utils/cacheManager');

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
  // 导航到通知中心
  navigateToMessage: function() {
    wx.navigateTo({
      url: '/pages/message/message'
    });
  },
  logout: function() {
    // 使用统一的缓存管理工具进行登出操作
    cacheManager.logout();
  }
});