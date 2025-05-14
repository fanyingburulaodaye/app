// 导入缓存管理工具
const cacheManager = require('../../utils/cacheManager');
const request = require('../../utils/request.js');

Page({
  data: {
    username: '',
    password: '',
    isUsernameValid: true,
    isPasswordValid: true,
    rememberPassword: false
  },
  
  onLoad: function() {
    // 页面加载时检查是否有保存的账号密码
    const savedUsername = wx.getStorageSync('savedUsername');
    const savedPassword = wx.getStorageSync('savedPassword');
    const rememberPassword = wx.getStorageSync('rememberPassword');
    
    if (savedUsername && savedPassword && rememberPassword) {
      this.setData({
        username: savedUsername,
        password: savedPassword,
        rememberPassword: true
      });
    }
    
    // 清除可能存在的旧数据，但保留记住密码的设置
    cacheManager.clearLearningDataCache();
  },
  
  bindUsernameInput: function(e) {
    this.setData({
      username: e.detail.value,
      isUsernameValid: e.detail.value.trim() !== ''  // 确保用户名不为空
    });
  },
  
  bindPasswordInput: function(e) {
    this.setData({
      password: e.detail.value,
      isPasswordValid: e.detail.value.trim() !== ''  // 确保密码不为空
    });
  },
  
  switchRememberPassword: function(e) {
    this.setData({
      rememberPassword: e.detail.value
    });
  },
  
  login: function() {
    const { username, password, isUsernameValid, isPasswordValid, rememberPassword } = this.data;
    
    if (!isUsernameValid || !isPasswordValid) {
      wx.showToast({
        title: '用户名和密码不能为空',
        icon: 'none'
      });
      return;
    }

    // 清除所有本地存储的用户数据和缓存，使用缓存管理工具
    cacheManager.clearAllCache(false); // 不保留任何设置，因为我们要重新设置
    
    // 如果用户选择了记住密码，保存这个设置
    if (rememberPassword) {
      wx.setStorageSync('savedUsername', username);
      wx.setStorageSync('savedPassword', password);
      wx.setStorageSync('rememberPassword', true);
    }

    wx.request({
      url: 'http://ceshi1119.w1.luyouxia.net//user/login', // 替换为你的Flask服务器地址
      method: 'POST',
      data: {
        username: username,
        password: password
      },
      success: (res) => {
        if (res.data.success) {
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
          
          // 保存token
          wx.setStorageSync('token', res.data.token);
          
          // 检查用户是否已填写详细信息
          this.checkUserInfo();
        } else {
          wx.showToast({
            title: res.data.message || '用户名或密码错误',
            icon: 'none'
          });
        }
      },
      fail: () => {
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },

  // 检查用户是否已填写详细信息
  checkUserInfo: function() {
    request.get('/user/check-info-status', {})
      .then(res => {
        if (res.code === 200) {
          if (res.data.hasFilledInfo) {
            // 已填写信息，直接进入首页
            wx.switchTab({
              url: '/pages/information/information',
            });
          } else {
            // 未填写信息，强制跳转到信息填写页面
            wx.redirectTo({
              url: '/pages/student-info/student-info?force=true',
            });
          }
        } else {
          // 请求失败，默认进入首页
          wx.switchTab({
            url: '/pages/information/information',
          });
        }
      })
      .catch(err => {
        console.error('检查用户信息状态失败:', err);
        // 请求异常，默认进入首页
        wx.switchTab({
          url: '/pages/information/information',
        });
      });
  }
});