Page({
  data: {
    url: ''
  },
  
  onLoad: function(options) {
    if (options.url) {
      const decodedUrl = decodeURIComponent(options.url);
      this.setData({
        url: decodedUrl
      });
    } else {
      wx.showToast({
        title: '链接无效',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  // 用户点击左上角返回按钮或物理返回键时触发
  onUnload: function() {
    // 页面卸载时，获取页面栈中的前一个页面
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2]; // 前一个页面
    
    // 如果前一个页面是课程详情页，检查并标记为已完成
    if (prevPage && prevPage.route === 'pages/course-detail/course-detail') {
      if (this.data.url.includes('18Yx3r')) {
        // 是视频页面
        prevPage.setData({
          videoVisited: true
        });
      } else if (this.data.url.includes('2w18qk')) {
        // 是习题页面
        prevPage.setData({
          exerciseVisited: true
        });
      }
      
      // 调用前一个页面的方法检查是否需要标记为已完成
      prevPage.checkAndMarkAsCompleted && prevPage.checkAndMarkAsCompleted();
    } 
    // 如果前一个页面是信息页面(测评页面)，刷新测评状态
    else if (prevPage && prevPage.route === 'pages/information/information') {
      // 判断是否从测评链接返回
      if (this.data.url.includes('shinlun') || this.data.url.includes('xingce')) {
        // 延迟一点时间再刷新状态，确保用户已经查看完测评内容
        setTimeout(() => {
          prevPage.fetchAssessmentStatus && prevPage.fetchAssessmentStatus();
        }, 500);
      }
    }
  }
}); 