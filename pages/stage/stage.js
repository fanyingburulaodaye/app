const request = require('../../utils/request.js');
const cacheManager = require('../../utils/cacheManager');

Page({
  data: {
    stages: [],
    currentStage: null,
    showAllStages: true
  },

  onLoad: function() {
    this.fetchStages();
  },
  
  onPullDownRefresh: function() {
    // 下拉刷新时，清除学习数据缓存并重新获取数据
    cacheManager.clearLearningDataCache();
    this.fetchStages(() => {
      wx.stopPullDownRefresh();
    });
  },
  
  onShow: function() {
    // 每次显示页面时都重新获取最新数据
    this.fetchStages();
  },

  fetchStages: function(callback) {
    // 为请求添加时间戳参数，强制不使用缓存
    const timestamp = new Date().getTime();
    request.get('/user/learning_plan?t=' + timestamp, {})
      .then((data) => {
        if (data && data.data) {
          const stages = data.data;
          // 确定当前阶段
          const currentStage = this.determineCurrentStage(stages);
          
          this.setData({
            stages: stages,
            currentStage: currentStage
          });
          
          console.log('学习阶段数据已更新', stages.length + '条数据');
        } else {
          console.error('学习阶段数据格式不正确', data);
          wx.showToast({
            title: '获取数据格式不正确',
            icon: 'none'
          });
        }
        
        if (typeof callback === 'function') {
          callback();
        }
      })
      .catch((error) => {
        console.error('获取学习阶段失败:', error);
        wx.showToast({
          title: '获取学习阶段失败',
          icon: 'none'
        });
        
        if (typeof callback === 'function') {
          callback();
        }
      });
  },

  determineCurrentStage: function(stages) {
    const today = new Date();
    const todayStr = this.formatDate(today);
    
    // 根据当前日期确定阶段
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      
      // 检查stage.time是否包含日期范围
      // 假设格式为"2025-04-21~2025-05-04"或类似格式
      const dateRangeMatch = stage.time.match(/(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})/);
      
      if (dateRangeMatch) {
        const startDate = dateRangeMatch[1];
        const endDate = dateRangeMatch[2];
        
        // 如果当前日期在范围内，返回当前阶段索引
        if (todayStr >= startDate && todayStr <= endDate) {
          return i;
        }
      }
      
      // 如果没有日期范围格式，尝试解析周数格式
      const weekMatch = stage.time.match(/第(\d+)-(\d+)周/);
      if (weekMatch) {
        const startWeek = parseInt(weekMatch[1]);
        const endWeek = parseInt(weekMatch[2]);
        const currentWeek = this.getWeekNumber(today);
        
        if (currentWeek >= startWeek && currentWeek <= endWeek) {
          return i;
        }
      }
    }
    
    // 如果无法确定当前阶段，默认返回第一个阶段
    return 0;
  },
  
  formatDate: function(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  },
  
  getWeekNumber: function(date) {
    // 简单计算当前是第几周（从1月1日开始）
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  },

  toggleAllStages: function() {
    this.setData({
      showAllStages: !this.data.showAllStages
    });
  }
});