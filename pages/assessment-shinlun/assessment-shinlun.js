// 引入request模块
const request = require('../../utils/request.js');

Page({
  data: {
    assessmentLink: '', // 存储测评链接
    questionItems: [
      { number: 1, time: '' }, // 默认第一题
      { number: 2, time: '' }, // 默认第二题
      { number: 3, time: '' }, // 默认第三题
      { number: 4, time: '' }, // 默认第四题
      { number: 5, time: '' }, // 默认第五题
    ],
    totalTime: '', // 总用时
    isLinkLoading: true, // 控制加载状态
    isCompleted: false // 是否已完成测评
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.fetchAssessmentLink();
    this.checkAssessmentStatus();
  },

  /**
   * 获取测评链接
   */
  fetchAssessmentLink: function () {
    this.setData({ isLinkLoading: true });
    
    request.get('/user/assessment_links', {})
      .then(res => {
        if (res && res.data && res.data.shinlun_link) {
          this.setData({
            assessmentLink: res.data.shinlun_link,
            isLinkLoading: false
          });
        } else {
          wx.showToast({
            title: '测评链接未设置',
            icon: 'none',
            duration: 2000
          });
          this.setData({ isLinkLoading: false });
        }
      })
      .catch(err => {
        console.error('获取测评链接失败:', err);
        wx.showToast({
          title: '获取测评链接失败，请重试',
          icon: 'none',
          duration: 2000
        });
        this.setData({ isLinkLoading: false });
      });
  },

  /**
   * 检查测评状态
   */
  checkAssessmentStatus: function () {
    // 先尝试从本地缓存读取测评状态
    const localStatus = wx.getStorageSync('assessmentStatus');
    if (localStatus && localStatus.shinlun_completed) {
      this.setData({ isCompleted: true });
    }
    
    // 再从服务器获取最新状态
    request.get('/user/assessment_status', {})
      .then((res) => {
        if (res && res.data) {
          const shinlunCompleted = res.data.shinlun_completed || false;
          this.setData({ isCompleted: shinlunCompleted });
        }
      })
      .catch((err) => {
        console.error('获取测评状态失败:', err);
      });
  },

  /**
   * 前往考试（打开WebView）
   */
  goToExam: function () {
    if (!this.data.assessmentLink || this.data.assessmentLink.trim() === '') {
      wx.showToast({
        title: '测评链接未设置，请联系管理员',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 导航到WebView页面，打开测评链接
    wx.navigateTo({
      url: `/pages/webview/webview?url=${encodeURIComponent(this.data.assessmentLink)}`,
      success: () => {
        console.log('导航到测评页面成功');
      },
      fail: (err) => {
        console.error('导航到测评页面失败:', err);
        wx.showToast({
          title: '打开测评页面失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  /**
   * 记录各题用户输入的时间并自动计算总用时
   */
  onQuestionTimeInput: function (e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    
    // 更新指定索引的题目时间
    const questionItems = this.data.questionItems;
    questionItems[index].time = value;
    
    // 计算总用时 - 将所有题目的时间相加
    let totalTime = 0;
    questionItems.forEach(item => {
      const time = parseInt(item.time);
      if (!isNaN(time) && time >= 0) {
        totalTime += time;
      }
    });
    
    // 设置总用时
    this.setData({
      questionItems,
      totalTime: totalTime > 0 ? String(totalTime) : ''
    });
  },

  /**
   * 提交用时
   */
  submitTime: function () {
    // 验证至少有一个题目用时已填写
    if (!this.validateTimeInputs()) {
      wx.showToast({
        title: '请至少填写一道题的用时',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 创建用时数据对象
    const timeData = this.createTimeDataObject();
    
    // 提交数据到后端
    this.submitAssessmentTimes(timeData);
  },

  /**
   * 验证时间输入
   */
  validateTimeInputs: function() {
    // 检查是否至少有一个有效的题目时间输入
    return this.data.questionItems.some(item => {
      const time = parseInt(item.time);
      return !isNaN(time) && time >= 0;
    });
  },

  /**
   * 创建时间数据对象
   */
  createTimeDataObject: function() {
    const timeData = {};
    
    // 添加总用时，现在总用时是自动计算的
    const totalTime = parseInt(this.data.totalTime);
    if (!isNaN(totalTime) && totalTime > 0) {
      timeData[0] = totalTime * 60; // 总用时，key为0，转换为秒
    }
    
    // 添加各题用时
    this.data.questionItems.forEach((item, index) => {
      const time = parseInt(item.time);
      if (!isNaN(time) && time >= 0) {
        timeData[item.number] = time * 60; // 转换为秒
      }
    });
    
    return timeData;
  },

  /**
   * 提交测评时间到后端
   */
  submitAssessmentTimes: function (times) {
    const data = {
      type: 'shinlun',
      times: times
    };
    
    wx.showLoading({
      title: '提交中...',
      mask: true
    });
    
    request.post('/user/save_assessment_time', data)
      .then((res) => {
        wx.hideLoading();
        console.log('保存测评时间成功:', res);
        
        // 更新本地状态和缓存
        this.setData({ isCompleted: true });
        const localStatus = wx.getStorageSync('assessmentStatus') || {};
        localStatus.shinlun_completed = true;
        localStatus.timestamp = Date.now();
        wx.setStorageSync('assessmentStatus', localStatus);
        
        // 显示成功提示
        wx.showToast({
          title: '申论测评已完成',
          icon: 'success',
          duration: 2000
        });
        
        // 检查是否两个测评都完成了
        if (localStatus.xingce_completed) {
          // 通知后台全部测评已完成
          request.post('/user/all_assessment_completed', {})
            .then((res) => {
              console.log('全部测评完成通知成功:', res);
              
              setTimeout(() => {
                wx.showModal({
                  title: '测评已全部完成',
                  content: '所有摸底测评已完成，正在为您定制学习计划，预计3~5个工作日完成',
                  showCancel: false,
                  success: () => {
                    // 返回上一页
                    wx.navigateBack();
                  }
                });
              }, 500);
            })
            .catch((err) => {
              console.error('全部测评完成通知失败:', err);
              wx.navigateBack();
            });
        } else {
          // 延迟一下再返回
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      })
      .catch((err) => {
        wx.hideLoading();
        console.error('保存测评时间失败:', err);
        
        // 即使API失败，也更新本地状态
        this.setData({ isCompleted: true });
        const localStatus = wx.getStorageSync('assessmentStatus') || {};
        localStatus.shinlun_completed = true;
        localStatus.timestamp = Date.now();
        wx.setStorageSync('assessmentStatus', localStatus);
        
        wx.showToast({
          title: '保存失败，但测评已标记为完成',
          icon: 'none',
          duration: 2000
        });
        
        // 延迟一下再返回
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 页面显示时刷新测评状态
    this.checkAssessmentStatus();
  }
}); 