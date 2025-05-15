// pages/information/information.js
const request = require('../../utils/request.js');
const cacheManager = require('../../utils/cacheManager');
const infoChecker = require('../../utils/infoChecker.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    username:'',
    today:'',
    target_exam:'',
    exam_date:'',
    daysRemaining: '未设置',
    timerBackgroundImage: '/static/image/计时器背景.jpg',
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
    bgAudio: null,
    useBackupAlert: false,
    // 新增学习阶段相关
    stages: [],
    currentStage: null,
    selectedStageIndex: null,
    hasUploadedPlan: true, // 默认为已上传学习计划
    // 测评状态，这些会从后端读取，不会被重置
    assessmentCompleted: false, // 是否完成摸底测评
    shinlunCompleted: false, // 是否完成申论测评
    xingceCompleted: false, // 是否完成行测测评
    shinlunButtonText: '申论摸底测评',
    xingceButtonText: '行测摸底测评',
    // 新增测评链接状态
    hasShinlunLink: false, // 是否有申论测评链接
    hasXingceLink: false, // 是否有行测测评链接
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.fetchData();
    this.fetchStages();
    this.fetchAssessmentStatus(); // 获取测评状态
    this.fetchAssessmentLinks(); // 获取测评链接状态
    
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

  // 计算两个日期之间的天数差
  calculateDaysRemaining: function(examDate) {
    if (!examDate) {
      console.log("没有提供考试日期");
      return '未设置';
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
      return '未设置';
    }
    
    // 再次检查日期是否有效
    if (isNaN(examDay.getTime())) {
      console.error("最终日期解析失败，使用默认值");
      return '未设置'; // 使用默认值
    }
    
    // 计算时间差并转换为天数
    const timeDiff = examDay.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    console.log("今天日期:", today);
    console.log("日期差(毫秒):", timeDiff);
    console.log("计算得到的天数差:", daysDiff);
    
    // 确保返回正整数
    return daysDiff > 0 ? daysDiff : '未设置';
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
            this.setData({ daysRemaining: '未设置' }); // 设置默认值
            return;
          }
          
          // 计算考试剩余天数
          let daysRemaining = '未设置'; // 默认值
          
          if (res.data.exam_date) {
            daysRemaining = this.calculateDaysRemaining(res.data.exam_date);
          } else {
            console.warn("没有获取到考试日期，使用默认值");
          }
          
          // 确保daysRemaining是一个有效的数字或默认文本
          if (daysRemaining !== '未设置' && (isNaN(daysRemaining) || daysRemaining < 0)) {
            daysRemaining = '未设置';
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
          this.setData({ daysRemaining: '未设置' });
        });
    } catch (error) {
      console.error('请求过程出错:', error);
      // 设置默认值
      this.setData({ daysRemaining: '未设置' });
    }
  },

  logout:function(){
    // 先清理缓存
    cacheManager.clearAllCache(true);
    
    // 然后再调用后端接口进行登出
    request.get('/user/logout',{})
    .then((res)=>{
        console.log('服务器登出响应:', res);
        
        // 完成登出流程，不重复显示提示，因为cacheManager中已经包含了跳转
        wx.reLaunch({
          url: '/pages/login/login'
        });
    })
    .catch((err) => {
        console.error('退出登录请求失败:', err);
        
        // 即使服务器请求失败，也强制退出
        wx.reLaunch({
          url: '/pages/login/login'
        });
    });
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

  // 导航到学习页面
  navigateToStudy: function() {
    wx.switchTab({
      url: '/pages/study/study'
    });
  },

  // 导航到通知页面
  navigateToNotification: function() {
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
    // 检查用户是否已填写信息
    infoChecker.checkUserInfoFilled();
    
    // 应用主题
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
    }
    
    // 每次显示页面时刷新数据
    this.fetchData();
    // 每次显示页面时也获取最新的测评状态
    this.fetchAssessmentStatus();
    // 获取测评链接状态
    this.fetchAssessmentLinks();
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

  },

  // 学习阶段相关方法
  fetchStages: function() {
    request.get('/user/learning_plan', {})
      .then((data) => {
        let stages = data.data;
        let hasUploadedPlan = true; // 标记是否有上传的学习计划
        
        // 检查返回的stages是否为空或者长度为0，如果是则使用默认阶段
        if (!stages || stages.length === 0) {
          // 提供默认的八个固定阶段，但不提供详细信息
          stages = [
            { id: 1, stage: "摸底测评", module: "", time: "", content: "" },
            { id: 2, stage: "第一阶段", module: "", time: "", content: "" },
            { id: 3, stage: "第二阶段", module: "", time: "", content: "" },
            { id: 4, stage: "第三阶段", module: "", time: "", content: "" },
            { id: 5, stage: "第四阶段", module: "", time: "", content: "" },
            { id: 6, stage: "第五阶段", module: "", time: "", content: "" },
            { id: 7, stage: "第六阶段", module: "", time: "", content: "" },
            { id: 8, stage: "第七阶段", module: "", time: "", content: "" }
          ];
          hasUploadedPlan = false; // 没有上传的学习计划
        }
        
        // 确定当前阶段
        let currentStage = 0; // 默认在第一个阶段（摸底测评）
        
        // 只有当返回的不是默认阶段时，才尝试确定当前阶段
        if (data.data && data.data.length > 0) {
          currentStage = this.determineCurrentStage(stages);
        }
        
        this.setData({
          stages: stages,
          currentStage: currentStage,
          selectedStageIndex: currentStage, // 默认选中当前阶段
          hasUploadedPlan: hasUploadedPlan // 添加标记以便在WXML中使用
        });
      })
      .catch((error) => {
        console.error('Failed to fetch stages:', error);
        
        // 当API请求失败时也提供默认阶段，但不提供详细信息
        const defaultStages = [
          { id: 1, stage: "摸底测评", module: "", time: "", content: "" },
          { id: 2, stage: "第一阶段", module: "", time: "", content: "" },
          { id: 3, stage: "第二阶段", module: "", time: "", content: "" },
          { id: 4, stage: "第三阶段", module: "", time: "", content: "" },
          { id: 5, stage: "第四阶段", module: "", time: "", content: "" },
          { id: 6, stage: "第五阶段", module: "", time: "", content: "" },
          { id: 7, stage: "第六阶段", module: "", time: "", content: "" },
          { id: 8, stage: "第七阶段", module: "", time: "", content: "" }
        ];
        
        this.setData({
          stages: defaultStages,
          currentStage: 0, // 默认在第一个阶段（摸底测评）
          selectedStageIndex: 0,
          hasUploadedPlan: false // 没有上传的学习计划
        });
      });
  },
  determineCurrentStage: function(stages) {
    const today = new Date();
    const todayStr = this.formatDate(today);
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const dateRangeMatch = stage.time.match(/(\d{4}-\d{2}-\d{2})~(\d{4}-\d{2}-\d{2})/);
      if (dateRangeMatch) {
        const startDate = dateRangeMatch[1];
        const endDate = dateRangeMatch[2];
        if (todayStr >= startDate && todayStr <= endDate) {
          return i;
        }
      }
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
    return 0;
  },
  formatDate: function(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  },
  getWeekNumber: function(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  },
  
  // 显示特定阶段的详细信息
  showStageDetail: function(e) {
    const index = e.currentTarget.dataset.index;
    if (index !== undefined && this.data.stages[index]) {
      // 如果没有上传学习计划
      if (!this.data.hasUploadedPlan) {
        // 更新选中的阶段索引，以便可以显示适当的视图
        this.setData({
          selectedStageIndex: index
        });
        
        // 如果点击的是摸底测评阶段，显示阶段名称
        if (index === 0) {
          wx.showToast({
            title: `${this.data.stages[index].stage}`,
            icon: 'none',
            duration: 1500
          });
        } else {
          // 如果点击的是其他阶段，显示特殊提示
          wx.showToast({
            title: '暂未上传学习计划，如有问题请联系助教大黄老师',
            icon: 'none',
            duration: 2500
          });
        }
        return;
      }
      
      // 有上传学习计划时，正常显示
      wx.showToast({
        title: `${this.data.stages[index].stage}`,
        icon: 'none',
        duration: 1500
      });
      
      // 更新选中的阶段索引
      this.setData({
        selectedStageIndex: index
      });
    }
  },
  
  // 显示学习计划异动弹窗
  showPlanChangeDialog: function() {
    // 如果未上传学习计划，显示提示信息
    if (!this.data.hasUploadedPlan) {
      wx.showToast({
        title: '未上传学习计划，无法进行计划异动',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 首先显示学习计划异动类型选项
    wx.showActionSheet({
      itemList: ['学习计划提前', '学习计划正常进行', '学习计划延迟'],
      success: (res) => {
        const tapIndex = res.tapIndex;
        if (tapIndex === 0) {
          // 用户选择了"学习计划提前"
          this.showPlanAdvanceOptions();
        } else if (tapIndex === 1) {
          // 用户选择了"学习计划正常进行"
          this.submitPlanNormal();
        } else if (tapIndex === 2) {
          // 用户选择了"学习计划延迟"
          this.showPlanDelayOptions();
        }
      },
      fail: (res) => {
        console.log('用户取消了选择');
      }
    });
  },
  
  // 处理学习计划提前选项
  showPlanAdvanceOptions: function() {
    // 直接使用输入框让用户输入每日学习时间
    wx.showModal({
      title: '下一阶段每日学习时间',
      content: '',
      editable: true,
      placeholderText: '',
      success: (modalRes) => {
        if (modalRes.confirm) {
          const inputHours = parseFloat(modalRes.content);
          if (!isNaN(inputHours) && inputHours > 0) {
            this.showDatePickerInput('advance', inputHours);
          } else {
            wx.showToast({
              title: '请输入有效数字',
              icon: 'none'
            });
          }
        }
      }
    });
  },
  
  // 处理学习计划延迟选项
  showPlanDelayOptions: function() {
    // 直接使用输入框让用户输入每日学习时间
    wx.showModal({
      title: '下一阶段每日学习时间',
      content: '',
      editable: true,
      placeholderText: '',
      success: (modalRes) => {
        if (modalRes.confirm) {
          const inputHours = parseFloat(modalRes.content);
          if (!isNaN(inputHours) && inputHours > 0) {
            this.showDatePickerInput('delay', inputHours);
          } else {
            wx.showToast({
              title: '请输入有效数字',
              icon: 'none'
            });
          }
        }
      }
    });
  },
  
  // 直接显示日期输入对话框
  showDatePickerInput: function(planType, studyHours) {
    wx.showModal({
      title: '下一阶段开始日期',
      content: '',
      editable: true,
      placeholderText: '2025-5-20',
      success: (res) => {
        if (res.confirm) {
          // 不再验证日期格式，直接提交用户输入的内容
          this.submitPlanChangeWithDetails(planType, studyHours, res.content);
        }
      }
    });
  },
  
  // 显示日期选择器
  showDatePicker: function(planType, studyHours) {
    // 直接使用输入框替代日期选择器
    this.showDatePickerInput(planType, studyHours);
  },
  
  // 备选：显示日期输入对话框
  showDateInputModal: function(planType, studyHours) {
    // 使用相同的日期输入方法
    this.showDatePickerInput(planType, studyHours);
  },
  
  // 提交正常进行的计划异动
  submitPlanNormal: function() {
    wx.showModal({
      title: '确认',
      content: '您确认学习计划正常进行吗？',
      success: (res) => {
        if (res.confirm) {
          this.submitPlanChangeRequest('学习计划正常进行，无需调整。');
        }
      }
    });
  },
  
  // 提交带详细信息的计划异动请求
  submitPlanChangeWithDetails: function(planType, studyHours, startDate) {
    const typeText = planType === 'advance' ? '提前' : '延迟';
    const reason = `学习计划${typeText}：每日学习时间 ${studyHours} 小时，新的开始日期 ${startDate}`;
    
    this.submitPlanChangeRequest(reason);
  },
  
  // 提交学习计划异动请求
  submitPlanChangeRequest: function(reason) {
    request.post('/user/submit_plan_change', {
      reason: reason
    })
    .then((res) => {
      if (res.code === 200) {
        wx.showToast({
          title: '申请已提交',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.message || '提交失败',
          icon: 'none'
        });
      }
    })
    .catch((err) => {
      console.error('提交学习计划异动请求失败:', err);
      wx.showToast({
        title: '提交失败，请稍后再试',
        icon: 'none'
      });
    });
  },

  // 获取测评状态
  fetchAssessmentStatus: function() {
    // 先尝试从本地缓存读取测评状态
    const localStatus = wx.getStorageSync('assessmentStatus');
    if (localStatus) {
      const shinlunCompleted = localStatus.shinlun_completed || false;
      const xingceCompleted = localStatus.xingce_completed || false;
      // 使用本地缓存的状态先更新UI
      this.setData({
        shinlunCompleted: shinlunCompleted,
        xingceCompleted: xingceCompleted,
        assessmentCompleted: (shinlunCompleted && xingceCompleted) || false,
        shinlunButtonText: shinlunCompleted ? '申论测评(已完成)' : '申论摸底测评',
        xingceButtonText: xingceCompleted ? '行测测评(已完成)' : '行测摸底测评'
      });
    }
    
    // 再从服务器获取最新状态
    request.get('/user/assessment_status', {})
      .then((res) => {
        if (res && res.data) {
          const shinlunCompleted = res.data.shinlun_completed || false;
          const xingceCompleted = res.data.xingce_completed || false;
          
          // 保存到本地缓存
          wx.setStorageSync('assessmentStatus', {
            shinlun_completed: shinlunCompleted,
            xingce_completed: xingceCompleted,
            timestamp: Date.now() // 添加时间戳以便检查缓存新鲜度
          });
          
          // 根据后台返回的测评状态设置前端状态
          this.setData({
            shinlunCompleted: shinlunCompleted,
            xingceCompleted: xingceCompleted,
            // 如果申论和行测都完成了，则整体测评完成
            assessmentCompleted: (shinlunCompleted && xingceCompleted) || false,
            // 更新按钮文本
            shinlunButtonText: shinlunCompleted ? '申论测评(已完成)' : '申论摸底测评',
            xingceButtonText: xingceCompleted ? '行测测评(已完成)' : '行测摸底测评'
          });
        }
      })
      .catch((err) => {
        console.error('获取测评状态失败:', err);
        // 网络请求失败时保持使用本地缓存的状态
      });
  },
  
  // 开始申论摸底测评
  startShinlunAssessment: function() {
    // 检查是否有测评链接
    if (!this.data.hasShinlunLink) {
      wx.showModal({
        title: '提示',
        content: '申论摸底测评链接尚未设置，请联系助教',
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }
    
    // 导航到专门的申论测评页面
    wx.navigateTo({
      url: '/pages/assessment-shinlun/assessment-shinlun',
      success: () => {
        console.log('导航到申论测评页面成功');
      },
      fail: (err) => {
        console.error('导航到申论测评页面失败:', err);
        wx.showToast({
          title: '打开测评页面失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },
  
  // 开始行测摸底测评
  startXingceAssessment: function() {
    // 检查是否有测评链接
    if (!this.data.hasXingceLink) {
      wx.showModal({
        title: '提示',
        content: '行测摸底测评链接尚未设置，请联系助教',
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }
    
    // 导航到专门的行测测评页面
    wx.navigateTo({
      url: '/pages/assessment-xingce/assessment-xingce',
      success: () => {
        console.log('导航到行测测评页面成功');
      },
      fail: (err) => {
        console.error('导航到行测测评页面失败:', err);
        wx.showToast({
          title: '打开测评页面失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },
  
  // 提交测评作答时间
  submitAssessmentTimes: function(type, times) {
    const data = {
      type: type, // 'shinlun' 或 'xingce'
      times: times // 每题作答时间的对象
    };
    
    request.post('/user/save_assessment_time', data)
      .then((res) => {
        console.log('保存测评时间成功:', res);
        
        // 立即强制更新本地状态和缓存
        const localStatus = wx.getStorageSync('assessmentStatus') || {};
        
        if (type === 'shinlun') {
          this.setData({ 
            shinlunCompleted: true,
            shinlunButtonText: '申论测评(已完成)' // 更新按钮文本
          });
          localStatus.shinlun_completed = true;
        } else if (type === 'xingce') {
          this.setData({ 
            xingceCompleted: true,
            xingceButtonText: '行测测评(已完成)' // 更新按钮文本
          });
          localStatus.xingce_completed = true;
        }
        
        // 更新时间戳
        localStatus.timestamp = Date.now();
        wx.setStorageSync('assessmentStatus', localStatus);
        
        // 显示成功提示
        wx.showToast({
          title: `${type === 'shinlun' ? '申论' : '行测'}测评已完成`,
          icon: 'success',
          duration: 2000
        });
        
        // 检查是否两个测评都完成了
        if (this.data.shinlunCompleted && this.data.xingceCompleted) {
          this.setData({ assessmentCompleted: true });
          
          // 通知后台全部测评已完成
          request.post('/user/all_assessment_completed', {})
            .then((res) => {
              console.log('全部测评完成通知成功:', res);
              wx.showToast({
                title: '测评已完成，正在定制学习计划',
                icon: 'success',
                duration: 2000
              });
            })
            .catch((err) => {
              console.error('全部测评完成通知失败:', err);
            });
        }
        
        // 再次从服务器获取最新状态，确保状态与后端同步
        this.fetchAssessmentStatus();
      })
      .catch((err) => {
        console.error('保存测评时间失败:', err);
        
        // 即使API失败，也更新本地状态，确保用户体验流畅
        if (type === 'shinlun') {
          this.setData({ 
            shinlunCompleted: true,
            shinlunButtonText: '申论测评(已完成)' 
          });
          wx.setStorageSync('assessmentStatus', {
            ...wx.getStorageSync('assessmentStatus'),
            shinlun_completed: true,
            timestamp: Date.now()
          });
        } else if (type === 'xingce') {
          this.setData({ 
            xingceCompleted: true,
            xingceButtonText: '行测测评(已完成)' 
          });
          wx.setStorageSync('assessmentStatus', {
            ...wx.getStorageSync('assessmentStatus'),
            xingce_completed: true,
            timestamp: Date.now()
          });
        }
        
        wx.showToast({
          title: '保存作答时间失败，但测评已标记为完成',
          icon: 'none',
          duration: 2000
        });
      });
  },
  
  // 通知后台测评已完成
  notifyAssessmentComplete: function(type) {
    // type可以是'shinlun'或'xingce'
    const data = {};
    data[`${type}_completed`] = true;
    
    request.post('/user/update_assessment', data)
      .then((res) => {
        console.log(`${type}测评完成通知成功:`, res);
        
        // 更新本地状态和本地缓存
        const localStatus = wx.getStorageSync('assessmentStatus') || {};
        
        if (type === 'shinlun') {
          this.setData({ 
            shinlunCompleted: true,
            shinlunButtonText: '申论测评(已完成)' // 更新按钮文本
          });
          localStatus.shinlun_completed = true;
        } else if (type === 'xingce') {
          this.setData({ 
            xingceCompleted: true,
            xingceButtonText: '行测测评(已完成)' // 更新按钮文本
          });
          localStatus.xingce_completed = true;
        }
        
        // 更新时间戳
        localStatus.timestamp = Date.now();
        wx.setStorageSync('assessmentStatus', localStatus);
        
        // 检查是否两个测评都完成了
        if (this.data.shinlunCompleted && this.data.xingceCompleted) {
          this.setData({ assessmentCompleted: true });
          
          // 通知后台全部测评已完成
          request.post('/user/all_assessment_completed', {})
            .then((res) => {
              console.log('全部测评完成通知成功:', res);
              wx.showToast({
                title: '测评已完成，正在定制学习计划',
                icon: 'success',
                duration: 2000
              });
            })
            .catch((err) => {
              console.error('全部测评完成通知失败:', err);
            });
        } else {
          wx.showToast({
            title: `${type === 'shinlun' ? '申论' : '行测'}测评已完成`,
            icon: 'success',
            duration: 2000
          });
        }
      })
      .catch((err) => {
        console.error(`${type}测评完成通知失败:`, err);
        
        // 即使API失败，也更新前端状态以便用户体验
        // 同时更新本地缓存
        const localStatus = wx.getStorageSync('assessmentStatus') || {};
        
        if (type === 'shinlun') {
          this.setData({ 
            shinlunCompleted: true,
            shinlunButtonText: '申论测评(已完成)' // 更新按钮文本
          });
          localStatus.shinlun_completed = true;
        } else if (type === 'xingce') {
          this.setData({ 
            xingceCompleted: true,
            xingceButtonText: '行测测评(已完成)' // 更新按钮文本
          });
          localStatus.xingce_completed = true;
        }
        
        // 更新时间戳
        localStatus.timestamp = Date.now();
        wx.setStorageSync('assessmentStatus', localStatus);
        
        // 检查是否两个测评都完成了
        if (this.data.shinlunCompleted && this.data.xingceCompleted) {
          this.setData({ assessmentCompleted: true });
        }
      });
  },

  // 获取测评链接状态
  fetchAssessmentLinks: function() {
    // 先尝试从本地缓存读取测评链接状态
    const localLinks = wx.getStorageSync('assessmentLinks') || {};
    const hasShinlunLink = localLinks.shinlun_link ? true : false;
    const hasXingceLink = localLinks.xingce_link ? true : false;
    
    // 使用本地缓存的状态先更新UI
    this.setData({
      hasShinlunLink: hasShinlunLink,
      hasXingceLink: hasXingceLink
    });
    
    // 再从服务器获取最新状态
    request.get('/user/assessment_links', {})
      .then((res) => {
        if (res && res.data) {
          // 检查返回的链接是否有效（不为空且有意义）
          const shinlunLink = res.data.shinlun_link && res.data.shinlun_link.trim() !== '' ? true : false;
          const xingceLink = res.data.xingce_link && res.data.xingce_link.trim() !== '' ? true : false;
          
          // 保存到本地缓存
          wx.setStorageSync('assessmentLinks', {
            shinlun_link: res.data.shinlun_link || '',
            xingce_link: res.data.xingce_link || '',
            timestamp: Date.now() // 添加时间戳以便检查缓存新鲜度
          });
          
          // 根据后台返回的测评链接状态设置前端状态
          this.setData({
            hasShinlunLink: shinlunLink,
            hasXingceLink: xingceLink
          });
        }
      })
      .catch((err) => {
        console.error('获取测评链接状态失败:', err);
        // 网络请求失败时保持使用本地缓存的状态
      });
  },
})