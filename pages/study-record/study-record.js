// 学习记录页面
const request = require('../../utils/request.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    completedCourses: [], // 已完成的课程列表
    allCompletedCourses: [], // 保存完整的已完成课程列表，用于搜索
    loading: true, // 加载状态
    keyword: '', // 搜索关键词
    showEmpty: false, // 是否显示空状态
    showSearchEmpty: false // 搜索结果为空
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.fetchCompletedCourses();
  },

  /**
   * 获取已完成的课程列表
   */
  fetchCompletedCourses: function () {
    this.setData({ loading: true });
    
    request.get('/user/course_plan', {})
      .then(res => {
        if (res.code === 200) {
          const { courses, completed_courses } = res.data;
          
          // 筛选出已完成的课程详情
          const completedCoursesList = courses.filter(course => 
            completed_courses.includes(course.index)
          ).map(course => {
            // 为每个课程添加搜索关键字字段（合并标题、模块和日期）
            return {
              ...course,
              searchKey: `${course.title || ''} ${course.module || ''} ${course.date || ''}`
            };
          });
          
          // 按日期倒序排序（最近完成的在前面）
          completedCoursesList.sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateB - dateA;
          });
          
          this.setData({
            completedCourses: completedCoursesList,
            allCompletedCourses: completedCoursesList,
            loading: false,
            showEmpty: completedCoursesList.length === 0
          });
        } else {
          this.setData({
            loading: false,
            showEmpty: true
          });
          wx.showToast({
            title: res.message || '获取学习记录失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('获取学习记录失败:', err);
        this.setData({
          loading: false,
          showEmpty: true
        });
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      });
  },

  /**
   * 搜索课程
   */
  onSearch: function (e) {
    const keyword = e.detail.value.trim().toLowerCase();
    this.setData({ keyword });
    this.searchCourses(keyword);
  },

  /**
   * 清空搜索框
   */
  onClearSearch: function () {
    this.setData({
      keyword: '',
      completedCourses: this.data.allCompletedCourses,
      showSearchEmpty: false
    });
  },
  
  /**
   * 搜索确认按钮点击事件
   */
  onSearchConfirm: function (e) {
    const keyword = e.detail.value.trim().toLowerCase();
    this.searchCourses(keyword);
  },

  /**
   * 执行搜索逻辑
   */
  searchCourses: function (keyword) {
    if (!keyword) {
      this.setData({
        completedCourses: this.data.allCompletedCourses,
        showSearchEmpty: false
      });
      return;
    }
    
    // 在所有已完成课程中搜索
    const searchResults = this.data.allCompletedCourses.filter(course => {
      return course.searchKey.toLowerCase().includes(keyword);
    });
    
    this.setData({
      completedCourses: searchResults,
      showSearchEmpty: searchResults.length === 0
    });
  },

  /**
   * 查看课程详情
   */
  viewCourseDetail: function (e) {
    const courseIndex = e.currentTarget.dataset.index;
    // 找到对应的课程详情
    const course = this.data.completedCourses.find(item => item.index === courseIndex);
    
    if (course) {
      // 将课程对象序列化并传递给详情页
      wx.navigateTo({
        url: `/pages/course-detail/course-detail?course=${encodeURIComponent(JSON.stringify(course))}`
      });
    } else {
      wx.showToast({
        title: '未找到课程信息',
        icon: 'none'
      });
    }
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh: function () {
    this.fetchCompletedCourses();
    wx.stopPullDownRefresh();
  },

  /**
   * 分享页面
   */
  onShareAppMessage: function () {
    return {
      title: '我的学习记录',
      path: '/pages/study-record/study-record'
    };
  }
}) 