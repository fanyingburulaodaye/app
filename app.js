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

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
    
    // 初始化通知相关数据
    this.initNotificationData();
    
    // 初始化应用全局主题
    console.log('初始化主题:', this.globalData.theme);
    this.applyGlobalTheme(this.globalData.theme);
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
    baseUrl: 'http://192.168.1.119:5001', // 后端API基础URL
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
