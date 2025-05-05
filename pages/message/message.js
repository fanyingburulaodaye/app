const { get,post } = require('../../utils/request'); // 假设封装好的函数在 utils/request.js 文件中
Page({
  data: {
    messages: [],
    messageContent:''
  },
  onLoad: function() {
    this.loadMessages();
  },
  onShow: function() {
    // 页面显示时刷新消息
    this.loadMessages();
  },
   // 输入框变化事件
   onMessageInput: function(event) {
    this.setData({
      messageContent: event.detail.value
    });
  },
  loadMessages: function() {
    wx.showLoading({
      title: '加载中...',
    });
    
    get('/user/messages', {})
      .then((data) => {
        if (data && data.data) {
          const formattedMessages = data.data.map(item => {
            return {
              ...item,
              created_at: this.formatDateTime(item.created_at),
              // 添加is_admin属性来区分管理员和用户消息
              is_admin: item.role === 'admin'
            };
          });
          
          this.setData({
            messages: formattedMessages
          }, () => {
            // 滚动到最新消息
            setTimeout(() => {
              wx.createSelectorQuery()
                .select('.chat-container')
                .node()
                .exec((res) => {
                  const scrollView = res[0].node;
                  scrollView.scrollTo({
                    top: scrollView.scrollHeight,
                    behavior: 'smooth'
                  });
                });
            }, 300);
          });
        }
        wx.hideLoading();
      })
      .catch((error) => {
        console.error('获取消息失败:', error);
        wx.showToast({
          title: '获取消息失败',
          icon: 'none'
        });
        wx.hideLoading();
      });
  },
  sendMessage: function() {
    const messageInput = this.data.messageContent;
    if (messageInput.trim() === '') {
      wx.showToast({
        title: '消息不能为空',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '发送中...',
    });
    
    post('/user/send_message', {'message_content': messageInput})
      .then((data) => {
        wx.hideLoading();
        if(data.status == 'success'){
          // 清空输入框
          this.setData({
            messageContent: ''
          });
          
          // 不显示发送成功的toast，避免影响用户体验
          this.loadMessages();
        } else {
          wx.showToast({
            title: data.message || '发送失败',
            icon: 'none'
          });
        }
      })
      .catch((error) => {
        wx.hideLoading();
        console.error('发送消息失败:', error);
        wx.showToast({
          title: '发送消息失败',
          icon: 'none'
        });
      });
  },

  formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '';
    
    // 创建一个新的 Date 对象
    const date = new Date(dateTimeStr);
    
    // 获取今天的日期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 获取昨天的日期
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 如果是今天的消息，只显示时间
    if (date >= today) {
      return this.formatTime(date);
    } 
    // 如果是昨天的消息，显示"昨天 时间"
    else if (date >= yesterday) {
      return `昨天 ${this.formatTime(date)}`;
    } 
    // 如果是更早的消息，显示完整日期时间
    else {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day} ${this.formatTime(date)}`;
    }
  },
  
  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  
});