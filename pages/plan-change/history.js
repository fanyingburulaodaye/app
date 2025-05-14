// pages/plan-change/history.js
const request = require('../../utils/request.js');

Page({
  data: {
    historyList: []
  },
  
  onLoad() {
    this.loadPlanChangeHistory();
  },
  
  onPullDownRefresh() {
    this.loadPlanChangeHistory();
  },
  
  // 加载学习计划异动历史
  loadPlanChangeHistory() {
    wx.showLoading({
      title: '加载中...'
    });
    
    request.get('/user/plan_change_history', {})
      .then((res) => {
        wx.hideLoading();
        wx.stopPullDownRefresh();
        
        if (res.code === 200) {
          const historyList = res.data.map(item => {
            // 添加状态文本和状态类名
            let statusText = '待处理';
            let statusClass = 'pending';
            
            switch(item.status) {
              case 'pending':
                statusText = '待处理';
                statusClass = 'pending';
                break;
              case 'processing':
                statusText = '处理中';
                statusClass = 'processing';
                break;
              case 'approved':
                statusText = '已批准';
                statusClass = 'approved';
                break;
              case 'rejected':
                statusText = '已拒绝';
                statusClass = 'rejected';
                break;
            }
            
            return {
              ...item,
              statusText,
              statusClass
            };
          });
          
          this.setData({
            historyList
          });
        } else {
          wx.showToast({
            title: res.message || '获取历史记录失败',
            icon: 'none'
          });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        wx.stopPullDownRefresh();
        console.error('获取学习计划异动历史失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      });
  }
}); 