const request = require('../../utils/request.js');
const infoChecker = require('../../utils/infoChecker.js');

Page({
  data: {
    stages: [],
    courses: [],
    currentStage: null,
    showAllStages: false,
    currentDate: '',
    selectedDate: '', // 日历选中的日期
    filteredCourses: [], // 日历选中日期的课程
    dailyProgressPercent: 0, // 今日学习进度百分比
    showColorLegend: false // 控制颜色说明的显示状态
  },

  onLoad: function() {
    // 获取当前日期
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const formattedDate = year + '-' + month + '-' + day;
    
    this.setData({
      currentDate: formattedDate,
      selectedDate: formattedDate // 初始化选中日期为当前日期
    });
    
    this.fetchStages();
    this.fetchCourses();
  },
  
  // 添加onShow函数，确保从详情页返回时刷新数据
  onShow: function() {
    // 检查用户是否已填写信息
    infoChecker.checkUserInfoFilled();
    
    // 从课程详情页返回时刷新课程数据
    console.log('学习页面显示，刷新课程数据');
    this.fetchCourses();
    // 刷新选中日期的课程列表
    this.filterCoursesByDate(this.data.selectedDate);
  },

  // 处理日期选择事件
  onDateSelect: function(e) {
    console.log('选择日期事件触发:', e.detail);
    const selectedDate = e.detail.date;
    this.setData({
      selectedDate: selectedDate
    });
    
    this.filterCoursesByDate(selectedDate);
  },
  
  // 根据日期过滤课程
  filterCoursesByDate: function(date) {
    console.log('过滤日期:', date);
    const filteredCourses = this.data.courses.filter(course => course.date === date);
    console.log('过滤后的课程:', filteredCourses);
    
    // 计算今日学习进度
    let dailyProgressPercent = 0;
    if (filteredCourses.length > 0) {
      const completedCount = filteredCourses.filter(course => course.is_completed).length;
      dailyProgressPercent = Math.round((completedCount / filteredCourses.length) * 100);
    }
    
    this.setData({
      filteredCourses: filteredCourses,
      dailyProgressPercent: dailyProgressPercent
    });
  },

  fetchStages: function() {
    request.get('/user/learning_plan', {})
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
    return year + '-' + month + '-' + day;
  },
  
  getWeekNumber: function(date) {
    // 简单计算当前是第几周（从1月1日开始）
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  },

  fetchCourses: function() {
    console.log('获取课程数据');
    request.get('/user/course_plan', {})
      .then((data) => {
        console.log('课程数据:', data);
        if (data.code === 200) {
          const allCourses = data.data.courses.map((course, index) => {
            // 使用Object.assign代替展开运算符
            return Object.assign({}, course, {
              is_completed: data.data.completed_courses.includes(course.index)
            });
          });
          
          this.setData({
            courses: allCourses
          });
          
          // 刷新选中日期的课程列表
          this.filterCoursesByDate(this.data.selectedDate);
        } else {
          console.error('获取课程数据失败:', data.message);
          wx.showToast({
            title: '获取课程信息失败',
            icon: 'none'
          });
        }
      })
      .catch((error) => {
        console.error('获取课程数据异常:', error);
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

  navigateToCourseDetail: function(e) {
    const courseId = e.currentTarget.dataset.id;
    // 根据ID查找完整的课程对象
    const course = this.data.courses.find(c => c.index == courseId);
    if (course) {
      // 将课程数据编码为URL参数
      const courseStr = encodeURIComponent(JSON.stringify(course));
      wx.navigateTo({
        url: '/pages/course-detail/course-detail?course=' + courseStr
      });
    } else {
      wx.showToast({
        title: '课程信息不存在',
        icon: 'none'
      });
    }
  },

  // 阻止事件冒泡
  preventBubble: function() {
    // 这个函数仅用于阻止事件冒泡，不需要实现任何逻辑
    return;
  },

  handleAction: function(e) {
    const index = e.currentTarget.dataset.index;
    const action = e.currentTarget.dataset.action;
    
    wx.showLoading({
      title: '更新中...',
      mask: true
    });
    
    if(action == '标记完成'){
      request.get('/user/mark_course_completed/'+index, {}).then((res) => {
        wx.hideLoading();
        if(res.status == 'success'){
          wx.showToast({
            title: res.message,
            icon: 'success'
          });
          
          // 更新完成状态并重新计算进度
          this.updateCourseStatus(index, true);
        } else {
          wx.showToast({
            title: res.message,
            icon: 'warning'
          });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('Error fetching data:', err);
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      });
    } else {
      request.get('/user/unmark_course_completed/'+index, {}).then((res) => {
        wx.hideLoading();
        if(res.status == 'success'){
          wx.showToast({
            title: res.message,
            icon: 'success'
          });
          
          // 更新完成状态并重新计算进度
          this.updateCourseStatus(index, false);
        } else {
          wx.showToast({
            title: res.message,
            icon: 'warning'
          });
        }
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('Error fetching data:', err);
        wx.showToast({
          title: '操作失败，请重试',
          icon: 'none'
      });
      });
    }
  },
  
  // 更新课程状态并重新计算进度
  updateCourseStatus: function(courseIndex, isCompleted) {
    // 更新全部课程列表中的状态
    const courses = this.data.courses.map(course => {
      if (course.index == courseIndex) {
        return Object.assign({}, course, { is_completed: isCompleted });
      }
      return course;
    });
    
    // 更新筛选后的课程列表中的状态
    const filteredCourses = this.data.filteredCourses.map(course => {
      if (course.index == courseIndex) {
        return Object.assign({}, course, { is_completed: isCompleted });
      }
      return course;
    });
    
    // 重新计算进度百分比
    let dailyProgressPercent = 0;
    if (filteredCourses.length > 0) {
      const completedCount = filteredCourses.filter(course => course.is_completed).length;
      dailyProgressPercent = Math.round((completedCount / filteredCourses.length) * 100);
    }
    
    // 更新状态
    this.setData({
      courses: courses,
      filteredCourses: filteredCourses,
      dailyProgressPercent: dailyProgressPercent
    });
  },

  // 切换颜色说明的显示状态
  toggleColorLegend: function() {
    this.setData({
      showColorLegend: !this.data.showColorLegend
    });
  }
}); 