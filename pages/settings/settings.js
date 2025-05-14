// 设置页面
const app = getApp();
const request = require('../../utils/request.js');
const { enhancePage } = require('../../utils/pageMixin.js');

// 定义页面配置
const pageConfig = {
  /**
   * 页面的初始数据
   */
  data: {
    // 通知设置
    notificationSettings: {
      enablePush: true,
      enableSound: true, 
      enableVibrate: true
    },
    
    // 系统设置
    systemSettings: {
      clearCache: false,
      theme: 'default'  // 'default', 'dark', 'light'
    },
    
    // 当前主题索引
    currentThemeIndex: 0,
    
    // 当前缓存大小
    cacheSize: '0KB',
    
    // 主题列表
    themeOptions: [
      {name: '默认主题', value: 'default'},
      {name: '护眼模式', value: 'light'},
      {name: '夜间模式', value: 'dark'}
    ],
    
    // 版本信息
    version: '1.0.6',
    
    // 页面样式
    pageStyle: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadSettings();
    this.calculateCacheSize();
  },
  
  /**
   * 页面显示时应用当前主题
   */
  onShow: function() {
    const systemSettings = wx.getStorageSync('systemSettings');
    if (systemSettings) {
      const theme = JSON.parse(systemSettings).theme;
      this.applyTheme(theme);
    }
  },

  /**
   * 从本地存储加载设置
   */
  loadSettings: function() {
    // 加载通知设置
    const notificationSettings = wx.getStorageSync('notificationSettings');
    if (notificationSettings) {
      this.setData({
        notificationSettings: JSON.parse(notificationSettings)
      });
    }
    
    // 加载系统设置
    const systemSettings = wx.getStorageSync('systemSettings');
    if (systemSettings) {
      try {
        const parsed = JSON.parse(systemSettings);
        
        // 设置当前主题索引
        let themeIndex = 0;
        if (parsed.theme === 'light') {
          themeIndex = 1;
        } else if (parsed.theme === 'dark') {
          themeIndex = 2;
        }
        
        this.setData({
          systemSettings: parsed,
          currentThemeIndex: themeIndex
        });
        
        console.log('加载主题设置:', parsed.theme, '索引:', themeIndex);
        
        // 应用主题 (现在使用混入的方法)
        this.applyTheme(parsed.theme);
      } catch (e) {
        console.error('解析系统设置失败:', e);
      }
    } else {
      // 确保有默认主题
      this.setData({
        currentThemeIndex: 0,
        'systemSettings.theme': 'default'
      });
    }
    
    // 同步全局设置到应用实例
    if (app.globalData) {
      app.globalData.notificationSettings = this.data.notificationSettings;
      app.globalData.theme = this.data.systemSettings.theme;
    }
  },

  /**
   * 保存设置
   */
  saveSettings: function() {
    // 保存通知设置
    wx.setStorageSync('notificationSettings', JSON.stringify(this.data.notificationSettings));
    
    // 保存系统设置
    wx.setStorageSync('systemSettings', JSON.stringify(this.data.systemSettings));
    
    // 同步到应用全局数据
    if (app.globalData) {
      app.globalData.notificationSettings = this.data.notificationSettings;
      app.globalData.theme = this.data.systemSettings.theme;
    }
    
    wx.showToast({
      title: '设置已保存',
      icon: 'success'
    });
  },

  /**
   * 切换推送通知
   */
  togglePush: function(e) {
    this.setData({
      'notificationSettings.enablePush': e.detail.value
    });
    this.saveSettings();
    
    // 如果打开通知，请求通知权限
    if (e.detail.value) {
      this.requestNotificationPermission();
    }
  },

  /**
   * 切换声音提醒
   */
  toggleSound: function(e) {
    this.setData({
      'notificationSettings.enableSound': e.detail.value
    });
    this.saveSettings();
    
    // 测试声音提醒
    if (e.detail.value) {
      // 播放简短提示音
      const innerAudioContext = wx.createInnerAudioContext();
      innerAudioContext.src = '/static/audio/notification.mp3'; // 确保有这个音频文件
      innerAudioContext.play();
    }
  },

  /**
   * 切换震动提醒
   */
  toggleVibrate: function(e) {
    this.setData({
      'notificationSettings.enableVibrate': e.detail.value
    });
    this.saveSettings();
    
    // 测试震动提醒
    if (e.detail.value) {
      wx.vibrateShort({
        type: 'medium'
      });
    }
  },

  /**
   * 请求通知权限
   */
  requestNotificationPermission: function() {
    wx.requestSubscribeMessage({
      tmplIds: ['CgM_JO9sSSqbfgVxJk-BZ9Wp7XH14xxxxxxx'], // 需替换为项目实际的模板ID
      success: (res) => {
        console.log('订阅消息授权结果:', res);
      },
      fail: (err) => {
        console.error('订阅消息授权失败:', err);
        wx.showToast({
          title: '获取通知权限失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 更改主题
   */
  changeTheme: function(e) {
    const index = parseInt(e.detail.value);
    const theme = this.data.themeOptions[index].value;
    
    console.log('切换主题为:', theme, '索引:', index);
    
    this.setData({
      'systemSettings.theme': theme,
      currentThemeIndex: index
    });
    this.saveSettings();
    
    // 应用主题 (通过混入的方法)
    this.applyTheme(theme);
    
    // 提示主题已更改
    wx.showToast({
      title: '主题已更改',
      icon: 'success'
    });
    
    // 更新全局应用主题
    if (app.globalData) {
      app.globalData.theme = theme;
      app.globalData.themeChanged = true;
      
      // 调用app全局主题应用方法
      if (app.applyGlobalTheme && typeof app.applyGlobalTheme === 'function') {
        app.applyGlobalTheme(theme);
      }
    }
  },
  
  /**
   * 应用主题到所有已打开的页面
   */
  applyThemeToAllPages: function(theme) {
    // 获取当前页面栈
    const pages = getCurrentPages();
    
    // 对每个页面应用主题
    pages.forEach(page => {
      if (page && page.applyTheme && typeof page.applyTheme === 'function') {
        try {
          page.applyTheme(theme);
        } catch (error) {
          console.error('应用主题到页面失败:', error);
        }
      }
    });
    
    // 尝试更新tabBar样式
    this.updateTabBarStyle(theme);
  },
  
  /**
   * 更新tabBar样式
   */
  updateTabBarStyle: function(theme) {
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

  /**
   * 应用主题
   */
  applyTheme: function(theme) {
    let bgColor = '';
    let textColor = '';
    let navBgColor = '';
    let navTextColor = '';
    let cardBgColor = '';
    
    switch (theme) {
      case 'dark':
        // 深色模式
        bgColor = '#222222';
        textColor = '#ffffff';
        navBgColor = '#333333';
        navTextColor = '#ffffff';
        cardBgColor = '#333333';
        break;
      case 'light':
        // 护眼模式
        bgColor = '#f0f6e6';
        textColor = '#333333';
        navBgColor = '#e8f4d9';
        navTextColor = '#333333';
        cardBgColor = '#f8faf4';
        break;
      default:
        // 默认主题
        bgColor = '#f6f7fb';
        textColor = '#333333';
        navBgColor = '#ffffff';
        navTextColor = '#000000';
        cardBgColor = '#ffffff';
        break;
    }
    
    // 更新导航栏样式
    wx.setNavigationBarColor({
      frontColor: navTextColor,
      backgroundColor: navBgColor
    });
    
    // 更新页面样式
    const pageStyle = `
      --bg-color: ${bgColor};
      --text-color: ${textColor};
      --card-bg-color: ${cardBgColor};
    `;
    
    this.setData({
      pageStyle: pageStyle
    });
  },

  /**
   * 计算缓存大小
   */
  calculateCacheSize: function() {
    wx.getStorageInfo({
      success: (res) => {
        const sizeKB = res.currentSize;
        let sizeTxt = sizeKB + 'KB';
        
        if (sizeKB > 1024) {
          sizeTxt = (sizeKB / 1024).toFixed(2) + 'MB';
        }
        
        this.setData({
          cacheSize: sizeTxt
        });
      }
    });
  },

  /**
   * 清除缓存
   */
  clearCache: function() {
    wx.showModal({
      title: '确认清除缓存',
      content: '清除缓存将会删除所有已保存的本地数据，包括学习记录。确定要清除吗？',
      success: (res) => {
        if (res.confirm) {
          // 只清除特定的缓存，保留设置和登录信息
          const keysToKeep = [
            'notificationSettings', 
            'systemSettings',
            'savedUsername',
            'savedPassword',
            'rememberPassword'
          ];
          
          // 获取所有缓存键
          wx.getStorageInfo({
            success: (info) => {
              // 遍历删除非保留键
              info.keys.forEach(key => {
                if (!keysToKeep.includes(key)) {
                  wx.removeStorageSync(key);
                }
              });
              
              // 重新计算缓存大小
              this.calculateCacheSize();
              
              wx.showToast({
                title: '缓存已清除',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  /**
   * 关于我们
   */
  aboutUs: function() {
    wx.showModal({
      title: '关于我们',
      content: '花木君公考小程序\n\n版本: ' + this.data.version + 
               '\n\n本应用专为考公学员定制，提供系统化的学习规划和进度管理功能，帮助学员高效备考。\n\n联系邮箱: service@example.com\n微信公众号: 花木君公考',
      showCancel: false
    });
  }
};

// 使用页面混入增强页面配置
Page(enhancePage(pageConfig)); 