Page({
  /**
   * 页面的初始数据
   */
  data: {
    date: '',
    planType: '',
    studyHours: 0,
    minDate: new Date().getTime(),
    maxDate: new Date(new Date().getFullYear(), new Date().getMonth() + 6, new Date().getDate()).getTime(),
    currentDate: new Date().getTime(),
    formatter(type, value) {
      if (type === 'year') {
        return `${value}年`;
      }
      if (type === 'month') {
        return `${value}月`;
      }
      return value;
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取传递的参数
    if (options.type) {
      this.setData({
        planType: options.type
      });
    }
    if (options.hours) {
      this.setData({
        studyHours: parseFloat(options.hours)
      });
    }
    
    // 设置标题
    const title = this.data.planType === 'advance' ? '选择提前开始日期' : '选择延迟开始日期';
    wx.setNavigationBarTitle({
      title: title
    });
    
    // 初始化日期
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    this.setData({
      date: formattedDate
    });
  },

  // 日期变化处理函数
  bindDateChange: function(e) {
    this.setData({
      date: e.detail.value
    });
  },

  // 确认选择
  confirmDate: function() {
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2]; // 获取上一个页面
    
    // 调用上一个页面的方法，传递选择的日期
    prevPage.submitPlanChangeWithDetails(
      this.data.planType, 
      this.data.studyHours, 
      this.data.date
    );
    
    // 返回上一页
    wx.navigateBack({
      delta: 1
    });
  },

  // 取消选择
  cancelSelect: function() {
    wx.navigateBack({
      delta: 1
    });
  }
}) 