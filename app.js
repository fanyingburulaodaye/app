// app.js
App({
  onLaunch() {
    console.log('应用启动');
    
    // 确保默认主题为default
    this.globalData.theme = 'default';
    
    // 加载存储的设置
    this.loadSettings();
    
    // 监听系统主题变化
    wx.onThemeChange((res) => {
      console.log('系统主题变更为：', res.theme);
      // 如果用户设置为跟随系统主题，则自动调整
      if (this.globalData.followSystemTheme) {
        const theme = res.theme === 'dark' ? 'dark' : 'default';
        this.globalData.theme = theme;
        wx.setStorageSync('systemSettings', JSON.stringify({
          theme: theme,
          clearCache: false
        }));
        
        // 应用主题到全局
        this.applyGlobalTheme(theme);
      }
    });

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 尝试静默登录
    this.silentLogin();
    
    // 初始化通知相关数据
    this.initNotificationData();
    
    // 初始化应用全局主题
    console.log('初始化主题:', this.globalData.theme);
    this.applyGlobalTheme(this.globalData.theme);
  },
  
  // 静默登录
  silentLogin() {
    console.log('尝试静默登录');
    // 检查本地是否有token
    const token = wx.getStorageSync('token');
    if (token) {
      // 验证token是否有效
      this.checkTokenValid(token);
    } else {
      // 没有token，执行微信登录流程
      this.doWxLogin();
    }
  },

  // 验证token有效性
  checkTokenValid(token) {
    // 确保token有Bearer前缀
    const authToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    
    wx.request({
      url: `${this.globalData.baseUrl}/api/wx/verify-token`,
      method: 'POST',
      header: {
        'Authorization': authToken
      },
      success: (res) => {
        if (res.data.code === 200) {
          console.log('Token有效，已登录');
          // 更新用户信息
          this.globalData.userInfo = res.data.data;
        } else {
          console.log('Token无效，重新登录');
          // token无效，执行微信登录流程
          this.doWxLogin();
        }
      },
      fail: (err) => {
        console.error('验证token失败:', err);
        // 请求失败，尝试微信登录
        this.doWxLogin();
      }
    });
  },

  // 执行微信登录
  doWxLogin() {
    wx.login({
      success: res => {
        if (res.code) {
          console.log('获取微信登录code成功:', res.code);
          // 将code发送到后台换取openid和自定义登录态
          wx.request({
            url: `${this.globalData.baseUrl}/api/wx/login`,
            method: 'POST',
            data: {
              code: res.code
            },
            success: loginRes => {
              if (loginRes.data.code === 200) {
                console.log('微信登录成功');
                // 登录成功，保存token
                wx.setStorageSync('token', loginRes.data.token);
                
                // 判断是否为新用户，需要获取更多信息
                if (loginRes.data.isNewUser) {
                  console.log('新用户，引导获取用户信息');
                  // 新用户，引导获取用户信息
                  this.showUserProfileGuide();
                }
              } else {
                console.error('微信登录失败:', loginRes.data.message);
                wx.showToast({
                  title: loginRes.data.message || '登录失败',
                  icon: 'none'
                });
              }
            },
            fail: (err) => {
              console.error('微信登录请求失败:', err);
              wx.showToast({
                title: '网络请求失败',
                icon: 'none'
              });
            }
          });
        } else {
          console.error('获取微信登录code失败:', res);
        }
      },
      fail: (err) => {
        console.error('微信登录失败:', err);
      }
    });
  },

  // 显示用户信息授权引导
  showUserProfileGuide() {
    wx.showModal({
      title: '完善信息',
      content: '为了提供更好的服务，请授权获取您的微信信息',
      confirmText: '确定',
      cancelText: '稍后',
      success: modalRes => {
        if (modalRes.confirm) {
          // 获取用户信息
          this.getUserProfile();
        }
      }
    });
  },

  // 获取用户信息
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: profileRes => {
        console.log('获取用户信息成功:', profileRes.userInfo);
        // 更新全局用户信息
        this.globalData.userInfo = profileRes.userInfo;
        
        // 将用户信息发送给后端
        wx.request({
          url: `${this.globalData.baseUrl}/api/wx/update-user-info`,
          method: 'POST',
          header: {
            'Authorization': wx.getStorageSync('token')
          },
          data: {
            userInfo: profileRes.userInfo
          },
          success: updateRes => {
            if (updateRes.data.code === 200) {
              console.log('更新用户信息成功');
              
              // 判断是否需要填写学员档案
              if (updateRes.data.needFillInfo) {
                console.log('需要填写学员档案');
                wx.redirectTo({
                  url: '/pages/student-info/student-info?force=true'
                });
              }
            } else {
              console.error('更新用户信息失败:', updateRes.data.message);
            }
          },
          fail: (err) => {
            console.error('更新用户信息请求失败:', err);
          }
        });
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
      }
    });
  },
  
  // 加载用户设置
  loadSettings() {
    try {
      // 加载通知设置
      const notificationSettings = wx.getStorageSync('notificationSettings');
      if (notificationSettings) {
        this.globalData.notificationSettings = JSON.parse(notificationSettings);
      }
      
      // 加载系统设置
      const systemSettings = wx.getStorageSync('systemSettings');
      if (systemSettings) {
        try {
          const settings = JSON.parse(systemSettings);
          if (settings && settings.theme) {
            this.globalData.theme = settings.theme;
          }
          console.log('从缓存加载主题设置:', this.globalData.theme);
        } catch (e) {
          console.error('解析系统设置出错:', e);
        }
      }
    } catch (e) {
      console.error('加载设置出错:', e);
    }
  },
  
  // 应用全局主题
  applyGlobalTheme(theme) {
    // 确保theme是有效值
    if (!theme || (theme !== 'default' && theme !== 'light' && theme !== 'dark')) {
      console.log('主题值无效，使用默认主题:', theme);
      theme = 'default';
    }
    
    console.log('应用全局主题:', theme);
    
    // 更新导航栏样式
    let navBgColor = '';
    let navTextColor = '';
    let bgColor = '';
    let textColor = '';
    let cardBgColor = '';
    
    switch (theme) {
      case 'dark':
        navBgColor = '#333333';
        navTextColor = '#ffffff';
        bgColor = '#222222';
        textColor = '#ffffff';
        cardBgColor = '#333333';
        break;
      case 'light':
        navBgColor = '#e8f4d9';
        navTextColor = '#333333';
        bgColor = '#f0f6e6';
        textColor = '#333333';
        cardBgColor = '#f8faf4';
        break;
      default:
        navBgColor = '#ffffff';
        navTextColor = '#000000';
        bgColor = '#f6f7fb';
        textColor = '#333333';
        cardBgColor = '#ffffff';
        break;
    }
    
    // 设置导航栏样式
    wx.setNavigationBarColor({
      frontColor: navTextColor,
      backgroundColor: navBgColor,
      animation: {
        duration: 300,
        timingFunc: 'easeIn'
      }
    }).catch(err => {
      console.log('设置导航栏样式失败:', err);
    });
    
    // 更新TabBar样式
    this.updateTabBarStyle(theme);
    
    // 保存主题到全局
    this.globalData.theme = theme;
    this.globalData.themeStyles = {
      bgColor,
      textColor,
      cardBgColor,
      navBgColor,
      navTextColor
    };
    
    // 标记主题已更改
    this.globalData.themeChanged = true;
    
    // 应用主题到所有已打开的页面
    setTimeout(() => {
      this.applyThemeToAllPages(theme);
    }, 100);
  },
  
  // 应用主题到所有已打开的页面
  applyThemeToAllPages(theme) {
    // 获取当前页面栈
    const pages = getCurrentPages();
    console.log('应用主题到所有页面, 页面数:', pages.length);
    
    // 对每个页面应用主题
    pages.forEach(page => {
      if (page && page.applyTheme && typeof page.applyTheme === 'function') {
        try {
          page.applyTheme(theme);
        } catch (error) {
          console.error('应用主题到页面失败:', error, page.route);
        }
      }
    });
  },
  
  // 更新TabBar样式
  updateTabBarStyle(theme) {
    // 根据主题设置tabBar样式
    let backgroundColor = '#ffffff';
    let borderStyle = 'black';
    let color = '#7A7E83';
    let selectedColor = '#3cc51f';
    
    switch (theme) {
      case 'dark':
        backgroundColor = '#333333';
        borderStyle = 'white';
        color = '#8c8c8c';
        selectedColor = '#4C84FF';
        break;
      case 'light':
        backgroundColor = '#f0f6e6';
        borderStyle = 'black';
        color = '#7A7E83';
        selectedColor = '#3cc51f';
        break;
    }
    
    // 设置tabBar样式
    wx.setTabBarStyle({
      backgroundColor: backgroundColor,
      borderStyle: borderStyle,
      color: color,
      selectedColor: selectedColor
    }).catch(err => {
      console.log('更新tabBar样式失败，可能是在非tabBar页面', err);
    });
  },
  
  // 初始化通知相关数据
  initNotificationData() {
    // 从本地存储恢复已读通知ID列表
    const lastReadIds = wx.getStorageSync('lastReadIds') || [];
    this.globalData.lastReadIds = lastReadIds;
    
    // 检查是否有新消息的标志
    this.globalData.hasNewNotifications = false;
    
    // 初始化检查一次未读通知数量
    this.checkUnreadNotifications();
  },
  
  // 检查未读通知数量并更新小红点
  checkUnreadNotifications() {
    // 如果已登录
    if (wx.getStorageSync('token')) {
      wx.request({
        url: `${this.globalData.baseUrl}/user/messages`,
        method: 'GET',
        header: {
          'Authorization': wx.getStorageSync('token')
        },
        success: (res) => {
          if (res.data && res.data.data) {
            const messages = res.data.data;
            const lastReadIds = this.globalData.lastReadIds || [];
            
            // 计算未读消息数量
            const unreadCount = messages.filter(msg => {
              // 消息未读且不在已读ID列表中
              return msg.is_read === 0 && !lastReadIds.includes(Number(msg.id));
            }).length;
            
            // 更新全局状态
            this.globalData.unreadCount = unreadCount;
            
            // 如果有未读消息，设置小红点
            if (unreadCount > 0) {
              // 通知中心在tabBar中的索引
              wx.setTabBarBadge({
                index: 2, // 根据实际位置调整，这里假设通知中心是第3个tab
                text: unreadCount.toString()
              }).catch(err => console.log('设置TabBarBadge失败', err));
            }
          }
        }
      });
    }
  },
  
  globalData: {
    userInfo: null,
    baseUrl: 'http://ceshi1119.w1.luyouxia.net', // 后端API基础URL
    lastReadIds: [],  // 已读通知ID列表
    unreadCount: 0,   // 未读通知计数
    hasNewNotifications: false, // 是否有新通知的标志
    
    // 设置相关
    notificationSettings: {
      enablePush: true,
      enableSound: true,
      enableVibrate: true
    },
    theme: 'default', // 当前主题：default, light, dark
    themeChanged: false, // 标记主题是否改变
    followSystemTheme: false, // 是否跟随系统主题
    
    // 主题样式
    themeStyles: {
      bgColor: '#f6f7fb',
      textColor: '#333333',
      cardBgColor: '#ffffff',
      navBgColor: '#ffffff',
      navTextColor: '#000000'
    }
  }
})
