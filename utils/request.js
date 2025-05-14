const base_url = 'http://ceshi1119.w1.luyouxia.net'

// 添加一个简单的随机数生成器，用于防止缓存
const getRandomString = () => {
  return Math.random().toString(36).substring(2, 15);
};

const request = (url, method, data, retryCount = 0) => {
  // 获取token
  const token = wx.getStorageSync('token');
  
  // 检查token是否存在
  if (!token) {
    wx.showToast({
      title: '未登录',
      icon: 'none'
    });
    // 跳转到登录页面
    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/login/login',
      });
    }, 1500);
    return Promise.reject('未登录');
  }
  
  // 构建请求URL，添加随机参数防止缓存
  let requestUrl = `${base_url}${url}`;
  const separator = requestUrl.includes('?') ? '&' : '?';
  requestUrl = `${requestUrl}${separator}_=${getRandomString()}`;
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: requestUrl,
      method: method,
      data: data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else if (res.statusCode === 403) {
          // token过期或无效
          console.log('Token失效，需要重新登录', res);
          wx.showToast({
            title: '登录已过期，请重新登录',
            icon: 'none'
          });
          // 清除无效token和相关数据
          wx.removeStorageSync('token');
          
          // 跳转到登录页面
          setTimeout(() => {
            wx.redirectTo({
              url: '/pages/login/login',
            });
          }, 1500);
          reject(res.data);
        } else {
          console.error('请求失败', res);
          reject(res.data);
        }
      },
      fail: (err) => {
        console.error('网络请求失败', err);
        
        // 网络错误，尝试重试(最多重试3次)
        if (retryCount < 3) {
          console.log(`请求失败，正在进行第${retryCount + 1}次重试...`);
          
          // 延迟一段时间后重试
          setTimeout(() => {
            request(url, method, data, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (retryCount + 1)); // 逐渐增加重试间隔
        } else {
          wx.showToast({
            title: '网络请求失败，请检查网络连接',
            icon: 'none'
          });
        reject(err);
        }
      }
    });
  });
};

module.exports = {
  get: (url, data) => request(url, 'GET', data),
  post: (url, data) => request(url, 'POST', data)
};