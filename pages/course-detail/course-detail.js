const { get } = require('../../utils/request');

Page({
  data: {
    courseDetail: null,
    videoUrl: 'https://d3vp2.xetslk.com/s/18Yx3r',
    exerciseUrl: 'https://d3vp2.xetslk.com/s/2w18qk',
    prepUrl: 'https://d3vp2.xetslk.com/s/1h7Fpr', // 添加课前预习URL
    // 添加视频、习题和预习的访问状态
    videoVisited: false,
    exerciseVisited: false,
    prepVisited: false, // 添加预习访问状态
    // 添加状态变更标记
    statusChanged: false
  },

  onLoad: function(options) {
    console.log('课程详情页面接收到参数:', options);
    
    if (options.course) {
      try {
        // 解析课程数据
        const courseDetail = JSON.parse(decodeURIComponent(options.course));
        console.log('解析后的课程数据:', courseDetail);
        
        // 尝试从本地存储中获取该课程的访问状态
        const courseId = courseDetail.index;
        const visitStatusKey = `course_visit_status_${courseId}`;
        const visitStatusStr = wx.getStorageSync(visitStatusKey);
        let visitStatus = null;
        
        if (visitStatusStr) {
          try {
            visitStatus = JSON.parse(visitStatusStr);
            console.log('从存储恢复访问状态:', visitStatus);
          } catch (e) {
            console.error('解析存储的访问状态失败:', e);
          }
        }
        
        this.setData({
          courseDetail: courseDetail,
          // 初始化时记录原始状态
          statusChanged: false,
          // 从本地存储恢复访问状态，如果有的话
          prepVisited: visitStatus ? visitStatus.prepVisited : false,
          videoVisited: visitStatus ? visitStatus.videoVisited : false,
          exerciseVisited: visitStatus ? visitStatus.exerciseVisited : false
        });
      } catch (error) {
        console.error('解析课程数据出错:', error);
        console.error('原始course参数:', options.course);
        
        // 尝试直接使用课程ID来获取信息
        if (options.course && options.course.includes('index')) {
          try {
            // 尝试从参数中提取课程ID
            const matches = options.course.match(/"index":(\d+)/);
            if (matches && matches[1]) {
              const courseId = matches[1];
              console.log('从损坏的参数中提取到课程ID:', courseId);
              // 使用ID获取课程详情
              this.fetchCourseDetail(courseId);
              return;
            }
          } catch (e) {
            console.error('尝试提取课程ID失败:', e);
          }
        }
        
        wx.showToast({
          title: '解析课程数据失败',
          icon: 'none'
        });
      }
    } else if (options.index) {
      // 支持通过index参数获取课程详情
      const courseId = options.index;
      console.log('通过index获取课程详情:', courseId);
      this.fetchCourseDetail(courseId);
    } else if (options.id) {
      // 兼容旧的实现方式
      const courseId = options.id;
      console.log('通过ID获取课程详情:', courseId);
      this.fetchCourseDetail(courseId);
    } else {
      console.error('未接收到课程数据或ID');
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
    }
  },

  fetchCourseDetail: function(courseId) {
    // 从课程列表API获取所有课程信息
    console.log('开始获取课程详情, courseId:', courseId);
    get('/user/course_plan', {})
      .then((res) => {
        console.log('API返回数据结构:', Object.keys(res));
        
        // 处理两种不同的API响应结构
        let courses = [];
        let completedCourses = [];
        
        if (res.code === 200 && res.data) {
          // 新的API响应结构
          console.log('使用新API响应结构');
          courses = res.data.courses || [];
          completedCourses = res.data.completed_courses || [];
        } else if (res.status === 'success') {
          // 旧的API响应结构
          console.log('使用旧API响应结构');
          courses = res.data.courses || [];
          completedCourses = res.data.completed_courses || [];
        } else {
          console.error('API返回无效数据:', res);
          wx.showToast({
            title: '获取课程详情失败',
            icon: 'none'
          });
          return;
        }
        
        console.log('课程列表长度:', courses.length);
        console.log('已完成课程:', completedCourses);
        
        // 找到匹配的课程
        const course = courses.find(c => String(c.index) === String(courseId));
        console.log('匹配到的课程:', course);
        
        if (course) {
          // 添加完成状态信息
          const isCompleted = completedCourses.includes(parseInt(courseId)) || 
                              completedCourses.includes(String(courseId));
          course.is_completed = isCompleted;
          console.log('处理后的课程信息:', course);
          
          // 尝试从本地存储中获取该课程的访问状态
          const visitStatusKey = `course_visit_status_${courseId}`;
          const visitStatusStr = wx.getStorageSync(visitStatusKey);
          let visitStatus = null;
          
          if (visitStatusStr) {
            try {
              visitStatus = JSON.parse(visitStatusStr);
              console.log('从存储恢复访问状态:', visitStatus);
            } catch (e) {
              console.error('解析存储的访问状态失败:', e);
            }
          }
          
          this.setData({
            courseDetail: course,
            statusChanged: false,
            // 从本地存储恢复访问状态，如果有的话
            prepVisited: visitStatus ? visitStatus.prepVisited : false,
            videoVisited: visitStatus ? visitStatus.videoVisited : false,
            exerciseVisited: visitStatus ? visitStatus.exerciseVisited : false
          });
        } else {
          console.error('未找到匹配的课程, courseId:', courseId);
          wx.showToast({
            title: '未找到课程信息',
            icon: 'none'
          });
        }
      })
      .catch((err) => {
        console.error('获取课程详情异常:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      });
  },

  // 检查是否应该自动标记为已完成
  checkAndMarkAsCompleted: function() {
    // 如果课程已经标记为完成，则不需要再次标记
    if (this.data.courseDetail && this.data.courseDetail.is_completed) {
      console.log('课程已标记为完成，无需重复标记');
      return;
    }
    
    // 如果预习、视频和习题都已访问，则自动标记为已完成
    if (this.data.prepVisited && this.data.videoVisited && this.data.exerciseVisited) {
      console.log('预习、视频和习题都已访问，自动标记课程为已完成');
      this.markAsCompleted();
    }
  },

  // 标记课程为已完成
  markAsCompleted: function() {
    const courseId = this.data.courseDetail.index;
    
    get('/user/mark_course_completed/' + courseId, {})
      .then((res) => {
        if(res.status == 'success'){
          // 更新本地数据状态
          let course = this.data.courseDetail;
          course.is_completed = true;
          
          this.setData({
            courseDetail: course,
            statusChanged: true // 标记状态已更改
          }, () => {
            // 保存访问状态
            this.saveVisitStatus();
          });
          
          wx.showToast({
            title: '课程已完成',
            icon: 'success'
          });
        } else {
          console.error('自动标记完成失败:', res.message);
        }
      })
      .catch((err) => {
        console.error('自动标记完成异常:', err);
      });
  },

  // 打开课前预习
  openPrep: function() {
    // 设置预习已访问状态
    this.setData({
      prepVisited: true
    }, () => {
      // 保存访问状态到本地存储
      this.saveVisitStatus();
      // 检查是否需要标记为已完成
      this.checkAndMarkAsCompleted();
    });
    
    // 跳转到预习页面
    wx.navigateTo({
      url: '/pages/webview/webview?url=' + encodeURIComponent(this.data.prepUrl)
      });
  },

  // 打开课程视频
  openVideo: function() {
    // 设置视频已访问状态
    this.setData({
      videoVisited: true
    }, () => {
      // 保存访问状态到本地存储
      this.saveVisitStatus();
      // 检查是否需要标记为已完成
      this.checkAndMarkAsCompleted();
    });
    
    // 跳转到视频页面
    wx.navigateTo({
      url: '/pages/webview/webview?url=' + encodeURIComponent(this.data.videoUrl)
    });
  },

  // 打开课程习题
  openExercise: function() {
    // 设置习题已访问状态
    this.setData({
      exerciseVisited: true
    }, () => {
      // 保存访问状态到本地存储
      this.saveVisitStatus();
      // 检查是否需要标记为已完成
      this.checkAndMarkAsCompleted();
    });
    
    // 跳转到习题页面
    wx.navigateTo({
      url: '/pages/webview/webview?url=' + encodeURIComponent(this.data.exerciseUrl)
    });
  },

  // 处理标记完成/取消标记按钮
  handleAction: function(e) {
    const action = e.currentTarget.dataset.action;
    const courseId = this.data.courseDetail.index;
    
    if(action == '标记完成'){
      get('/user/mark_course_completed/' + courseId, {})
        .then((res) => {
          if(res.status == 'success'){
            // 更新本地数据状态
            let course = this.data.courseDetail;
            course.is_completed = true;
            
            this.setData({
              courseDetail: course,
              statusChanged: true // 标记状态已更改
            });
            
            wx.showToast({
              title: res.message || '标记成功',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: res.message || '操作失败',
              icon: 'none'
            });
          }
        })
        .catch((err) => {
          console.error('标记完成失败:', err);
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none'
          });
        });
    } else {
      get('/user/unmark_course_completed/' + courseId, {})
        .then((res) => {
          if(res.status == 'success'){
            // 更新本地数据状态
            let course = this.data.courseDetail;
            course.is_completed = false;
            
            this.setData({
              courseDetail: course,
              // 重置访问状态
              prepVisited: false,
              videoVisited: false,
              exerciseVisited: false,
              statusChanged: true // 标记状态已更改
            }, () => {
              // 清除本地存储的访问状态
              const visitStatusKey = `course_visit_status_${courseId}`;
              wx.removeStorageSync(visitStatusKey);
            });
            
            wx.showToast({
              title: res.message || '取消标记成功',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: res.message || '操作失败',
              icon: 'none'
            });
          }
        })
        .catch((err) => {
          console.error('取消标记失败:', err);
          wx.showToast({
            title: '网络错误，请重试',
            icon: 'none'
          });
        });
    }
  },

  // 返回上一页
  goBack: function() {
    // 检查状态是否有变化，如果有则通知上一页刷新数据
    if (this.data.statusChanged) {
      // 获取页面栈
      const pages = getCurrentPages();
      // 获取上一页实例
      const prevPage = pages[pages.length - 2];
      
      // 检查上一页是否是学习页面
      if (prevPage && prevPage.route.includes('pages/study/study')) {
        console.log('通知学习页面刷新数据');
        // 调用上一页的刷新方法
        prevPage.fetchCourses();
      }
    }

    // 无论状态是否变化，都需要保留课程的日期信息
    if (this.data.courseDetail && this.data.courseDetail.date) {
      // 获取页面栈
      const pages = getCurrentPages();
      // 获取上一页实例
      const prevPage = pages[pages.length - 2];
      
      // 检查上一页是否是学习页面
      if (prevPage && prevPage.route.includes('pages/study/study')) {
        console.log('保留课程日期:', this.data.courseDetail.date);
        // 设置学习页面的选中日期为当前课程的日期
        prevPage.setData({
          selectedDate: this.data.courseDetail.date
        });
        // 同时更新筛选的课程列表
        prevPage.filterCoursesByDate(this.data.courseDetail.date);
      }
    }
    
    wx.navigateBack();
  },

  // 保存访问状态到本地存储
  saveVisitStatus: function() {
    if (!this.data.courseDetail) return;
    
    const courseId = this.data.courseDetail.index;
    const visitStatus = {
      prepVisited: this.data.prepVisited,
      videoVisited: this.data.videoVisited,
      exerciseVisited: this.data.exerciseVisited
    };
    const visitStatusKey = `course_visit_status_${courseId}`;
    
    console.log('保存访问状态到本地存储:', visitStatus);
    wx.setStorageSync(visitStatusKey, JSON.stringify(visitStatus));
  }
}); 