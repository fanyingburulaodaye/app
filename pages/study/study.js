const { get } = require('../../utils/request.js');

Page({
  data: {
    stages: [],
    courses: [],
    stage_completed_count: 0,
    stage_courses_count: 0,
    stage_completion_percentage: 0,
    completed_courses: [],
    currentStage: null,
    showAllStages: false,
    showAllCourses: false,
    todayCourses: [],
    currentDate: ''
  },

  onLoad: function() {
    // 获取当前日期
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    this.setData({
      currentDate: formattedDate
    });
    
    this.fetchStages();
    this.fetchCourses();
  },

  fetchStages: function() {
    get('/user/learning_plan', {})
      .then((data) => {
        const stages = data.data;
        // 确定当前阶段
        const currentStage = this.determineCurrentStage(stages);
        
        this.setData({
          stages: stages,
          currentStage: currentStage
        });
      })
      .catch((error) => {
        console.error('Failed to fetch stages:', error);
        wx.showToast({
          title: '获取学习阶段信息失败',
          icon: 'none'
        });
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
    return `${year}-${month}-${day}`;
  },
  
  getWeekNumber: function(date) {
    // 简单计算当前是第几周（从1月1日开始）
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  },

  fetchCourses: function() {
    get('/user/course_plan', {})
      .then((data) => {
        console.log(data);
        const allCourses = data.data.courses.map((course, index) => ({
          ...course,
          is_completed: data.data.completed_courses.includes(course.index),
        }));
        
        // 筛选今日课程
        const todayCourses = allCourses.filter(course => course.date === this.data.currentDate);
        
        this.setData({
          courses: allCourses,
          todayCourses: todayCourses,
          stage_completed_count: data.data.stage_completed_count,
          stage_completion_percentage: data.data.stage_completion_percentage,
          stage_courses_count: data.data.stage_courses_count,
          completed_courses: data.data.completed_courses,
        });
      })
      .catch((error) => {
        console.error('Failed to fetch courses:', error);
        wx.showToast({
          title: '获取课程信息失败',
          icon: 'none'
        });
      });
  },

  toggleAllStages: function() {
    this.setData({
      showAllStages: !this.data.showAllStages
    });
  },
  
  toggleAllCourses: function() {
    this.setData({
      showAllCourses: !this.data.showAllCourses
    });
  },

  handleAction: function(e) {
    const index = e.currentTarget.dataset.index;
    const action = e.currentTarget.dataset.action;
    
    if(action == '标记完成'){
      get('/user/mark_course_completed/'+index, {}).then((res) => {
        if(res.status == 'success'){
          wx.showToast({
            title: res.message,
            icon: 'success'
          });
          this.fetchCourses();
        }else{
          wx.showToast({
            title: res.message,
            icon: 'warning'
          });
        }
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
      });
    }else{
      get('/user/unmark_course_completed/'+index, {}).then((res) => {
        if(res.status == 'success'){
          wx.showToast({
            title: res.message,
            icon: 'success'
          });
          this.fetchCourses();
        }else{
          wx.showToast({
            title: res.message,
            icon: 'warning'
          });
        }
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
      });
    }
  }
}); 