// pages/admin/student-info/detail.js
const request = require('../../../utils/request.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    studentId: null,
    studentInfo: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    if (options.id) {
      this.setData({
        studentId: options.id
      });
      this.fetchStudentInfo();
    } else {
      wx.showToast({
        title: '学员ID不能为空',
        icon: 'none'
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  /**
   * 获取学员详细信息
   */
  fetchStudentInfo: function() {
    wx.showLoading({
      title: '加载中...',
    });
    
    request.get(`/admin/student-info/${this.data.studentId}`, {})
      .then(res => {
        wx.hideLoading();
        if (res.code === 200 && res.data) {
          this.setData({
            studentInfo: res.data
          });
        } else {
          this.setData({
            studentInfo: null
          });
          
          wx.showToast({
            title: res.message || '获取学员信息失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('获取学员详细信息失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      });
  },

  /**
   * 返回列表页
   */
  navigateBack: function() {
    wx.navigateBack();
  }
}) 