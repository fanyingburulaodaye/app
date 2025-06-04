// 导入缓存管理工具
const cacheManager = require('../../utils/cacheManager');
const request = require('../../utils/request.js');

const app = getApp();

Page({
  data: {
    activeTab: 'wechat', // 默认选中微信登录页签
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
  
  // 切换登录方式标签
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
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
  
  // 账号密码登录
  login: function() {
    const { username, password, isUsernameValid, isPasswordValid, rememberPassword } = this.data;
    
    if (!isUsernameValid || !isPasswordValid) {
      wx.showToast({
        title: '用户名和密码不能为空',
        icon: 'none'
      });
      return;
    }

    // 显示加载中
    wx.showLoading({
      title: '登录中...',
    });

    // 清除所有本地存储的用户数据和缓存，使用缓存管理工具
    cacheManager.clearAllCache(false); // 不保留任何设置，因为我们要重新设置
    
    // 如果用户选择了记住密码，保存这个设置
    if (rememberPassword) {
      wx.setStorageSync('savedUsername', username);
      wx.setStorageSync('savedPassword', password);
      wx.setStorageSync('rememberPassword', true);
    }

    wx.request({
      url: `${app.globalData.baseUrl}/user/login`,
      method: 'POST',
      data: {
        username: username,
        password: password
      },
      success: (res) => {
        wx.hideLoading();
        
        if (res.data.code === 200 || res.data.success) {
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
        wx.hideLoading();
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        });
      }
    });
  },

  // 微信登录
  wxLogin: function() {
    // 显示加载中
    wx.showLoading({
      title: '登录中...',
    });
    
    // 调用小程序登录接口
    wx.login({
      success: (res) => {
        if (res.code) {
          // 获取到微信登录凭证code，发送到后端换取token
          wx.request({
            url: `${app.globalData.baseUrl}/api/wx/login`,
            method: 'POST',
            data: {
              code: res.code
            },
            success: (loginRes) => {
              wx.hideLoading();
              
              if (loginRes.data.code === 200) {
                // 登录成功，保存token
                wx.setStorageSync('token', loginRes.data.token);
                
                // 判断是否为新用户，需要获取更多信息
                if (loginRes.data.isNewUser) {
                  // 新用户，引导获取用户信息
                  this.getUserProfile();
                } else {
                  // 已有用户，检查是否需要完善学员信息
                  this.checkUserInfo();
                }
              } else {
                wx.showToast({
                  title: loginRes.data.message || '微信登录失败',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              wx.hideLoading();
              console.error('微信登录请求失败:', err);
              wx.showToast({
                title: '网络请求失败',
                icon: 'none'
              });
            }
          });
        } else {
          wx.hideLoading();
          console.error('获取微信登录code失败:', res);
          wx.showToast({
            title: '微信登录失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('wx.login调用失败:', err);
        wx.showToast({
          title: '微信登录失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 获取用户信息
  getUserProfile: function() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (profileRes) => {
        // 更新全局用户信息
        app.globalData.userInfo = profileRes.userInfo;
        
        // 将用户信息发送给后端
        wx.request({
          url: `${app.globalData.baseUrl}/api/wx/update-user-info`,
          method: 'POST',
          header: {
            'Authorization': wx.getStorageSync('token')
          },
          data: {
            userInfo: profileRes.userInfo
          },
          success: (updateRes) => {
            if (updateRes.data.code === 200) {
              // 检查是否需要填写学员档案
              if (updateRes.data.needFillInfo) {
                wx.redirectTo({
                  url: '/pages/student-info/student-info?force=true'
                });
              } else {
                // 不需要填写学员档案，直接进入首页
                wx.switchTab({
                  url: '/pages/information/information'
                });
              }
            } else {
              console.error('更新用户信息失败:', updateRes.data.message);
              // 仍然进行学员信息检查
              this.checkUserInfo();
            }
          },
          fail: (err) => {
            console.error('更新用户信息请求失败:', err);
            // 仍然进行学员信息检查
            this.checkUserInfo();
          }
        });
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        // 如果用户拒绝授权，仍然进行学员信息检查
        this.checkUserInfo();
      }
    });
  },

  // 检查用户是否已填写详细信息
  checkUserInfo: function() {
    request.get('/user/check-info-status', {}, { noAuth: false })
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