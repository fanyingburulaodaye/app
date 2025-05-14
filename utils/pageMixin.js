/**
 * 页面混入(mixin)
 * 提供通用的主题应用功能给所有页面
 */

const app = getApp();

// 页面混入对象
const pageMixin = {
  /**
   * 应用主题到当前页面
   * @param {string} theme 主题名称: 'default', 'light', 'dark'
   */
  applyTheme: function(theme) {
    // 确保theme是有效值
    if (!theme || (theme !== 'default' && theme !== 'light' && theme !== 'dark')) {
      console.log('主题值无效，使用默认主题:', theme);
      theme = 'default';
    }
    
    console.log('页面应用主题:', theme, this.route);
    
    // 获取全局主题样式
    let styles = {};
    
    if (app.globalData && app.globalData.themeStyles) {
      styles = app.globalData.themeStyles;
    } else {
      // 如果全局样式不可用，则使用默认样式
      switch (theme) {
        case 'dark':
          styles = {
            bgColor: '#222222',
            textColor: '#ffffff',
            cardBgColor: '#333333',
            navBgColor: '#333333',
            navTextColor: '#ffffff'
          };
          break;
        case 'light':
          styles = {
            bgColor: '#f0f6e6',
            textColor: '#333333',
            cardBgColor: '#f8faf4',
            navBgColor: '#e8f4d9',
            navTextColor: '#333333'
          };
          break;
        default:
          styles = {
            bgColor: '#f6f7fb',
            textColor: '#333333',
            cardBgColor: '#ffffff',
            navBgColor: '#ffffff',
            navTextColor: '#000000'
          };
          break;
      }
    }
    
    // 构建页面样式
    const pageStyle = `
      --bg-color: ${styles.bgColor};
      --text-color: ${styles.textColor};
      --card-bg-color: ${styles.cardBgColor};
    `;
    
    // 设置页面样式
    if (this.setData) {
      this.setData({
        pageStyle: pageStyle
      });
    }
    
    // 更新导航栏样式
    wx.setNavigationBarColor({
      frontColor: styles.navTextColor,
      backgroundColor: styles.navBgColor,
      animation: {
        duration: 300,
        timingFunc: 'easeIn'
      }
    }).catch(err => {
      console.error('设置导航栏颜色失败', err);
    });
  },
  
  /**
   * 检查并应用当前主题
   * 每次页面显示时调用
   */
  checkAndApplyTheme: function() {
    let theme = 'default';
    
    if (app.globalData && app.globalData.theme) {
      theme = app.globalData.theme;
    } else {
      // 如果全局主题不可用，从存储中获取
      const systemSettings = wx.getStorageSync('systemSettings');
      if (systemSettings) {
        try {
          const settings = JSON.parse(systemSettings);
          if (settings && settings.theme) {
            theme = settings.theme;
          }
        } catch (e) {
          console.error('解析系统设置失败:', e);
        }
      }
    }
    
    console.log('检查并应用主题:', theme);
    this.applyTheme(theme);
  }
};

// 创建页面增强器
const enhancePage = function(pageConfig) {
  // 合并原始onLoad
  const originalOnLoad = pageConfig.onLoad;
  pageConfig.onLoad = function(options) {
    // 添加pageStyle数据字段
    if (!this.data) {
      this.data = {};
    }
    if (!this.data.pageStyle) {
      this.setData({
        pageStyle: ''
      });
    }
    
    // 注入主题应用方法
    this.applyTheme = pageMixin.applyTheme;
    this.checkAndApplyTheme = pageMixin.checkAndApplyTheme;
    
    // 应用当前主题
    this.checkAndApplyTheme();
    
    // 调用原始onLoad
    if (originalOnLoad) {
      originalOnLoad.call(this, options);
    }
  };
  
  // 合并原始onShow
  const originalOnShow = pageConfig.onShow;
  pageConfig.onShow = function() {
    // 检查是否需要应用主题
    if (app.globalData && app.globalData.themeChanged) {
      this.checkAndApplyTheme();
      app.globalData.themeChanged = false;
    }
    
    // 调用原始onShow
    if (originalOnShow) {
      originalOnShow.call(this);
    }
  };
  
  return pageConfig;
};

module.exports = {
  pageMixin,
  enhancePage
}; 