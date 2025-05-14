// 个人主页
const request = require('../../utils/request.js');
const cacheManager = require('../../utils/cacheManager');
const { enhancePage } = require('../../utils/pageMixin.js');

// 定义页面配置
const pageConfig = {
  data: {
    showQRCode: false,
    pageStyle: ''  // 添加pageStyle用于主题切换
  },

  onLoad: function() {
    // 页面加载
  },

  // 菜单项点击事件
  onMenuItemTap: function(e) {
    const itemType = e.currentTarget.dataset.type;
    
    switch(itemType) {
      case 'studyRecord':
        wx.navigateTo({
          url: '/pages/study-record/study-record',
        });
        break;
      case 'profile':
        // 跳转到学员信息表单页面进行编辑
        wx.navigateTo({
          url: '/pages/student-info/student-info?edit=true',
        });
        break;
      case 'planChangeHistory':
        wx.navigateTo({
          url: '/pages/plan-change/history',
        });
        break;
      case 'settings':
        wx.navigateTo({
          url: '/pages/settings/settings',
        });
        break;
      case 'focusTimer':
        wx.navigateTo({
          url: '/pages/focus-timer/focus-timer',
        });
        break;
      case 'contact':
        this.showContactQRCode();
        break;
      case 'logout':
        this.handleLogout();
        break;
      default:
        break;
    }
  },

  // 显示联系助教大黄的二维码
  showContactQRCode: function() {
    this.setData({
      showQRCode: true
    });
  },
  
  // 关闭二维码弹窗
  onQRCodeClose: function() {
    this.setData({
      showQRCode: false
    });
  },

  // 处理退出登录
  handleLogout: function() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          this.logout();
        }
      }
    });
  },
  
  // 退出登录
  logout: function() {
    // 清除登录态和token
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    
    // 返回登录页
    wx.reLaunch({
      url: '/pages/login/login',
    });
  }
};

// 使用页面混入增强页面配置
Page(enhancePage(pageConfig)); 