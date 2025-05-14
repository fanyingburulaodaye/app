// pages/notification-detail/notification-detail.js
const { get } = require('../../utils/request');

// 添加全局时间处理工具函数
const formatTime = {
  // 将任意时间格式统一转换为本地时间
  toLocalTime: function(dateInput) {
    if (!dateInput) return null;
    
    let timestamp;
    
    // 如果是Date对象，直接获取时间戳
    if (dateInput instanceof Date) {
      timestamp = dateInput.getTime();
    } 
    // 如果是字符串，需要解析
    else if (typeof dateInput === 'string') {
      // 处理各种可能的日期格式
      
      // 1. 尝试直接解析ISO格式
      let date = new Date(dateInput);
      
      // 2. 如果失败，尝试处理特殊格式
      if (isNaN(date.getTime())) {
        // 尝试替换'-'为'/'，这在某些平台上更可靠
        date = new Date(dateInput.replace(/-/g, '/'));
        
        // 如果还是失败，尝试提取数字并手动创建日期
        if (isNaN(date.getTime())) {
          const parts = dateInput.match(/(\d+)/g);
          if (parts && parts.length >= 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // 月份从0开始
            const day = parseInt(parts[2], 10);
            const hours = parts.length > 3 ? parseInt(parts[3], 10) : 0;
            const minutes = parts.length > 4 ? parseInt(parts[4], 10) : 0;
            const seconds = parts.length > 5 ? parseInt(parts[5], 10) : 0;
            
            date = new Date(year, month, day, hours, minutes, seconds);
          }
        }
      }
      
      // 检查是否是UTC时间（带Z后缀或+00:00）
      if (!isNaN(date.getTime())) {
        if (dateInput.endsWith('Z') || dateInput.includes('+00:00')) {
          // 是UTC时间，转换为本地时间（中国为UTC+8）
          timestamp = date.getTime() + 8 * 60 * 60 * 1000;
        } else {
          // 已经是本地时间
          timestamp = date.getTime();
        }
      } else {
        // 解析失败
        return null;
      }
    } 
    // 如果是数字（时间戳），直接使用
    else if (typeof dateInput === 'number') {
      timestamp = dateInput;
    } 
    else {
      return null;
    }
    
    // 返回新的Date对象
    return new Date(timestamp);
  },
  
  // 格式化为友好显示格式（今天、昨天或日期）
  toFriendlyFormat: function(dateInput) {
    const localDate = this.toLocalTime(dateInput);
    if (!localDate) return '';
    
    try {
      // 获取今天和昨天的日期
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // 获取输入日期的0点时间用于比较
      const inputDateDay = new Date(
        localDate.getFullYear(), 
        localDate.getMonth(), 
        localDate.getDate()
      );
      
      // 格式化时间部分
      const hours = localDate.getHours().toString().padStart(2, '0');
      const minutes = localDate.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;
      
      // 根据日期返回不同格式
      if (inputDateDay.getTime() === today.getTime()) {
        return `今天 ${timeStr}`;
      } else if (inputDateDay.getTime() === yesterday.getTime()) {
        return `昨天 ${timeStr}`;
      } else {
        const year = localDate.getFullYear();
        const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
        const day = localDate.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day} ${timeStr}`;
      }
    } catch (e) {
      console.error('格式化友好时间出错:', e);
      return '';
    }
  },
  
  // 格式化为完整日期时间
  toFullFormat: function(dateInput) {
    const localDate = this.toLocalTime(dateInput);
    if (!localDate) return '';
    
    try {
      const year = localDate.getFullYear();
      const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
      const day = localDate.getDate().toString().padStart(2, '0');
      const hours = localDate.getHours().toString().padStart(2, '0');
      const minutes = localDate.getMinutes().toString().padStart(2, '0');
      const seconds = localDate.getSeconds().toString().padStart(2, '0');
      
      return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      console.error('格式化完整时间出错:', e);
      return '';
    }
  }
};

Page({

  /**
   * 页面的初始数据
   */
  data: {
    notification: null,
    loading: true,
    notificationId: null,
    notificationIndex: null,
    statusChanged: false  // 标记状态是否被改变
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('通知详情页加载，参数:', options);
    
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: '通知详情'
    });

    // 获取通知 ID 和索引
    const { id, index } = options;
    
    // 保存ID和索引
    this.setData({
      notificationId: id,
      notificationIndex: index
    });
    
    if (!id) {
      wx.showToast({
        title: '通知ID不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 从页面传参获取通知详情
    const eventChannel = this.getOpenerEventChannel();
    console.log('获取eventChannel:', eventChannel ? '成功' : '失败');
    
    if (eventChannel) {
      eventChannel.on('acceptNotificationData', (data) => {
        console.log('接收到通知数据:', data);
        if (data && data.notification) {
          const notification = data.notification;
          
          try {
            // 使用新的时间格式化工具
            notification.created_at = formatTime.toFriendlyFormat(notification.created_at_raw || notification.created_at);
            notification.created_at_full = formatTime.toFullFormat(notification.created_at_raw || notification.created_at);
            
            // 更新状态
            this.setData({
              notification: notification,
              loading: false
            });
            
            // 如果通知未读，立即标记为已读
            if (!notification.is_read) {
              this.markAsRead(id);
            }
          } catch (err) {
            console.error('处理通知数据出错:', err);
            // 如果处理失败，尝试从服务器获取
            this.fetchNotificationDetail(id);
          }
        } else {
          // 如果没有获取到通知数据，尝试从服务器获取
          this.fetchNotificationDetail(id);
        }
      });
    } else {
      console.error('获取eventChannel失败');
      // 如果没有eventChannel，直接从服务器获取
      this.fetchNotificationDetail(id);
    }
  },

  // 从服务器获取通知详情
  fetchNotificationDetail: function(notificationId) {
    console.log('从服务器获取通知详情:', notificationId);
    
    wx.showLoading({
      title: '加载中...',
    });
    
    // 使用wx.request直接请求，避免可能的request模块问题
    wx.request({
      url: `${getApp().globalData.baseUrl}/user/message_detail`,
      method: 'GET',
      header: {
        'Authorization': wx.getStorageSync('token')
      },
      data: {
        message_id: notificationId
      },
      success: (res) => {
        console.log('获取通知详情成功:', res);
        const data = res.data;
        if (data && data.data) {
          const notification = data.data;
          
          try {
            // 使用新的时间格式化工具
            notification.created_at = formatTime.toFriendlyFormat(notification.created_at);
            notification.created_at_full = formatTime.toFullFormat(notification.created_at);
            notification.is_read = notification.is_read === 1;
            
            this.setData({
              notification: notification,
              loading: false
            });
            
            // 如果通知未读，标记为已读
            if (!notification.is_read) {
              this.markAsRead(notificationId);
            }
          } catch (err) {
            console.error('处理服务器通知数据出错:', err);
            this.setData({ loading: false });
          }
        } else {
          this.setData({ loading: false });
          wx.showToast({
            title: '获取通知失败',
            icon: 'none'
          });
        }
        
        wx.hideLoading();
      },
      fail: (err) => {
        console.error('获取通知详情请求失败:', err);
        this.setData({ loading: false });
        
        wx.hideLoading();
        wx.showToast({
          title: '获取通知失败',
          icon: 'none'
        });
      }
    });
  },

  // 标记通知为已读
  markAsRead: function(messageId) {
    console.log('标记通知已读:', messageId);
    
    // 更新本地状态
    if (this.data.notification && !this.data.notification.is_read) {
      let notification = this.data.notification;
      notification.is_read = true;
      
      this.setData({
        notification: notification,
        statusChanged: true  // 标记状态已改变
      });
    }
    
    // 向服务器发送更新请求
    wx.request({
      url: `${getApp().globalData.baseUrl}/user/update_message_status`,
      method: 'POST',
      header: {
        'Authorization': wx.getStorageSync('token'),
        'content-type': 'application/json'
      },
      data: {
        message_id: messageId,
        is_read: 1
      },
      success: (res) => {
        console.log('标记已读成功:', res);
      },
      fail: (err) => {
        console.error('标记已读失败:', err);
      }
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    // 保存状态变更到全局
    this.syncToGlobal();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 如果状态已更改，需要通知上一页
    if (this.data.statusChanged) {
      // 找到消息列表页
      const pages = getCurrentPages();
      // 上一页面
      const prevPage = pages[pages.length - 2];
      
      if (prevPage && prevPage.route.includes('message')) {
        // 如果上一页是消息列表页，调用其方法更新消息状态
        console.log('通知列表页更新消息状态');
        if (typeof prevPage.updateMessageReadStatus === 'function') {
          prevPage.updateMessageReadStatus(this.data.notificationId);
        }
      }
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  // 日期时间格式化（简短版）
  formatDateTime: function(dateStr) {
    return formatTime.toFriendlyFormat(dateStr);
  },

  // 日期时间格式化（完整版）
  formatFullDateTime: function(dateStr) {
    return formatTime.toFullFormat(dateStr);
  },

  // 同步状态到全局
  syncToGlobal() {
    try {
      const { notificationId, notification } = this.data;
      if (notificationId && notification && notification.is_read) {
        const app = getApp();
        let lastReadIds = app.globalData.lastReadIds || [];
        if (!lastReadIds.includes(Number(notificationId))) {
          lastReadIds.push(Number(notificationId));
          app.globalData.lastReadIds = lastReadIds;
          
          // 保存到本地存储
          wx.setStorage({
            key: 'lastReadIds',
            data: lastReadIds
          });
        }
      }
    } catch (err) {
      console.error('同步到全局状态失败:', err);
    }
  }
})