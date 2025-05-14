// pages/admin/student-info/list.js
const request = require('../../../utils/request.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    studentList: [], // 所有学员信息
    filteredList: [], // 筛选后的学员信息
    searchKeyword: '' // 搜索关键词
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.fetchStudentList();
  },

  /**
   * 获取所有学员信息
   */
  fetchStudentList: function() {
    wx.showLoading({
      title: '加载中...',
    });
    
    request.get('/admin/student-info', {})
      .then(res => {
        wx.hideLoading();
        if (res.code === 200 && res.data) {
          this.setData({
            studentList: res.data,
            filteredList: res.data
          });
        } else {
          this.setData({
            studentList: [],
            filteredList: []
          });
          
          wx.showToast({
            title: res.message || '获取学员信息失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('获取学员信息失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      });
  },

  /**
   * 搜索输入变化
   */
  onSearchInput: function(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  /**
   * 执行搜索
   */
  onSearch: function() {
    const keyword = this.data.searchKeyword.trim().toLowerCase();
    
    if (!keyword) {
      // 如果关键词为空，显示所有数据
      this.setData({
        filteredList: this.data.studentList
      });
      return;
    }
    
    // 筛选符合条件的数据
    const filtered = this.data.studentList.filter(item => {
      const name = (item.name || '').toLowerCase();
      const phone = (item.phone || '').toLowerCase();
      
      return name.includes(keyword) || phone.includes(keyword);
    });
    
    this.setData({
      filteredList: filtered
    });
  },

  /**
   * 查看学员详细信息
   */
  viewDetail: function(e) {
    const studentId = e.currentTarget.dataset.id;
    
    wx.navigateTo({
      url: `/pages/admin/student-info/detail?id=${studentId}`,
    });
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this.fetchStudentList();
    wx.stopPullDownRefresh();
  }
}) 