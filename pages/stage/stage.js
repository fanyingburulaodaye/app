const request = require('../../utils/request.js');
Page({
  data: {
    stages: []
  },
  onLoad: function() {
    this.fetchStages();
  },
  fetchStages: function() {
    const token = wx.getStorageSync('token'); // 假设 token 存储在本地存储中
    request.get('/user/learning_plan', {}, token)
      .then((data) => {
        this.setData({
          stages: data.data
        });
      })
      .catch((error) => {
        console.error('Failed to fetch stages:', error);
        wx.showToast({
          title: '获取学习阶段信息失败',
          icon: 'none'
        });
      });
  }
});