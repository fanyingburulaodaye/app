const { get } = require('../../utils/request'); // 假设封装好的函数在 utils/request.js 文件中

Page({
  data: {
    courses: [],
    stage_completed_count: 0,
    stage_completion_percentage: 0,
    stage_courses_count: 0,
    completed_courses: [],
    selectedDate: '',
    filteredCourses: []
  },
  onLoad: function() {
    console.log('课程页面加载');
    // 获取当前日期并设为选中日期
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day}`;
    
    this.setData({
      selectedDate: currentDate
    });
    console.log('当前选中日期:', currentDate);
    
    this.fetchCourses();
  },
  
  fetchCourses: function() {
    get('/user/course_plan', {})
      .then((data) => {
        console.log('获取到课程数据:', data);
        const courses = data.data.courses.map((course, index) => ({
          ...course,
          is_completed: data.data.completed_courses.includes(course.index),
        }));
        
        console.log('处理后的课程数据:', courses);
        
        this.setData({
          courses: courses,
          stage_completed_count: data.data.stage_completed_count,
          stage_completion_percentage: data.data.stage_completion_percentage,
          stage_courses_count: data.data.stage_courses_count,
          completed_courses: data.data.completed_courses
        });
        
        // 初始化选中日期的课程
        this.filterCoursesByDate(this.data.selectedDate);
      })
      .catch((error) => {
        console.error('Failed to fetch courses:', error);
        wx.showToast({
          title: '获取课程信息失败',
          icon: 'none'
        });
      });
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
    
    this.setData({
      filteredCourses: filteredCourses
    });
  },
  
  // 新增方法
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