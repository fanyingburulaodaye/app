// pages/information/information.js
const request = require('../../utils/request.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    username:'',
    today:'',
    target_exam:'',
    exam_date:'',
    daysRemaining: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.fetchData()
  },

  // 计算两个日期之间的天数差
  calculateDaysRemaining: function(examDate) {
    if (!examDate) {
      console.log("没有提供考试日期");
      return 0;
    }
    
    console.log("原始考试日期:", examDate);
    
    // 尝试将各种格式的日期转换为标准格式 (YYYY-MM-DD)
    let formattedExamDate = examDate;
    
    // 处理 "2025年06月15日" 格式
    if (examDate.includes('年') && examDate.includes('月')) {
      const match = examDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日?/);
      if (match) {
        const year = match[1];
        const month = match[2].padStart(2, '0'); // 确保月份是两位数
        const day = match[3].padStart(2, '0');   // 确保日期是两位数
        formattedExamDate = `${year}-${month}-${day}`;
      }
    }
    
    // 处理 "YYYY/MM/DD" 格式
    if (examDate.includes('/')) {
      formattedExamDate = examDate.replace(/\//g, '-');
    }
    
    // 处理 "YYYY.MM.DD" 格式
    if (examDate.includes('.')) {
      formattedExamDate = examDate.replace(/\./g, '-');
    }
    
    console.log("格式化后的考试日期:", formattedExamDate);
    
    // 获取今天日期的零点时间
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 解析考试日期
    let examDay;
    try {
      // 如果只有年份，设置为当年12月31日
      if (/^\d{4}$/.test(formattedExamDate)) {
        examDay = new Date(parseInt(formattedExamDate), 11, 31);
      } else {
        examDay = new Date(formattedExamDate);
        // 检查是否解析成功（无效日期解析结果为NaN）
        if (isNaN(examDay.getTime())) {
          // 尝试手动解析
          const parts = formattedExamDate.split('-');
          if (parts.length === 3) {
            examDay = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          } else if (parts.length === 2) {
            // 如果只有年月，设为当月最后一天
            examDay = new Date(parseInt(parts[0]), parseInt(parts[1]), 0);
          } else {
            // 默认值：设为当年年底
            examDay = new Date(new Date().getFullYear(), 11, 31);
          }
        }
      }
      examDay.setHours(0, 0, 0, 0);
      console.log("解析后的考试日期对象:", examDay);
    } catch (error) {
      console.error("日期解析错误:", error);
      // 返回一个默认值，避免显示0
      return 100;
    }
    
    // 再次检查日期是否有效
    if (isNaN(examDay.getTime())) {
      console.error("最终日期解析失败，使用默认值");
      return 100; // 使用默认值
    }
    
    // 计算时间差并转换为天数
    const timeDiff = examDay.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    console.log("今天日期:", today);
    console.log("日期差(毫秒):", timeDiff);
    console.log("计算得到的天数差:", daysDiff);
    
    // 确保返回正整数
    return daysDiff > 0 ? daysDiff : 100;
  },

  fetchData: function() {
    // 访问API获取数据
    try {
      request.get('/user/info', {})
        .then((res) => {
          console.log("服务器返回的完整数据:", res);
          
          // 检查返回的数据结构
          if (!res || !res.data) {
            console.error("API返回的数据无效");
            this.setData({ daysRemaining: 100 }); // 设置默认值
            return;
          }
          
          // 计算考试剩余天数
          let daysRemaining = 100; // 默认值
          
          if (res.data.exam_date) {
            daysRemaining = this.calculateDaysRemaining(res.data.exam_date);
          } else {
            console.warn("没有获取到考试日期，使用默认值");
          }
          
          // 确保daysRemaining是一个有效的数字
          if (isNaN(daysRemaining) || daysRemaining < 0) {
            daysRemaining = 100;
          }
          
          // 更新页面数据
          this.setData({
            today: res.today || new Date().toLocaleDateString(),
            exam_date: res.data.exam_date || "未设置",
            username: res.data.student_name || "同学",
            target_exam: res.data.target_exam || "未设置",
            daysRemaining: daysRemaining
          });
          
          console.log('数据已更新，剩余天数:', daysRemaining);
        })
        .catch((err) => {
          console.error('获取数据失败:', err);
          // 设置默认值
          this.setData({ daysRemaining: 100 });
        });
    } catch (error) {
      console.error('请求过程出错:', error);
      // 设置默认值
      this.setData({ daysRemaining: 100 });
    }
  },

  logout:function(){
    request.get('/user/logout',{})
    .then((res)=>{
      if (res.status === 'success') {
        wx.showToast({
          title: '退出登录成功',
          icon: 'success',
          duration: 2000
        });
        // 清除小程序本地存储的用户信息
        wx.removeStorageSync('token');
        // 跳转到登录页面
        wx.redirectTo({
          url: '/pages/login/login'
        });
      } else {
        wx.showToast({
          title: '退出登录失败',
          icon: 'none',
          duration: 2000
        });
      }
    })
    .catch((err) => {
      console.error('Error fetching data:', err);
    });
  },

  // 导航到学习页面
  navigateToStudy: function() {
    wx.switchTab({
      url: '/pages/study/study'
    });
  },

  // 导航到留言页面
  navigateToMessage: function() {
    wx.switchTab({
      url: '/pages/message/message'
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 每次显示页面时刷新数据
    this.fetchData();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    // 下拉刷新数据
    this.fetchData();
    wx.stopPullDownRefresh();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})