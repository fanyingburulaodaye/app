const request = require('../../utils/request.js');

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 用户信息对象，用于绑定表单数据
    userInfo: {},
    // 政治面貌选项数组
    politicalStatusArray: [
      '中共党员', 
      '中共预备党员', 
      '共青团员', 
      '无党派人士', 
      '群众',
      '民革党员', 
      '民盟盟员', 
      '民建会员', 
      '民进会员', 
      '农工党党员', 
      '致公党党员', 
      '九三学社社员', 
      '台盟盟员'
    ],
    politicalStatusIndex: 0,
    // 是否为强制填写模式
    isForceMode: false,
    // 是否是编辑模式
    isEditMode: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 检查是否是强制填写模式
    if (options.force && options.force === 'true') {
      this.setData({
        isForceMode: true
      });
    }

    // 检查是否是编辑模式
    if (options.edit && options.edit === 'true') {
      this.setData({
        isEditMode: true
      });
    }

    // 尝试获取已有用户信息
    this.fetchUserInfo();
  },

  /**
   * 获取用户信息
   */
  fetchUserInfo: function() {
    request.get('/user/student-info', {})
      .then(res => {
        if (res.code === 200 && res.data) {
          // 如果政治面貌存在，设置对应的索引
          if (res.data.political_status) {
            const index = this.data.politicalStatusArray.findIndex(item => item === res.data.political_status);
            if (index !== -1) {
              this.setData({
                politicalStatusIndex: index
              });
            }
          }

          // 更新用户信息
          this.setData({
            userInfo: res.data
          });
        }
      })
      .catch(err => {
        console.error('获取用户信息失败:', err);
        wx.showToast({
          title: '获取信息失败',
          icon: 'none'
        });
      });
  },

  /**
   * 表单提交处理
   */
  submitForm: function(e) {
    // 获取表单数据
    const formData = e.detail.value;
    
    // 验证必填字段
    if (!this.validateForm(formData)) {
      return;
    }

    // 显示加载提示
    wx.showLoading({
      title: '提交中...',
      mask: true
    });

    // 提交表单数据到后端
    request.post('/user/student-info', formData)
      .then(res => {
        wx.hideLoading();
        if (res.code === 200) {
          wx.showToast({
            title: '提交成功',
            icon: 'success'
          });

          setTimeout(() => {
            // 如果是强制模式，提交成功后跳转到首页
            if (this.data.isForceMode) {
              wx.switchTab({
                url: '/pages/information/information'
              });
            } else if (this.data.isEditMode) {
              // 如果是编辑模式，返回上一页
              wx.navigateBack();
            }
          }, 1500);
        } else {
          wx.showToast({
            title: res.message || '提交失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('提交表单失败:', err);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      });
  },

  /**
   * 验证表单数据
   */
  validateForm: function(formData) {
    // 必填字段列表
    const requiredFields = [
      { field: 'name', name: '姓名' },
      { field: 'phone', name: '手机号码' },
      { field: 'xiaoetong_nickname', name: '小鹅通昵称' },
      { field: 'target_exam', name: '目标考试+岗位' },
      { field: 'target_score_xingce', name: '目标分数（行测）' },
      { field: 'target_score_shinlun', name: '目标分数（申论）' },
      { field: 'study_status', name: '目前个人工作学习状态' },
      { field: 'study_hours_weekday', name: '工作日学习时间' },
      { field: 'study_hours_weekend', name: '周末学习时间' },
      { field: 'self_assessment', name: '自我评估' },
      { field: 'motivation', name: '自我激励的话' }
    ];

    // 检查必填字段是否为空
    for (const item of requiredFields) {
      if (!formData[item.field]) {
        wx.showToast({
          title: `请填写${item.name}`,
          icon: 'none'
        });
        return false;
      }
    }

    // 验证手机号格式
    if (!/^1\d{10}$/.test(formData.phone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return false;
    }

    // 验证目标分数
    if (isNaN(parseFloat(formData.target_score_xingce)) || parseFloat(formData.target_score_xingce) <= 0) {
      wx.showToast({
        title: '请输入正确的行测目标分数',
        icon: 'none'
      });
      return false;
    }

    if (isNaN(parseFloat(formData.target_score_shinlun)) || parseFloat(formData.target_score_shinlun) <= 0) {
      wx.showToast({
        title: '请输入正确的申论目标分数',
        icon: 'none'
      });
      return false;
    }

    // 验证学习时间
    if (isNaN(parseFloat(formData.study_hours_weekday)) || parseFloat(formData.study_hours_weekday) <= 0) {
      wx.showToast({
        title: '请输入正确的工作日学习时间',
        icon: 'none'
      });
      return false;
    }

    if (isNaN(parseFloat(formData.study_hours_weekend)) || parseFloat(formData.study_hours_weekend) <= 0) {
      wx.showToast({
        title: '请输入正确的周末学习时间',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  /**
   * 预计考试时间变更处理
   */
  bindDateChange: function(e) {
    this.setData({
      'userInfo.exam_date': e.detail.value
    });
  },

  /**
   * 出生日期变更处理
   */
  bindBirthDateChange: function(e) {
    this.setData({
      'userInfo.birth_date': e.detail.value
    });
  },

  /**
   * 学习状态变更处理
   */
  bindStatusChange: function(e) {
    this.setData({
      'userInfo.study_status': e.detail.value
    });
  },

  /**
   * 性别变更处理
   */
  bindGenderChange: function(e) {
    this.setData({
      'userInfo.gender': e.detail.value
    });
  },

  /**
   * 政治面貌变更处理
   */
  bindPoliticalStatusChange: function(e) {
    const index = e.detail.value;
    this.setData({
      politicalStatusIndex: index,
      'userInfo.political_status': this.data.politicalStatusArray[index]
    });
  },

  /**
   * 应届生状态变更处理
   */
  bindFreshGraduateChange: function(e) {
    this.setData({
      'userInfo.is_fresh_graduate': e.detail.value
    });
  },

  /**
   * 处理"暂不填写"按钮点击事件
   */
  skipFilling: function() {
    // 将用户跳转到主页
    wx.switchTab({
      url: '/pages/information/information'
    });
  }
}) 