/**
 * 用户信息检查工具
 * 用于检查用户是否已填写学员档案登记表
 */

const request = require('./request.js');

/**
 * 检查用户是否已填写信息，如未填写则显示提示
 * @returns {Promise<boolean>} 是否已填写信息
 */
function checkUserInfoFilled() {
  return new Promise((resolve) => {
    request.get('/user/check-info-status', {})
      .then(res => {
        if (res.code === 200) {
          if (res.data.hasFilledInfo) {
            // 已填写信息
            resolve(true);
          } else {
            // 未填写信息，显示提示
            wx.showModal({
              title: '提示',
              content: '请先填写学员档案登记表，以便为您提供更好的服务',
              confirmText: '去填写',
              cancelText: '稍后填写',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  // 跳转到信息填写页面
                  wx.navigateTo({
                    url: '/pages/student-info/student-info'
                  });
                }
                resolve(false);
              }
            });
          }
        } else {
          // 请求失败，默认已填写
          console.error('检查用户信息状态失败:', res.message);
          resolve(true);
        }
      })
      .catch(err => {
        console.error('检查用户信息状态请求异常:', err);
        // 出错时默认已填写，避免影响用户体验
        resolve(true);
      });
  });
}

module.exports = {
  checkUserInfoFilled
}; 