const request = require('../../utils/request');

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
      const timeStr = hours + ':' + minutes;
      
      // 根据日期返回不同格式
      if (inputDateDay.getTime() === today.getTime()) {
        return '今天 ' + timeStr;
      } else if (inputDateDay.getTime() === yesterday.getTime()) {
        return '昨天 ' + timeStr;
      } else {
        const year = localDate.getFullYear();
        const month = (localDate.getMonth() + 1).toString().padStart(2, '0');
        const day = localDate.getDate().toString().padStart(2, '0');
        return year + '-' + month + '-' + day + ' ' + timeStr;
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
      
      return year + '年' + month + '月' + day + '日 ' + hours + ':' + minutes + ':' + seconds;
    } catch (e) {
      console.error('格式化完整时间出错:', e);
      return '';
    }
  }
};

Page({
  data: {
    messages: [],
    loading: true,
    lastReadIds: [], // 使用数组代替Set，避免小程序数据兼容性问题
    pollingInterval: null, // 添加轮询定时器变量
    lastRefreshTime: 0 // 添加最后刷新时间记录
  },
  
  onLoad: function() {
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: '通知中心'
    });
    
    // 从全局获取已读通知ID列表
    const app = getApp();
    if (app.globalData.lastReadIds && app.globalData.lastReadIds.length > 0) {
      this.setData({
        lastReadIds: app.globalData.lastReadIds
      });
    }
    
    this.loadMessages();
    
    // 启动轮询定时器，每30秒检查一次新通知
    this.startPolling();
  },
  
  onShow: function() {
    // 每次返回页面时都强制刷新数据，添加时间戳避免缓存
    const currentTime = Date.now();
    
    // 如果距离上次刷新超过3秒，强制刷新数据（避免频繁刷新）
    if (currentTime - this.data.lastRefreshTime > 3000) {
      this.setData({
        lastRefreshTime: currentTime
      });
      
      // 强制刷新数据，传入时间戳避免缓存
    this.loadMessages();
    }
    
    // 页面回到前台时，重新启动轮询
    this.startPolling();
    
    // 从全局更新本地的已读ID列表
    const app = getApp();
    if (app.globalData.lastReadIds && app.globalData.lastReadIds.length > 0) {
      // 使用传统方法合并两个数组并去重
      const currentIds = this.data.lastReadIds || [];
      const globalIds = app.globalData.lastReadIds || [];
      
      // 合并数组
      const mergedIds = currentIds.concat(globalIds);
      
      // 去重
      const uniqueIds = [];
      for (var i = 0; i < mergedIds.length; i++) {
        if (uniqueIds.indexOf(mergedIds[i]) === -1) {
          uniqueIds.push(mergedIds[i]);
        }
      }
      
      // 如果有新增ID，更新数据
      if (uniqueIds.length > currentIds.length) {
        this.setData({
          lastReadIds: uniqueIds
        });
      }
    }
  },
  
  onHide: function() {
    // 页面进入后台时，停止轮询，避免无用的网络请求
    this.stopPolling();
    
    // 保存已读ID列表到全局
    const app = getApp();
    if (this.data.lastReadIds && this.data.lastReadIds.length > 0) {
      app.globalData.lastReadIds = this.data.lastReadIds;
      
      // 同时保存到本地存储
      wx.setStorage({
        key: 'lastReadIds',
        data: this.data.lastReadIds
      });
    }
  },
  
  onUnload: function() {
    // 页面卸载时，确保停止轮询
    this.stopPolling();
    
    // 保存已读ID列表到全局和本地存储
    this.saveReadStatus();
  },
  
  // 保存已读状态
  saveReadStatus: function() {
    const app = getApp();
    if (this.data.lastReadIds && this.data.lastReadIds.length > 0) {
      app.globalData.lastReadIds = this.data.lastReadIds;
      
      // 同时保存到本地存储
      wx.setStorage({
        key: 'lastReadIds',
        data: this.data.lastReadIds
      });
    }
  },
  
  // 启动定时轮询
  startPolling: function() {
    // 先清除可能存在的定时器
    this.stopPolling();
    
    // 创建新的定时器，每30秒轮询一次
    var that = this;
    this.data.pollingInterval = setInterval(function() {
      console.log('轮询检查新通知...');
      that.checkNewNotifications();
    }, 30000); // 30秒间隔
  },
  
  // 停止定时轮询
  stopPolling: function() {
    if (this.data.pollingInterval) {
      clearInterval(this.data.pollingInterval);
      this.data.pollingInterval = null;
    }
  },
  
  // 检查新通知，静默更新
  checkNewNotifications: function() {
    // 不显示加载动画，静默获取数据
    // 添加时间戳参数避免缓存
    const timestamp = Date.now();
    var that = this;
    request.get('/user/messages', { _t: timestamp })
      .then(function(data) {
        if (data && data.data) {
          var newMessages = [];
          for (var i = 0; i < data.data.length; i++) {
            var item = data.data[i];
            // 保存原始日期时间
            var originalDate = item.created_at;
            
            // 检查是否在最近已读的消息ID集合中
            var isRead = item.is_read === 1;
            if (!isRead && that.data.lastReadIds && that.data.lastReadIds.indexOf(Number(item.id)) !== -1) {
              isRead = true;
            }
            
            // 创建新对象，避免使用展开操作符
            var messageObj = Object.assign({}, item, {
              created_at_raw: originalDate,
              created_at: formatTime.toFriendlyFormat(originalDate),
              is_admin: item.role === 'admin',
              is_read: isRead
          });
            
            newMessages.push(messageObj);
          }
          
          // 通知按时间排序，最新的在前面
          newMessages.sort(function(a, b) {
            return new Date(formatTime.toLocalTime(b.created_at_raw) || b.created_at) - 
                   new Date(formatTime.toLocalTime(a.created_at_raw) || a.created_at);
          });
          
          // 检查是否有新通知
          if (that.hasNewNotifications(newMessages)) {
            console.log('发现新通知，更新列表');
            that.setData({
              messages: newMessages
            });
            
            // 更新未读消息计数
            that.updateUnreadCount();
            
            // 轻提示用户有新通知
            wx.showToast({
              title: '收到新通知',
              icon: 'success',
              duration: 1500
            });
          }
        }
      })
      .catch(function(error) {
        console.error('检查新通知失败:', error);
        // 不向用户显示错误，静默失败
      });
  },
  
  // 检查是否有新通知
  hasNewNotifications: function(newMessages) {
    var oldMessages = this.data.messages;
    
    // 如果消息数量不同，肯定有变化
    if (newMessages.length !== oldMessages.length) {
      return true;
    }
    
    // 比较最新的几条消息ID是否相同
    var compareCount = Math.min(5, newMessages.length);
    for (var i = 0; i < compareCount; i++) {
      if (!oldMessages[i] || newMessages[i].id !== oldMessages[i].id) {
        return true;
      }
    }
    
    // 检查未读状态是否有变化
    for (var i = 0; i < newMessages.length; i++) {
      var newMsg = newMessages[i];
      
      // 查找对应的旧消息
      var oldMsg = null;
      for (var j = 0; j < oldMessages.length; j++) {
        if (oldMessages[j].id === newMsg.id) {
          oldMsg = oldMessages[j];
          break;
        }
      }
      
      if (!oldMsg || newMsg.is_read !== oldMsg.is_read) {
        return true;
      }
    }
    
    return false;
  },
  
  onPullDownRefresh: function() {
    // 下拉刷新时重新加载
    var that = this;
    this.loadMessages(function() {
      wx.stopPullDownRefresh();
    });
  },
  
  // 应用挂起的状态更新
  applyPendingStatusUpdates: function() {
    var messages = this.data.messages;
    var lastReadIds = this.data.lastReadIds;
    var updated = false;
    
    // 如果有等待更新的已读标记
    if (lastReadIds && lastReadIds.length > 0) {
      var updatedMessages = [];
      
      for (var i = 0; i < messages.length; i++) {
        var msg = messages[i];
        // 检查消息是否在最近已读的ID数组中
        var msgId = Number(msg.id);
        var isInReadIds = false;
        
        for (var j = 0; j < lastReadIds.length; j++) {
          if (lastReadIds[j] === msgId) {
            isInReadIds = true;
            break;
          }
        }
        
        if (isInReadIds && !msg.is_read) {
          updated = true;
          // 创建新对象，避免使用展开操作符
          var updatedMsg = Object.assign({}, msg, { is_read: true });
          updatedMessages.push(updatedMsg);
        } else {
          updatedMessages.push(msg);
        }
      }
      
      if (updated) {
        this.setData({
          messages: updatedMessages
        });
      }
    }
  },
  
  loadMessages: function(callback) {
    this.setData({ loading: true });
    
    wx.showLoading({
      title: '加载中...',
    });
    
    // 添加时间戳参数避免缓存
    const timestamp = Date.now();
    var that = this;
    request.get('/user/messages', { _t: timestamp })
      .then(function(data) {
        if (data && data.data) {
          var formattedMessages = [];
          
          for (var i = 0; i < data.data.length; i++) {
            var item = data.data[i];
            // 保存原始日期时间
            var originalDate = item.created_at;
            
            // 检查是否在最近已读的消息ID集合中
            var isRead = item.is_read === 1;
            if (!isRead && that.data.lastReadIds) {
              for (var j = 0; j < that.data.lastReadIds.length; j++) {
                if (that.data.lastReadIds[j] === Number(item.id)) {
              isRead = true;
                  break;
                }
              }
            }
            
            // 创建新对象，避免使用展开操作符
            var messageObj = Object.assign({}, item, {
              created_at_raw: originalDate,
              created_at: formatTime.toFriendlyFormat(originalDate),
              is_admin: item.role === 'admin', // 添加 is_admin 属性区分管理员和用户消息
              is_read: isRead   // 合并后端和本地状态
          });
            
            formattedMessages.push(messageObj);
          }
          
          // 通知按时间排序，最新的在前面
          formattedMessages.sort(function(a, b) {
            return new Date(formatTime.toLocalTime(b.created_at_raw) || b.created_at) - 
                   new Date(formatTime.toLocalTime(a.created_at_raw) || a.created_at);
          });
          
          that.setData({
            messages: formattedMessages,
            loading: false
          });
          
          // 更新未读消息计数
          that.updateUnreadCount();
        } else {
          that.setData({ 
            messages: [],
            loading: false
          });
        }
        
        wx.hideLoading();
        
        if (typeof callback === 'function') {
          callback();
        }
      })
      .catch(function(error) {
        console.error('获取通知失败:', error);
        wx.showToast({
          title: '获取通知失败',
          icon: 'none'
        });
        
        that.setData({ loading: false });
        wx.hideLoading();
        
        if (typeof callback === 'function') {
          callback();
        }
      });
  },
  
  // 查看通知详情
  viewNotificationDetail: function(e) {
    var id = e.currentTarget.dataset.id;
    var index = e.currentTarget.dataset.index;
    var notification = this.data.messages[index];
    
    // 浅拷贝通知对象，避免引用问题
    var notificationCopy = Object.assign({}, notification);
    
    // 如果通知未读，则标记为已读
    if (!notification.is_read) {
      this.markAsRead(id, index);
    }
    
    console.log('开始导航到通知详情页', id, index);
    
    // 确保通知内容存在
    if (!notification) {
      wx.showToast({
        title: '通知数据不存在',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到通知详情页，并传递通知数据
    var that = this;
    wx.navigateTo({
      url: '/pages/notification-detail/notification-detail?id=' + id + '&index=' + index,
      success: function(res) {
        // 通过eventChannel向被打开页面传送数据
        res.eventChannel.emit('acceptNotificationData', { notification: notificationCopy });
        console.log('页面导航成功');
      },
      fail: function(err) {
        console.error('导航到通知详情页失败:', err);
        // 尝试使用其他导航方法
        wx.showToast({
          title: '打开详情失败，请重试',
          icon: 'none'
        });
      }
      });
  },

  // 标记通知为已读
  markAsRead: function(id, index) {
    // 更新本地数据状态
    var messages = this.data.messages;
    messages[index].is_read = true;
    
    // 更新已读消息ID数组
    var lastReadIds = this.data.lastReadIds || [];
    var numId = Number(id);
    var idExists = false;
    
    // 检查ID是否已存在
    for (var i = 0; i < lastReadIds.length; i++) {
      if (lastReadIds[i] === numId) {
        idExists = true;
        break;
      }
    }
    
    // 如果ID不存在，添加到数组
    if (!idExists) {
      lastReadIds.push(numId);
    }
    
    this.setData({
      messages: messages,
      lastReadIds: lastReadIds
    });
    
    // 同步到全局状态
    var app = getApp();
    app.globalData.lastReadIds = lastReadIds;
    
    // 保存到本地存储
    wx.setStorage({
      key: 'lastReadIds',
      data: lastReadIds
    });
    
    // 更新未读消息计数
    this.updateUnreadCount();
    
    // 向后端发送更新请求 - 简化处理方式，不依赖后端响应
    var that = this;
    wx.request({
      url: getApp().globalData.baseUrl + '/user/update_message_status',
      method: 'POST',
      header: {
        'Authorization': wx.getStorageSync('token'),
        'content-type': 'application/json'
      },
      data: {
        message_id: id,
        is_read: 1
      },
      fail: function(err) {
        console.error('标记已读失败:', err);
      }
    });
  },
  
  // 更新未读消息计数
  updateUnreadCount: function() {
    // 计算未读消息数量
    var unreadCount = 0;
    var messages = this.data.messages;
    
    for (var i = 0; i < messages.length; i++) {
      if (!messages[i].is_read) {
        unreadCount++;
      }
    }
    
    this.setData({
      unreadCount: unreadCount
    });
    
    // 更新全局未读计数
    var app = getApp();
    app.globalData.unreadCount = unreadCount;
    
    // 更新小程序右上角的红点提示
    var that = this;
    if (unreadCount > 0) {
      wx.setTabBarBadge({
        index: 2, // 通知中心在tabBar中的索引，修正为2（对应app.json中的位置）
        text: unreadCount.toString()
      }).catch(function(err) {
        console.log('设置TabBarBadge失败', err);
      });
    } else {
      wx.removeTabBarBadge({
        index: 2  // 通知中心在tabBar中的索引，修正为2（对应app.json中的位置）
      }).catch(function(err) {
        console.log('移除TabBarBadge失败', err);
      });
    }
  },
  
  // 更新通知已读状态（供详情页调用）
  updateMessageReadStatus: function(messageId) {
    var messages = this.data.messages;
    var index = -1;
    
    // 手动查找索引
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].id == messageId) {
        index = i;
        break;
      }
    }
    
    if (index !== -1) {
      messages[index].is_read = true;
      
      // 记录这个ID已被标记为已读
      var lastReadIds = this.data.lastReadIds || [];
      var numId = Number(messageId);
      var idExists = false;
      
      // 检查ID是否已存在
      for (var i = 0; i < lastReadIds.length; i++) {
        if (lastReadIds[i] === numId) {
          idExists = true;
          break;
        }
      }
      
      // 如果ID不存在，添加到数组
      if (!idExists) {
        lastReadIds.push(numId);
      }
      
      this.setData({
        messages: messages,
        lastReadIds: lastReadIds
      });
      
      // 更新未读消息计数
      this.updateUnreadCount();
    }
  },
  
  // 更新通知状态（供详情页调用）
  updateMessageStatus: function(messageId, isRead) {
    var messages = this.data.messages;
    var index = -1;
    
    // 手动查找索引
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].id == messageId) {
        index = i;
        break;
      }
    }
    
    if (index !== -1 && messages[index].is_read !== isRead) {
      messages[index].is_read = isRead;
      
      // 记录这个ID已被标记为已读
      if (isRead) {
        var lastReadIds = this.data.lastReadIds || [];
        var numId = Number(messageId);
        var idExists = false;
        
        // 检查ID是否已存在
        for (var i = 0; i < lastReadIds.length; i++) {
          if (lastReadIds[i] === numId) {
            idExists = true;
            break;
          }
        }
        
        // 如果ID不存在，添加到数组
        if (!idExists) {
          lastReadIds.push(numId);
        }
        
        this.setData({ lastReadIds: lastReadIds });
      }
      
      this.setData({
        messages: messages
      });
      
      // 更新未读消息计数
      this.updateUnreadCount();
    }
  },
  
  // 日期时间格式化 - 使用新的全局时间处理工具
  formatDateTime: function(dateStr) {
    return formatTime.toFriendlyFormat(dateStr);
  }
});