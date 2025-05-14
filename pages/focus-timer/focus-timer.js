const request = require('../../utils/request.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    focusTimer: {
      minutes: '25',
      seconds: '00',
      totalSeconds: 25 * 60,
      remainingSeconds: 25 * 60,
      isRunning: false,
      options: ['5秒', '5分钟', '10分钟', '15分钟', '25分钟', '30分钟', '45分钟', '60分钟', '90分钟'],
      selectedIndex: 4, // 默认选择25分钟
      timerId: null
    },
    useBackupAlert: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查音频文件是否存在
    const fs = wx.getFileSystemManager();
    try {
      fs.accessSync('/xuexijihua/学习时间到了.wav');
      console.log('音频文件存在，可以使用');
    } catch (e) {
      console.error('音频文件不存在或无法访问:', e);
      // 可以在这里设置一个标志，表示应该使用备用提醒方式
      this.setData({
        useBackupAlert: true
      });
    }
  },

  // 设置计时器时长
  setTimerDuration: function(e) {
    const selectedIndex = e.detail.value;
    const options = this.data.focusTimer.options;
    const selectedOption = options[selectedIndex];
    
    // 从选项中提取数字
    const number = parseInt(selectedOption.match(/\d+/)[0]);
    
    // 判断是秒还是分钟
    let totalSeconds = 0;
    if (selectedOption.includes('秒')) {
      totalSeconds = number; // 如果是秒，直接使用
    } else {
      totalSeconds = number * 60; // 如果是分钟，转换为秒
    }
    
    this.setData({
      'focusTimer.selectedIndex': selectedIndex,
      'focusTimer.totalSeconds': totalSeconds,
      'focusTimer.remainingSeconds': totalSeconds,
      'focusTimer.minutes': this.formatTime(Math.floor(totalSeconds / 60)),
      'focusTimer.seconds': this.formatTime(totalSeconds % 60)
    });
  },
  
  // 格式化时间为两位数
  formatTime: function(time) {
    return time < 10 ? '0' + time : String(time);
  },
  
  // 提醒用户计时结束
  alertUser: function() {
    console.log('提醒用户计时结束');
    
    // 1. 震动提醒
    wx.vibrateLong();
    
    // 2. 根据音频文件可用性决定是否播放音频
    if (this.data.useBackupAlert) {
      // 如果音频文件不可用，使用备用提醒方式
      this.useBackupAlert();
    } else {
      // 尝试播放音频提醒
      this.playBackgroundAudio();
    }
    
    // 3. 显示Toast提示
    wx.showToast({
      title: '专注时间到！',
      icon: 'success',
      duration: 2000
    });
    
    // 4. 显示模态对话框
    setTimeout(() => {
      wx.showModal({
        title: '专注时间结束',
        content: '您设置的专注时间已结束，请休息一下吧！',
        showCancel: false,
        confirmText: '好的',
        success: (res) => {
          if (res.confirm) {
            console.log('用户确认了提示框');
          }
        }
      });
    }, 300); 
  },
  
  // 播放音频提醒
  playBackgroundAudio: function() {
    console.log('播放音频提醒');
    
    // 直接使用InnerAudioContext播放本地音频
    this.playLocalAudio();
  },
  
  // 使用InnerAudioContext播放本地音频
  playLocalAudio: function() {
    console.log('使用InnerAudioContext播放本地音频');
    
    try {
      // 创建内部音频上下文
      const innerAudioContext = wx.createInnerAudioContext();
      
      // 设置音频源为本地文件
      innerAudioContext.src = '/xuexijihua/学习时间到了.wav';
      
      // 自动播放
      innerAudioContext.autoplay = true;
      
      // 监听事件
      innerAudioContext.onPlay(() => {
        console.log('本地音频开始播放');
      });
      
      innerAudioContext.onError((res) => {
        console.error('本地音频播放错误:', res.errMsg);
        // 使用备用提醒方式
        this.useBackupAlert();
      });
      
      // 播放结束后销毁实例
      innerAudioContext.onEnded(() => {
        console.log('本地音频播放结束');
        innerAudioContext.destroy();
      });
      
    } catch (e) {
      console.error('创建本地音频实例失败:', e);
      // 使用备用提醒方式
      this.useBackupAlert();
    }
  },
  
  // 备用提醒方式
  useBackupAlert: function() {
    // 再次震动以确保提醒
    setTimeout(() => {
      wx.vibrateLong();
    }, 500);
  },
  
  // 切换计时器（开始/暂停）
  toggleTimer: function() {
    const isRunning = this.data.focusTimer.isRunning;
    
    if (isRunning) {
      // 暂停计时器
      clearInterval(this.data.focusTimer.timerId);
      this.setData({
        'focusTimer.isRunning': false,
        'focusTimer.timerId': null
      });
    } else {
      // 开始计时器
      const timerId = setInterval(() => {
        let remainingSeconds = this.data.focusTimer.remainingSeconds - 1;
        
        if (remainingSeconds < 0) {
          // 计时结束
          clearInterval(this.data.focusTimer.timerId);
          this.setData({
            'focusTimer.isRunning': false,
            'focusTimer.timerId': null
          });
          
          // 提醒用户
          this.alertUser();
          
          // 重置为原始时间
          const totalSeconds = this.data.focusTimer.totalSeconds;
          this.setData({
            'focusTimer.remainingSeconds': totalSeconds,
            'focusTimer.minutes': this.formatTime(Math.floor(totalSeconds / 60)),
            'focusTimer.seconds': this.formatTime(totalSeconds % 60)
          });
          
          return;
        }
        
        // 更新显示的时间
        this.setData({
          'focusTimer.remainingSeconds': remainingSeconds,
          'focusTimer.minutes': this.formatTime(Math.floor(remainingSeconds / 60)),
          'focusTimer.seconds': this.formatTime(remainingSeconds % 60)
        });
      }, 1000);
      
      this.setData({
        'focusTimer.isRunning': true,
        'focusTimer.timerId': timerId
      });
    }
  },
  
  // 重置计时器
  resetTimer: function() {
    // 如果计时器正在运行，先停止
    if (this.data.focusTimer.isRunning) {
      clearInterval(this.data.focusTimer.timerId);
    }
    
    // 重置为原始时间
    const totalSeconds = this.data.focusTimer.totalSeconds;
    this.setData({
      'focusTimer.isRunning': false,
      'focusTimer.timerId': null,
      'focusTimer.remainingSeconds': totalSeconds,
      'focusTimer.minutes': this.formatTime(Math.floor(totalSeconds / 60)),
      'focusTimer.seconds': this.formatTime(totalSeconds % 60)
    });
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    // 页面隐藏时，如果计时器正在运行，停止计时器
    if (this.data.focusTimer && this.data.focusTimer.isRunning) {
      clearInterval(this.data.focusTimer.timerId);
      this.setData({
        'focusTimer.isRunning': false,
        'focusTimer.timerId': null
      });
    }
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 页面卸载时，如果计时器正在运行，停止计时器
    if (this.data.focusTimer && this.data.focusTimer.isRunning) {
      clearInterval(this.data.focusTimer.timerId);
    }
  }
}) 