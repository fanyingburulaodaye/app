const { get } = require('../../utils/request'); // 假设封装好的函数在 utils/request.js 文件中

Page({
  data: {
    courses: [],
    stage_completed_count:0,
    stage_completion_percentage:0,
    stage_courses_count:0,
    completed_courses:[]
  },
  onLoad: function() {
    this.fetchCourses();
  },
  fetchCourses: function() {
    get('/user/course_plan', {})
      .then((data) => {
        console.log(data)
        this.setData({
          courses: data.data.courses.map((course, index) => ({
            ...course,
            is_completed: data.data.completed_courses.includes(course.index),
          })),
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
  handleAction: function(e) {
    const index = e.currentTarget.dataset.index;
    const action = e.currentTarget.dataset.action;
    if(action=='标记完成'){
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
    // 根据 action 执行相应的操作
  }
});