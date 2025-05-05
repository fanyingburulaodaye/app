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

    wx.request({
      url: 'http://127.0.0.1:5001/user/login', // 替换为你的Flask服务器地址
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
          
          // 如果选择了记住密码，则保存账号密码
          if (rememberPassword) {
            wx.setStorageSync('savedUsername', username);
            wx.setStorageSync('savedPassword', password);
            wx.setStorageSync('rememberPassword', true);
          } else {
            // 如果没有选择记住密码，则清除之前可能保存的账号密码
            wx.removeStorageSync('savedUsername');
            wx.removeStorageSync('savedPassword');
            wx.removeStorageSync('rememberPassword');
          }
          
          // 根据用户类型跳转到相应页面
          wx.switchTab({
            url: '/pages/information/information',
          })
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
  }
});