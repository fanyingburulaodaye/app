/**
 * 缓存管理工具类
 * 用于统一管理小程序的缓存清理逻辑
 */

// 清理所有缓存数据，保留特定设置
const clearAllCache = (preserveSettings = true) => {
  console.log('开始清理所有缓存和数据...');
  
  try {
    // 如果需要保留设置，先保存记住密码相关的设置
    let savedUsername = null;
    let savedPassword = null;
    let rememberPassword = false;
    
    if (preserveSettings) {
      savedUsername = wx.getStorageSync('savedUsername');
      savedPassword = wx.getStorageSync('savedPassword');
      rememberPassword = wx.getStorageSync('rememberPassword');
    }
    
    // 清除所有存储
    wx.clearStorageSync();
    console.log('已清除所有本地存储');
    
    // 如果需要保留设置且启用了记住密码，恢复相关设置
    if (preserveSettings && rememberPassword) {
      wx.setStorageSync('savedUsername', savedUsername);
      wx.setStorageSync('savedPassword', savedPassword);
      wx.setStorageSync('rememberPassword', rememberPassword);
    }
    
    // 重置全局数据
    const app = getApp();
    if (app && app.globalData) {
      app.globalData.userInfo = null;
      app.globalData.lastReadIds = [];
      app.globalData.unreadCount = 0;
      app.globalData.hasNewNotifications = false;
      console.log('已重置全局数据');
    }
    
    return true;
  } catch (e) {
    console.error('清除缓存失败:', e);
    return false;
  }
};

// 专门清理学习阶段和课程安排相关的缓存
const clearLearningDataCache = () => {
  console.log('开始清理学习数据缓存...');
  
  // 清除可能与学习阶段和课程相关的数据
  try {
    // 删除可能缓存的阶段和课程数据
    wx.removeStorageSync('stages');
    wx.removeStorageSync('courses');
    wx.removeStorageSync('coursePlan');
    wx.removeStorageSync('learningPlan');
    wx.removeStorageSync('completedCourses');
    
    // 删除其他可能的相关数据
    wx.removeStorageSync('stagesData');
    wx.removeStorageSync('coursesData');
    wx.removeStorageSync('currentStage');
    
    console.log('已清理学习数据缓存');
    return true;
  } catch (e) {
    console.error('清理学习数据缓存失败:', e);
    return false;
  }
};

// 退出登录并清理缓存的完整流程
const logout = (callback = null) => {
  // 先清理缓存
  clearAllCache(true);
  
  // 返回登录页面
  wx.showToast({
    title: '已退出登录',
    icon: 'success',
    duration: 2000
  });
  
  // 延迟跳转以确保缓存清理完成
  setTimeout(() => {
    wx.reLaunch({
      url: '/pages/login/login'
    });
    
    // 如果有回调函数，执行它
    if (typeof callback === 'function') {
      callback();
    }
  }, 500);
};

// 导出函数
module.exports = {
  clearAllCache,
  clearLearningDataCache,
  logout
}; 